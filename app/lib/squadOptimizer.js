<<<<<<< HEAD
// app/lib/squadOptimizer.js
// 인연 발동 + 실제 역할 데이터(roleInference) + 전법 궁합을 고려한 "강한 덱" 자동 편성 로직
//
// [변경사항 요약]
// - deckEngineData(네이버 카페 분석 자료: 장수 역할지수 + 장수간 Connection)를 추가로 import
// - scoreSynergyForTrio: 기존 SYNERGY_MASTER 매칭 점수 + Connection 기반 점수를 합산하도록 확장
// - scoreRoleBalance: 기존 inferGeneralRole 기반 그룹 다양성 보너스 + deckEngineData 매크로 역할
//   (공격/지원/제어) 다양성 보너스를 추가 (기존 로직은 그대로 두고 더하기만 함)
// - 나머지 함수(전법 매칭, 진형 선택 등)는 원본 그대로 유지

import { SYNERGY_MASTER, FORMATIONS_MASTER } from '../../data/synergies';
import { inferGeneralRole, inferTacticRole } from '../../data/roleInference';
import { COMMON_ARTS_MASTER } from '../../data/commonArts';
import deckEngineData from '../../data/deckEngineData.json'; // ← 신규: 카페 분석 자료
import { parseTierScore } from './tierSquadMatcher'; // tier_name("T1", "T1+", "T2-" 등) 파싱용 - 빈도 가중치에 재사용

// ─────────────────────────────────────────────────────────────
// [신규] deckEngineData 기반 lookup 테이블 (모듈 로드 시 1회만 계산)
// ─────────────────────────────────────────────────────────────
=======
import { SYNERGY_MASTER, FORMATIONS_MASTER } from '../../data/synergies';
import { inferGeneralRole } from '../../data/roleInference';
import { COMMON_ARTS_MASTER } from '../../data/commonArts';
import deckEngineData from '../../data/deckEngineData.json';

>>>>>>> d4eb085 (전체 수정)
const MACRO_BY_CATEGORY = {
  attack_carry: '공격',
  support_engine: '지원',
  support_amplifier: '지원',
  support_sustain: '지원',
  control_trigger: '제어',
  control_counter: '제어',
};

