// data/tierDeckMatch.js
//
// tier_decks 실제 플랫 스키마(hero{1,2,3}_name, hero{1,2,3}_tactic1_main/sub 등)를
// 장수 배열로 파싱하고, 보유(창고) 이름 풀 기준 매칭 정보를 계산하는 공용 유틸.
// MatchesTab.js의 parseDeckSetup/calculateMatch와 동일 로직 — 두 화면(티어덱 매칭 페이지,
// 연무탭)이 서로 다른 매칭 결과를 내지 않도록 여기 하나로 통일해서 둘 다 이 파일을 참조한다.

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// tier_decks 한 행(row)을 장수 3명 배열로 파싱
export function parseTierDeckSetup(deck) {
  const heroes = [];

  for (let i = 1; i <= 3; i++) {
    const name = deck[`hero${i}_name`]?.trim();
    if (!name) continue;

    const t1Main = deck[`hero${i}_tactic1_main`]?.trim();
    const t1Sub = parseJsonField(deck[`hero${i}_tactic1_sub`]);
    const t2Main = deck[`hero${i}_tactic2_main`]?.trim();
    const t2Sub = parseJsonField(deck[`hero${i}_tactic2_sub`]);

    const mainTactics = [t1Main, t2Main].filter(Boolean);
    const dbSubTactics = [...t1Sub, ...t2Sub].filter(Boolean);

    heroes.push({
      general_name: name,
      stat_focus: deck[`hero${i}_stat`] || '속성 미정',
      main_tactics: mainTactics.length > 0 ? mainTactics : ['전법 정보 없음'],
      db_sub_tactics: dbSubTactics,
      arts_of_war: {
        unique: deck[`hero${i}_unique_art_of_war`] || null,
        common: parseJsonField(deck[`hero${i}_common_art_of_war`]),
      },
      equipment_options: parseJsonField(deck[`hero${i}_equip`]),
    });
  }

  return heroes;
}

// generalPool/tacticPool: 보유(창고) 장수/전법 "이름" 문자열 배열
// 이 티어덱이 그 풀 안에서 얼마나(장수 몇 명, 전법 몇 개) 매칭되는지 계산.
// isFullGeneralMatch === true면 장수 3명이 전부 풀 안에 있다는 뜻(완전 매칭).
export function scoreTierDeckMatch(deck, generalPool = [], tacticPool = []) {
  const setup = parseTierDeckSetup(deck);

  if (setup.length === 0) {
    return {
      setup,
      deckGenNames: [],
      deckTactics: [],
      matchedGenCount: 0,
      totalGenCount: 0,
      matchedTactCount: 0,
      totalTactCount: 0,
      isFullGeneralMatch: false,
      percent: 0,
    };
  }

  const deckGenNames = setup.map((h) => h.general_name);
  const deckTactics = setup.flatMap((h) => h.main_tactics);

  const matchedGenCount = deckGenNames.filter((n) => generalPool.includes(n)).length;
  const matchedTactCount = deckTactics.filter((n) => tacticPool.includes(n)).length;

  const genScore = (matchedGenCount / deckGenNames.length) * 60;
  const tactScore = deckTactics.length > 0 ? (matchedTactCount / deckTactics.length) * 40 : 0;

  return {
    setup,
    deckGenNames,
    deckTactics,
    matchedGenCount,
    totalGenCount: deckGenNames.length,
    matchedTactCount,
    totalTactCount: deckTactics.length,
    isFullGeneralMatch: matchedGenCount === deckGenNames.length,
    percent: Math.round(genScore + tactScore),
  };
}