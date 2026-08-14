import { getFormationForTrio, connectionScoreOf } from '../app/lib/squadOptimizer';
import { buildTacticFamilyIndex, getSubstituteScore } from '../data/tacticCompatibility';
import { ROLE_TROOP_AFFINITY, suggestTroopSubtype } from '../data/troopMastery';

// 모듈 로드 시 한 번만 생성 — 편성 루프 돌 때마다 다시 만들지 않도록
const familyIndex = buildTacticFamilyIndex();

/**
 * general_roles(역할별 랭킹) 데이터를 general_name 기준으로 인덱싱합니다.
 * 한 장수가 attack_carry / support_engine / support_amplifier / support_sustain /
 * control_trigger 등 여러 category에 걸쳐 등장할 수 있는데, 슬롯의 stat_focus만으로는
 * 이 category와 정확히 매칭할 근거가 없어서(taxonomy가 다름), "이 장수가 가장 잘하는
 * 역할에서 얼마나 상위 랭크인지"를 대표값(bestRoleIndex)으로 뽑아 전체적인
 * 채용 우선순위(=자주/잘 쓰이는 정도)로 사용합니다.
 */
export function buildGeneralRoleIndex(generalRoles = []) {
  const index = {};
  for (const r of generalRoles) {
    const name = r.general_name?.trim();
    if (!name) continue;
    const roleIndex = r.role_index ?? 0;
    if (!index[name]) {
      index[name] = { bestRoleIndex: roleIndex, entries: [] };
    } else if (roleIndex > index[name].bestRoleIndex) {
      index[name].bestRoleIndex = roleIndex;
    }
    index[name].entries.push({
      category: r.category,
      rank: r.rank,
      roleIndex,
      roleGrade: r.role_grade,
      roleType: r.role_type
    });
  }
  return index;
}

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

  // 2. 전법 실제 속성 분류
  // ⚠️ 주의: tactics 테이블에는 category/effect 컬럼이 존재하지 않습니다.
  // 실제 컬럼은 trait(병기/책략/보조/방어/치유/문무), type(액티브/패시브/추격/지휘), description입니다.
  // 예전 코드가 없는 컬럼(category/effect)을 읽고 있어서 이 아래 역할 매칭 전체가 항상 무효였습니다.
  const trait = tacticObj.trait || '';
  const tacType = tacticObj.type || '';
  const tacName = tacticObj.name || '';
  const tacDesc = tacticObj.description || '';

  // 전법 성격 분류 (문무는 병기·책략 피해를 동시에 주는 혼합형이라 둘 다 true)
  const isMagicDamage = trait === '책략' || trait === '문무' || tacDesc.includes('책략 피해');
  const isPhysicalDamage = trait === '병기' || trait === '문무' || tacDesc.includes('병기 피해');
  const isDefenseSurvival = trait === '방어' || tacDesc.includes('받는 피해');
  const isHealSupport = trait === '치유' || tacDesc.includes('회복') || tacDesc.includes('치유');
  const isUtilitySupport = trait === '보조'; // 버프/디버프 등 직접 피해가 아닌 보조 계열

  // 3. 역할군별(primary_role) 정밀 점수 가감산
  // generals.primary_role 실제 값 8종을 전부 커버합니다: 탱커_방어, 딜_병기, 딜_책략,
  // 딜_혼합, 힐러, 지휘_보조, 디버퍼, 버퍼 (예전엔 딜_혼합/지휘_보조/디버퍼/버퍼 분기가 아예 없어서
  // 이 역할을 가진 장수는 역할 기반 채점이 통째로 스킵되고 있었습니다)
  if (primaryRole === '탱커_방어' || primaryRole.includes('탱커')) {
    // 황개, 조조, 조인 등 방어형 장수
    if (isDefenseSurvival || isHealSupport) score += 15;
    if (isMagicDamage && !isDefenseSurvival) score -= 25; // 방어장수에게 순수 책략딜은 감점
  } else if (primaryRole === '딜_병기') {
    // 무력 물딜러 (마초, 관우, 여포 등)
    if (isPhysicalDamage) score += 15;
    if (isMagicDamage && !isPhysicalDamage) score -= 30; // 물리 딜러에게 순수 책략딜 강력 감점
  } else if (primaryRole === '딜_책략') {
    // 지장 딜러 (제갈량, 주유, 정욱 등)
    if (isMagicDamage) score += 20;
    if (isPhysicalDamage && !isMagicDamage) score -= 30;
  } else if (primaryRole === '딜_혼합') {
    // 동탁, 서서, 원소 등 문무겸용 장수
    if (isPhysicalDamage) score += 12;
    if (isMagicDamage) score += 12;
  } else if (primaryRole === '힐러') {
    if (isHealSupport) score += 25;
    if (isPhysicalDamage || isMagicDamage) score -= 15;
  } else if (primaryRole === '지휘_보조') {
    // 곽가, 순욱 등 액티브 발동률/행동량 확대형 - 보조·치유 계열이 핵심, 순수 물리딜은 안 맞음
    if (isUtilitySupport || isHealSupport) score += 20;
    if (isPhysicalDamage && !isUtilitySupport) score -= 20;
  } else if (primaryRole === '디버퍼') {
    if (isUtilitySupport || isMagicDamage) score += 12;
    if (tacDesc.includes('디버프') || tacDesc.includes('무장 해제') || tacDesc.includes('공포') || tacDesc.includes('능력 소진') || tacDesc.includes('침묵')) {
      score += 15;
    }
  } else if (primaryRole === '버퍼') {
    if (isUtilitySupport) score += 20;
    if (isHealSupport) score += 10;
    if (isPhysicalDamage && !isUtilitySupport) score -= 15;
  }

  // 3-1. preferred_tactic_type(장수별 세부 선호 전법 유형) 매칭
  // primary_role보다 훨씬 구체적인 신호라서(예: 같은 지휘_보조라도 힐 선호 vs 디버프 선호가 갈림)
  // 별도로 한 번 더 가산합니다.
  score += getPreferredTypeBonus(preferredType, { trait, tacType, tacDesc });

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
 * generals.preferred_tactic_type 값에 맞춰 전법(trait/type/description)이 실제로
 * 그 선호와 얼마나 일치하는지 가산점을 계산합니다.
 */