<<<<<<< HEAD
// 장수 이름 -> { macro, role_index } (여러 역할 중 role_index가 가장 높은 것을 대표값으로 사용)
const GENERAL_MACRO_MAP = (() => {
  const map = new Map();
  for (const [category, rows] of Object.entries(deckEngineData.roles)) {
=======
const GENERAL_MACRO_MAP = (() => {
  const map = new Map();
  for (const [category, rows] of Object.entries(deckEngineData.roles || {})) {
>>>>>>> d4eb085 (전체 수정)
    for (const r of rows) {
      const cur = map.get(r.general);
      if (!cur || r.role_index > cur.role_index) {
        map.set(r.general, { macro: MACRO_BY_CATEGORY[category], role_index: r.role_index });
      }
    }
  }
  return map;
})();

<<<<<<< HEAD
// 정렬된 이름쌍("A|B") -> 누적 연결점수 (leader/follower 양방향 있으면 합산)
const CONNECTION_SCORE_MAP = (() => {
  const map = new Map();
  const key = (a, b) => [a, b].sort().join('|');
  for (const c of deckEngineData.connections) {
=======
// 카테고리별 Main 랭킹만 모아서, 장수별로 가장 좋은(랭크 낮고 등급 높은) 자리를 채택.
// role_grade(0~5)와 랭크(1이 최고)를 함께 반영한 개별 실력 점수.
const MAIN_RANK_MAP = (() => {
  const map = new Map();
  for (const rows of Object.values(deckEngineData.roles || {})) {
    for (const r of rows) {
      if (r.role_type !== 'Main') continue;
      const value = r.role_grade * 15 * Math.max(0, 1 - (r.rank - 1) / 15);
      const cur = map.get(r.general);
      if (!cur || value > cur.value) {
        map.set(r.general, { rank: r.rank, grade: r.role_grade, category: r.category, value });
      }
    }
  }
  return map;
})();

// 이 함수는 시너지/커넥션과 별개로, "이 장수가 자기 역할군에서 랭크 1위 Main인가"만
// 판단해서 소폭 가산점을 준다. 시너지(40점 단위)보다 확실히 작게 유지.
export function individualRankBonus(generalName) {
  return MAIN_RANK_MAP.get(generalName)?.value || 0;
}

// 자기 역할군에서 랭크 1위 Main인 장수 = "앵커". 1군을 무조건 최강 조합으로
// 만들기 위해, 앵커가 있으면 트리오 탐색에서 우선적으로 소비된다.
const RANK1_ANCHOR_SET = (() => {
  const set = new Set();
  for (const [name, info] of MAIN_RANK_MAP.entries()) {
    if (info.rank === 1) set.add(name);
  }
  return set;
})();

export function isRank1Anchor(generalName) {
  return generalName ? RANK1_ANCHOR_SET.has(generalName) : false;
}

const CONNECTION_SCORE_MAP = (() => {
  const map = new Map();
  const key = (a, b) => [a, b].sort().join('|');
  for (const c of deckEngineData.connections || []) {
>>>>>>> d4eb085 (전체 수정)
    const k = key(c.leader, c.follower);
    map.set(k, (map.get(k) || 0) + c.score);
  }
  return map;
})();

<<<<<<< HEAD
function connectionScoreOf(nameA, nameB) {
  return CONNECTION_SCORE_MAP.get([nameA, nameB].sort().join('|')) || 0;
}

// ─────────────────────────────────────────────────────────────
// [신규] tier_decks 기반 "장수 → 전법" 실사용 빈도 매핑
//
// 아이디어: tier_decks는 사람이 실전 검증한 "이 장수에게 실제로 이 전법을 썼다"는
// 실측 데이터다. inferGeneralRole/inferTacticRole 기반 휴리스틱(scoreTacticForGeneral)보다
// 신뢰도가 높으므로, 전법 배정 시 이걸 먼저 시도하고 안 되면 휴리스틱으로 폴백한다.
//
// 티어 라벨은 별도 컬럼이 아니라 tier_name 문자열 안에 "T1", "T1+", "T2-" 형태로 들어있다
// (tierSquadMatcher.js의 parseTierScore 참고). 여기서도 동일한 파서를 재사용해서
// 높은 티어(T1에 가까울수록) 덱일수록 빈도 가중치를 더 크게 준다.
// ─────────────────────────────────────────────────────────────

/**
 * tier_decks 전체를 스캔해서 "장수 이름 → { 전법이름: 가중합 점수 }" 맵을 만든다.
 * - added_tactics(그 장수가 실제로 낀 전법)뿐 아니라 alt_tactics(대체옵션)도
 *   더 낮은 가중치로 반영해서, "이 장수가 잘 쓰던 전법 풀"을 넓게 잡는다.
 * - 같은 덱 안에서 여러 번 (added + alt) 잡혀도 합산되며, 등장한 덱 수가 많을수록,
 *   티어가 높을수록(parseTierScore 값이 클수록) 점수가 커진다.
 * - parseTierScore가 -1(T 표기 없는 개척덱류)을 반환하는 경우, 음수 가중치가 되지 않도록
 *   최소 가중치(MIN_TIER_WEIGHT)로 클램프한다.
 *
 * 모듈 로드 시 한 번이 아니라 tierDecks를 인자로 받아 호출 시점에 계산한다(데이터가 매 요청
 * 바뀌지 않는다면, 호출부에서 결과를 캐싱해서 재사용하는 걸 권장 — buildTacticFrequencyMap은
 * 순수 함수라 캐싱하기 쉽다).
 *
 * @param {Array} tierDecks
 * @param {Object} [options]
 * @param {number} [options.altWeight=0.4] alt_tactics(대체옵션)에 적용할 가중치 배율
 * @param {number} [options.minCount=1] 최종 후보로 인정할 최소 누적 점수(노이즈 컷)
 * @returns {Map<string, Map<string, number>>} 장수명 -> (전법명 -> 누적점수) 맵
 */
const MIN_TIER_WEIGHT = 0.5; // T 표기 없는 개척덱류(parseTierScore === -1)의 최소 가중치

=======
export function connectionScoreOf(nameA, nameB) {
  if (!nameA || !nameB) return 0;
  return CONNECTION_SCORE_MAP.get([nameA, nameB].sort().join('|')) || 0;
}

// 원본 장수(nameA)와 대체 후보(nameB)가 같은 역할 매크로(공격/지원/제어)에
// 속하면 소폭의 보조 가산점을 준다. 시너지·커넥션보다 확실히 작게 유지.
export function roleMacroBonus(nameA, nameB) {
  const a = GENERAL_MACRO_MAP.get(nameA)?.macro;
  const b = GENERAL_MACRO_MAP.get(nameB)?.macro;
  if (!a || !b) return 0;
  return a === b ? 12 : 0;
}

// 등급(T0/T1 등) 개념이 없어져서 모든 덱을 동일 가중치(1)로 집계한다.
// tactics: [{ main, sub: [] }, { main, sub: [] }] 슬롯별 구조를 기준으로,
// main은 그대로, sub는 낮은 가중치(altWeight)로 빈도에 반영한다.
>>>>>>> d4eb085 (전체 수정)
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
<<<<<<< HEAD
    const rawScore = parseTierScore(deck.tier_name || '');
    const weight = Math.max(rawScore, MIN_TIER_WEIGHT);

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

  // 노이즈 컷: minCount 미만인 항목 제거
=======
    for (const gSetup of deck.deck_setup || []) {
      const name = gSetup.general_name?.trim();
      if (!name) continue;
      for (const slot of gSetup.tactics || []) {
        if (slot?.main) bump(name, slot.main, 1);
        (slot?.sub || []).forEach(t => t && bump(name, t, altWeight));
      }
    }
  }

>>>>>>> d4eb085 (전체 수정)
  if (minCount > 0) {
    for (const inner of map.values()) {
      for (const [tacticName, score] of inner) {
        if (score < minCount) inner.delete(tacticName);
      }
    }
  }
<<<<<<< HEAD

  return map;
}

/**
 * 특정 장수에 대해, 빈도 맵 기준으로 "가장 많이 같이 쓰인 전법" 순으로 정렬된
 * 후보 이름 배열을 반환한다. (보유 여부/중복 사용 여부는 호출부에서 필터링)
 */
=======
  return map;
}

>>>>>>> d4eb085 (전체 수정)
export function getTopTacticsByFrequency(generalName, tacticFrequencyMap) {
  const inner = tacticFrequencyMap?.get(generalName);
  if (!inner || inner.size === 0) return [];
  return [...inner.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tacticName]) => tacticName);
}

<<<<<<< HEAD
// 원본 SYNERGY_MASTER 점수(대략 0~180 스케일)와 스케일을 맞추기 위한 가중치.
// deck_engine_data의 연결점수는 쌍당 -5~5 수준이라 그대로 더하면 존재감이 없어서 곱해준다.
// 값이 과하다 싶으면 이 상수만 낮추면 됨.
const CONNECTION_WEIGHT = 8;

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
export function primaryGroup(general) {
  const roles = inferGeneralRole(general);
  if (roles.includes('힐러')) return 'support';
  if (roles.includes('버퍼') || roles.includes('디버퍼')) return 'support';
=======
const CONNECTION_WEIGHT = 6;

function powerScore(g) {
  return (g?.strength || 0) + (g?.intelligence || 0) + (g?.command || 0) + (g?.initiative || 0);
}

export function primaryGroup(general) {
  const roles = inferGeneralRole(general);
  if (roles.includes('힐러') || roles.includes('버퍼')) return 'support';
>>>>>>> d4eb085 (전체 수정)
  if (roles.includes('탱커')) return 'tank';
  if (roles.includes('책략딜')) return 'strategist';
  if (roles.includes('병기딜')) return 'warrior';
  return 'vanguard';
}

<<<<<<< HEAD
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
//    [변경] deckEngineData의 Connection 점수를 추가로 합산
// ---------------------------------------------------------------
=======
>>>>>>> d4eb085 (전체 수정)
function scoreSynergyForTrio(trioNames) {
  let score = 0;
  let activeSynergies = [];

<<<<<<< HEAD
  // 기존: 수동 등록된 SYNERGY_MASTER 매칭
=======
>>>>>>> d4eb085 (전체 수정)
  for (const syn of SYNERGY_MASTER) {
    const matched = syn.members.filter(m => trioNames.includes(m)).length;
    if (matched >= syn.req && matched > 0) {
      const ratio = matched / syn.members.length;
      score += 40 + ratio * 60;
      activeSynergies.push(syn.name);
    }
  }

<<<<<<< HEAD
  // [신규] 카페 분석 자료 기반 Connection 점수 (3개 쌍 전부 확인)
  const [a, b, c] = trioNames;
  const connectionRaw =
    connectionScoreOf(a, b) + connectionScoreOf(b, c) + connectionScoreOf(a, c);
=======
  const [a, b, c] = trioNames;
  const connectionRaw = connectionScoreOf(a, b) + connectionScoreOf(b, c) + connectionScoreOf(a, c);
>>>>>>> d4eb085 (전체 수정)
  if (connectionRaw !== 0) {
    score += connectionRaw * CONNECTION_WEIGHT;
    activeSynergies.push(`Connection(${connectionRaw})`);
  }

  return { score, activeSynergies };
}

function scoreRoleBalance(trio) {
  const groups = trio.map(primaryGroup);
  const uniqueGroups = new Set(groups).size;
  let bonus = uniqueGroups * 8;
  if (groups.includes('support')) bonus += 10;
  if (groups.includes('tank')) bonus += 6;

<<<<<<< HEAD
  // [신규] deckEngineData 매크로 역할(공격/지원/제어) 다양성 보너스 - 기존 보너스에 소량 가산
=======
>>>>>>> d4eb085 (전체 수정)
  const macros = trio.map(g => GENERAL_MACRO_MAP.get(g.name)?.macro).filter(Boolean);
  const distinctMacros = new Set(macros).size;
  if (distinctMacros === 3) bonus += 6;
  else if (distinctMacros === 2) bonus += 2;
<<<<<<< HEAD
  else if (macros.length === 3) bonus -= 4; // 셋 다 같은 매크로 역할이면 소폭 감점
=======
>>>>>>> d4eb085 (전체 수정)

  return bonus;
}

function scoreTrio(trio) {
  const trioNames = trio.map(g => g.name);
  const { score: synScore, activeSynergies } = scoreSynergyForTrio(trioNames);
  const roleScore = scoreRoleBalance(trio);
  const totalPower = trio.reduce((sum, g) => sum + powerScore(g), 0);
<<<<<<< HEAD

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
=======
  const rankBonus = trioNames.reduce((sum, n) => sum + individualRankBonus(n), 0);

  const total = synScore * 10 + roleScore * 3 + totalPower * 0.05 + rankBonus;
  return { trio, total, synScore, roleScore, totalPower, rankBonus, activeSynergies };
}

function findBestTrioOptimized(pool, maxCandidates = 35) {
  if (pool.length < 3) return null;

  console.log(`[TrioOptimizer] 후보 풀 크기: ${pool.length} → 상위 ${maxCandidates}개로 제한`);

  const sortedPool = [...pool]
    .sort((a, b) => powerScore(b) - powerScore(a))
    .slice(0, maxCandidates);

  let best = null;
  let bestScore = -Infinity;

  for (let i = 0; i < sortedPool.length - 2; i++) {
    for (let j = i + 1; j < sortedPool.length - 1; j++) {
      const partial = [sortedPool[i], sortedPool[j]];
      const partialScore = scoreTrio(partial).total;

      if (best && partialScore * 0.6 < bestScore) continue;

      for (let k = j + 1; k < sortedPool.length; k++) {
        const trio = [sortedPool[i], sortedPool[j], sortedPool[k]];
        const scored = scoreTrio(trio);

        if (scored.total > bestScore) {
          bestScore = scored.total;
          best = scored;
        }
      }
    }
  }

  console.log(`[TrioOptimizer] 최고 점수: ${bestScore.toFixed(1)}`);
  return best;
}

// required로 지정된 장수(1~2명)를 무조건 포함시키고, 나머지 자리는 전체 풀에서
// 최고 파트너를 탐색한다. 앵커가 1~2명만 남았을 때 사용.
export function findBestTrioWithRequired(pool, requiredNames, maxCandidates = 40) {
  const required = pool.filter(g => requiredNames.includes(g.name?.trim()));
  const rest = pool.filter(g => !requiredNames.includes(g.name?.trim()));
  const need = 3 - required.length;

  if (need <= 0) {
    return scoreTrio(required.slice(0, 3));
  }

  const sortedRest = [...rest]
    .sort((a, b) => powerScore(b) - powerScore(a))
    .slice(0, maxCandidates);

  let best = null;
  let bestScore = -Infinity;

  if (need === 1) {
    for (const cand of sortedRest) {
      const scored = scoreTrio([...required, cand]);
      if (scored.total > bestScore) {
        bestScore = scored.total;
        best = scored;
      }
    }
  } else {
    for (let i = 0; i < sortedRest.length - 1; i++) {
      for (let j = i + 1; j < sortedRest.length; j++) {
        const scored = scoreTrio([...required, sortedRest[i], sortedRest[j]]);
        if (scored.total > bestScore) {
          bestScore = scored.total;
          best = scored;
        }
      }
    }
  }

  return best;
}

export function pickFormationForTrio(trio) {
  const groups = trio.map(primaryGroup);
  const frontLike = groups.filter(r => ['warrior', 'tank', 'vanguard'].includes(r)).length;
  const backLike = groups.filter(r => ['strategist', 'support'].includes(r)).length;

  let formationName = '기형진';
  if (frontLike >= 2 && backLike >= 1) formationName = '안형진';
  else if (backLike >= 2 && frontLike >= 1) formationName = '추형진';
  else if (frontLike >= 2) formationName = '일자진';
  else if (backLike >= 2) formationName = '어린진';
>>>>>>> d4eb085 (전체 수정)

  return FORMATIONS_MASTER.find(f => f.name === formationName) || FORMATIONS_MASTER[0];
}

<<<<<<< HEAD
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

  if (gPhys && tMagic && !tPhys) score -= 100;
  if (gMagic && tPhys && !tMagic) score -= 100;

  if (gPhys && tPhys) score += 50;
  if (gMagic && tMagic) score += 50;
  if (gHeal && tHeal) score += 60;
  if (gBuff && tBuff) score += 45;
  if (gDebuff && tDebuff) score += 45;
  if (gTank && tDefense) score += 45;

  ['추격형', '액티브형'].forEach(tag => {
    if (gRoles.includes(tag) && tRoles.includes(tag)) score += 10;
  });

  return score;
}

/**
 * 장수 하나에게 배정할 전법을 고른다. 우선순위:
 *  1. (호출부에서 이미 처리) 이 덱 고유의 원래 추천 전법 — resolveGlobalTactics의 original[i]
 *  2. [신규] tacticFrequencyMap 기반, 이 장수에게 실전에서 가장 많이 쓰인 전법 (보유 & 미사용인 것 중 1순위)
 *  3. 기존 역할 휴리스틱(scoreTacticForGeneral) — 1,2 둘 다 실패했을 때만 (신규/희귀 장수 등)
 *
 * @param {Object} general
 * @param {Array} ownedTactics
 * @param {Set<string>} usedTacticNames
 * @param {Map<string, Map<string, number>>} [tacticFrequencyMap] buildTacticFrequencyMap() 결과. 없으면 2단계는 건너뜀.
 */
export function pickBestTacticForGeneral(general, ownedTactics, usedTacticNames, tacticFrequencyMap) {
  const ownedByName = new Map(ownedTactics.map(t => [t.name, t]));

  // 2단계: 빈도 데이터 기반 우선 시도
  if (tacticFrequencyMap) {
    const rankedNames = getTopTacticsByFrequency(general.name, tacticFrequencyMap);
    for (const name of rankedNames) {
      if (usedTacticNames.has(name)) continue;
      const owned = ownedByName.get(name);
      if (owned) return owned;
    }
  }

  // 3단계: 기존 역할 휴리스틱 폴백
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
//    전법을 최종 확정한다.
// ---------------------------------------------------------------
export function resolveGlobalTactics(squads, ownedTactics, generals, tacticFrequencyMap) {
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

        const alt = general ? pickBestTacticForGeneral(general, ownedTactics, used, tacticFrequencyMap) : null;
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

// ---------------------------------------------------------------
// 8. [신규] deckEngineData 커버리지 체크 유틸
//    보유 장수 중 카페 분석 자료(주로 골드 장수 위주)에 없는 이름을 뽑아준다.
//    - 콘솔 디버깅용 또는 UI에 "이 장수는 연결 데이터가 부족합니다" 표시할 때 사용.
// ---------------------------------------------------------------
=======
// 1-5군 편성의 핵심 진입점. 매 호출마다(=매 군마다) 남은 풀에서:
//  - 남은 랭크1 앵커 중 개별 점수가 가장 높은 1명만 필수로 삼고,
//    나머지 2자리는 앵커 여부와 상관없이 전체 풀에서 최고 조합을 탐색한다.
//  - 앵커가 없으면 기존처럼 전체 풀에서 탐색한다.
//
// (이전에는 앵커가 3명 이상이면 앵커들끼리만 격리해서 조합을 찾았는데,
//  그러면 장비-황충처럼 커넥션 점수가 제일 높은 비앵커 페어가 애초에
//  후보에서 배제되는 문제가 있었다. 앵커 1명만 강제하고 나머지는 열어두면
//  "1군에 최상위 특화 장수가 반드시 낀다"는 보장은 유지하면서도,
//  진짜 강한 페어가 있으면 그쪽이 이기도록 계산이 스스로 판단한다.)
export function findBestSynergyTrio(remainingPool) {
  const anchors = remainingPool.filter(g => isRank1Anchor(g.name?.trim()));

  if (anchors.length > 0) {
    const topAnchor = [...anchors].sort((a, b) =>
      individualRankBonus(b.name.trim()) - individualRankBonus(a.name.trim())
    )[0];
    const withAnchor = findBestTrioWithRequired(remainingPool, [topAnchor.name.trim()]);
    if (withAnchor) return withAnchor;
  }

  return findBestTrioOptimized(remainingPool, 35);
}

export function recommendArtsAndEquipment(general) {
  const roles = inferGeneralRole(general);
  let category = 'attack_power_pursuit';
  let stats = ['무력', '통솔'];

  if (roles.includes('힐러') || roles.includes('버퍼')) {
    category = 'healing_support';
    stats = ['지력', '통솔'];
  } else if (roles.includes('책략딜')) {
    category = 'magic_strategy';
    stats = ['지력', '통솔'];
  } else if (roles.includes('탱커')) {
    category = 'defense_survival';
    stats = ['통솔', '무력'];
  }

  const pool = COMMON_ARTS_MASTER[category] || [];
  return {
    artsOfWar: {
      unique: general.unique_tactic_name || '고유 병법',
      common: pool.slice(0, 2).map(a => a.name)
    },
    equipmentOptions: stats
  };
}

>>>>>>> d4eb085 (전체 수정)
export function checkDeckEngineCoverage(ownedGeneralNames) {
  const covered = [];
  const missing = [];
  for (const name of ownedGeneralNames) {
    if (GENERAL_MACRO_MAP.has(name)) covered.push(name);
    else missing.push(name);
  }
  return { covered, missing };
<<<<<<< HEAD
=======
}

// ⚠️ 미사용 추정 함수 — squadEngine.js는 이 두 함수를 import하지 않고
// 자체 buildOptimalSquads를 따로 갖고 있음. 다른 파일에서 여기서 가져다
// 쓰는 곳이 없는지 확인 후 삭제 검토 필요.
export function buildOptimalSquads(remainingGenerals, startSquadNum, endSquadNum, usedGeneralNames) {
  console.log('[buildOptimalSquads] 호출됨 - remainingGenerals:', remainingGenerals.length);
  return [];
}

export function resolveGlobalTactics(squads, ownedTactics, generals, tacticFrequencyMap) {
  console.log('[resolveGlobalTactics] 호출됨');
  return squads;
>>>>>>> d4eb085 (전체 수정)
}