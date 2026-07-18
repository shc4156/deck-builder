import { pickTierSquads } from './tierSquadMatcher';
import { buildOptimalSquads, resolveGlobalTactics, buildTacticFrequencyMap } from './squadOptimizer';

export function recommendFullSquads(tierDecks, generals, tactics, selectedGenerals, selectedTactics) {
  const ownedGenerals = generals.filter(g => selectedGenerals.includes(g.id));
  const ownedGeneralNames = new Set(ownedGenerals.map(g => g.name));
  const ownedTactics = tactics.filter(t => selectedTactics.includes(t.id));

  // 1단계: 티어덱으로 최대한 채우기 (장수 가용 여부만 체크)
  const { squads: tierSquads, remainingGeneralNames } = pickTierSquads(tierDecks, ownedGeneralNames, 5);

  let allSquads = [...tierSquads];

  // 2단계: 5군 미만이면 남은 장수 풀에서 자동 조합
  if (allSquads.length < 5) {
    const remainingGenerals = ownedGenerals.filter(g => remainingGeneralNames.has(g.name));
    const optimizedSquads = buildOptimalSquads(
      remainingGenerals,
      allSquads.length + 1,
      5,
      new Set() // remainingGenerals가 이미 걸러진 상태라 빈 Set으로 시작
    );
    allSquads = [...allSquads, ...optimizedSquads.map(s => ({ ...s, source: 'auto_optimized' }))];
  }

  // 3단계: 전체 군을 통틀어 전법 중복 없이 최종 확정 (대체 전법 포함)
  // tier_decks 실사용 빈도(장수별로 실전에서 가장 자주 같이 쓰인 전법)를 먼저 시도하고,
  // 없으면 기존 역할 휴리스틱으로 폴백하도록 tacticFrequencyMap을 전달한다.
  const tacticFrequencyMap = buildTacticFrequencyMap(tierDecks);
  return resolveGlobalTactics(allSquads, ownedTactics, generals, tacticFrequencyMap);
}