// utils/squadEngine.js
import { SYNERGY_MASTER } from '../data/synergies';
import { COMMON_ARTS_OF_WAR, getArtsCategoryForGeneral } from '../data/artsOfWar';

// generals.unique_arts는 DB에서 문자열(JSON) 또는 이미 파싱된 객체로 올 수 있음
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

// 장수 데이터를 보고 적절한 병법(common 2~3개 + unique 0~1개)을 자동 배정
function getDefaultArtsOfWar(generalData) {
  const category = getArtsCategoryForGeneral(generalData);
  const pool = COMMON_ARTS_OF_WAR[category] || [];
  const poolNames = pool.map(a => a.name);

  const uniqueArts = parseUniqueArts(generalData?.unique_arts);

  if (uniqueArts) {
    // 고유병법이 있는 장수: 일반병법 2개 + 고유병법 1개
    const uniqueName = Object.keys(uniqueArts)[0];
    return { common: poolNames.slice(0, 2), unique: uniqueName };
  }

  // 고유병법이 없는 장수(보라 등급 등): 일반병법 3개
  return { common: poolNames.slice(0, 3), unique: null };
}

// 장수의 실제 능력치 중 가장 높은 속성을 반환 (지력/무력/통솔)
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

// 최종 확정된 장수 이름들의 첫 글자를 따서 부대 이름 생성
function generateSquadName(finalizedSetup) {
  return finalizedSetup.map(g => g.general_name.trim().charAt(0)).join('');
}

// 원본 대체 후보 탐색 (인연효과 우선 → role 일치 → tag 일치 → 아무나)
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

function findBestTactics(generalData, tactics, selectedTactics, usedTactics, count) {
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
    // 0순위(신규): 장수의 고유전법 유형(추격/액티브/방어/회복 등)과 일치하는 전법
    if (generalData.preferred_tactic_type) {
      const typeMatched = pool
        .filter(t => t.role === generalData.preferred_tactic_type)
        .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
      takeFrom(typeMatched);
    }

    // 1순위(기존, 유형 정보 없을 때 폴백): primary_role 일치
    if (result.length < count) {
      const roleMatched = pool
        .filter(t => t.role === generalData.primary_role)
        .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
      takeFrom(roleMatched);
    }

    // 2순위: tags와 secondary_roles 겹침
    if (result.length < count) {
      const secondary = generalData.secondary_roles || [];
      const tagMatched = pool
        .filter(t => !localUsed.has(t.name) && (t.tags || []).some(tag => secondary.includes(tag)))
        .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
      takeFrom(tagMatched);
    }
  }

  // 3순위: 등급 기준 아무거나
  if (result.length < count) {
    const rest = pool
      .filter(t => !localUsed.has(t.name))
      .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));
    takeFrom(rest);
  }

  return result;
}

function resolveTacticsForGeneral(generalData, originalTacticNames, tactics, selectedTactics, usedTactics, count = 2) {
  const result = [];
  const localUsed = new Set();

  for (const tacName of originalTacticNames || []) {
    if (result.length >= count) break;
    const tacData = tactics.find(t => t.name === tacName);
    if (!tacData) continue;
    if (!selectedTactics.includes(tacData.id)) continue;
    if (usedTactics.has(tacData.name) || localUsed.has(tacData.name)) continue;

    result.push(tacData);
    localUsed.add(tacData.name);
  }

  if (result.length < count) {
    const combinedUsed = new Set([...usedTactics, ...localUsed]);
    const additional = findBestTactics(generalData, tactics, selectedTactics, combinedUsed, count - result.length);
    additional.forEach(t => {
      if (!localUsed.has(t.name)) {
        result.push(t);
        localUsed.add(t.name);
      }
    });
  }

  return result;
}

export function buildOptimalSquads({ tierDecks, generals, tactics, myGenNames, myTactNames, pinnedDeckIds, selectedTactics }) {
  const usedGenerals = new Set();
  const usedTactics = new Set();
  const squads = [];

  const findGeneralData = (name) => generals.find(g => g.name.trim() === name.trim());

  const prioritizedDecks = [...tierDecks].sort((a, b) => (pinnedDeckIds.includes(a.id) ? -1 : 1));

  for (const deck of prioritizedDecks) {
    if (squads.length >= 5) break;

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
        generalData, originalTacticNames, tactics, selectedTactics, usedTactics, 2
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

      // 병법(art): 대체됐거나, 원본 덱에 arts_of_war 자체가 없는 경우 자동 배정
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

  return squads;
}