function getPreferredTypeBonus(preferredType, { trait, tacType, tacDesc }) {
  switch (preferredType) {
    case '딜_병기':
      return trait === '병기' ? 20 : 0;
    case '딜_책략':
      return trait === '책략' ? 20 : 0;
    case '딜_혼합':
      return trait === '문무' ? 20 : 0;
    case '힐':
      return trait === '치유' ? 20 : 0;
    case '지원_복합':
      return (trait === '치유' || trait === '보조') ? 15 : 0;
    case '방어_자신':
      return trait === '방어' ? (tacDesc.includes('아군') ? 8 : 20) : 0;
    case '방어_아군':
      return trait === '방어' ? (tacDesc.includes('아군') ? 20 : 8) : 0;
    case '버프_자신':
      return trait === '보조' ? (tacDesc.includes('아군') ? 8 : 20) : 0;
    case '버프_아군':
      return trait === '보조' ? (tacDesc.includes('아군') ? 20 : 8) : 0;
    case '디버프':
      return (tacDesc.includes('디버프') || tacDesc.includes('무장 해제') || tacDesc.includes('공포') ||
        tacDesc.includes('능력 소진') || tacDesc.includes('침묵') || tacDesc.includes('약화')) ? 20 : 0;
    case '추격':
      // 추격/액티브는 서로 배타적인 발동 타이밍 — 반대 타입이면 감점해서
      // 100점 상한에서 서로 구분 안 되는 문제(추격 선호인데 액티브가 동점 100점)를 방지
      if (tacType === '추격') return 20;
      if (tacType === '액티브') return -20;
      return 0;
    case '액티브':
      if (tacType === '액티브') return 15;
      if (tacType === '추격') return -15;
      return 0;
    case '회심':
      return (tacDesc.includes('회심') || tacDesc.includes('치명')) ? 20 : 0;
    default:
      return 0;
  }
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

  // 1. trait(병기/책략/보조/방어/치유/문무) 동일 여부
  // (예전엔 존재하지 않는 category 컬럼을 읽어서 이 비교가 항상 실패했습니다)
  if (originalTactic.trait && originalTactic.trait === candidateTactic.trait) {
    similarityBonus += 25;
  }

  // 2. description 텍스트 기반 핵심 키워드 일치 여부
  const keywords = ['책략 피해', '병기 피해', '회복', '방어', '공포', '요술', '무장 해제', '능력 소진', '간파', '관통'];
  const origDesc = originalTactic.description || '';
  const candDesc = candidateTactic.description || '';

  keywords.forEach(kw => {
    if (origDesc.includes(kw) && candDesc.includes(kw)) {
      similarityBonus += 15;
    }
  });

  return similarityBonus;
}

