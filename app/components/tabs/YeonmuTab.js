'use client';
import { useState, useMemo, useEffect } from 'react';
import { useDeckAssets } from '../../../hooks/useDeckAssets';
import { useYeonmuStorage } from '../../../hooks/useYeonmuStorage';

/* ============================================================
   🎨 SquadsTab.js와 동일한 다크 오퍼레이션 테마 색상 상수
   (mockup_dark_formation.html 기준 — 값이 바뀌면 두 파일 모두 맞춰줘야 함)
============================================================ */
const SCROLL = {
  bg: '#0B0D11',
  paperLight: '#14171D',
  paperMid: '#1C2027',
  ink: '#EDEDED',
  inkFaint: '#8A8F98',
  border: '#3A3F4A',
  headerBorder: '#2A2E36',
  gold: '#B8873A',
  sealDark: '#C0453D',
  blue: '#3A7BC8',
  green: '#4E9A63',
  greenBg: '#1F2A22',
  greenSoft: '#8FBF9D',
  mono: 'var(--font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace)',
};

const WAREHOUSE_LIMITS = {
  generals: 10,
  tactics: 20,
  supportTactics: 2, // 지원 전법(등급 무관) — 모든 라운드픽 모드 공통 고정 2개
};

const STEPS = [
  { key: 'generals', label: '1. 무장' },
  { key: 'tactics', label: '2. 전법' },
  { key: 'support', label: '3. 지원' },
  { key: 'decks', label: '4. 추천덱' },
];

// 🆕 연무 드래프트 라운드픽 3종 — 게임 내에서 실제로 고른 픽을 그대로 입력받기 위한 모드.
// 셋 다 배타적(하나만 선택)이며, 공통으로 "본인 합류 장수 1명 + 지원 전법 2개(등급 무관)"가 붙는다.
const DRAFT_MODES = [
  { key: 'general', label: '① 무장 다시뽑기', desc: '보유 10명 중 1명을 다른 장수로 교체' },
  { key: 'tactic', label: '② 전법 다시뽑기', desc: '보유 20개 중 2개를 다른 전법으로 교체' },
  { key: 'tactic_support', label: '③ 전법 지원', desc: '교체 없이, 보유 보라 전법 1개를 추가 지원' },
];

// 🆕 장수 단계 진영 필터 목록
const FACTIONS = ['전체', '위', '촉', '오', '군'];

/* ============================================================
   🆕 지원 무장/전법 추천 점수 로직
   — SquadsTab.js의 ROLE_LABEL_MAP / ROLE_GROUP_MAP / getTierBadge /
     getTacticGradeBadge 와 동일한 값 사용 (값이 바뀌면 두 파일 모두 맞춰줘야 함)
============================================================ */
const ROLE_LABEL_MAP = {
  '방어_자신': '탱커', '방어_아군': '탱커',
  '딜_병기': '딜러', '딜_책략': '딜러', '딜_혼합': '딜러',
  '추격': '딜러(추격)', '액티브': '딜러(액티브)', '회심': '딜러(회심)',
  '힐': '힐러',
  '버프_자신': '버퍼', '버프_아군': '버퍼', '지원_복합': '버퍼',
  '디버프': '디버퍼',
};

const ROLE_GROUP_MAP = {
  '방어_자신': '탱', '방어_아군': '탱',
  '딜_병기': '딜', '딜_책략': '딜', '딜_혼합': '딜', '추격': '딜', '액티브': '딜', '회심': '딜',
  '힐': '힐',
  '버프_자신': '버프', '버프_아군': '버프', '지원_복합': '버프',
  '디버프': '디버프',
};

// 전법 효과 텍스트에서 겹침/보강 여부를 판단할 때 쓰는 키워드 (SquadsTab의 getTacticSimilarityScore와 동일)
const TACTIC_EFFECT_KEYWORDS = ['책략 피해', '병기 피해', '회복', '방어', '공포', '요술', '무장 해제', '능력 소진', '간파', '관통'];

// 점수 구간별 등급 배지 (S/A/B/C)
const getTierBadge = (score) => {
  const s = Number(score) || 0;
  if (s >= 90) return { label: 'S', color: SCROLL.sealDark };
  if (s >= 75) return { label: 'A', color: SCROLL.gold };
  if (s >= 60) return { label: 'B', color: SCROLL.blue };
  return { label: 'C', color: SCROLL.inkFaint };
};

// 전법 등급(보라/황금) 배지
const getTacticGradeBadge = (grade) => {
  if (!grade) return '';
  const g = String(grade).trim();
  if (g.includes('보라')) return '🟣';
  if (g.includes('황금')) return '🟡';
  return '';
};

// 지원 무장 후보 1명에 대한 추천 점수 + 이유
// - 창고에 이미 담긴 역할군(탱/딜/힐/버프/디버프)에 없는 역할을 채워주는지
// - 창고 무장과 세력이 겹쳐 세력 보너스에 기여하는지
// - 병종이 겹치지 않아 다양화에 도움이 되는지
// - 창고 무장과 인연(connections)이 있는지
// 🆕 연무대회 전용 티어(문서 "연무대회2:무장 선택" 기준) — 티어덱 매칭이 아니라
// 연무 콘텐츠 자체의 무장 강도/조합 적합성 평가 기준을 그대로 반영.
const YEONMU_TIER_MAP = {
  제갈량: 0, 조운: 0, 황월영: 0, 주유: 0, 하후돈: 0, 등애: 0, 조조: 0, 유비: 0, 동탁: 0, 초선: 0, 대교: 0,
  관우: 1, 곽가: 1, 순욱: 1, 조인: 1, 견희: 1,
  마초: 2, 장비: 2, 서서: 2, 하후연: 2, 장각: 2, 장합: 2, 손권: 2, 노숙: 2, 주창: 2, 허저: 2,
  관평: 3, 황충: 3, 전위: 3, 이유: 3, 추씨: 3, 정욱: 3,
};

// 문서에 "여러 역할을 수행할 수 있어 조합 전체의 상한선을 직접 높여준다"고 명시된 다기능 무장
const YEONMU_VERSATILE_GENERALS = ['대교', '하후돈'];

const scoreSupportGeneral = (candidate, warehouseGeneralNames, allGenerals, connections) => {
  const warehouseGens = (warehouseGeneralNames || [])
    .map((n) => allGenerals.find((g) => g.name === n))
    .filter(Boolean);

  let score = 40;
  const reasons = [];

  const existingRoleGroups = warehouseGens.map((o) => ROLE_GROUP_MAP[o.preferred_tactic_type]).filter(Boolean);
  const roleCounts = existingRoleGroups.reduce((m, r) => { m[r] = (m[r] || 0) + 1; return m; }, {});
  const candRole = ROLE_GROUP_MAP[candidate.preferred_tactic_type];
  const candRoleLabel = ROLE_LABEL_MAP[candidate.preferred_tactic_type] || candRole;

  // 연무 PDF 기준: 전열 탱커 확보가 최우선 조건 — 창고에 탱커(또는 전열 힐러)가 없으면 크게 가산
  const hasFrontHealer = warehouseGens.some(
    (o) => ROLE_GROUP_MAP[o.preferred_tactic_type] === '힐' && o.position === '전열'
  );
  if (candRole === '탱') {
    if (!roleCounts['탱'] && !hasFrontHealer) {
      score += 30;
      reasons.push('⭐ 전열 탱커 공백 보완 — 연무는 전열 생존이 최우선 조건');
    } else {
      score += 10;
      reasons.push('탱커 백업 (전열 안정성 강화)');
    }
  } else if (candRole && !roleCounts[candRole]) {
    score += 12;
    reasons.push(`창고에 없는 ${candRoleLabel} 역할 보완`);
  }

  // 연무 PDF 기준: 전투 템포가 느려 "더블 코어" 딜러 구성이 필요 — 딜러가 정확히 1명일 때 최우선 가산
  if (candRole === '딜') {
    if ((roleCounts['딜'] || 0) === 1) {
      score += 22;
      reasons.push('더블 코어 딜러 완성 (연무는 전투가 길어져 코어 2명 필요)');
    } else if (roleCounts['딜']) {
      score += 4;
      reasons.push('딜러 백업');
    }
  }

  // 연무 PDF 기준: 대교·하후돈처럼 여러 역할을 겸하는 다기능 무장은 조합 상한선을 직접 높임
  if (YEONMU_VERSATILE_GENERALS.includes(candidate.name)) {
    score += 15;
    reasons.push('다기능 무장 — 조합 전체 상한선을 직접 높임');
  }

  // 연무 PDF 기준: 발동 편차가 큰 확률형 무장은 안정성이 최우선인 연무 규칙과 상충
  if (YEONMU_VOLATILE_GENERALS.includes(candidate.name)) {
    score -= 25;
    reasons.push('⚠️ 확률형 무장 — 연무는 안정성이 핵심이라 비추천');
  }

  // 연무 PDF 기준: 연무대회 자체 무장 티어 (일반 티어덱 매칭과 별개)
  const tier = YEONMU_TIER_MAP[candidate.name];
  if (tier === 0) { score += 18; reasons.push('연무 T0급 무장'); }
  else if (tier === 1) { score += 10; reasons.push('연무 T1급 무장'); }
  else if (tier === 3) { score -= 5; reasons.push('연무 T3급 (상대적으로 약함)'); }

  const sameFactionCount = warehouseGens.filter((o) => o.faction && o.faction === candidate.faction).length;
  if (candidate.faction && sameFactionCount > 0) {
    score += Math.min(10, sameFactionCount * 4);
    reasons.push(`${candidate.faction} 세력 ${sameFactionCount}명과 소속 일치`);
  }

  if (connections && connections.length > 0 && warehouseGeneralNames && warehouseGeneralNames.length > 0) {
    const candName = candidate.name?.trim();
    const hasConn = connections.some((conn) => {
      const leader = conn.leader_name?.trim();
      const follower = conn.follower_name?.trim();
      return warehouseGeneralNames.some((heroName) => {
        const h = heroName?.trim();
        if (!h || h === candName) return false;
        return (leader === h && follower === candName) || (leader === candName && follower === h);
      });
    });
    if (hasConn) {
      score += 15;
      reasons.push('창고 무장과 인연 관계');
    }
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
};

// 지원 전법 후보 1개에 대한 추천 점수 + 이유
// - 창고에 있는 장수들과 실제로 궁합이 맞는지(추격 위주인데 책략 장수가 있으면 책략 전법이 유리해지도록)
// - 그 장수의 공식 추천 전법(generals.recommended_tactics)에 포함되는지
// - 등급(보라/황금)이 높은지
// - 창고 전법들이 아직 다루지 않는 효과 키워드를 새로 보강해주는지
const scoreSupportTactic = (candidate, warehouseGeneralNames, warehouseTacticNames, allGenerals, allTactics) => {
  let score = 40;
  const reasons = [];
  const effect = candidate.effect || '';

  // 🆕 창고 장수 로스터와의 실제 궁합 — 예전엔 이 부분이 아예 없어서 창고에 책략 장수가 있어도
  // 책략 전법이 전혀 유리하게 안 나왔음. 창고 장수 전원 대상으로 scoreTacticForGeneral을 돌려
  // 가장 궁합 좋은 장수 기준으로 가산한다(그 장수에게 실제 배정될 후보라는 뜻은 아니고, "이 전법이
  // 창고 로스터에 얼마나 쓸모 있는가"를 보는 것).
  const warehouseGens = (warehouseGeneralNames || [])
    .map((n) => allGenerals.find((g) => g.name === n))
    .filter(Boolean);

  let bestFitGeneralName = null;

  if (warehouseGens.length > 0) {
    const fits = warehouseGens.map((g) => ({ general: g, fit: scoreTacticForGeneral(candidate, g) }));
    const best = fits.reduce((a, b) => (b.fit.score > a.fit.score ? b : a));
    // scoreTacticForGeneral은 0~100+ 범위라 지원 점수(0~100) 스케일에 맞춰 가중치(0.5)로 반영
    score += Math.round(best.fit.score * 0.5) - 15; // 기본 궁합(30점)은 이미 반영돼 있으므로 상수 보정
    bestFitGeneralName = best.general.name;
    if (best.fit.typeMatched) {
      reasons.push(`${best.general.name}(${best.general.preferred_tactic_type || '역할 미상'}) 궁합 전법`);
    }
    if (isOfficiallyRecommended(best.general, candidate.name)) {
      reasons.push(`⭐ ${best.general.name} 공식 추천 전법 (장수 도감)`);
    }
  }

  // 연무 PDF 기준: 병법/장비 보너스가 없어 기본 피해량이 낮음 → "고정 수치 피해"가
  // "퍼센트 피해 증가"보다 실질적으로 더 유리 (게임 내 계산식: 기본 피해 × 퍼센트 증가)
  const hasFixed = ['고정 피해', '고정 수치', '추가 피해'].some((kw) => effect.includes(kw));
  const hasPercentOnly = !hasFixed && ['피해 증가', '피해량 증가'].some((kw) => effect.includes(kw));
  if (hasFixed) {
    score += 22;
    reasons.push('⭐ 고정 수치 피해 전법 — 연무는 기본 피해가 낮아 퍼센트 증가보다 유리');
  } else if (hasPercentOnly) {
    score -= 8;
    reasons.push('퍼센트 피해 증가형 — 연무에서는 상대적으로 비효율적');
  }

  // 연무 PDF 기준: 전열 생존(방어/피해 감소)이 매우 중요 — 금낭 라운드엔 이 계열이 등장하지 않음
  if (effect.includes('받는 피해') && effect.includes('감소')) {
    score += 16;
    reasons.push('피해 감소 전법 (연무 전열 생존에 핵심)');
  } else if (effect.includes('방어')) {
    score += 10;
    reasons.push('방어 계열 전법');
  }

  // 연무 PDF 기준: 무기 봉인/침묵 등 제어 전법은 범용성이 높음
  if (['무장 해제', '침묵', '봉인', '능력 소진'].some((kw) => effect.includes(kw))) {
    score += 10;
    reasons.push('제어 전법 (범용성 높음)');
  }

  const grade = String(candidate.grade || '').trim();
  if (grade.includes('황금')) {
    score += 12;
    reasons.push('황금 등급 전법');
  } else if (grade.includes('보라')) {
    score += 6;
    reasons.push('보라 등급 전법');
  }

  const warehouseTacs = (warehouseTacticNames || [])
    .map((n) => allTactics.find((t) => t.name === n))
    .filter(Boolean);

  const coveredKeywords = new Set();
  warehouseTacs.forEach((wt) => {
    TACTIC_EFFECT_KEYWORDS.forEach((kw) => {
      if ((wt.effect || '').includes(kw)) coveredKeywords.add(kw);
    });
  });

  const newKeywords = TACTIC_EFFECT_KEYWORDS.filter((kw) => effect.includes(kw) && !coveredKeywords.has(kw));
  if (newKeywords.length > 0) {
    score += 10;
    reasons.push(`${newKeywords.join('/')} 효과 보강`);
  }

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons, bestFitGeneralName };
};

