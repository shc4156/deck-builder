import { getFormationForTrio, connectionScoreOf } from '../app/lib/squadOptimizer';

/**
 * 장수와 전법 간의 적합도 점수(0~100점) 정밀 계산 함수
 */
export function evaluateTacticFit(generalObj, tacticObj) {
  if (!generalObj || !tacticObj) return 50;

  let score = 50; // 기본 시작 점수

  // 스탯 숫자로 변환 (기본값 설정)
  const str = parseFloat(generalObj.strength || 100);
  const int = parseFloat(generalObj.intelligence || 100);
  const cmd = parseFloat(generalObj.command || 100);
  const primaryRole = generalObj.primary_role || '';
  const preferredType = generalObj.preferred_tactic_type || '';

  // 1. 수파베이스 generals 테이블의 recommended_tactics(추천 전법) 검증
  let recommendedList = [];
  if (Array.isArray(generalObj.recommended_tactics)) {
    recommendedList = generalObj.recommended_tactics;
  } else if (typeof generalObj.recommended_tactics === 'string') {
    try {
      recommendedList = JSON.parse(generalObj.recommended_tactics);
    } catch {
      recommendedList = generalObj.recommended_tactics.split(',').map(s => s.trim());
    }
  }

  // 💡 공식 추천 전법에 포함되어 있으면 최우선 가산점 부여 (+35점)
  const isRecommended = recommendedList.some(
    recName => recName.trim() === tacticObj.name?.trim()
  );
  if (isRecommended) {
    score += 35;
  }

  // 2. 전법 카테고리/속성에 따른 역할군(primary_role) 매칭 로직
  const category = tacticObj.category || '';
  const tacName = tacticObj.name || '';
  const tacEffect = tacticObj.effect || '';

  // 전법 성격 분류
  const isMagicDamage = category === 'magic_strategy' || tacEffect.includes('책략 피해');
  const isPhysicalDamage = category === 'attack_power_pursuit' || tacEffect.includes('병기 피해');
  const isDefenseSurvival = category === 'defense_survival' || tacEffect.includes('피해 감소') || tacEffect.includes('통솔');
  const isHealSupport = category === 'healing_support' || tacEffect.includes('회복') || tacEffect.includes('치유');

  // 3. 역할군별(Role) 정밀 점수 가감산
  if (primaryRole.includes('탱커') || primaryRole.includes('방어')) {
    // 황개, 조조, 조인 등 방어형 장수
    if (isDefenseSurvival || isHealSupport) score += 15;
    if (isMagicDamage && !primaryRole.includes('책략')) score -= 25; // 방어장수에게 순수 책략딜은 감점
  } else if (primaryRole.includes('딜_병기')) {
    // 무력 물딜러 (마초, 관우, 여포 등)
    if (isPhysicalDamage) score += 15;
    if (isMagicDamage) score -= 30; // 물리 딜러에게 책략딜 강력 감점
  } else if (primaryRole.includes('딜_책략')) {
    // 지장 딜러 (제갈량, 주유, 정욱 등)
    if (isMagicDamage) score += 20;
    if (isPhysicalDamage) score -= 30;
  } else if (primaryRole.includes('힐러')) {
    if (isHealSupport) score += 25;
    if (isPhysicalDamage || isMagicDamage) score -= 15;
  }

  // 4. 스탯 자격 검증 (지력/무력 차이에 따른 보정)
  if (isMagicDamage) {
    if (int < 160) score -= 20; // 지력이 낮은 경우 책략 전법 점수 삭감
    else score += Math.floor((int - 160) / 10);
  }
  if (isPhysicalDamage) {
    if (str < 160) score -= 20; // 무력이 낮은 경우 병기 전법 점수 삭감
    else score += Math.floor((str - 160) / 10);
  }

  // 5. 점수 범위 보정 (최대 100점, 최소 10점)
  return Math.min(100, Math.max(10, score));
}

