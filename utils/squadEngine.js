import { SYNERGY_MASTER } from '../data/synergies';
import { COMMON_ARTS_OF_WAR, getArtsCategoryForGeneral } from '../data/artsOfWar';
import { findAlternativeTactics } from '../data/tacticAlternatives';
import { getFallbackTacticsForGeneral } from './tacticFallback';

/**
 * 1-5군 자동 추천 메인 엔진
 */
export function buildOptimalSquads({
  tierDecks,
  generals,
  tactics,
  myGenNames,
  myTactNames,
  pinnedGeneralNames = [],
  selectedTactics = []
}) {
  if (!tierDecks || tierDecks.length === 0) return [];

  // 사용 가능한 장수 및 전법 자원 복사
  let availableGenerals = [...myGenNames];
  let availableTactics = [...myTactNames];

  const resultSquads = [];

  // 1. 고정 장수가 포함된 티어덱 우선 매칭
  // 2. 보유한 자원 기준으로 최적의 1~5군 순차 생성
  let squadCounter = 1;

  for (const deck of tierDecks) {
    if (squadCounter > 5) break;

    const setup = deck.deck_setup || [];
    const requiredGenNames = setup.map(s => s.general_name.trim());

    // 매칭 여부 체크 (최소 2명 이상 보유 시 고려)
    const matchedCount = requiredGenNames.filter(name => availableGenerals.includes(name)).length;

    if (matchedCount >= 2) {
      // 덱 완성 후 차용된 자원 차감
      requiredGenNames.forEach(name => {
        const idx = availableGenerals.indexOf(name);
        if (idx !== -1) availableGenerals.splice(idx, 1);
      });

      resultSquads.push({
        ...deck,
        squadNum: squadCounter++
      });
    }
  }

  return resultSquads;
}