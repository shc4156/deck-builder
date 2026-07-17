// app/lib/squadOptimizer.js
// 인연 발동 + 실제 역할 데이터(roleInference) + 전법 궁합을 고려한 "강한 덱" 자동 편성 로직

import { SYNERGY_MASTER, FORMATIONS_MASTER } from '../../data/synergies';
import { inferGeneralRole, inferTacticRole } from '../../data/roleInference';
import { COMMON_ARTS_MASTER } from '../../data/commonArts';


const generateStrategicSquads = (tierDecks, myGensData, myTactData, pinnedDeckIds) => {
  const usedGenerals = new Set();
  const squads = [];

  // 1. 고정된 덱을 먼저 찾아 배정 (Priority: 핀 된 덱 > 일반 티어덱)
  const pinnedDecks = tierDecks.filter(d => pinnedDeckIds.includes(d.id));
  const remainingDecks = tierDecks.filter(d => !pinnedDeckIds.includes(d.id));
  const prioritizedDecks = [...pinnedDecks, ...remainingDecks];

  for (const deck of prioritizedDecks) {
    if (squads.length >= 5) break;

    const canUse = deck.deck_setup.every(g => !usedGenerals.has(g.general_name.trim()));
    
    if (canUse) {
      deck.deck_setup.forEach(g => usedGenerals.add(g.general_name.trim()));
      
      // ... (기존 전법/병법 자동 할당 및 객체 생성 로직) ...
      
      squads.push({ ...deck, squadNumber: squads.length + 1 });
    }
  }
  return squads;
};

// 역할에 따라 범용 병법 카테고리 + 추천 장비 스탯을 결정
function recommendCategoryAndStats(general) {
  const roles = inferGeneralRole(general);

  if (roles.includes('힐러') || roles.includes('버퍼')) {
    return { category: 'healing_support', stats: ['지력', '통솔'] };
  }
  if (roles.includes('책략딜')) {
    return { category: 'magic_strategy', stats: ['지력', '통솔'] };
  }
  if (roles.includes('탱커') || roles.includes('디버퍼')) {
    return { category: 'defense_survival', stats: ['통솔', '무력'] };
  }
  if (roles.includes('추격형')) {
    return { category: 'attack_power_pursuit', stats: ['무력', '선공'] };
  }
  if (roles.includes('병기딜')) {
    return { category: 'critical_pierce', stats: ['무력', '선공'] };
  }
  return { category: 'attack_power_pursuit', stats: ['무력', '통솔'] };
}

export function recommendArtsAndEquipment(general) {
  const { category, stats } = recommendCategoryAndStats(general);
  const pool = COMMON_ARTS_MASTER[category] || [];

  return {
    artsOfWar: {
      unique: general.unique_tactic_name || '고유 병법 정보 없음',
      common: pool.slice(0, 2).map(a => a.name)
    },
    equipmentOptions: stats
  };
}

// ---------------------------------------------------------------
// 0. 유틸: 스탯 접근 (타이브레이커용 - 역할 자체는 더 이상 스탯으로 추측하지 않음)
// ---------------------------------------------------------------
function getStat(g, key) {
  return g?.stats?.[key] ?? g?.[key] ?? 0;
}

function powerScore(g) {
  return getStat(g, 'strength') + getStat(g, 'intelligence') + getStat(g, 'command') + getStat(g, 'initiative');
}

// ---------------------------------------------------------------
// 1. 장수 역할 그룹핑 (진형/밸런스 계산용 - inferGeneralRole 결과를 그대로 신뢰)
// ---------------------------------------------------------------
// inferGeneralRole은 ['병기딜','책략딜','힐러','버퍼','디버퍼','탱커','추격형','액티브형'] 등을 반환.
// 진형/밸런스 판단에는 이 중 대표 성향 하나로 묶어서 사용한다.
export function primaryGroup(general) {
  const roles = inferGeneralRole(general);
  if (roles.includes('힐러')) return 'support';
  if (roles.includes('버퍼') || roles.includes('디버퍼')) return 'support';
  if (roles.includes('탱커')) return 'tank';
  if (roles.includes('책략딜')) return 'strategist';
  if (roles.includes('병기딜')) return 'warrior';
  return 'vanguard';
}