/* ============================================================
   🆕 창고(+지원) 장수·전법 풀만으로 3개 부대(1부대 3명) 추천 편성
   — 1순위: 실제로 검증된 티어덱(장수 3명 전원 보유)을 장수가 안 겹치는 선에서
     최우선으로 그대로 배치(전법도 티어덱 원본 그대로 사용).
   — 2순위: 티어덱으로 못 채운 나머지 자리만, 남은 장수/전법 풀로 기존 휴리스틱
     greedy 배정을 적용해 빈 슬롯 없이 채운다.
============================================================ */
const YEONMU_SQUAD_COUNT = 3;
const YEONMU_SQUAD_SIZE = 3;

// PDF(연무대회 기본 로직 설명) 기준: 발동 확률이 낮고 편차가 큰 "확률형" 무장은 연무에서 페널티.
// 커뮤니티 가이드에 명시적으로 예시로 언급된 이름만 보수적으로 반영(DB에 발동확률 컬럼이 없어 하드코딩).
const YEONMU_VOLATILE_GENERALS = ['장각', '곽가'];

// 연무대회는 병법/장비 보너스가 없어 "퍼센트 피해 증가"보다 "고정 수치 피해 증가"가 더 유리하다는
// PDF 가이드를 반영한 키워드 — 전법 효과 텍스트에 이 표현이 있으면 가산점.
const FIXED_DAMAGE_KEYWORDS = ['고정 피해', '고정 수치', '추가 피해'];
const PERCENT_DAMAGE_KEYWORDS = ['피해 증가', '피해량 증가'];

// squadEngine.js의 evaluateTacticFit과 동일한 파싱 로직 — generals.recommended_tactics
// (배열 / JSON 문자열 / 콤마구분 문자열 모두 가능한 컬럼)을 이름 배열로 변환
const parseRecommendedTactics = (general) => {
  const raw = general?.recommended_tactics;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [raw];
    } catch {
      return raw.split(',').map((s) => s.trim());
    }
  }
  return [];
};

const isOfficiallyRecommended = (general, tacticName) =>
  parseRecommendedTactics(general).some((n) => n?.trim() === tacticName?.trim());

// 전법 1개가 장수 1명에게 얼마나 궁합이 맞는지 점수화.
// 궁합이 전혀 없어도 최소 점수(30점)는 주기 때문에, 남는 전법이라도 반드시 배정될 수 있다.
const scoreTacticForGeneral = (tactic, general) => {
  let score = 30;
  const reasons = [];
  let typeMatched = false;

  const role = general.preferred_tactic_type || general.primary_role || '';
  const mainStat = general.main_stat || general.stat_focus || '';
  const effect = tactic.effect || '';
  const grade = String(tactic.grade || '').trim();

  if (role.includes('책략') && effect.includes('책략 피해')) { score += 30; reasons.push('책략형 궁합'); typeMatched = true; }
  if (role.includes('병기') && effect.includes('병기 피해')) { score += 30; reasons.push('병기형 궁합'); typeMatched = true; }
  if (role.includes('힐') && effect.includes('회복')) { score += 30; reasons.push('회복 궁합'); typeMatched = true; }
  if ((role.includes('방어') || role.includes('탱')) && effect.includes('방어')) { score += 25; reasons.push('방어 궁합'); typeMatched = true; }
  if (role.includes('디버프') && (effect.includes('공포') || effect.includes('무장 해제') || effect.includes('능력 소진') || effect.includes('간파'))) {
    score += 25; reasons.push('디버프 궁합'); typeMatched = true;
  }
  if (role.includes('버프') && !typeMatched && (effect.includes('증가') || effect.includes('회복'))) {
    score += 15; reasons.push('버프 계열'); typeMatched = true;
  }

  if (mainStat.includes('무력') && effect.includes('병기 피해')) score += 8;
  if (mainStat.includes('지력') && effect.includes('책략 피해')) score += 8;

  // 🆕 장수 도감의 공식 추천 전법(generals.recommended_tactics)에 포함되면 최우선 가산 —
  // 예전엔 이 필드를 아예 안 봐서, 도감에 좋은 추천 전법이 많아도 점수에 전혀 반영이 안 됐음
  if (isOfficiallyRecommended(general, tactic.name)) {
    score += 35;
    reasons.push('⭐ 공식 추천 전법 (장수 도감)');
    typeMatched = true;
  }

  if (grade.includes('황금')) { score += 12; reasons.push('황금 등급'); }
  else if (grade.includes('보라')) { score += 6; reasons.push('보라 등급'); }

  // 🆕 연무대회 전용 가산점: 병법 시스템이 없어 전법 자체의 "고정 수치 피해" 효과가 더 유리(PDF 가이드 반영)
  if (FIXED_DAMAGE_KEYWORDS.some((kw) => effect.includes(kw))) {
    score += 10; reasons.push('연무 특화(고정 피해)');
  }

  if (!typeMatched) reasons.push('타입 불일치 · 대체 배정');

  return { score: Math.max(0, Math.round(score)), reasons, typeMatched };
};

// 장수 1명이 현재 전법 풀 전체와 얼마나 궁합이 좋은지(=풀을 얼마나 잘 활용할 수 있는지) 점수화.
// 실제로 한 장수에게는 전법이 최대 2개까지 배정되므로, 궁합 상위 2개 전법의 평균 점수로 판단한다.
const scoreGeneralTacticUtilization = (general, tacticsPool) => {
  if (!tacticsPool || tacticsPool.length === 0) return 0;
  const scores = tacticsPool.map((t) => scoreTacticForGeneral(t, general).score).sort((a, b) => b - a);
  const top2 = scores.slice(0, 2);
  return top2.reduce((a, b) => a + b, 0) / top2.length;
};

