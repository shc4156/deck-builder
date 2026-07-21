import { SYNERGY_MASTER } from '../data/synergies';
import { COMMON_ARTS_OF_WAR, getArtsCategoryForGeneral } from '../data/artsOfWar';
import { findAlternativeTactics } from '../data/tacticAlternatives';
// [신규] deckEngineData(장수 연결점수) 기반 로직 재사용 - app/lib/squadOptimizer.js
import { connectionScoreOf, findBestSynergyTrio, pickFormationForTrio } from '../app/lib/squadOptimizer';

function parseUniqueArts(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    const parsed = JSON.parse(raw);
    return parsed && Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function getDefaultArtsOfWar(generalData) {
  const category = getArtsCategoryForGeneral(generalData);
  const pool = COMMON_ARTS_OF_WAR[category] || [];
  const poolNames = pool.map(a => a.name);

  const uniqueArts = parseUniqueArts(generalData?.unique_arts);

  if (uniqueArts) {
    const uniqueName = Object.keys(uniqueArts)[0];
    return { common: poolNames.slice(0, 2), unique: uniqueName };
  }

  return { common: poolNames.slice(0, 3), unique: null };
}

function getStatFocusLabel(generalData) {
  if (!generalData) return '균형 투자';
  const stats = {
    지력: Number(generalData.intelligence ?? 0),
    무력: Number(generalData.strength ?? 0),
    통솔: Number(generalData.command ?? 0),
  };
  const [topStat] = Object.entries(stats).sort((a, b) => b[1] - a[1])[0];
  return topStat;
}

// [신규] 티어덱 템플릿 없이(재구성 단계) 새로 짠 3인조에 장비 추천 속성을 붙일 때 사용.
// squadOptimizer.js의 recommendArtsAndEquipment는 unique_tactic_name 필드를 참조하는데
// 이 프로젝트의 실제 장수 스키마(unique_arts JSON)와 안 맞아서, 기존 getStatFocusLabel과
// 동일한 스탯 소스로 상위 2개 스탯만 뽑는 간단한 버전을 자체적으로 둔다.
function getEquipmentOptions(generalData) {
  if (!generalData) return ['균형 투자'];
  const stats = {
    지력: Number(generalData.intelligence ?? 0),
    무력: Number(generalData.strength ?? 0),
    통솔: Number(generalData.command ?? 0),
  };
  return Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k);
}

function generateSquadName(finalizedSetup) {
  return finalizedSetup.map(g => g.general_name.trim().charAt(0)).join('');
}

const MIN_TIER_WEIGHT = 0.5;

function parseTierScore(tierName) {
  const match = (tierName || '').match(/T(\d)([+-]?)/);
  if (!match) return -1;
  const num = parseInt(match[1], 10);
  const modifier = match[2] === '+' ? 0.3 : match[2] === '-' ? -0.3 : 0;
  return (10 - num) + modifier;
}

export function buildTacticFrequencyMap(tierDecks, options = {}) {
  const { altWeight = 0.4, minCount = 0 } = options;
  const map = new Map();

  const bump = (generalName, tacticName, amount) => {
    if (!generalName || !tacticName || tacticName === '미장착') return;
    if (!map.has(generalName)) map.set(generalName, new Map());
    const inner = map.get(generalName);
    inner.set(tacticName, (inner.get(tacticName) || 0) + amount);
  };

  for (const deck of tierDecks || []) {
    const weight = Math.max(parseTierScore(deck.tier_name), MIN_TIER_WEIGHT);

    for (const gSetup of deck.deck_setup || []) {
      const name = gSetup.general_name?.trim();
      if (!name) continue;

      (gSetup.added_tactics || []).forEach(t => {
        if (t) bump(name, t, weight);
      });
      (gSetup.alt_tactics || []).forEach(t => {
        if (t) bump(name, t, weight * altWeight);
      });
    }
  }

  if (minCount > 0) {
    for (const inner of map.values()) {
      for (const [tacticName, score] of inner) {
        if (score < minCount) inner.delete(tacticName);
      }
    }
  }

  return map;
}

