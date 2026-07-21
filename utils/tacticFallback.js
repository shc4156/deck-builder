/**
 * 대체 전법이 비어있을 때 tactics DB에서 해당 장수의 추천 전법 상위 3개를 가져오는 함수
 * @param {string} generalName - 장수 이름 (예: "제갈량")
 * @param {string} mainTacticName - 이미 설정된 메인 전법 이름
 * @param {Array} allTactics - tactics_rows.json (전체 전법 DB)
 * @returns {Array<string>} - 추천 대체 전법 이름 배열 (최대 3개)
 */
export function getFallbackTacticsForGeneral(generalName, mainTacticName, allTactics = []) {
  if (!generalName || !allTactics.length) return [];

  // 1. 해당 장수가 recommended_generals에 포함된 전법들 필터링
  const matchedTactics = allTactics.filter(tactic => {
    if (!tactic.recommended_generals) return false;
    
    // 이미 지정된 메인 전법은 제외
    if (tactic.name === mainTacticName) return false;

    try {
      const recList = typeof tactic.recommended_generals === 'string'
        ? JSON.parse(tactic.recommended_generals)
        : tactic.recommended_generals;
      
      return Array.isArray(recList) && recList.includes(generalName);
    } catch (e) {
      return false;
    }
  });

  // 2. 등급(황금 > 보라) 및 우선순위에 따라 정렬
  matchedTactics.sort((a, b) => {
    if (a.grade === '황금' && b.grade !== '황금') return -1;
    if (a.grade !== '황금' && b.grade === '황금') return 1;
    return 0;
  });

  // 3. 상위 3개 전법의 이름만 추출
  return matchedTactics.slice(0, 3).map(t => t.name);
}