// 🆕 진형 추천 — SquadsTab.js의 getPositionEffectBonus/evaluateFormationFit과 동일한 판단 기준을,
// 연무 부대의 heroes 구조({ general, tactics })에 맞게 이식. 진형 후보 전체를 돌며 가장 궁합 좋은 진형을 고른다.
const getPositionEffectBonus = (effectText, gen) => {
  if (!effectText || !gen) return 0;
  const mainStat = gen.main_stat || gen.stat_focus || '';
  const role = gen.preferred_tactic_type || gen.primary_role || '';
  let bonus = 0;

  if (effectText.includes('받는 피해') && effectText.includes('감소')) {
    if (role.includes('방어') || role.includes('탱') || mainStat.includes('통솔')) bonus += 15;
  }
  if (effectText.includes('주는 피해') && effectText.includes('증가')) {
    if (role.includes('딜') || role.includes('공격') || role.includes('책략') || mainStat.includes('무력') || mainStat.includes('지력')) bonus += 15;
  }
  if (effectText.includes('통솔') && effectText.includes('증가')) {
    if (role.includes('방어') || role.includes('탱') || mainStat.includes('통솔')) bonus += 12;
  }
  if (effectText.includes('연타') && effectText.includes('증가')) {
    if (mainStat.includes('무력') || role.includes('병기') || role.includes('딜') || role.includes('공격')) bonus += 12;
  }
  if ((effectText.includes('회심') || effectText.includes('모책') || effectText.includes('묘책')) && effectText.includes('증가')) {
    if (role.includes('딜') || role.includes('공격') || role.includes('책략') || role.includes('병기') || mainStat.includes('무력') || mainStat.includes('지력')) bonus += 12;
  }
  if (effectText.includes('피신') && effectText.includes('증가')) {
    if (role.includes('방어') || role.includes('보조') || role.includes('탱')) bonus += 10;
  }

  return bonus;
};

const parseFormationGridArray = (formation) => {
  try {
    if (Array.isArray(formation.grid)) return formation.grid.map(Number);
    const raw = String(formation.grid || '');
    return (raw.includes('[') ? JSON.parse(raw) : raw.split(',')).map(Number);
  } catch {
    return [0, 1, 0, 0, 1, 1];
  }
};

// 부대(heroes) 하나를 특정 진형의 그리드에 배치해 이름 그리드를 만든다 (표시용).
const buildFormationGridForSquad = (heroes, formation) => {
  const grid = ['', '', '', '', '', ''];
  if (!heroes || !formation) return grid;
  const patternGrid = parseFormationGridArray(formation);
  const isSlotOpen = (i) => patternGrid[i] === 1;
  const takenSlots = new Set();
  const leftover = [];

  heroes.forEach((hero, index) => {
    const gen = hero.general;
    if (!gen) return;
    const pos = gen.position || '균형';
    const col = index % 3;
    const frontIdx = col;
    const backIdx = col + 3;

    if (pos === '전열' && isSlotOpen(frontIdx) && !takenSlots.has(frontIdx)) {
      grid[frontIdx] = gen.name; takenSlots.add(frontIdx);
    } else if (pos === '후열' && isSlotOpen(backIdx) && !takenSlots.has(backIdx)) {
      grid[backIdx] = gen.name; takenSlots.add(backIdx);
    } else if (isSlotOpen(frontIdx) && !takenSlots.has(frontIdx)) {
      grid[frontIdx] = gen.name; takenSlots.add(frontIdx);
    } else if (isSlotOpen(backIdx) && !takenSlots.has(backIdx)) {
      grid[backIdx] = gen.name; takenSlots.add(backIdx);
    } else {
      leftover.push(gen.name);
    }
  });

  leftover.forEach((name) => {
    const openSlot = [0, 1, 2, 3, 4, 5].find((i) => isSlotOpen(i) && !takenSlots.has(i));
    if (openSlot !== undefined) { grid[openSlot] = name; takenSlots.add(openSlot); }
  });

  return grid;
};

// 부대(heroes)가 진형 하나와 얼마나 궁합이 좋은지 점수화 (전열/후열 배치 + 진형 효과 궁합)
const scoreFormationForSquad = (heroes, formation) => {
  let score = 50;
  const reasons = [];
  const gridArr = parseFormationGridArray(formation);
  const frontCount = gridArr.slice(0, 3).filter((v) => Number(v) === 1).length;
  const backCount = gridArr.slice(3, 6).filter((v) => Number(v) === 1).length;

  heroes.forEach((hero) => {
    const gen = hero.general;
    if (!gen) return;
    const pos = gen.position || '균형';

    if (pos === '전열' && frontCount >= 1) {
      score += 10;
      const bonus = getPositionEffectBonus(formation.front_effect, gen);
      score += bonus;
      if (bonus > 0) reasons.push(`${gen.name} 전열 배치 궁합`);
    }
    if (pos === '후열' && backCount >= 1) {
      score += 10;
      const bonus = getPositionEffectBonus(formation.back_effect, gen);
      score += bonus;
      if (bonus > 0) reasons.push(`${gen.name} 후열 배치 궁합`);
    }
  });

  return { score: Math.min(100, Math.max(30, Math.round(score))), reasons };
};

// 진형 후보 전체 중 이 부대에 가장 잘 맞는 진형을 골라 반환
const pickBestFormationForSquad = (heroes, formationsList, generalsList) => {
  if (!formationsList || formationsList.length === 0 || !heroes || heroes.length === 0) return null;
  let best = null;
  formationsList.forEach((f) => {
    const { score, reasons } = scoreFormationForSquad(heroes, f);
    if (!best || score > best.score) {
      best = { formation: f, score, reasons, grid: buildFormationGridForSquad(heroes, f) };
    }
  });
  return best;
};

// 창고(+지원) 장수/전법 풀에서, 이미 티어덱으로 선점된 이름을 제외한 "나머지"만으로
// 남은 부대 슬롯을 채운다. usedGeneralNames/usedTacticNames는 앞서 티어덱이 이미 사용한 이름들.
const buildRecommendedYeonmuSquads = (
  generalNames,
  tacticNames,
  allGenerals,
  allTactics,
  squadCount = YEONMU_SQUAD_COUNT,
  squadSize = YEONMU_SQUAD_SIZE,
  usedGeneralNames = new Set(),
  usedTacticNames = new Set(),
  prefilledSquads = [] // 티어덱이 이미 채워놓은 부대(그대로 유지, 이 함수는 나머지 부대만 만듦
) => {
  const pool = (generalNames || [])
    .filter((n) => !usedGeneralNames.has(n))
    .map((n) => allGenerals.find((g) => g.name === n))
    .filter(Boolean);
  const tacticsPool = (tacticNames || [])
    .filter((n) => !usedTacticNames.has(n))
    .map((n) => allTactics.find((t) => t.name === n))
    .filter(Boolean);

  const remainingSquadCount = Math.max(0, squadCount - prefilledSquads.length);

  // 🆕 PDF 가이드(전열 탱커 1 + 더블 코어 딜러 2) 반영: 부대마다 "전열(탱커 또는 전열 힐러) 1명 + 딜러 2명"
  // 구성을 우선 지향한다. 같은 역할군 안에서 고를 후보가 여럿이면, 창고 전법 풀(tacticsPool)과 궁합이
  // 가장 좋은(=풀을 잘 활용할 수 있는) 장수부터 우선 배정한다.
  const isFrontRole = (g) => {
    const group = ROLE_GROUP_MAP[g.preferred_tactic_type];
    if (group === '탱') return true;
    if (group === '힐' && g.position === '전열') return true; // 전열 힐러는 탱 대용으로 인정
    return false;
  };
  const isDealerRole = (g) => ROLE_GROUP_MAP[g.preferred_tactic_type] === '딜';

  const byUtilization = (list) =>
    [...list].sort((a, b) => scoreGeneralTacticUtilization(b, tacticsPool) - scoreGeneralTacticUtilization(a, tacticsPool));

  const frontCandidates = byUtilization(pool.filter(isFrontRole));
  const dealerCandidates = byUtilization(pool.filter(isDealerRole));

  const squads = Array.from({ length: remainingSquadCount }, () => []);
  const used = new Set();

  // 1차: 부대마다 전열(탱커/전열 힐러) 1명 우선 배정 — 같은 세력 우선 배치는 아래 나머지 배정에서 고려
  squads.forEach((sq) => {
    const g = frontCandidates.find((c) => !used.has(c.name));
    if (g) { sq.push(g); used.add(g.name); }
  });

  // 2차: 부대마다 딜러 2명씩 배정 (더블 코어 딜러 구성)
  squads.forEach((sq) => {
    while (sq.length < squadSize) {
      const g = dealerCandidates.find((c) => !used.has(c.name));
      if (!g) break;
      sq.push(g); used.add(g.name);
    }
  });

  // 3차: 전열/딜러가 부족해 아직 자리가 남은 부대는, 남은 인원 중 전법 풀 궁합이 좋은 순으로
  // 빈 슬롯 없이 반드시 채운다 (역할 이상형이 없어도 부대 완성이 최우선).
  const leftoverSorted = byUtilization(pool.filter((g) => !used.has(g.name)));
  squads.forEach((sq) => {
    while (sq.length < squadSize) {
      const g = leftoverSorted.find((c) => !used.has(c.name));
      if (!g) break;
      sq.push(g); used.add(g.name);
    }
  });

  const bench = pool.filter((g) => !used.has(g.name));
  const squadGenerals = squads.flat();

  const pairs = [];
  squadGenerals.forEach((g) => {
    tacticsPool.forEach((t) => {
      const fit = scoreTacticForGeneral(t, g);
      pairs.push({ generalName: g.name, tacticName: t.name, ...fit });
    });
  });
  pairs.sort((a, b) => b.score - a.score);

  const tacticCount = {};
  const tacticUsed = new Set();
  const assignedTactics = {};
  squadGenerals.forEach((g) => { assignedTactics[g.name] = []; tacticCount[g.name] = 0; });

  pairs.forEach((p) => {
    if (tacticCount[p.generalName] >= 2) return;
    if (tacticUsed.has(p.tacticName)) return;
    assignedTactics[p.generalName].push({ name: p.tacticName, score: p.score, reasons: p.reasons, typeMatched: p.typeMatched });
    tacticCount[p.generalName] += 1;
    tacticUsed.add(p.tacticName);
  });

  const autoDecks = squads.map((sq, i) => ({
    squadNum: prefilledSquads.length + i + 1,
    heroes: sq.map((g) => ({ general: g, tactics: assignedTactics[g.name] || [] })),
    source: 'auto',
  }));

  const decks = [...prefilledSquads, ...autoDecks];

  const leftoverTactics = tacticsPool.filter((t) => !tacticUsed.has(t.name));

  return { decks, bench, leftoverTactics };
};

// 🆕 병종(방패병/궁병/창병/기병) 동일 병종 인원수 보너스 — glossary_rows.json "조합_및_상성" 카테고리 수치 그대로 반영.
// (상성 관계 자체 - 방패병>궁병>창병>기병>방패병 - 는 상대 부대가 있어야 계산 가능해 여기선 다루지 않고,
// 우리 부대 안에서 같은 병종을 몇 명 확보했는지에 대한 조합 보너스만 반영합니다.)
const TROOP_TYPE_BONUS = {
  방패병: { 2: 3.5, 3: 5.0 },
  궁병: { 2: 3.5, 3: 5.0 },
  창병: { 2: 2.1, 3: 3.0 }, // 받는 피해 감소분(1.4%/2.0%)도 있지만 점수 환산은 주는 피해 증가분 기준으로 단순화
  기병: { 2: 1.4, 3: 2.0 },
};