function getTopTacticsByFrequency(generalName, tacticFrequencyMap) {
  const inner = tacticFrequencyMap?.get(generalName);
  if (!inner || inner.size === 0) return [];
  return [...inner.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tacticName]) => tacticName);
}

// 원본 대체 후보 탐색
// 우선순위: 1) 수동 등록된 인연효과(SYNERGY_MASTER) 발동
//           2) [신규] deckEngineData 연결점수(connectionScoreOf) 합이 가장 높은 후보
//           3) primary_role 일치
//           4) secondary_roles/tags 겹침
//           5) 아무나
function findBestSubstitute(originalGeneral, generals, myGenNames, usedGenerals, tempUsed, currentSquadNames) {
  const isAvailable = (gen) => {
    const n = gen.name.trim();
    return myGenNames.includes(n) && !usedGenerals.has(n) && !tempUsed.has(n);
  };

  const candidates = generals.filter(isAvailable);
  if (candidates.length === 0) return null;

  if (currentSquadNames && currentSquadNames.length > 0) {
    const synergyCandidate = candidates.find(g => {
      const name = g.name.trim();
      return SYNERGY_MASTER.some(syn => {
        if (!syn.members.includes(name)) return false;
        const overlapWithSquad = syn.members.filter(m => currentSquadNames.includes(m)).length;
        return overlapWithSquad + 1 >= syn.req;
      });
    });
    if (synergyCandidate) return synergyCandidate.name.trim();

    // [신규] 2순위: 이미 배치된 장수들과의 deckEngineData 연결점수 합이 가장 높은 후보.
    // SYNERGY_MASTER만큼 확정적이진 않지만, role/tag 매칭보다는 신뢰도 높은 실전 분석
    // 데이터라 그 다음 순서로 둔다. 합산 점수가 0보다 클 때만 채택.
    let bestConnCandidate = null;
    let bestConnScore = 0;
    for (const g of candidates) {
      const name = g.name.trim();
      const connScore = currentSquadNames.reduce((sum, existing) => sum + connectionScoreOf(name, existing), 0);
      if (connScore > bestConnScore) {
        bestConnScore = connScore;
        bestConnCandidate = name;
      }
    }
    if (bestConnCandidate) return bestConnCandidate;
  }

  if (originalGeneral) {
    const roleMatch = candidates.find(g => g.primary_role === originalGeneral.primary_role);
    if (roleMatch) return roleMatch.name.trim();

    const origSecondary = originalGeneral.secondary_roles || [];
    if (origSecondary.length > 0) {
      const tagMatch = candidates.find(g => {
        const gSecondary = g.secondary_roles || [];
        return gSecondary.some(tag => origSecondary.includes(tag));
      });
      if (tagMatch) return tagMatch.name.trim();
    }
  }

  return candidates[0].name.trim();
}

function findBestTactics(generalData, tactics, selectedTactics, usedTactics, count, tacticFrequencyMap) {
  const isAvailable = (t) => selectedTactics.includes(t.id) && !usedTactics.has(t.name);
  const pool = tactics.filter(isAvailable);

  const result = [];
  const localUsed = new Set();

  const takeFrom = (list) => {
    for (const t of list) {
      if (result.length >= count) break;
      if (localUsed.has(t.name)) continue;
      result.push(t);
      localUsed.add(t.name);
    }
  };

  if (generalData) {
    if (generalData.preferred_tactic_type) {
      const typeMatched = pool
        .filter(t => t.role === generalData.preferred_tactic_type)
        .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
      takeFrom(typeMatched);
    }

    if (result.length < count && tacticFrequencyMap) {
      const rankedNames = getTopTacticsByFrequency(generalData.name, tacticFrequencyMap);
      if (rankedNames.length > 0) {
        const poolByName = new Map(pool.map(t => [t.name, t]));
        const freqMatched = rankedNames.map(name => poolByName.get(name)).filter(Boolean);
        takeFrom(freqMatched);
      }
    }

    if (result.length < count) {
      const roleMatched = pool
        .filter(t => t.role === generalData.primary_role)
        .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
      takeFrom(roleMatched);
    }

    if (result.length < count) {
      const secondary = generalData.secondary_roles || [];
      const tagMatched = pool
        .filter(t => !localUsed.has(t.name) && (t.tags || []).some(tag => secondary.includes(tag)))
        .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
      takeFrom(tagMatched);
    }
  }

  if (result.length < count) {
    const rest = pool
      .filter(t => !localUsed.has(t.name))
      .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
    takeFrom(rest);
  }

  return result;
}

