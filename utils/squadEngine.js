// utils/squadEngine.js
export function buildOptimalSquads({ tierDecks, generals, tactics, myGenNames, myTactNames, pinnedDeckIds, selectedTactics }) {
  const usedGenerals = new Set();
  const usedTactics = new Set();
  const squads = [];

  // 우선순위 정렬: 핀 된 덱 -> 나머지
  const prioritizedDecks = [...tierDecks].sort((a, b) => (pinnedDeckIds.includes(a.id) ? -1 : 1));

  for (const deck of prioritizedDecks) {
    if (squads.length >= 5) break;

    // 장수 배치: 핀 덱은 고정, 아니면 보유 장수 중 남는 것 채우기
    let tempUsed = new Set();
    const setup = deck.deck_setup.map(g => {
      let name = g.general_name.trim();
      // 내 보유 장수가 아니거나 이미 쓰인 장수면, 보유 장수 중 아무나 채우기 (단순화)
      if (!myGenNames.includes(name) || usedGenerals.has(name) || tempUsed.has(name)) {
        const sub = generals.find(gen => myGenNames.includes(gen.name.trim()) && !usedGenerals.has(gen.name.trim()) && !tempUsed.has(gen.name.trim()))?.name.trim();
        if (sub) name = sub;
      }
      tempUsed.add(name);
      return { ...g, general_name: name };
    });

    // 전법 배치: 단순 순차 할당 (황금 -> 보라)
    const finalized = setup.map(g => {
      const finalTactics = [];
      const availableTactics = tactics
        .filter(t => selectedTactics.includes(t.id) && !usedTactics.has(t.name))
        .sort((a, b) => (b.grade === '황금' ? 1 : 0) - (a.grade === '황금' ? 1 : 0));

      for (let i = 0; i < 2; i++) {
        const t = availableTactics[i];
        if (t) {
          finalTactics.push({ name: t.name, grade: t.grade });
          usedTactics.add(t.name);
        } else {
          finalTactics.push({ name: '전법장착', grade: '보라' });
        }
      }
      return { ...g, added_tactics_detailed: finalTactics };
    });

    tempUsed.forEach(n => usedGenerals.add(n));
    squads.push({ ...deck, deck_setup: finalized, squadNum: squads.length + 1 });
  }
  return squads;
}