/**
 * 원본(티어덱 추천) 전법을 대체할 때, 장수 적합도(evaluateTacticFit) +
 * 전법 호환성(getSubstituteScore, 같은 family 내 rank)을 합산해 최적 후보 1개를 고른다.
 */
function findBestSubstituteTactic(originalTacticObj, generalObj, candidatePool) {
  if (!candidatePool || candidatePool.length === 0) return null;

  const scored = candidatePool.map(t => {
    let score = evaluateTacticFit(generalObj, t);
    if (originalTacticObj) {
      const compat = getSubstituteScore(originalTacticObj.id, t.id, familyIndex);
      if (compat) score += compat.score * 0.3; // family 궁합 가산점(태그 2개 겹침 정도 무게)
    }
    return { tactic: t, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0] || null;
}

/**
 * 장수 1명에게 병부 전환을 추천할지 계산합니다.
 * explicitTroop(티어덱 curated 값)이 있으면 그걸 그대로 쓰고,
 * 없을 때만 역할 적합도 + 부대 내 병종 통일 시너지를 합쳐 자동 추천합니다.
 * coarse 병종(방패병/창병/기병/궁병)이 정해지면, 그 안의 세부 병종(예: 중방패병/검방패병)도
 * troopMastery의 suggestTroopSubtype으로 이어서 판단해 결과에 함께 담습니다.
 *
 * 주의: coarse 병종 자체는 이미 최적(=병부로 갈아탈 필요 없음)이어서 전환 추천이
 * 없는 경우에도, "지금 병종을 어느 세부(예: 중방패병 vs 검방패병)로 정통 찍을지"는
 * 여전히 유효한 질문이라 subtype 계산은 별도로 계속 진행합니다. 이 경우 troop은
 * nativeTroop 그대로, troop_mismatch는 false로 나가고 subtype만 채워집니다.
 * (explicitTroop 쪽은 티어덱이 coarse 값만 갖고 있어 subtype은 항상 heuristic으로 판단)
 */
export function suggestTroopConversion({ generalObj, squadEffectiveTroops = [], explicitTroop = null }) {
  if (explicitTroop) {
    const subtypeResult = suggestTroopSubtype(explicitTroop, generalObj);
    return {
      troop: explicitTroop,
      source: 'tierdeck',
      reason: '티어덱 권장값',
      subtype: subtypeResult?.subtype || null,
      subtypeSource: subtypeResult?.source || null,
      subtypeReason: subtypeResult?.reason || null,
      subtypeConfidence: subtypeResult?.confidence || null,
      subtypeCandidates: subtypeResult?.candidates || null
    };
  }
  if (!generalObj) return null;

  const nativeTroop = generalObj.troop_type;
  const affinity = ROLE_TROOP_AFFINITY[generalObj.primary_role] || {};
  const candidates = ['방패병', '창병', '기병', '궁병'];

  const scoreOf = (troop) => {
    let score = affinity[troop] || 0;
    const sameCount = squadEffectiveTroops.filter(t => t === troop).length;
    score += sameCount === 2 ? 30 : sameCount === 1 ? 10 : 0;
    if (troop === nativeTroop) score += 8; // 병부 소모 없이 유지 가능 → 현상유지 소폭 가산
    return score;
  };

  let best = nativeTroop;
  let bestScore = scoreOf(nativeTroop);
  candidates.forEach(troop => {
    const s = scoreOf(troop);
    if (s > bestScore) { bestScore = s; best = troop; }
  });

  const gain = bestScore - scoreOf(nativeTroop);
  const troopChanged = best !== nativeTroop && gain >= 15;

  // coarse 병종 전환이 없어도(이미 nativeTroop이 최적) subtype은 nativeTroop 기준으로 계속 판단.
  // 전환이 있으면 전환될 병종(best) 기준으로 판단.
  const effectiveTroop = troopChanged ? best : nativeTroop;
  const subtypeResult = suggestTroopSubtype(effectiveTroop, generalObj);

  if (!troopChanged && !subtypeResult) return null;

  return {
    troop: effectiveTroop,
    source: troopChanged ? 'heuristic' : 'native',
    reason: troopChanged ? (gain >= 30 ? '역할+조합 시너지 강함' : '역할 적합도 우위') : '현재 병종 유지, 세부 진급만 추천',
    subtype: subtypeResult?.subtype || null,
    subtypeSource: subtypeResult?.source || null,
    subtypeReason: subtypeResult?.reason || null,
    subtypeConfidence: subtypeResult?.confidence || null,
    subtypeCandidates: subtypeResult?.candidates || null
  };
}

/**
 * 대체 장수 후보 1명의 적합도(0~100점 근사)를 계산합니다.
 * ① 슬롯이 요구하는 stat_focus(무력/지력)와 후보 스탯의 정합성
 * ② general_roles 랭킹(전체적으로 얼마나 잘/자주 쓰이는 장수인지)
 * ③ 이미 같은 군단에 배정된 장수들과의 국가(kingdom) 시너지
 * ④ (전달된 경우) 연의(connections)·인연(synergies) 시너지
 */
export function evaluateGeneralFit({
  candidate,
  targetSetup,
  currentSquadGenNames = [],
  generals = [],
  generalRoleIndex = {},
  connections = [],
  synergies = []
}) {
  if (!candidate) return 0;

  let score = 50;

  // 1. 스탯 적합도
  const str = parseFloat(candidate.strength || 100);
  const int = parseFloat(candidate.intelligence || 100);
  const statFocus = targetSetup?.stat_focus || '';
  if (statFocus === '무력') {
    score += str >= int ? 15 : -10;
  } else if (statFocus === '지력') {
    score += int >= str ? 15 : -10;
  }

  // 2. general_roles 랭킹 반영 (role_index 0~100 → 대략 -8 ~ +20점 가산)
  const roleInfo = generalRoleIndex[candidate.name?.trim()];
  if (roleInfo) {
    score += (roleInfo.bestRoleIndex - 50) * 0.4;
  }

  // 3. 같은 군단 내 국가(kingdom) 시너지
  const squadKingdoms = currentSquadGenNames
    .map(n => generals.find(g => g.name?.trim() === n)?.kingdom)
    .filter(Boolean);
  const sameKingdomCount = squadKingdoms.filter(k => k === candidate.kingdom).length;
  score += sameKingdomCount * 12;

  // 4. 연의(connections) 관계 시너지 — 이미 배정된 장수와 연의 관계면 가산
  if (connections.length > 0) {
    const candName = candidate.name?.trim();
    const hasConn = connections.some(c => {
      const leader = c.leader_name?.trim();
      const follower = c.follower_name?.trim();
      return (
        (leader === candName && currentSquadGenNames.includes(follower)) ||
        (follower === candName && currentSquadGenNames.includes(leader))
      );
    });
    if (hasConn) score += 25;
  }

  // 5. 인연(synergies) 효과 시너지 — 후보를 포함했을 때 발동 조건에 더 가까워지면 가산
  if (synergies.length > 0) {
    const candName = candidate.name?.trim();
    const hasSynergy = synergies.some(s => {
      const members = typeof s.members === 'string' ? JSON.parse(s.members) : (s.members || []);
      const trimmed = members.map(m => m.trim());
      if (!trimmed.includes(candName)) return false;
      const matchCount = trimmed.filter(m => currentSquadGenNames.includes(m)).length;
      return matchCount >= (s.req_count || 2) - 1; // 후보 자신은 아직 배정 전이므로 -1
    });
    if (hasSynergy) score += 18;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * 후보군 중 evaluateGeneralFit 최고점 장수 1명을 고른다.
 */
function findBestSubstituteGeneral(params) {
  const { candidates } = params;
  if (!candidates || candidates.length === 0) return null;

  const scored = candidates.map(g => ({
    general: g,
    score: evaluateGeneralFit({ ...params, candidate: g })
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.general || null;
}

/**
 * 특정 슬롯(장수 1명)에 대해, 티어덱 원본 전법(main_tactics)을 우선 반영해서
 * 최대 2개의 전법을 배정한다.
 * 우선순위: ① 원본 전법 보유 시 그대로 → ② DB db_sub_tactics 중 보유분 →
 *          ③ evaluateTacticFit + family 호환성 점수 기반 자동 대체
 * usedTactics(Set)는 이 함수 안에서 직접 갱신한다(중복 전법 방지).
 */
function findBestTacticsForSlot({ generalObj, targetSetup, tactics, availableTacticsPool, usedTactics }) {
  const originalNames = (targetSetup?.main_tactics || []).filter(n => n && n !== '전법 정보 없음');
  const subCandidateNames = targetSetup?.db_sub_tactics || [];

  // 티어덱에 원본 전법 정보 자체가 없으면(구 데이터 등) 기존 범용 로직으로 폴백
  if (originalNames.length === 0) {
    const remaining = availableTacticsPool.filter(t => !usedTactics.has(t.name?.trim()));
    const generic = findBestTacticsForGeneral(generalObj, remaining);
    generic.forEach(g => usedTactics.add(g.name));
    return generic.map(g => ({ ...g, isSubstituted: true }));
  }

  const result = [];

  for (const origName of originalNames) {
    if (result.length >= 2) break;

    const originalTacticObj = tactics.find(t => t.name?.trim() === origName);

    // ① 원본 전법을 보유하고 있으면 그대로 배정
    if (!usedTactics.has(origName) && availableTacticsPool.some(t => t.name?.trim() === origName)) {
      result.push({ name: origName, grade: originalTacticObj?.grade || '황금', score: 100, isSubstituted: false });
      usedTactics.add(origName);
      continue;
    }

    // ② DB에 저장된 서브 대체 전법 중 보유한 게 있으면 우선 사용
    const ownedSub = subCandidateNames.find(
      n => !usedTactics.has(n) && availableTacticsPool.some(t => t.name?.trim() === n)
    );
    if (ownedSub) {
      const subObj = tactics.find(t => t.name?.trim() === ownedSub);
      result.push({ name: ownedSub, grade: subObj?.grade || '황금', score: 90, isSubstituted: true });
      usedTactics.add(ownedSub);
      continue;
    }

    // ③ 장수 적합도 + 전법 호환성(family) 점수 기반 자동 대체
    const remaining = availableTacticsPool.filter(t => !usedTactics.has(t.name?.trim()));
    const best = findBestSubstituteTactic(originalTacticObj, generalObj, remaining);
    if (best) {
      result.push({ name: best.tactic.name, grade: best.tactic.grade || '황금', score: Math.round(best.score), isSubstituted: true });
      usedTactics.add(best.tactic.name);
    }
  }

  // 원본 슬롯이 1개뿐이었거나 대체 실패로 2개를 못 채웠으면 일반 로직으로 나머지 채움
  if (result.length < 2) {
    const remaining = availableTacticsPool.filter(t => !usedTactics.has(t.name?.trim()));
    const filler = findBestTacticsForGeneral(generalObj, remaining).filter(
      f => !result.some(r => r.name === f.name)
    );
    for (const f of filler) {
      if (result.length >= 2) break;
      result.push({ ...f, isSubstituted: true });
      usedTactics.add(f.name);
    }
  }

  return result;
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
  pinnedDeckIds = [],
  generalRoles = [],
  connections = [],
  synergies = []
}) {
  const usedGenerals = new Set();
  const usedTactics = new Set();
  const resultSquads = [];
  const generalRoleIndex = buildGeneralRoleIndex(generalRoles);

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
        // [대체 장수 자동 발굴] - 스탯 적합도 + general_roles 랭킹(자주/잘 쓰이는 정도) +
        // 국가/연의/인연 시너지를 합산 채점해서 가장 적합한 후보 1명을 선택
        const candidates = availableGeneralsPool.filter(g => !usedGenerals.has(g.name?.trim()));
        const substitute = findBestSubstituteGeneral({
          candidates,
          targetSetup,
          currentSquadGenNames,
          generals,
          generalRoleIndex,
          connections,
          synergies
        });
        if (substitute) {
          assignedGeneral = substitute;
          usedGenerals.add(substitute.name.trim());
          isSubstituted = true;
        }
      }

      if (assignedGeneral) {
        currentSquadGenNames.push(assignedGeneral.name);

        // 티어덱 원본 전법(main_tactics) 우선 반영 → db_sub_tactics → 호환성 기반 자동 대체 순으로 전법 배정
        const bestTactics = findBestTacticsForSlot({
          generalObj: assignedGeneral,
          targetSetup,
          tactics,
          availableTacticsPool,
          usedTactics
        });

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