function resolveTacticsForGeneral(generalData, originalTacticNames, tactics, generals, selectedTactics, usedTactics, count = 2, tacticFrequencyMap) {
  const result = [];
  const localUsed = new Set();

  for (const tacName of originalTacticNames || []) {
    if (result.length >= count) break;
    const tacData = tactics.find(t => t.name === tacName);

    if (tacData && selectedTactics.includes(tacData.id) && !usedTactics.has(tacData.name) && !localUsed.has(tacData.name)) {
      result.push(tacData);
      localUsed.add(tacData.name);
      continue;
    }

    if (!tacName) continue;
    const combinedUsed = new Set([...usedTactics, ...localUsed]);
    const alts = findAlternativeTactics({
      generalName: generalData?.name,
      recommendedTacticName: tacName,
      tactics,
      generals,
      selectedTactics,
      usedTacticsInDeck: Array.from(combinedUsed),
      limit: 1,
    });

    if (alts.length > 0) {
      const altData = tactics.find(t => t.name === alts[0]);
      if (altData && !localUsed.has(altData.name)) {
        result.push(altData);
        localUsed.add(altData.name);
      }
    }
  }

  if (result.length < count) {
    const combinedUsed = new Set([...usedTactics, ...localUsed]);
    const additional = findBestTactics(generalData, tactics, selectedTactics, combinedUsed, count - result.length, tacticFrequencyMap);
    additional.forEach(t => {
      if (!localUsed.has(t.name)) {
        result.push(t);
        localUsed.add(t.name);
      }
    });
  }

  return result;
}