const scoreTroopTypeForSquad = (heroes) => {
  const reasons = [];
  const counts = {};
  heroes.forEach((h) => {
    const type = h.general?.troop_type;
    if (type) counts[type] = (counts[type] || 0) + 1;
  });

  let bonus = 0;
  Object.entries(counts).forEach(([type, count]) => {
    const table = TROOP_TYPE_BONUS[type];
    if (!table) return;
    const tier = count >= 3 ? 3 : count >= 2 ? 2 : null;
    if (!tier) return;
    const pct = table[tier];
    bonus += pct * 2; // % 수치를 0~100점 스케일 가산점으로 환산(휴리스틱 가중치)
    reasons.push(`${type} ${count}명 조합 보너스 (+${pct}%)`);
  });

  return { bonus: Math.round(bonus), reasons };
};

// 🆕 인연(synergies_rows.json) 보너스 — 부대 3명 안에서 조건(req_count) 충족되는 인연 세트를 찾아 가산.
// effect 수치가 인연마다 제각각(포인트/퍼센트/확률 등)이라 정확한 환산 대신, 발동 여부 자체에
// 고정 가산점(+15/인연)을 주고 실제 effect 텍스트는 이유(reasons)에 그대로 보여줘 근거를 알 수 있게 함.
const scoreSynergyForSquad = (heroes, synergies) => {
  const reasons = [];
  if (!synergies || synergies.length === 0) return { bonus: 0, reasons };

  const names = heroes.map((h) => h.general?.name).filter(Boolean);
  let bonus = 0;

  synergies.forEach((s) => {
    const members = typeof s.members === 'string' ? JSON.parse(s.members) : (s.members || []);
    const matchCount = members.filter((m) => names.includes(m.trim())).length;
    if (matchCount >= (s.req_count || 2)) {
      bonus += 15;
      reasons.push(`인연 «${s.name}» 발동 — ${s.effect}`);
    }
  });

  return { bonus: Math.round(bonus), reasons };
};

// 🆕 50레벨 기준 스탯 가산점 — generals.strength/intelligence/command(squadEngine.js와 동일 필드,
// 이미 만렙(50) 기준 수치라는 전제)이 역할에 맞게 실제로 높은지를 반영. 장비·병법이 없는 연무에서는
// 전법 궁합만큼이나 순수 스탯 총량이 생존/딜량을 좌우하기 때문에 별도로 가산.
const scoreLevel50StatForSquad = (heroes) => {
  const reasons = [];
  let bonus = 0;

  heroes.forEach((h) => {
    const g = h.general;
    if (!g) return;
    const str = parseFloat(g.strength || 0);
    const int = parseFloat(g.intelligence || 0);
    const cmd = parseFloat(g.command || 0);
    const role = ROLE_GROUP_MAP[g.preferred_tactic_type];

    if (role === '딜') {
      const mainStat = Math.max(str, int);
      if (mainStat >= 200) { bonus += 8; reasons.push(`${g.name} 50렙 스탯 우수(${mainStat})`); }
      else if (mainStat >= 180) { bonus += 4; }
    } else if (role === '탱') {
      if (cmd >= 200) { bonus += 8; reasons.push(`${g.name} 50렙 통솔 우수(${cmd})`); }
      else if (cmd >= 180) { bonus += 4; }
    }
  });

  return { bonus: Math.round(bonus), reasons };
};

// 🆕 사용자가 직접 부대(3명) 구성을 수정했을 때, 그 조합이 연무대회 기준으로 얼마나 괜찮은지 점수화.
// PDF(연무대회(1) 기본 로직 설명 / 연무대회2:무장 선택)에 나온 기준을 그대로 반영:
//  - 전열 탱커 유무가 매우 중요
//  - 단일 딜러보다 더블 코어(딜러 2명) 구성이 유리 (전투 템포가 느려짐)
//  - 확률형(발동 편차 큰) 무장은 안정성이 떨어져 페널티
//  - 병법/장비 보너스가 없어 전법의 "고정 수치 피해"가 "퍼센트 피해 증가"보다 유리
//  - 전법이 무장 타입과 실제로 궁합이 맞는지(typeMatched)도 반영
//  - 🆕 병종 조합, 인연(시너지), 50렙 스탯도 함께 반영 (synergies는 호출부에서 전달)
const scoreYeonmuSquadComposition = (heroes, synergies = []) => {
  if (!heroes || heroes.length === 0) return { score: 0, reasons: ['부대가 비어있음'] };

  let score = 50;
  const reasons = [];

  const roles = heroes.map((h) => ROLE_GROUP_MAP[h.general?.preferred_tactic_type] || '기타');
  const roleCounts = roles.reduce((m, r) => { m[r] = (m[r] || 0) + 1; return m; }, {});

  // 1. 전열 탱커 유무 (전열 힐러는 탱 대용으로 일부 인정)
  const hasFrontHealer = heroes.some(
    (h) => ROLE_GROUP_MAP[h.general?.preferred_tactic_type] === '힐' && h.general?.position === '전열'
  );
  if (roleCounts['탱'] >= 1) {
    score += 15;
    reasons.push('전열 탱커 보유 (생존력 확보)');
  } else if (hasFrontHealer) {
    score += 10;
    reasons.push('전열 힐러가 탱커 역할 겸함 (생존력 일부 확보)');
  } else {
    score -= 20;
    reasons.push('⚠️ 전열 탱커 없음 — 연무는 전열 생존이 핵심');
  }

  // 2. 더블 코어 딜러 구성
  const dealerCount = roleCounts['딜'] || 0;
  if (dealerCount >= 2) {
    score += 15;
    reasons.push('더블 코어 딜러 구성 (느린 전투 템포에 유리)');
  } else if (dealerCount === 1) {
    score -= 10;
    reasons.push('단일 딜러 — 연무는 전투가 길어져 코어 1명으론 부족');
  } else {
    score -= 15;
    reasons.push('⚠️ 딜러 없음 — 딜 캐리 부재');
  }

  // 3. 힐/버프 지원
  if (roleCounts['힐']) {
    score += 8;
    reasons.push('힐러 포함 (병력 손실 방지)');
  }

  // 4. 확률형(불안정) 무장 페널티
  const volatileMembers = heroes.filter((h) => YEONMU_VOLATILE_GENERALS.includes(h.general?.name));
  if (volatileMembers.length > 0) {
    score -= volatileMembers.length * 12;
    reasons.push(`⚠️ 확률형 무장 포함(${volatileMembers.map((h) => h.general.name).join(', ')}) — 안정성 저하`);
  }

  // 5. 전법 타입 매칭률 + 고정 수치 피해 전법 가산
  const allTactics = heroes.flatMap((h) => h.tactics || []);
  if (allTactics.length > 0) {
    const matchedCount = allTactics.filter((t) => t.typeMatched).length;
    const matchRatio = matchedCount / allTactics.length;
    score += Math.round(matchRatio * 15);
    if (matchRatio < 0.5) reasons.push('전법-무장 궁합 낮음 (타입 불일치 다수)');

    const fixedDamageCount = allTactics.filter((t) => (t.reasons || []).some((r) => r.includes('고정 피해'))).length;
    if (fixedDamageCount > 0) {
      score += fixedDamageCount * 5;
      reasons.push('고정 수치 피해 전법 보유 (연무 유리)');
    }
  }

  // 6. 병종 조합 보너스
  const troopResult = scoreTroopTypeForSquad(heroes);
  score += troopResult.bonus;
  reasons.push(...troopResult.reasons);

  // 7. 인연(시너지) 보너스
  const synergyResult = scoreSynergyForSquad(heroes, synergies);
  score += synergyResult.bonus;
  reasons.push(...synergyResult.reasons);

  // 8. 50레벨 스탯 가산점
  const statResult = scoreLevel50StatForSquad(heroes);
  score += statResult.bonus;
  reasons.push(...statResult.reasons);

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons };
};

// 🆕 이미지 없이 텍스트 위주로 표시하는 선택 카드
// (보유 여부 grayscale 없음 — 연무대회 창고는 보유 무관하게 전체 풀에서 선택)
function SelectableCard({ name, subLabel, isSelected, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'relative',
        borderRadius: '8px',
        background: SCROLL.paperMid,
        border: `1px solid ${isSelected ? SCROLL.gold : SCROLL.headerBorder}`,
        padding: '10px 8px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !isSelected ? 0.4 : 1,
      }}
    >
      <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {name}
      </p>
      {subLabel && (
        <p style={{ margin: '3px 0 0', fontSize: '10px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono }}>{subLabel}</p>
      )}
      {isSelected && (
        <div style={{
          position: 'absolute', top: '4px', right: '4px', width: '14px', height: '14px',
          borderRadius: '50%', background: SCROLL.gold, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', color: SCROLL.paperLight, fontWeight: 700,
        }}>✓</div>
      )}
    </div>
  );
}

