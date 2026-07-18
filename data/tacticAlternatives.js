// data/tacticAlternatives.js
//
// 원본(티어덱 추천) 전법을 미보유일 때, 보유 전법 중 가장 궁합 좋은 대체 전법을 찾는 로직.
// 원래 app/matches/page.js 안에 findAlternativeTactics로 로컬 정의돼 있었는데,
// 1-5군 자동편성(utils/squadEngine.js)이 서로 다른 로직(findBestTactics)으로 대체 전법을
// 고르는 바람에 "매칭 페이지가 제안한 대체 전법"과 "실제 스쿼드에 배정된 전법"이 어긋나는
// 버그가 있었음. 두 화면이 동일한 결과를 보여주도록 이 함수 하나로 통일한다.
//
// role이 다르면 애초에 후보에서 제외(1차 강제 필터) → tags/secondary_roles 겹침으로
// 세부 스코어링 → type(지휘/패시브/액티브/추격)까지 일치하는 후보를 우선 그룹으로 분리.

/**
 * @param {Object} params
 * @param {string} params.generalName 대상 장수 이름
 * @param {string} params.recommendedTacticName 원본(티어덱 추천) 전법 이름 - 미보유 상태
 * @param {Array}  params.tactics 전체 tactics 데이터
 * @param {Array}  params.generals 전체 generals 데이터
 * @param {Array<number|string>} params.selectedTactics 사용자가 보유 체크한 tactics id 목록
 * @param {Array<string>} [params.usedTacticsInDeck] 이미 이 편성 내에서 사용 중인 전법 이름(중복 방지)
 * @param {number} [params.limit=3] 반환할 후보 개수
 * @returns {Array<string>} 궁합 순으로 정렬된 대체 전법 이름 배열
 */
export function findAlternativeTactics({
  generalName,
  recommendedTacticName,
  tactics,
  generals,
  selectedTactics,
  usedTacticsInDeck = [],
  limit = 3,
}) {
  const targetTactic = tactics.find(t => t.name === recommendedTacticName);
  if (!targetTactic || !targetTactic.role) return [];

  const targetRole = targetTactic.role;
  const targetTags = targetTactic.tags || [];

  const myOwnedTactics = tactics.filter(t =>
    selectedTactics.includes(t.id) &&
    t.name !== recommendedTacticName &&
    !usedTacticsInDeck.includes(t.name)
  );

  const currentGeneral = generals.find(g => g.name === generalName);
  const generalSecondaryRoles = currentGeneral?.secondary_roles || [];

  // 1차 강제 필터: role이 다르면 애초에 후보가 아님
  const roleMatched = myOwnedTactics.filter(t => t.role === targetRole);

  const scoreTactic = (t) => {
    let score = 100; // role이 이미 일치하므로 기본 점수 부여
    const tTags = t.tags || [];

    const sharedTags = tTags.filter(tag => targetTags.includes(tag));
    score += sharedTags.length * 15;

    const generalTagOverlap = tTags.filter(tag => generalSecondaryRoles.includes(tag));
    score += generalTagOverlap.length * 5;

    return score;
  };

  // 2차: type(지휘/패시브/액티브/추격)이 원본과 같은 발동 슬롯인 후보를 우선 사용
  const typeMatched = roleMatched.filter(t => t.type === targetTactic.type);
  const typeMismatched = roleMatched.filter(t => t.type !== targetTactic.type);

  const rankedTypeMatched = typeMatched
    .map(t => ({ tactic: t, score: scoreTactic(t) }))
    .sort((a, b) => b.score - a.score);

  const rankedTypeMismatched = typeMismatched
    .map(t => ({ tactic: t, score: scoreTactic(t) }))
    .sort((a, b) => b.score - a.score);

  const finalRanked = [...rankedTypeMatched, ...rankedTypeMismatched];

  return finalRanked.map(item => item.tactic.name).slice(0, limit);
}