export function buildOptimalSquads({ tierDecks, generals, tactics, myGenNames, myTactNames, pinnedDeckIds, selectedTactics, tacticFrequencyMap }) {
  const usedGenerals = new Set();
  const usedTactics = new Set();
  const squads = [];

  const freqMap = tacticFrequencyMap || buildTacticFrequencyMap(tierDecks);

  const findGeneralData = (name) => generals.find(g => g.name.trim() === name.trim());

  const prioritizedDecks = [...tierDecks].sort((a, b) => (pinnedDeckIds.includes(a.id) ? -1 : 1));

  for (const deck of prioritizedDecks) {
    if (squads.length >= 5) break;

    // [신규] 보유율(커버리지) 게이트: 핀 고정 덱은 항상 템플릿으로 사용.
    // 그 외 덱은 원본 3명 중 과반(2명 이상)을 실제로 보유·사용 가능해야만 템플릿으로 씀.
    // 커버리지가 낮은 덱(예: 3명 중 1명 이하 보유)은 여기서 건너뛰고, 해당 장수들은
    // 나중에 "재구성 단계"에서 deckEngineData 연결점수 기반으로 자유롭게 조합된다.
    const isPinned = pinnedDeckIds.includes(deck.id);
    const deckGeneralNames = deck.deck_setup.map(g => g.general_name.trim());
    const ownedAvailableCount = deckGeneralNames.filter(
      n => myGenNames.includes(n) && !usedGenerals.has(n)
    ).length;
    const isHighCoverage = isPinned || ownedAvailableCount >= Math.ceil(deckGeneralNames.length / 2);

    if (!isHighCoverage) continue;

    let tempUsed = new Set();

    const setup = deck.deck_setup.map(g => {
      let name = g.general_name.trim();
      const originalGeneralData = findGeneralData(name);
      let isSubstituted = false;

      if (!myGenNames.includes(name) || usedGenerals.has(name) || tempUsed.has(name)) {
        const currentSquadNames = Array.from(tempUsed);
        const sub = findBestSubstitute(originalGeneralData, generals, myGenNames, usedGenerals, tempUsed, currentSquadNames);
        if (sub) {
          name = sub;
          isSubstituted = true;
        }
      }

      tempUsed.add(name);
      return { ...g, general_name: name, isSubstituted };
    });

    const finalized = setup.map(g => {
      const generalData = findGeneralData(g.general_name);

      const originalTacticNames = g.isSubstituted ? [] : (g.added_tactics || []);
      const chosenTactics = resolveTacticsForGeneral(
        generalData, originalTacticNames, tactics, generals, selectedTactics, usedTactics, 2, freqMap
      );

      const finalTactics = chosenTactics.map(t => {
        usedTactics.add(t.name);
        return { name: t.name, grade: t.grade };
      });

      while (finalTactics.length < 2) {
        finalTactics.push({ name: '전법장착', grade: '보라' });
      }

      const troopType = generalData?.troop_type || '병종 미확인';
      const statFocus = g.isSubstituted ? getStatFocusLabel(generalData) : g.stat_focus;

      const artsOfWar = (g.isSubstituted || !g.arts_of_war)
        ? getDefaultArtsOfWar(generalData)
        : g.arts_of_war;

      return {
        ...g,
        added_tactics_detailed: finalTactics,
        troop_type: troopType,
        stat_focus: statFocus,
        arts_of_war: artsOfWar,
      };
    });

    tempUsed.forEach(n => usedGenerals.add(n));

    squads.push({
      ...deck,
      tier_name: generateSquadName(finalized),
      original_tier_name: deck.tier_name,
      deck_setup: finalized,
      squadNum: squads.length + 1,
    });
  }

  // [신규] 재구성 단계: 위에서 템플릿으로 못 쓰고 건너뛴 덱들의 장수, 그리고 애초에 어떤
  // 티어덱에도 등장하지 않는 장수까지 포함한 "아직 안 쓰인 보유 장수 풀"에서, deckEngineData
  // 연결점수+시너지 기반 조합 탐색(findBestSynergyTrio)으로 직접 3인조를 짜서 남은 군단
  // 자리를 채운다. 여기서 만들어지는 덱은 특정 티어덱을 차용한 게 아니라 처음부터 연결
  // 관계를 보고 조합된 것이므로 "대체(isSubstituted)" 표기를 하지 않는다.
  while (squads.length < 5) {
    const remainingPool = generals.filter(g => {
      const n = g.name.trim();
      return myGenNames.includes(n) && !usedGenerals.has(n);
    });

    const best = findBestSynergyTrio(remainingPool);
    if (!best) break; // 3인조를 더 만들 수 있는 보유 장수가 부족함

    const formation = pickFormationForTrio(best.trio);

    const finalized = best.trio.map(generalData => {
      const chosenTactics = resolveTacticsForGeneral(
        generalData, [], tactics, generals, selectedTactics, usedTactics, 2, freqMap
      );
      const finalTactics = chosenTactics.map(t => {
        usedTactics.add(t.name);
        return { name: t.name, grade: t.grade };
      });
      while (finalTactics.length < 2) {
        finalTactics.push({ name: '전법장착', grade: '보라' });
      }

      return {
        general_name: generalData.name.trim(),
        isSubstituted: false,
        added_tactics_detailed: finalTactics,
        troop_type: generalData?.troop_type || '병종 미확인',
        stat_focus: getStatFocusLabel(generalData),
        arts_of_war: getDefaultArtsOfWar(generalData),
        equipment_options: getEquipmentOptions(generalData),
      };
    });

    best.trio.forEach(g => usedGenerals.add(g.name.trim()));

    squads.push({
      id: `synergy-${squads.length + 1}`,
      tier_name: generateSquadName(finalized),
      original_tier_name: best.activeSynergies.length > 0
        ? `연결 시너지 편성 (${best.activeSynergies[0]})`
        : '연결 시너지 편성',
      formation_grid: formation.grid,
      deck_setup: finalized,
      squadNum: squads.length + 1,
    });
  }

  return squads;
}