export default function YeonmuTab() {
  const { generals = [], tactics = [], selectedGenerals = [], selectedTactics = [], connections = [], formations = [], synergies = [] } = useDeckAssets();
  const { warehouse, setWarehouse, isReady, resetWarehouse } = useYeonmuStorage();
  const [step, setStep] = useState('generals');

  // 🆕 텍스트 검색 및 진영 필터 state
  const [generalSearch, setGeneralSearch] = useState('');
  const [tacticSearch, setTacticSearch] = useState('');
  const [factionFilter, setFactionFilter] = useState('전체');

  // 🆕 3단계(지원) 화면에서 지원 무장을 고르면 목록을 자동으로 접어서, 스크롤 없이
  // 바로 아래 지원 전법 목록이 보이게 함. 선택을 해제하면 다시 펼쳐짐(헤더 클릭으로도 토글 가능).
  const [supportGeneralOpen, setSupportGeneralOpen] = useState(true);
  useEffect(() => {
    setSupportGeneralOpen(!warehouse.supportGeneral);
  }, [warehouse.supportGeneral]);

  // 🆕 지원 전법 2개가 다 채워지면 목록을 자동으로 접음(장수와 동일 패턴). 하나라도 빠지면 다시 펼쳐짐.
  const [supportTacticsOpen, setSupportTacticsOpen] = useState(true);
  useEffect(() => {
    setSupportTacticsOpen(warehouse.supportTactics.length < WAREHOUSE_LIMITS.supportTactics);
  }, [warehouse.supportTactics]);

  const toggleGeneral = (name) => {
    setWarehouse((prev) => {
      const exists = prev.generals.includes(name);
      if (exists) {
        return { ...prev, generals: prev.generals.filter((n) => n !== name) };
      }
      if (prev.generals.length >= WAREHOUSE_LIMITS.generals) return prev;
      return { ...prev, generals: [...prev.generals, name] };
    });
  };

  const toggleTactic = (name) => {
    setWarehouse((prev) => {
      const exists = prev.tactics.includes(name);
      if (exists) {
        return { ...prev, tactics: prev.tactics.filter((n) => n !== name) };
      }
      if (prev.tactics.length >= WAREHOUSE_LIMITS.tactics) return prev;
      return { ...prev, tactics: [...prev.tactics, name] };
    });
  };

  // 🆕 진영 필터 + 검색어를 함께 적용한 장수 목록 (1단계)
  const filteredGenerals = useMemo(() => {
    let list = generals;
    if (factionFilter !== '전체') {
      list = list.filter((g) => g.faction === factionFilter);
    }
    if (generalSearch.trim()) {
      const q = generalSearch.trim().toLowerCase();
      list = list.filter((g) => g.name?.toLowerCase().includes(q));
    }
    return list;
  }, [generals, factionFilter, generalSearch]);

  // 🆕 검색어를 적용한 전법 목록 (2단계)
  const filteredTactics = useMemo(() => {
    if (!tacticSearch.trim()) return tactics;
    const q = tacticSearch.trim().toLowerCase();
    return tactics.filter((t) => t.name?.toLowerCase().includes(q));
  }, [tactics, tacticSearch]);

  // 🆕 이름을 입력하고 Enter를 누르면 바로 창고에 추가 (정확히 일치하는 이름 우선, 없으면 필터링된 첫 결과)
  const handleGeneralSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const q = generalSearch.trim().toLowerCase();
    if (!q) return;
    const exact = generals.find((g) => g.name?.toLowerCase() === q);
    const target = exact || filteredGenerals[0];
    if (target) {
      toggleGeneral(target.name);
      setGeneralSearch('');
    }
  };

  const handleTacticSearchKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    const q = tacticSearch.trim().toLowerCase();
    if (!q) return;
    const exact = tactics.find((t) => t.name?.toLowerCase() === q);
    const target = exact || filteredTactics[0];
    if (target) {
      toggleTactic(target.name);
      setTacticSearch('');
    }
  };

  // 3단계 후보: 창고 단계와 달리 "보유한" 장수/전법 중, 이미 창고에 있는 이름은 제외
  const supportGeneralCandidates = useMemo(() => {
    return generals.filter(
      (g) => selectedGenerals.includes(g.id) && !warehouse.generals.includes(g.name)
    );
  }, [generals, selectedGenerals, warehouse.generals]);

  const supportTacticCandidates = useMemo(() => {
    return tactics.filter(
      (t) => selectedTactics.includes(t.id) && !warehouse.tactics.includes(t.name)
    );
  }, [tactics, selectedTactics, warehouse.tactics]);

  // 🆕 지원 무장/전법 후보를 추천 점수 내림차순으로 정렬 (창고 구성과의 시너지 기반)
  const scoredSupportGeneralCandidates = useMemo(() => {
    return supportGeneralCandidates
      .map((g) => ({ ...g, ...scoreSupportGeneral(g, warehouse.generals, generals, connections) }))
      .sort((a, b) => b.score - a.score);
  }, [supportGeneralCandidates, warehouse.generals, generals, connections]);

  const scoredSupportTacticCandidates = useMemo(() => {
    return supportTacticCandidates
      .map((t) => ({ ...t, ...scoreSupportTactic(t, warehouse.generals, warehouse.tactics, generals, tactics) }))
      .sort((a, b) => b.score - a.score);
  }, [supportTacticCandidates, warehouse.generals, warehouse.tactics, generals, tactics]);

  // 🆕 "이게 왜 필요한지" 명시적 추천 카드용 데이터.
  // 지원 무장: 아직 뽑지 않았을 때만 1순위 후보를 강조해서 보여줌.
  const supportGeneralRecommendation = useMemo(() => {
    if (warehouse.supportGeneral) return null;
    return scoredSupportGeneralCandidates[0] || null;
  }, [warehouse.supportGeneral, scoredSupportGeneralCandidates]);

  // 🆕 지원 전법 2개(등급 무관, 모든 라운드픽 모드 공통) — 아직 담지 않은 후보 중 점수 상위 항목을 강조 추천.
  // 🆕 한 장수가 실전에서 들 수 있는 전법은 최대 2개뿐이라, 같은 장수 위주 후보가 몰리지
  // 않도록(bestFitGeneralName 기준) 장수 1명당 추천은 최대 2개까지만 인정한다. 캡을 채운 장수의
  // 전법만 남았고 대체할 다른 장수 후보가 없으면, 억지로 채우지 않고 그 슬롯은 비워둔다.
  const supportTacticRecommendations = useMemo(() => {
    const remaining = WAREHOUSE_LIMITS.supportTactics - warehouse.supportTactics.length;
    if (remaining <= 0) return [];

    const available = scoredSupportTacticCandidates.filter((t) => !warehouse.supportTactics.includes(t.name));

    const picks = [];
    const pickedNames = new Set();
    const generalUsage = {}; // bestFitGeneralName -> 이번 추천에서 이미 몇 개 배정했는지

    for (let i = 0; i < remaining; i++) {
      let pool = available.filter((t) => !pickedNames.has(t.name));

      // 장수당 최대 2개 제한을 지키는 후보만 인정.
      // ⚠️ 예전엔 `withinCap || pool[0]`로 폴백해서, 이미 캡을 채운 장수(예: 정욱)의
      // 남은 전법이 대체 후보가 없을 때도 다시 뽑혀버렸다(= 한 장수가 슬롯을 다 차지하는 버그).
      // 캡 초과인데 대체 후보가 없으면 이 슬롯은 그냥 비워두는 게 맞다 — 억지로 채우지 않는다.
      const best = pool.find((t) => {
        const g = t.bestFitGeneralName;
        if (!g) return true;
        return (generalUsage[g] || 0) < 2;
      });

      if (best) {
        picks.push(best);
        pickedNames.add(best.name);
        if (best.bestFitGeneralName) {
          generalUsage[best.bestFitGeneralName] = (generalUsage[best.bestFitGeneralName] || 0) + 1;
        }
      }
    }

    return picks;
  }, [scoredSupportTacticCandidates, warehouse.supportTactics]);

  // 🆕 ③ 전법 지원 모드 전용 — 보유 전법 중 "보라 등급"만 후보로 좁힌 목록.
  // 지원 전법 2개(등급 무관)와는 별개 슬롯이며, warehouse.supportPurpleTactic 1개만 선택 가능.
  const supportPurpleTacticCandidates = useMemo(() => {
    if (warehouse.draftMode !== 'tactic_support') return [];
    return supportTacticCandidates.filter((t) => String(t.grade || '').includes('보라'));
  }, [supportTacticCandidates, warehouse.draftMode]);

  const scoredSupportPurpleTacticCandidates = useMemo(() => {
    return supportPurpleTacticCandidates
      .map((t) => ({ ...t, ...scoreSupportTactic(t, warehouse.generals, warehouse.tactics, generals, tactics) }))
      .sort((a, b) => b.score - a.score);
  }, [supportPurpleTacticCandidates, warehouse.generals, warehouse.tactics, generals, tactics]);

  // 🆕 보라 전법 슬롯 1순위 추천 카드용 — 아직 선택하지 않았을 때만 최고 점수 후보를 보여줌
  const supportPurpleTacticRecommendation = useMemo(() => {
    if (warehouse.draftMode !== 'tactic_support' || warehouse.supportPurpleTactic) return null;
    return scoredSupportPurpleTacticCandidates[0] || null;
  }, [warehouse.draftMode, warehouse.supportPurpleTactic, scoredSupportPurpleTacticCandidates]);

  // 🆕 라운드픽 모드에 따라 실제로 반영된 "최종 창고 장수 10명" — ① 무장 다시뽑기일 때만 교체 1건 적용
  const effectiveWarehouseGenerals = useMemo(() => {
    if (warehouse.draftMode === 'general' && warehouse.replacedGeneral?.from && warehouse.replacedGeneral?.to) {
      return warehouse.generals.map((n) => (n === warehouse.replacedGeneral.from ? warehouse.replacedGeneral.to : n));
    }
    return warehouse.generals;
  }, [warehouse.generals, warehouse.draftMode, warehouse.replacedGeneral]);

  // 🆕 라운드픽 모드에 따라 실제로 반영된 "최종 창고 전법 20개" — ② 전법 다시뽑기일 때만 교체 최대 2건 적용
  const effectiveWarehouseTactics = useMemo(() => {
    if (warehouse.draftMode === 'tactic') {
      let result = [...warehouse.tactics];
      (warehouse.replacedTactics || []).forEach(({ from, to }) => {
        if (from && to) result = result.map((n) => (n === from ? to : n));
      });
      return result;
    }
    return warehouse.tactics;
  }, [warehouse.tactics, warehouse.draftMode, warehouse.replacedTactics]);

  // 🆕 4단계 추천덱: 라운드픽 모드가 반영된 최종 창고 장수 10명 + 지원 장수 1명(선택 시),
  // 최종 창고 전법 20개 + 지원 전법 2개 + (③ 모드일 때만) 지원 보라 전법 1개 풀로 3개 부대를 자동 편성.
  // 타입이 안 맞는 전법이라도 반드시 배정되도록 buildRecommendedYeonmuSquads에서 처리.
  const deckGeneralPool = useMemo(() => {
    return warehouse.supportGeneral
      ? [...effectiveWarehouseGenerals, warehouse.supportGeneral]
      : [...effectiveWarehouseGenerals];
  }, [effectiveWarehouseGenerals, warehouse.supportGeneral]);

  const deckTacticPool = useMemo(() => {
    const purple = warehouse.draftMode === 'tactic_support' && warehouse.supportPurpleTactic
      ? [warehouse.supportPurpleTactic]
      : [];
    return [...effectiveWarehouseTactics, ...warehouse.supportTactics, ...purple];
  }, [effectiveWarehouseTactics, warehouse.supportTactics, warehouse.draftMode, warehouse.supportPurpleTactic]);

  // 🆕 연무는 티어덱과 비교/의존하지 않고, 창고(+지원) 보유 자원만으로 편성한다.
  // (예전엔 완전 매칭된 티어덱을 먼저 선점 배치했지만, 연무 콘텐츠 자체가 티어덱 재현이
  // 목적이 아니라서 그 경로를 없애고 buildRecommendedYeonmuSquads 하나로만 편성한다.)
  const { decks: recommendedDecks, bench: recommendedBench, leftoverTactics } = useMemo(() => {
    return buildRecommendedYeonmuSquads(
      deckGeneralPool,
      deckTacticPool,
      generals,
      tactics,
      YEONMU_SQUAD_COUNT,
      YEONMU_SQUAD_SIZE
    );
  }, [deckGeneralPool, deckTacticPool, generals, tactics]);

  // 🆕 사용자가 4단계에서 직접 수정할 수 있는 편집 가능한 편성본.
  // 창고 구성(deckGeneralPool/deckTacticPool)이 바뀌어 recommendedDecks가 새로 계산되면 편집본도 초기화된다.
  const [customDecks, setCustomDecks] = useState([]);
  const [selectedHero, setSelectedHero] = useState(null); // { squadIdx, heroIdx }

  useEffect(() => {
    setCustomDecks(recommendedDecks);
    setSelectedHero(null);
  }, [recommendedDecks]);

  // 부대 슬롯(장수+전법 세트) 두 개를 서로 맞바꾼다 — 사용자가 직접 편성을 바꿔볼 수 있게 함
  const handleHeroSlotClick = (squadIdx, heroIdx) => {
    if (!selectedHero) {
      setSelectedHero({ squadIdx, heroIdx });
      return;
    }
    if (selectedHero.squadIdx === squadIdx && selectedHero.heroIdx === heroIdx) {
      setSelectedHero(null);
      return;
    }
    setCustomDecks((prev) => {
      const next = prev.map((d) => ({ ...d, heroes: [...d.heroes] }));
      const a = next[selectedHero.squadIdx]?.heroes[selectedHero.heroIdx];
      const b = next[squadIdx]?.heroes[heroIdx];
      if (!a || !b) return prev;
      next[selectedHero.squadIdx].heroes[selectedHero.heroIdx] = b;
      next[squadIdx].heroes[heroIdx] = a;
      return next;
    });
    setSelectedHero(null);
  };

  const resetCustomDecks = () => {
    setCustomDecks(recommendedDecks);
    setSelectedHero(null);
  };

  // 🆕 각 부대(편집본 기준)의 PDF 로직 기반 점수
  const customDeckScores = useMemo(
    () => customDecks.map((d) => scoreYeonmuSquadComposition(d.heroes, synergies)),
    [customDecks, synergies]
  );

  // 🆕 각 부대(편집본 기준)에 가장 궁합 좋은 진형 추천 — 장수를 바꿔 넣으면 추천 진형도 함께 재계산됨
  const customDeckFormations = useMemo(
    () => customDecks.map((d) => pickBestFormationForSquad(d.heroes, formations, generals)),
    [customDecks, formations, generals]
  );

  const isDecksEdited = useMemo(() => {
    if (customDecks.length !== recommendedDecks.length) return true;
    return customDecks.some((d, i) =>
      d.heroes.some((h, hi) => h.general?.name !== recommendedDecks[i]?.heroes[hi]?.general?.name)
    );
  }, [customDecks, recommendedDecks]);

  const neededGenerals = YEONMU_SQUAD_COUNT * YEONMU_SQUAD_SIZE;

  if (!isReady) return null;

  return (
    <div style={{ background: SCROLL.bg, minHeight: '100%', padding: '16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        <div style={{ padding: '4px 0 14px' }}>
          <p style={{ fontSize: '11px', color: SCROLL.gold, letterSpacing: '0.05em', margin: '0 0 4px', fontFamily: SCROLL.mono }}>
            SANGUOZHI · YEONMU
          </p>
          <h2 style={{ margin: 0, fontSize: '17px', color: SCROLL.ink }}>창고 입력</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {STEPS.map((s) => (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                style={{
                  fontSize: '11px', padding: '5px 10px', borderRadius: '4px', border: `0.5px solid ${SCROLL.border}`,
                  background: step === s.key ? SCROLL.gold : 'transparent',
                  color: step === s.key ? SCROLL.paperLight : SCROLL.inkFaint,
                  fontWeight: step === s.key ? 600 : 400, cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (confirm('이번 주 창고 데이터를 모두 지울까요?')) resetWarehouse(); }}
            style={{ fontSize: '12px', border: `0.5px solid ${SCROLL.border}`, background: 'transparent', color: SCROLL.inkFaint, borderRadius: '6px', padding: '5px 10px' }}
          >
            초기화
          </button>
        </div>

        {step === 'generals' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>무장 10명 선택 (시작 4 + 드래프트 6)</span>
              <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                {warehouse.generals.length} / {WAREHOUSE_LIMITS.generals}
              </span>
            </div>

            {/* 🆕 진영 필터 */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {FACTIONS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFactionFilter(f)}
                  style={{
                    fontSize: '11px',
                    padding: '5px 12px',
                    borderRadius: '4px',
                    border: `0.5px solid ${SCROLL.border}`,
                    background: factionFilter === f ? SCROLL.gold : 'transparent',
                    color: factionFilter === f ? SCROLL.paperLight : SCROLL.inkFaint,
                    fontWeight: factionFilter === f ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* 🆕 텍스트 검색 (이름 입력 후 Enter로 바로 추가) */}
            <input
              type="text"
              value={generalSearch}
              onChange={(e) => setGeneralSearch(e.target.value)}
              onKeyDown={handleGeneralSearchKeyDown}
              placeholder="장수 이름 입력 후 Enter로 추가"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                marginBottom: '10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: `0.5px solid ${SCROLL.border}`,
                background: SCROLL.paperMid,
                color: SCROLL.ink,
                outline: 'none',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {filteredGenerals.map((g) => (
                <SelectableCard
                  key={g.id}
                  name={g.name}
                  subLabel={`${g.faction || ''}${g.troop_type ? ' · ' + g.troop_type : ''}`}
                  isSelected={warehouse.generals.includes(g.name)}
                  disabled={warehouse.generals.length >= WAREHOUSE_LIMITS.generals && !warehouse.generals.includes(g.name)}
                  onClick={() => toggleGeneral(g.name)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'tactics' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>전법 20개 선택 (시작 8 + 드래프트 12)</span>
              <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                {warehouse.tactics.length} / {WAREHOUSE_LIMITS.tactics}
              </span>
            </div>

            {/* 🆕 텍스트 검색 (이름 입력 후 Enter로 바로 추가) */}
            <input
              type="text"
              value={tacticSearch}
              onChange={(e) => setTacticSearch(e.target.value)}
              onKeyDown={handleTacticSearchKeyDown}
              placeholder="전법 이름 입력 후 Enter로 추가"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '8px 10px',
                marginBottom: '10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: `0.5px solid ${SCROLL.border}`,
                background: SCROLL.paperMid,
                color: SCROLL.ink,
                outline: 'none',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {filteredTactics.map((t) => (
                <SelectableCard
                  key={t.id}
                  name={t.name}
                  subLabel={t.grade || ''}
                  isSelected={warehouse.tactics.includes(t.name)}
                  disabled={warehouse.tactics.length >= WAREHOUSE_LIMITS.tactics && !warehouse.tactics.includes(t.name)}
                  onClick={() => toggleTactic(t.name)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'support' && (
          <>
            {/* 🆕 연무 드래프트 라운드픽 3종 선택 — 게임 내에서 실제로 고른 픽을 그대로 입력.
                셋 다 배타적이며, 셋 다 공통으로 지원 무장 1명 + 지원 전법 2개(등급 무관)가 뒤에 이어진다. */}
            <div style={{ marginBottom: '18px' }}>
              <span style={{ fontSize: '12px', color: SCROLL.inkFaint, display: 'block', marginBottom: '8px' }}>
                라운드픽 — 게임에서 고른 항목을 선택하세요
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {DRAFT_MODES.map((m) => {
                  const isSel = warehouse.draftMode === m.key;
                  return (
                    <div
                      key={m.key}
                      onClick={() => setWarehouse((prev) => ({ ...prev, draftMode: m.key }))}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                        background: isSel ? SCROLL.greenBg : SCROLL.paperMid,
                        border: `0.5px solid ${isSel ? SCROLL.green : SCROLL.headerBorder}`,
                      }}
                    >
                      <div style={{
                        width: '14px', height: '14px', borderRadius: '50%', flexShrink: 0,
                        border: `1.5px solid ${isSel ? SCROLL.green : SCROLL.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isSel && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: SCROLL.green }} />}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>{m.label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '10px', color: SCROLL.inkFaint }}>{m.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 🆕 ① 무장 다시뽑기 — 10명 중 1명을 다른 장수로 교체 */}
            {warehouse.draftMode === 'general' && (
              <div style={{ marginBottom: '18px', padding: '12px', borderRadius: '10px', background: SCROLL.paperMid, border: `0.5px solid ${SCROLL.headerBorder}` }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>① 어떤 장수를 어떤 장수로 바꿨나요?</p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select
                    value={warehouse.replacedGeneral?.from || ''}
                    onChange={(e) => setWarehouse((prev) => ({ ...prev, replacedGeneral: { ...prev.replacedGeneral, from: e.target.value || null } }))}
                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '6px', border: `0.5px solid ${SCROLL.border}`, background: SCROLL.bg, color: SCROLL.ink }}
                  >
                    <option value="">뺄 장수…</option>
                    {warehouse.generals.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span style={{ color: SCROLL.inkFaint, fontSize: '12px' }}>→</span>
                  <input
                    type="text"
                    value={warehouse.replacedGeneral?.to || ''}
                    onChange={(e) => setWarehouse((prev) => ({ ...prev, replacedGeneral: { ...prev.replacedGeneral, to: e.target.value || null } }))}
                    placeholder="장수 이름…"
                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '6px', border: `0.5px solid ${SCROLL.border}`, background: SCROLL.bg, color: SCROLL.ink, outline: 'none' }}
                  />
                </div>
              </div>
            )}

            {/* 🆕 ② 전법 다시뽑기 — 20개 중 2개를 다른 전법으로 교체 */}
            {warehouse.draftMode === 'tactic' && (
              <div style={{ marginBottom: '18px', padding: '12px', borderRadius: '10px', background: SCROLL.paperMid, border: `0.5px solid ${SCROLL.headerBorder}` }}>
                <p style={{ margin: '0 0 10px', fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>② 어떤 전법 2개를 어떤 전법으로 바꿨나요?</p>
                {[0, 1].map((idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: idx === 0 ? '8px' : 0 }}>
                    <select
                      value={warehouse.replacedTactics?.[idx]?.from || ''}
                      onChange={(e) => setWarehouse((prev) => {
                        const next = [...(prev.replacedTactics || [{ from: null, to: null }, { from: null, to: null }])];
                        next[idx] = { ...next[idx], from: e.target.value || null };
                        return { ...prev, replacedTactics: next };
                      })}
                      style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '6px', border: `0.5px solid ${SCROLL.border}`, background: SCROLL.bg, color: SCROLL.ink }}
                    >
                      <option value="">뺄 전법 {idx + 1}…</option>
                      {warehouse.tactics.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <span style={{ color: SCROLL.inkFaint, fontSize: '12px' }}>→</span>
                    <input
                      type="text"
                      value={warehouse.replacedTactics?.[idx]?.to || ''}
                      onChange={(e) => setWarehouse((prev) => {
                        const next = [...(prev.replacedTactics || [{ from: null, to: null }, { from: null, to: null }])];
                        next[idx] = { ...next[idx], to: e.target.value || null };
                        return { ...prev, replacedTactics: next };
                      })}
                      placeholder="전법 이름…"
                      style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '6px', border: `0.5px solid ${SCROLL.border}`, background: SCROLL.bg, color: SCROLL.ink, outline: 'none' }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* 🆕 지원 무장 1명 / 전법 2개 후보를 창고 구성과의 시너지 점수(S/A/B/C) 내림차순으로 표시.
                scoredSupportGeneralCandidates / scoredSupportTacticCandidates 는 "보유 + 창고와 중복 제외" 필터에
                score(0~100)와 reasons(추천 이유 배열)를 더해 점수 높은 순으로 정렬한 목록. */}
            <div style={{ marginBottom: '18px' }}>
              <div
                onClick={() => setSupportGeneralOpen((v) => !v)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>
                  {supportGeneralOpen ? '▾' : '▸'} 지원 무장 1명 (보유 목록 중 · 추천순)
                </span>
                <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                  {warehouse.supportGeneral ? 1 : 0} / 1
                </span>
              </div>

              {/* 🆕 선택 완료 후 접힌 상태 — 목록을 다시 펼치지 않아도 바로 아래 지원 전법으로 이어짐 */}
              {!supportGeneralOpen && warehouse.supportGeneral && (
                <div
                  onClick={() => setSupportGeneralOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                    padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                    background: SCROLL.greenBg, borderLeft: `2px solid ${SCROLL.green}`,
                  }}
                >
                  <span style={{ fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>
                    ✓ {warehouse.supportGeneral}
                  </span>
                  <span style={{ fontSize: '11px', color: SCROLL.inkFaint }}>변경하려면 클릭</span>
                </div>
              )}

              {supportGeneralOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* 🆕 "왜 이 무장이 필요한지"를 바로 알려주는 1순위 추천 카드 — 목록 스크롤 없이 바로 담을 수 있음 */}
                  {supportGeneralRecommendation && (
                    <div style={{
                      padding: '12px', borderRadius: '8px', marginBottom: '2px',
                      background: SCROLL.greenBg, border: `1px solid ${SCROLL.green}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: SCROLL.greenSoft, fontWeight: 700, letterSpacing: '0.02em' }}>
                          💡 추천 · {supportGeneralRecommendation.name}이(가) 필요한 이유
                        </span>
                        <button
                          onClick={() => setWarehouse((prev) => ({ ...prev, supportGeneral: supportGeneralRecommendation.name }))}
                          style={{
                            fontSize: '11px', border: `0.5px solid ${SCROLL.green}`, background: 'transparent',
                            color: SCROLL.greenSoft, borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          이 무장 담기
                        </button>
                      </div>
                      {supportGeneralRecommendation.reasons.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: SCROLL.ink, lineHeight: 1.6 }}>
                          {supportGeneralRecommendation.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                  {scoredSupportGeneralCandidates.map((g) => {
                    const isSel = warehouse.supportGeneral === g.name;
                    const tier = getTierBadge(g.score);
                    return (
                      <div
                        key={g.id}
                        onClick={() => setWarehouse((prev) => ({
                          ...prev,
                          supportGeneral: prev.supportGeneral === g.name ? null : g.name,
                        }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                          background: isSel ? SCROLL.greenBg : SCROLL.paperMid,
                          borderLeft: isSel ? `2px solid ${SCROLL.green}` : '2px solid transparent',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>{g.name}</p>
                            <span style={{
                              fontSize: '10px', fontWeight: 700, fontFamily: SCROLL.mono, color: tier.color,
                              border: `0.5px solid ${tier.color}`, borderRadius: '4px', padding: '0 5px'
                            }}>
                              {tier.label} · {g.score}
                            </span>
                          </div>
                          {g.reasons.length > 0 && (
                            <p style={{ margin: '3px 0 0', fontSize: '10px', color: SCROLL.inkFaint }}>
                              {g.reasons.join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div
                onClick={() => setSupportTacticsOpen((v) => !v)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>
                  {supportTacticsOpen ? '▾' : '▸'} 지원 전법 2개 (등급 무관 · 보유 목록 중 · 추천순)
                </span>
                <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                  {warehouse.supportTactics.length} / {WAREHOUSE_LIMITS.supportTactics}
                </span>
              </div>

              {/* 🆕 2개 다 채워진 뒤 접힌 상태 — 무장 슬롯과 동일 패턴, 클릭하면 다시 펼쳐짐 */}
              {!supportTacticsOpen && warehouse.supportTactics.length >= WAREHOUSE_LIMITS.supportTactics && (
                <div
                  onClick={() => setSupportTacticsOpen(true)}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '4px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                    background: SCROLL.greenBg, borderLeft: `2px solid ${SCROLL.green}`,
                  }}
                >
                  {warehouse.supportTactics.map((name) => (
                    <span key={name} style={{ fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>✓ {name}</span>
                  ))}
                  <span style={{ fontSize: '11px', color: SCROLL.inkFaint, marginTop: '2px' }}>변경하려면 클릭</span>
                </div>
              )}

              {supportTacticsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* 🆕 남은 슬롯만큼 "왜 필요한지" 이유를 붙여 상위 후보를 먼저 보여줌 */}
                {supportTacticRecommendations.length > 0 && (
                  <div style={{
                    padding: '12px', borderRadius: '8px', marginBottom: '2px',
                    background: SCROLL.greenBg, border: `1px solid ${SCROLL.green}`,
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: '11px', color: SCROLL.greenSoft, fontWeight: 700, letterSpacing: '0.02em' }}>
                      💡 추천 · 남은 {WAREHOUSE_LIMITS.supportTactics - warehouse.supportTactics.length}개 슬롯에 이런 전법이 필요해요
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {supportTacticRecommendations.map((t) => {
                        const gradeBadge = getTacticGradeBadge(t.grade);
                        return (
                          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>
                                {gradeBadge && `${gradeBadge} `}{t.name}
                                {t.isPurpleSlot && (
                                  <span style={{ marginLeft: '6px', fontSize: '9px', color: SCROLL.gold, border: `0.5px solid ${SCROLL.gold}`, borderRadius: '4px', padding: '0 4px', fontWeight: 700 }}>
                                    마지막 슬롯 · 보라 필수
                                  </span>
                                )}
                              </p>
                              {t.reasons.length > 0 && (
                                <ul style={{ margin: '4px 0 0', paddingLeft: '16px', fontSize: '11px', color: SCROLL.ink, lineHeight: 1.6 }}>
                                  {t.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                </ul>
                              )}
                            </div>
                            <button
                              onClick={() => setWarehouse((prev) => ({ ...prev, supportTactics: [...prev.supportTactics, t.name] }))}
                              style={{
                                fontSize: '11px', border: `0.5px solid ${SCROLL.green}`, background: 'transparent',
                                color: SCROLL.greenSoft, borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', flexShrink: 0,
                              }}
                            >
                              담기
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {scoredSupportTacticCandidates.map((t) => {
                  const isSel = warehouse.supportTactics.includes(t.name);
                  const isFull = warehouse.supportTactics.length >= WAREHOUSE_LIMITS.supportTactics;
                  const tier = getTierBadge(t.score);
                  const gradeBadge = getTacticGradeBadge(t.grade);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isFull && !isSel) return;
                        setWarehouse((prev) => ({
                          ...prev,
                          supportTactics: isSel
                            ? prev.supportTactics.filter((n) => n !== t.name)
                            : [...prev.supportTactics, t.name],
                        }));
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px',
                        cursor: isFull && !isSel ? 'not-allowed' : 'pointer',
                        opacity: isFull && !isSel ? 0.4 : 1,
                        background: isSel ? SCROLL.greenBg : SCROLL.paperMid,
                        borderLeft: isSel ? `2px solid ${SCROLL.green}` : '2px solid transparent',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>
                            {gradeBadge && `${gradeBadge} `}{t.name}
                          </p>
                          <span style={{
                            fontSize: '10px', fontWeight: 700, fontFamily: SCROLL.mono, color: tier.color,
                            border: `0.5px solid ${tier.color}`, borderRadius: '4px', padding: '0 5px'
                          }}>
                            {tier.label} · {t.score}
                          </span>
                        </div>
                        {t.reasons.length > 0 && (
                          <p style={{ margin: '3px 0 0', fontSize: '10px', color: SCROLL.inkFaint }}>
                            {t.reasons.join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>

            {/* 🆕 ③ 전법 지원 모드 전용 — 보유 보라 전법 중 1개를 추가 지원 슬롯에 담는다.
                지원 전법 2개(등급 무관)와는 완전히 별개 슬롯. */}
            {warehouse.draftMode === 'tactic_support' && (
              <div style={{ marginTop: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>③ 지원 보라 전법 1개 (보유 보라 등급만 · 추천순)</span>
                  <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                    {warehouse.supportPurpleTactic ? 1 : 0} / 1
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {supportPurpleTacticRecommendation && (
                    <div style={{
                      padding: '12px', borderRadius: '8px', marginBottom: '2px',
                      background: SCROLL.greenBg, border: `1px solid ${SCROLL.green}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', color: SCROLL.greenSoft, fontWeight: 700, letterSpacing: '0.02em' }}>
                          💡 추천 · {supportPurpleTacticRecommendation.name}이(가) 필요한 이유
                        </span>
                        <button
                          onClick={() => setWarehouse((prev) => ({ ...prev, supportPurpleTactic: supportPurpleTacticRecommendation.name }))}
                          style={{
                            fontSize: '11px', border: `0.5px solid ${SCROLL.green}`, background: 'transparent',
                            color: SCROLL.greenSoft, borderRadius: '6px', padding: '3px 9px', cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          이 전법 담기
                        </button>
                      </div>
                      {supportPurpleTacticRecommendation.reasons.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '11px', color: SCROLL.ink, lineHeight: 1.6 }}>
                          {supportPurpleTacticRecommendation.reasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                  {scoredSupportPurpleTacticCandidates.map((t) => {
                    const isSel = warehouse.supportPurpleTactic === t.name;
                    const tier = getTierBadge(t.score);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setWarehouse((prev) => ({
                          ...prev,
                          supportPurpleTactic: prev.supportPurpleTactic === t.name ? null : t.name,
                        }))}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                          background: isSel ? SCROLL.greenBg : SCROLL.paperMid,
                          borderLeft: isSel ? `2px solid ${SCROLL.green}` : '2px solid transparent',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, fontWeight: 600 }}>🟣 {t.name}</p>
                            <span style={{
                              fontSize: '10px', fontWeight: 700, fontFamily: SCROLL.mono, color: tier.color,
                              border: `0.5px solid ${tier.color}`, borderRadius: '4px', padding: '0 5px'
                            }}>
                              {tier.label} · {t.score}
                            </span>
                          </div>
                          {t.reasons.length > 0 && (
                            <p style={{ margin: '3px 0 0', fontSize: '10px', color: SCROLL.inkFaint }}>
                              {t.reasons.join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {scoredSupportPurpleTacticCandidates.length === 0 && (
                    <p style={{ fontSize: '11px', color: SCROLL.inkFaint, margin: 0 }}>
                      보유한 보라 등급 전법 중 아직 창고/지원에 담기지 않은 후보가 없어요.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {step === 'decks' && (
          <>
            {/* 🆕 창고(+지원) 풀만으로 자동 편성한 3개 부대 추천안.
                타입이 안 맞는 전법이라도(예: 책략 장수에 병기 전법) 빈 슬롯 없이 반드시 2개씩 채우는 것을 우선함 —
                ⚠️ 배지가 붙은 전법은 궁합이 이상적이지 않으니 상황 봐서 직접 바꿔써도 됨. */}
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>
                창고 장수 {warehouse.generals.length}명{warehouse.supportGeneral ? ' + 지원 1명' : ''} · 창고 전법 {warehouse.tactics.length}개{warehouse.supportTactics.length > 0 ? ` + 지원 ${warehouse.supportTactics.length}개` : ''}{warehouse.draftMode === 'tactic_support' && warehouse.supportPurpleTactic ? ' + 지원 보라 1개' : ''} 풀로 자동 편성
              </span>
              {warehouse.draftMode === 'general' && warehouse.replacedGeneral?.from && warehouse.replacedGeneral?.to && (
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: SCROLL.greenSoft }}>
                  ① 무장 다시뽑기 반영: {warehouse.replacedGeneral.from} → {warehouse.replacedGeneral.to}
                </p>
              )}
              {warehouse.draftMode === 'tactic' && (warehouse.replacedTactics || []).some((r) => r.from && r.to) && (
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: SCROLL.greenSoft }}>
                  ② 전법 다시뽑기 반영: {(warehouse.replacedTactics || []).filter((r) => r.from && r.to).map((r) => `${r.from} → ${r.to}`).join(' · ')}
                </p>
              )}
              {deckGeneralPool.length < neededGenerals && (
                <p style={{ margin: '6px 0 0', fontSize: '11px', color: SCROLL.gold }}>
                  ⚠️ 장수가 {deckGeneralPool.length}명뿐이라 부대를 다 채우지 못했어요. 3개 부대(9명)를 다 채우려면 {neededGenerals}명이 필요해요.
                </p>
              )}
            </div>

            {/* 🆕 장수 카드를 클릭하면 선택되고, 다른 장수 카드를 한번 더 클릭하면 두 자리가 서로 맞바뀐다.
                직접 편성을 바꿔보면서 옆의 점수(S/A/B/C)가 어떻게 변하는지 바로 확인 가능 — PDF 기준(전열 탱커,
                더블 코어 딜러, 확률형 무장 회피, 고정 수치 피해 전법 우선) 그대로 반영한 scoreYeonmuSquadComposition 사용. */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: SCROLL.inkFaint }}>
                {selectedHero ? '바꿔 넣을 다른 장수를 클릭하세요' : '장수를 클릭해 부대끼리 자리를 바꿔볼 수 있어요'}
              </span>
              {isDecksEdited && (
                <button
                  onClick={resetCustomDecks}
                  style={{ fontSize: '11px', border: `0.5px solid ${SCROLL.border}`, background: 'transparent', color: SCROLL.gold, borderRadius: '6px', padding: '4px 8px', cursor: 'pointer' }}
                >
                  초기 추천으로 되돌리기
                </button>
              )}
            </div>

            {customDecks.map((deck, dIdx) => {
              const squadScore = customDeckScores[dIdx] || { score: 0, reasons: [] };
              const scoreTier = getTierBadge(squadScore.score);
              return (
              <div key={deck.squadNum} style={{
                marginBottom: '14px', padding: '14px', borderRadius: '10px',
                background: SCROLL.paperMid, border: `0.5px solid ${SCROLL.headerBorder}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 700, color: SCROLL.gold,
                      fontFamily: SCROLL.mono, letterSpacing: '0.05em'
                    }}>
                      {deck.squadNum}군
                    </span>
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 700, fontFamily: SCROLL.mono, color: scoreTier.color,
                    border: `0.5px solid ${scoreTier.color}`, borderRadius: '4px', padding: '1px 6px'
                  }}>
                    {scoreTier.label} · {squadScore.score}점
                  </span>
                </div>

                {squadScore.reasons.length > 0 && (
                  <p style={{ margin: '0 0 10px', fontSize: '10px', color: SCROLL.inkFaint, lineHeight: 1.5 }}>
                    {squadScore.reasons.join(' · ')}
                  </p>
                )}

                {/* 🆕 추천 진형 — 이 부대의 전열/후열 배치(장수 position)와 진형 효과 궁합이 가장 좋은 진형을
                    formations 전체 후보 중에서 자동으로 골라 보여줌. 장수를 바꿔 넣으면 즉시 재계산됨. */}
                {(() => {
                  const formationRec = customDeckFormations[dIdx];
                  if (!formationRec) return null;
                  const fTier = getTierBadge(formationRec.score);
                  return (
                    <div style={{
                      marginBottom: '10px', padding: '8px 10px', borderRadius: '8px',
                      background: SCROLL.bg, border: `0.5px dashed ${SCROLL.border}`
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono }}>추천 진형</span>
                        <span style={{ fontSize: '12px', color: SCROLL.gold, fontWeight: 700 }}>
                          {formationRec.formation.name || '이름 없음'}
                        </span>
                        <span style={{
                          fontSize: '9px', fontWeight: 700, fontFamily: SCROLL.mono, color: fTier.color,
                          border: `0.5px solid ${fTier.color}`, borderRadius: '4px', padding: '0 4px'
                        }}>
                          {fTier.label} · {formationRec.score}점
                        </span>
                      </div>
                      {formationRec.formation.effect && (
                        <p style={{ margin: '4px 0 0', fontSize: '10px', color: SCROLL.inkFaint, lineHeight: 1.4 }}>
                          {formationRec.formation.effect}
                        </p>
                      )}
                      {formationRec.reasons.length > 0 && (
                        <p style={{ margin: '4px 0 0', fontSize: '10px', color: SCROLL.greenSoft, lineHeight: 1.4 }}>
                          {formationRec.reasons.join(' · ')}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {deck.heroes.map((hero, hIdx) => {
                    const roleLabel = ROLE_LABEL_MAP[hero.general.preferred_tactic_type] || hero.general.preferred_tactic_type || '';
                    const isSel = selectedHero && selectedHero.squadIdx === dIdx && selectedHero.heroIdx === hIdx;
                    return (
                      <div
                        key={hIdx}
                        onClick={() => handleHeroSlotClick(dIdx, hIdx)}
                        style={{
                          padding: '10px', borderRadius: '8px', background: isSel ? SCROLL.greenBg : SCROLL.bg,
                          border: `0.5px solid ${isSel ? SCROLL.green : SCROLL.border}`, cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, fontWeight: 700 }}>
                            {hero.general.name}
                            {roleLabel && (
                              <span style={{ marginLeft: '6px', fontSize: '10px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontWeight: 400 }}>
                                [{roleLabel}]
                              </span>
                            )}
                            {YEONMU_VOLATILE_GENERALS.includes(hero.general.name) && (
                              <span style={{ marginLeft: '6px', fontSize: '9px', color: SCROLL.gold, border: `0.5px solid ${SCROLL.gold}`, borderRadius: '4px', padding: '0 4px' }}>
                                ⚠️ 확률형
                              </span>
                            )}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '0' }}>
                          {hero.tactics.length === 0 && (
                            <span style={{ fontSize: '10px', color: SCROLL.inkFaint }}>배정 가능한 전법 없음 (풀 소진)</span>
                          )}
                          {hero.tactics.map((t, tIdx) => {
                            const gradeBadge = getTacticGradeBadge(
                              tactics.find((tc) => tc.name?.trim() === t.name?.trim())?.grade
                            );
                            // 실질적 이유(reasons)를 그대로 보여줘서, 타입이 안 맞아도 왜 이 전법이
                            // 배정됐는지(혹은 얼마나 차선책인지) 판단 근거를 알 수 있게 함
                            const filteredReasons = (t.reasons || []).filter((r) => r !== '타입 불일치 · 대체 배정');
                            return (
                              <div key={tIdx} style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: SCROLL.ink }}>
                                    {gradeBadge && `${gradeBadge} `}{t.name}
                                  </span>
                                  <span style={{
                                    fontSize: '9px', fontWeight: 700, fontFamily: SCROLL.mono,
                                    color: t.typeMatched ? SCROLL.greenSoft : SCROLL.inkFaint,
                                    border: `0.5px solid ${t.typeMatched ? SCROLL.green : SCROLL.border}`,
                                    borderRadius: '4px', padding: '0 4px'
                                  }}>
                                    {t.typeMatched ? '적합' : '차선'} · {t.score}점
                                  </span>
                                </div>
                                {filteredReasons.length > 0 && (
                                  <p style={{ margin: 0, fontSize: '9px', color: SCROLL.inkFaint }}>
                                    {filteredReasons.join(' · ')}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })}

            {recommendedBench.length > 0 && (
              <div style={{ marginBottom: '14px', padding: '12px', borderRadius: '10px', background: SCROLL.paperMid, border: `0.5px dashed ${SCROLL.border}` }}>
                <div style={{ fontSize: '11px', color: SCROLL.inkFaint, marginBottom: '6px', fontFamily: SCROLL.mono }}>예비 (미출전)</div>
                <div style={{ fontSize: '12px', color: SCROLL.ink }}>
                  {recommendedBench.map((g) => g.name).join(', ')}
                </div>
              </div>
            )}

            {leftoverTactics.length > 0 && (
              <div style={{ padding: '12px', borderRadius: '10px', background: SCROLL.paperMid, border: `0.5px dashed ${SCROLL.border}` }}>
                <div style={{ fontSize: '11px', color: SCROLL.inkFaint, marginBottom: '6px', fontFamily: SCROLL.mono }}>미사용 전법</div>
                <div style={{ fontSize: '12px', color: SCROLL.ink }}>
                  {leftoverTactics.map((t) => t.name).join(', ')}
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
}