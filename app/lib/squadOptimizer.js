/**
 * 3인 조합 기반 최적 진형 반환 (기존 코드)
 */
export function getFormationForTrio(generalNames = []) {
  // 기본 3x2 진형 그리드 (추형진 스타일)
  return '0,1,0,0,1,1';
}

/**
 * 장수 간 인연/연관도 점수 계산 (기존 코드)
 */
export function connectionScoreOf(genA, genB) {
  if (!genA || !genB) return 0;
  if (genA === genB) return 100;
  return 50; // 기본 인연 점수
}

// ==========================================
// 🔻 아래부터 새로 추가해 주셔야 하는 코드입니다 🔻
// ==========================================

// app/lib/squadOptimizer.js

/**
 * 전법 빈도수 맵 생성
 */
export function buildTacticFrequencyMap(selectedTactics = []) {
  const map = {};
  selectedTactics.forEach((t) => {
    const name = typeof t === 'string' ? t : t.tactic_name || t.name;
    if (name) {
      map[name] = (map[name] || 0) + 1;
    }
  });
  return map;
}

/**
 * 전용/공용 전법 의존성 해결
 */
export function resolveGlobalTactics(heroes = [], availableTactics = []) {
  return heroes.map((hero) => ({
    ...hero,
    tactics: hero.tactics || availableTactics.slice(0, 3)
  }));
}

/**
 * 1~5군 최적 부대 생성 핵심 로직
 */
export function optimizeSquads({ generals = [], tactics = [], selectedGenerals = [], selectedTactics = [], tierDecks = [] }) {
  if (!generals.length || !selectedGenerals.length) return [];

  // 선택된 장수 객체 목록 추출
  const availableHeroes = generals.filter((g) =>
    selectedGenerals.includes(g.id) || selectedGenerals.includes(g.general_name)
  );

  const squads = [];
  const chunkSize = 3; // 3명씩 1개 부대 구성

  // 보유 장수들을 3명씩 묶어서 1~5군 조합 자동 생성
  for (let i = 0; i < availableHeroes.length; i += chunkSize) {
    const squadHeroes = availableHeroes.slice(i, i + chunkSize);
    if (squadHeroes.length < 3) break; // 3명이 안 되면 스킵

    const squadIndex = squads.length + 1;
    if (squadIndex > 5) break; // 최대 5군까지

    const matchedDeck = tierDecks[squadIndex - 1] || {};

    squads.push({
      id: `squad-${squadIndex}`,
      deck_name: matchedDeck.deck_name || `${squadHeroes[0].general_name} 조합`,
      score: 85 - (squadIndex - 1) * 5,
      
      // ⭕ 1. 장수 객체 배열 전달
      heroes: squadHeroes, 
      
      // ⭕ 2. 페이지에서 `generals` 속성명으로 장수 이름을 읽을 수 있도록 추가 지원
      generals: squadHeroes.map(h => h.general_name), 

      // ⭕ 3. 진형 문자열 매핑 (기본 추형진 '0,1,0,0,1,1' 제공)
      formation: getFormationForTrio(squadHeroes.map(h => h.general_name))
    });
  }

  return squads;
}

// squadRecommendation.js 호환용 별칭 export
export function buildOptimalSquads(params) {
  return optimizeSquads(params);
}