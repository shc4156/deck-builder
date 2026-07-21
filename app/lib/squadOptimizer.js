// app/lib/squadOptimizer.js
// [임시 스텁] 빌드 에러 해결을 위해 로직을 임시로 단순화해 둔 상태입니다.
// 나중에 자동 추천 로직을 재구현할 때 이 파일을 다시 업데이트해 주세요.

import { SYNERGY_MASTER, FORMATIONS_MASTER } from '../../data/synergies';
import { inferGeneralRole } from '../../data/roleInference';
import { COMMON_ARTS_MASTER } from '../../data/commonArts';

export function individualRankBonus(generalName) {
  return 0;
}

export function isRank1Anchor(generalName) {
  return false;
}

export function connectionScoreOf(nameA, nameB) {
  return 0;
}

export function roleMacroBonus(nameA, nameB) {
  return 0;
}

export function buildTacticFrequencyMap(tierDecks, options = {}) {
  return new Map();
}

export function getTopTacticsByFrequency(generalName, tacticFrequencyMap) {
  return [];
}

export function pickBestTacticForGeneral(general, ownedTactics, usedTacticNames, tacticFrequencyMap) {
  return null;
}

export function resolveGlobalTactics(squads, ownedTactics, generals, tacticFrequencyMap) {
  return squads;
}

export function recommendArtsAndEquipment(general) {
  return {
    artsOfWar: {
      unique: general?.unique_tactic_name || '고유 병법',
      common: []
    },
    equipmentOptions: ['무력', '통솔']
  };
}

export function primaryGroup(general) {
  const roles = inferGeneralRole(general);
  if (roles.includes('힐러') || roles.includes('버퍼')) return 'support';
  if (roles.includes('탱커')) return 'tank';
  if (roles.includes('책략딜')) return 'strategist';
  if (roles.includes('병기딜')) return 'warrior';
  return 'vanguard';
}

export function pickFormationForTrio(trio) {
  return FORMATIONS_MASTER[0];
}

export function findBestTrioWithRequired(pool, requiredNames, maxCandidates = 40) {
  return null;
}

export function findBestSynergyTrio(remainingPool) {
  return null;
}

export function buildOptimalSquads(remainingGenerals, startSquadNum, endSquadNum, usedGeneralNames) {
  return [];
}

export function checkDeckEngineCoverage(ownedGeneralNames) {
  return { covered: [], missing: [] };
}