// ---------------------------------------------------------------
// 2. 트리오(3인조) 조합 생성기
// ---------------------------------------------------------------
function* combinations3(pool) {
  const n = pool.length;
  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        yield [pool[i], pool[j], pool[k]];
      }
    }
  }
}

// ---------------------------------------------------------------
// 3. 트리오 점수 계산 (인연 > 역할 밸런스 > 스탯 총합)
// ---------------------------------------------------------------
function scoreSynergyForTrio(trioNames) {
  let score = 0;
  let activeSynergies = [];

  for (const syn of SYNERGY_MASTER) {
    const matched = syn.members.filter(m => trioNames.includes(m)).length;
    if (matched >= syn.req && matched > 0) {
      const ratio = matched / syn.members.length;
      score += 40 + ratio * 60;
      activeSynergies.push(syn.name);
    }
  }
  return { score, activeSynergies };
}

function scoreRoleBalance(trio) {
  const groups = trio.map(primaryGroup);
  const uniqueGroups = new Set(groups).size;
  let bonus = uniqueGroups * 8;
  if (groups.includes('support')) bonus += 10;
  if (groups.includes('tank')) bonus += 6;
  return bonus;
}

function scoreTrio(trio) {
  const trioNames = trio.map(g => g.name);
  const { score: synScore, activeSynergies } = scoreSynergyForTrio(trioNames);
  const roleScore = scoreRoleBalance(trio);
  const totalPower = trio.reduce((sum, g) => sum + powerScore(g), 0);

  const total = synScore * 10 + roleScore * 3 + totalPower * 0.05;

  return { trio, total, synScore, roleScore, totalPower, activeSynergies };
}

// ---------------------------------------------------------------
// 4. 역할 구성에 맞는 진형 자동 선택
// ---------------------------------------------------------------
export function pickFormationForTrio(trio) {
  const groups = trio.map(primaryGroup);
  const frontLike = groups.filter(r => r === 'warrior' || r === 'tank' || r === 'vanguard').length;
  const backLike = groups.filter(r => r === 'strategist' || r === 'support').length;

  let formationName;
  if (frontLike >= 2 && backLike === 0) {
    formationName = '일자진';
  } else if (backLike >= 2 && frontLike === 0) {
    formationName = '어린진';
  } else if (frontLike >= 2 && backLike >= 1) {
    formationName = '안형진';
  } else if (backLike >= 2 && frontLike >= 1) {
    formationName = '추형진';
  } else {
    formationName = '기형진';
  }

  return FORMATIONS_MASTER.find(f => f.name === formationName) || FORMATIONS_MASTER[0];
}

// ---------------------------------------------------------------
// 5. 장수 하나에 대해 특정 전법의 궁합 점수를 매긴다 (실제 trait/type 컬럼 기반)
// ---------------------------------------------------------------
function scoreTacticForGeneral(tactic, general) {
  const gRoles = inferGeneralRole(general);
  const tRoles = inferTacticRole(tactic);

  const gPhys = gRoles.includes('병기딜');
  const gMagic = gRoles.includes('책략딜');
  const gHeal = gRoles.includes('힐러');
  const gBuff = gRoles.includes('버퍼');
  const gDebuff = gRoles.includes('디버퍼');
  const gTank = gRoles.includes('탱커');

  const tPhys = tRoles.includes('병기딜');
  const tMagic = tRoles.includes('책략딜');
  const tHeal = tRoles.includes('힐');
  const tBuff = tRoles.includes('버퍼');
  const tDebuff = tRoles.includes('디버퍼');
  const tDefense = tRoles.includes('방어');

  let score = 0;

  // 명백한 상성 불일치는 큰 감점 (물리 딜러에게 순수 책략 전법 등)
  if (gPhys && tMagic && !tPhys) score -= 100;
  if (gMagic && tPhys && !tMagic) score -= 100;

  // 역할 일치 가점
  if (gPhys && tPhys) score += 50;
  if (gMagic && tMagic) score += 50;
  if (gHeal && tHeal) score += 60;
  if (gBuff && tBuff) score += 45;
  if (gDebuff && tDebuff) score += 45;
  if (gTank && tDefense) score += 45;

  // 발동 방식(추격형/액티브형) 일치 가점
  ['추격형', '액티브형'].forEach(tag => {
    if (gRoles.includes(tag) && tRoles.includes(tag)) score += 10;
  });

  return score;
}

