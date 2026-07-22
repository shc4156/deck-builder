// app/lib/squadRecommendationVs.js

function parseTierScore(tierName) {
  if (!tierName || typeof tierName !== 'string') return -1;
  const match = tierName.match(/T(\d)([+-]?)/);
  if (!match) return -1;
  const num = parseInt(match[1], 10);
  const modifier = match[2] === '+' ? 0.3 : match[2] === '-' ? -0.3 : 0;
  return 10 - num + modifier;
}

// 장수 객체/문자열에서 '이름'만 안전하게 추출하는 도우미 함수
function getGeneralName(gen) {
  if (!gen) return '';
  if (typeof gen === 'string') return gen;
  return gen.name || gen.heroName || '';
}

export function recommendFullSquadsVs(
  tierDecks = [],
  generals = [],
  tactics = [],
  selectedGenerals = [],
  selectedTactics = []
) {
  const safeGenerals = Array.isArray(generals) ? generals : [];
  const safeTactics = Array.isArray(tactics) ? tactics : [];
  const safeSelectedGenerals = Array.isArray(selectedGenerals) ? selectedGenerals : [];
  const safeSelectedTactics = Array.isArray(selectedTactics) ? selectedTactics : [];
  const safeTierDecks = Array.isArray(tierDecks) ? tierDecks : [];

  // 보유 장수 필터링
  const ownedGenerals = safeGenerals.filter(g => g && safeSelectedGenerals.includes(g.id));
  const ownedGeneralNames = new Set(ownedGenerals.map(g => getGeneralName(g)).filter(Boolean));

  // 티어 덱 정렬
  const sortedTierDecks = [...safeTierDecks].sort((a, b) => {
    const scoreA = parseTierScore(a?.tier || a?.name);
    const scoreB = parseTierScore(b?.tier || b?.name);
    return scoreB - scoreA;
  });

  const selectedSquads = [];
  const usedGeneralNames = new Set();

  // 1. 티어 덱 탐색
  for (const deck of sortedTierDecks) {
    if (selectedSquads.length >= 5) break;

    const rawGenerals = deck.generals || deck.heroes || [];
    if (!Array.isArray(rawGenerals) || rawGenerals.length === 0) continue;

    // 장수 이름 목록 추출
    const deckGeneralNames = rawGenerals.map(g => getGeneralName(g)).filter(Boolean);
    if (deckGeneralNames.length === 0) continue;

    // 보유 여부 및 사용 여부 체크
    const canBuild = deckGeneralNames.every(
      name => ownedGeneralNames.has(name) && !usedGeneralNames.has(name)
    );

    if (canBuild) {
      deckGeneralNames.forEach(name => usedGeneralNames.add(name));

      // FormationGridVisual 및 상위 컴포넌트 호환용 장수 객체 배열 생성
      const heroObjects = deckGeneralNames.map((name, idx) => ({
        name,
        heroName: name,
        position: idx // 기본 배치 순서
      }));

      selectedSquads.push({
        id: deck.id || `squad_${selectedSquads.length + 1}`,
        name: deck.name || `[${selectedSquads.length + 1}군] 추천부대`,
        generals: deckGeneralNames,
        heroes: heroObjects, // 배치 시각화 컴포넌트용
        formation: deck.formation || '0,1,0,0,1,1',
        score: deck.score || 85,
        source: 'tier'
      });
    }
  }

  // 2. 남은 장수로 자율 편성
  const remainingGenerals = ownedGenerals.filter(g => !usedGeneralNames.has(getGeneralName(g)));

  while (selectedSquads.length < 5 && remainingGenerals.length >= 3) {
    const squadGen = remainingGenerals.splice(0, 3);
    const genNames = squadGen.map(g => getGeneralName(g));

    const heroObjects = genNames.map((name, idx) => ({
      name,
      heroName: name,
      position: idx
    }));

    selectedSquads.push({
      id: `auto_${selectedSquads.length + 1}`,
      name: `[${selectedSquads.length + 1}군] 자율편성부대`,
      generals: genNames,
      heroes: heroObjects,
      formation: '0,1,0,0,1,1',
      score: 50,
      source: 'auto'
    });
  }

  return selectedSquads;
}