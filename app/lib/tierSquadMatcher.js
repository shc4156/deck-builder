
// 티어덱 기반 1단계: 장수 가용 여부만 체크, 전법은 원본 추천값을 그대로 담아두고
// 최종 확정은 squadRecommendation.js의 resolveGlobalTactics에 맡긴다.

// squadOptimizer.js의 buildTacticFrequencyMap에서도 동일 기준으로 재사용하기 위해 export.
export function parseTierScore(tierName) {
  const match = tierName.match(/T(\d)([+-]?)/);
  if (!match) return -1; // "T" 표기 없는 개척덱류는 최하 우선순위
  const num = parseInt(match[1], 10);
  const modifier = match[2] === '+' ? 0.3 : match[2] === '-' ? -0.3 : 0;
  return (10 - num) + modifier;
}

export function pickTierSquads(tierDecks, ownedGeneralNames, maxSquads = 5) {
  const availableGeneralNames = new Set(ownedGeneralNames);
  const usedDeckIds = new Set();

  const sortedDecks = [...tierDecks].sort(
    (a, b) => parseTierScore(b.tier_name) - parseTierScore(a.tier_name)
  );

  const squads = [];

  for (let squadNum = 1; squadNum <= maxSquads; squadNum++) {
    let chosenDeck = null;


    for (const deck of tierDecks) {
      if (usedDeckIds.has(deck.id)) continue;
      if (!deck.deck_setup || !Array.isArray(deck.deck_setup)) continue;

      const names = deck.deck_setup.map(g => g.general_name);
      const allAvailable = names.every(name => availableGeneralNames.has(name));
      if (allAvailable) {
        chosenDeck = deck;
        break;
      }
    }

    if (!chosenDeck) break; // 이 이상은 티어덱으로 못 채움 -> 2단계로 넘김

    usedDeckIds.add(chosenDeck.id);
    chosenDeck.deck_setup.forEach(g => availableGeneralNames.delete(g.general_name));

    squads.push({
      id: `tier-${chosenDeck.id}`,
      tier_name: chosenDeck.tier_name,
      formation_grid: chosenDeck.formation_grid,
      squadNum,
      deck_setup: chosenDeck.deck_setup.map(g => ({
        general_name: g.general_name,

        // tactics: [{ main, sub: [] }, { main, sub: [] }] 슬롯별 구조 그대로 전달
        tactics: g.tactics || [],
        arts_of_war: g.arts_of_war,
        stat_focus: g.stat_focus,
        equipment_options: g.equipment_options,

      })),
      source: 'tier_deck'
    });
  }

  return { squads, remainingGeneralNames: availableGeneralNames };
}