/**
 * 특정 장수에게 아직 안 쓰인 보유 전법 중 가장 궁합 좋은 것을 고른다.
 * @param {Object} general
 * @param {Array} ownedTactics - 유저가 보유한 tactics row 전체
 * @param {Set} usedTacticNames - 이미 다른 슬롯에서 확정된 전법 이름 (전역 중복 방지)
 */
export function pickBestTacticForGeneral(general, ownedTactics, usedTacticNames) {
  let best = null;
  for (const t of ownedTactics) {
    if (usedTacticNames.has(t.name)) continue;
    const score = scoreTacticForGeneral(t, general);
    if (!best || score > best.score) best = { tactic: t, score };
  }
  return best ? best.tactic : null;
}

// ---------------------------------------------------------------
// 6. 전체 편성(티어덱 기반 + AI 기반) 확정 후, 1~5군을 순서대로 훑으며
//    전법을 최종 확정한다: 원래 추천 전법이 있고 보유 & 미사용이면 그대로,
//    아니면 role 궁합이 가장 좋은 미사용 보유 전법으로 대체.
//    -> 이 함수가 끝나면 모든 군의 전법이 서로 절대 겹치지 않는다.
// ---------------------------------------------------------------
export function resolveGlobalTactics(squads, ownedTactics, generals) {
  const used = new Set();
  const ownedNameSet = new Set(ownedTactics.map(t => t.name));

  squads.forEach(squad => {
    squad.deck_setup.forEach(gSetup => {
      const general = generals.find(g => g.name === gSetup.general_name);
      const original = gSetup.added_tactics || [];
      const resolvedNames = [];
      const substituteFlags = [];

      for (let i = 0; i < 2; i++) {
        const candidate = original[i];

        if (candidate && candidate !== '미장착' && ownedNameSet.has(candidate) && !used.has(candidate)) {
          resolvedNames.push(candidate);
          substituteFlags.push(false);
          used.add(candidate);
          continue;
        }

        const alt = general ? pickBestTacticForGeneral(general, ownedTactics, used) : null;
        if (alt) {
          resolvedNames.push(alt.name);
          substituteFlags.push(true);
          used.add(alt.name);
        } else {
          resolvedNames.push('미장착');
          substituteFlags.push(false);
        }
      }

      gSetup.added_tactics = resolvedNames;
      gSetup.isSubstitute = substituteFlags;
    });
  });

  return squads;
}

// ---------------------------------------------------------------
// 7. 메인: 남은 보유 장수 풀에서 5군(또는 남은 슬롯 수)까지 최적 편성
//    (전법은 여기서 채우지 않고 자리만 비워둔 채로 resolveGlobalTactics에서 최종 확정)
// ---------------------------------------------------------------
export function buildOptimalSquads(remainingGenerals, startSquadNum, endSquadNum, usedGeneralNames) {
  const squads = [];
  let pool = remainingGenerals.filter(g => !usedGeneralNames.has(g.name.trim()));

  for (let squadNum = startSquadNum; squadNum <= endSquadNum; squadNum++) {
    if (pool.length < 3) break;

    let best = null;
    for (const trio of combinations3(pool)) {
      const scored = scoreTrio(trio);
      if (!best || scored.total > best.total) {
        best = scored;
      }
    }

    if (!best) break;

    const formation = pickFormationForTrio(best.trio);

    squads.push({
      id: `optimized-${squadNum}`,
      tier_name: best.activeSynergies.length > 0
        ? `제 ${squadNum} 정예군단 (${best.activeSynergies[0]} 발동)`
        : `제 ${squadNum} 정예군단 (자동 최적화)`,
      matchPercent: null,
      formation_grid: formation.grid,
      squadNum,
      deck_setup: best.trio.map(g => {
  const { artsOfWar, equipmentOptions } = recommendArtsAndEquipment(g);
  return {
    general_name: g.name,
    added_tactics: [null, null],
    arts_of_war: artsOfWar,
    stat_focus: inferGeneralRole(g).join(' / '),
    equipment_options: equipmentOptions
  };
}),
      _debug: { synScore: best.synScore, roleScore: best.roleScore, totalPower: best.totalPower }
    });

    best.trio.forEach(g => {
      pool = pool.filter(p => p.name !== g.name);
      usedGeneralNames.add(g.name.trim());
    });
  }

  return squads;
}