/**
 * 2. 특정 장수에게 가장 적합한 전법 2개 선별 (이미 사용된 전법 제외)
 */
function findBestTacticsForGeneral(general, availableTactics) {
  if (!general || !availableTactics || availableTactics.length === 0) return [];

  const scoredTactics = availableTactics.map(tac => ({
    tactic: tac,
    score: evaluateTacticFit(general, tac)
  }));

  // 적합도 높은 순으로 정렬
  scoredTactics.sort((a, b) => b.score - a.score);

  return scoredTactics.slice(0, 2).map(item => ({
    name: item.tactic.name,
    grade: item.tactic.grade || '황금',
    score: item.score
  }));
}

/**
 * 원본 전법과 유사한 대체 전법 가산점 연산
 */
export function getTacticSimilarityScore(originalTactic, candidateTactic) {
  if (!originalTactic || !candidateTactic) return 0;
  if (originalTactic.id === candidateTactic.id) return 0;

  let similarityBonus = 0;

  // 1. 카테고리 동일 여부 (defense_survival, magic_strategy, healing_support 등)
  if (originalTactic.category && originalTactic.category === candidateTactic.category) {
    similarityBonus += 25;
  }

  // 2. 효과 텍스트(effect) 기반 핵심 키워드 일치 여부
  const keywords = ['책략 피해', '병기 피해', '회복', '방어', '공포', '요술', '무장 해제', '능력 소진', '간파', '관통'];
  const origEffect = originalTactic.effect || '';
  const candEffect = candidateTactic.effect || '';

  keywords.forEach(kw => {
    if (origEffect.includes(kw) && candEffect.includes(kw)) {
      similarityBonus += 15;
    }
  });

  return similarityBonus;
}

/**
 * 3. [메인 메커니즘] 1~5군 자동 편성 및 전법 낙수 배정
 */
export function buildOptimalSquads({
  tierDecks = [],
  generals = [],
  tactics = [],
  myGenNames = [],
  myTactNames = [],
  pinnedDeckIds = []
}) {
  const usedGenerals = new Set();
  const usedTactics = new Set();
  const resultSquads = [];

  // 내 보유 자산 실체화
  const availableGeneralsPool = generals.filter(g => myGenNames.includes(g.name?.trim()));
  const availableTacticsPool = tactics.filter(t => myTactNames.includes(t.name?.trim()));

  // 1단계: 티어덱 스캔 (최대 5개 군단 생성)
  for (let i = 0; i < tierDecks.length && resultSquads.length < 5; i++) {
    const deck = tierDecks[i];
    const rawSetup = Array.isArray(deck.deck_setup) ? deck.deck_setup : [];
    if (rawSetup.length === 0) continue;

    const deckGenNames = rawSetup.map(s => (s?.general_name || '').trim()).filter(Boolean);

    // 보유 중이고 아직 미사용된 장수 체크
    const ownedAvailable = deckGenNames.filter(n => myGenNames.includes(n) && !usedGenerals.has(n));
    const isPinned = pinnedDeckIds.includes(deck.id);

    // 고정 덱이거나 최소 1명 이상 보유 시 덱 구성 시도
    if (!isPinned && ownedAvailable.length === 0) continue;

    const squadSetup = [];
    const currentSquadGenNames = [];

    // 장수 3명 슬롯 채우기
    for (let slotIdx = 0; slotIdx < 3; slotIdx++) {
      const targetSetup = rawSetup[slotIdx] || {};
      const targetName = (targetSetup.general_name || '').trim();

      let assignedGeneral = null;
      let isSubstituted = false;

      if (targetName && myGenNames.includes(targetName) && !usedGenerals.has(targetName)) {
        // [원래 장수 배치]
        assignedGeneral = generals.find(g => g.name?.trim() === targetName);
        usedGenerals.add(targetName);
      } else {
        // [대체 장수 자동 발굴]
        const substitute = availableGeneralsPool.find(g => !usedGenerals.has(g.name?.trim()));
        if (substitute) {
          assignedGeneral = substitute;
          usedGenerals.add(substitute.name.trim());
          isSubstituted = true;
        }
      }

      if (assignedGeneral) {
        currentSquadGenNames.push(assignedGeneral.name);

        // 남은 전법 풀에서 최적의 전법 2개 추천 배정
        const remainingTactics = availableTacticsPool.filter(t => !usedTactics.has(t.name?.trim()));
        const bestTactics = findBestTacticsForGeneral(assignedGeneral, remainingTactics);

        // 사용한 전법 사용 처리
        bestTactics.forEach(bt => usedTactics.add(bt.name));

        squadSetup.push({
          general_name: assignedGeneral.name,
          isSubstituted,
          stat_focus: targetSetup.stat_focus || (assignedGeneral.attributes?.force > assignedGeneral.attributes?.intelligence ? '무력' : '지력'),
          added_tactics_detailed: bestTactics,
          arts_of_war: targetSetup.arts_of_war || { unique: '기본 병법', common: ['공격', '방어'] },
          equipment_options: targetSetup.equipment_options || ['기본 장비']
        });
      }
    }

    if (squadSetup.length > 0) {
      resultSquads.push({
        id: deck.id || `squad_${resultSquads.length + 1}`,
        squadNum: resultSquads.length + 1,
        deck_name: deck.deck_name || deck.tier_name || `제 ${resultSquads.length + 1} 군`,
        formation: getFormationForTrio(currentSquadGenNames),
        deck_setup: squadSetup,
        description: deck.description || '최적화된 정예 조합'
      });
    }
  }

  return resultSquads;
}

// 남은 장수들 중 시너지(연의/인연/국가)가 가장 높은 3인 조합을 찾는 함수
export const findBestSynergyGroup = (availableGenerals, connections, synergies) => {
  if (availableGenerals.length < 3) return availableGenerals;

  let bestGroup = [];
  let maxScore = -1;

  // 남은 장수 중 3명 조합을 탐색 (장수 수가 많을 경우 상위 장수 위주 탐색)
  for (let i = 0; i < availableGenerals.length; i++) {
    for (let j = i + 1; j < availableGenerals.length; j++) {
      for (let k = j + 1; k < availableGenerals.length; k++) {
        const trio = [availableGenerals[i], availableGenerals[j], availableGenerals[k]];
        const names = trio.map(g => g.name);
        const kingdoms = trio.map(g => g.kingdom);

        let score = 0;

        // ⚡ 1. 연의 관계 점수 (가장 높은 가산점)
        const hasConn = connections.some(c => 
          names.includes(c.leader_name?.trim()) && names.includes(c.follower_name?.trim())
        );
        if (hasConn) score += 500;

        // 🔗 2. 인연 효과 점수
        const hasSynergy = synergies.some(s => {
          const members = typeof s.members === 'string' ? JSON.parse(s.members) : s.members;
          const matchCount = members.filter(m => names.includes(m.trim())).length;
          return matchCount >= (s.req_count || 2);
        });
        if (hasSynergy) score += 300;

        // 🏛️ 3. 동일 국가(진영) 통일 점수
        const kingdomCounts = kingdoms.reduce((acc, cur) => {
          acc[cur] = (acc[cur] || 0) + 1;
          return acc;
        }, {});
        const maxSameKingdom = Math.max(...Object.values(kingdomCounts));
        
        if (maxSameKingdom === 3) score += 200; // 3인 동일 국가
        else if (maxSameKingdom === 2) score += 80; // 2인 동일 국가

        if (score > maxScore) {
          maxScore = score;
          bestGroup = trio;
        }
      }
    }
  }

  return bestGroup.length === 3 ? bestGroup : availableGenerals.slice(0, 3);
};