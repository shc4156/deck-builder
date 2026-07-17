// data/roleInference.js

const ALLY_WORDS = /아군|우군|자신/;
const ENEMY_WORDS = /적군/;

// 전법 텍스트를 얻는 헬퍼 — 실제 컬럼명이 effect/desc/description 중 뭔지 몰라도 안전하게 처리
function getTacticText(tactic) {
  return tactic.description || '';
}

// "적군" 언급 지점 주변(앞 10자, 뒤 40자)에 감소/디버프/약화 관련 단어가 있을 때만 디버프로 판정
// (문장 안에 "적군"과 "감소"가 서로 무관하게 각자 등장하는 경우의 오탐 방지)
function hasNearbyEnemyDebuff(text) {
  const enemyIndices = [];
  let idx = text.indexOf('적군');
  while (idx !== -1) {
    enemyIndices.push(idx);
    idx = text.indexOf('적군', idx + 1);
  }
  return enemyIndices.some(i => {
    const window = text.slice(Math.max(0, i - 10), i + 40);
    return window.includes('감소') || window.includes('디버프') || window.includes('약화');
  });
}

// tactics 테이블의 type 컬럼(지휘/패시브/액티브/추격) -> 발동 방식 표시용 값
export function inferTacticTriggerType(tactic) {
  const map = {
    '지휘': '지휘형',
    '패시브': '패시브형',
    '액티브': '액티브형',
    '추격': '추격형',
  };
  return map[tactic.type] || '기타';
}

// tactics 테이블의 trait 컬럼(병기/책략/치유/방어/보조/문무) -> 역할 계열
// trait='보조'인 경우만 텍스트를 봐서 버프/디버프 판별 (DB에 버프/디버프 구분 컬럼이 없어서)
export function inferTacticRole(tactic) {
  const text = getTacticText(tactic);
  const roles = [];

  switch (tactic.trait) {
    case '병기':
      roles.push('병기딜');
      break;
    case '책략':
      roles.push('책략딜');
      break;
    case '치유':
      roles.push('힐');
      break;
    case '방어':
      roles.push('방어');
      break;
    case '문무':
      roles.push('병기딜', '책략딜');
      break;
    case '보조': {
      const isBuff = ALLY_WORDS.test(text) && (text.includes('증가') || text.includes('회복') || text.includes('회유') || text.includes('부여'));
      const isDebuff = hasNearbyEnemyDebuff(text);
      if (isBuff) roles.push('버퍼');
      if (isDebuff) roles.push('디버퍼');
      if (!isBuff && !isDebuff) roles.push('기타');
      break;
    }
    default:
      roles.push('기타');
  }

  roles.push(inferTacticTriggerType(tactic));
  return roles;
}

// ── 장수는 trait/type 컬럼이 없고 unique_tactic_effect가 자유 텍스트라 키워드 추측을 유지 ──

function isPrimaryChaseTrigger(text) {
  if (text.includes('연타')) return true;
  const idx = text.indexOf('일반 공격 후');
  if (idx === -1) return false;
  const before = text.slice(Math.max(0, idx - 10), idx);
  if (before.includes('획득')) return false;
  return true;
}

function inferGeneralTriggerType(text) {
  return isPrimaryChaseTrigger(text) ? '추격형' : '액티브형';
}

function inferDamageAttributes(text) {
  const hasJatsu = text.includes('책략');
  const hasWeapon = text.includes('병기') || text.includes('무기');
  const attrs = [];
  if (hasJatsu) attrs.push('책략딜');
  if (hasWeapon) attrs.push('병기딜');
  if (attrs.length === 0 && text.includes('피해') && (text.includes('적군') || text.includes('목표'))) {
    attrs.push('병기딜');
  }
  return attrs;
}

export function inferGeneralRole(general) {
  const text = `${general.unique_tactic_effect || ''} ${general.unique_tactic_description || ''}`;
  const roles = [];

  if (text.includes('치료') || text.includes('회복')) roles.push('힐러');
  if (ALLY_WORDS.test(text) && (text.includes('증가') || text.includes('버프') || text.includes('회유'))) roles.push('버퍼');
  if (ENEMY_WORDS.test(text) && (text.includes('감소') || text.includes('디버프') || text.includes('약화'))) roles.push('디버퍼');
  if (text.includes('방어') || text.includes('도발') || text.includes('받는 피해')) roles.push('탱커');

  const dmgAttrs = inferDamageAttributes(text);
  roles.push(...dmgAttrs);
  if (dmgAttrs.length > 0) roles.push(inferGeneralTriggerType(text));

  return roles.length > 0 ? roles : ['분석 불가'];
}

// ── 전법 -> 추천 장수 매칭 ──

const BASE_TACTIC_TO_GENERAL = {
  '힐': ['힐러'],
  '디버퍼': ['디버퍼'],
  '방어': ['탱커'],
  '책략딜': ['책략딜'],
  '병기딜': ['병기딜'],
};

function getTargetGeneralRoles(tactic) {
  const text = getTacticText(tactic);
  const tacticRoles = inferTacticRole(tactic);
  const targets = new Set();

  if (tacticRoles.includes('버퍼') && text.includes('연타')) {
    targets.add('추격형');
  } else if (tacticRoles.includes('버퍼')) {
    targets.add('버퍼');
  }

  tacticRoles.forEach(role => {
    if (BASE_TACTIC_TO_GENERAL[role]) {
      BASE_TACTIC_TO_GENERAL[role].forEach(r => targets.add(r));
    }
  });

  return Array.from(targets);
}

export function findRecommendedGenerals(tactic, generals) {
  const targetRoles = getTargetGeneralRoles(tactic);
  if (targetRoles.length === 0) return [];

  return generals
    .filter(g => {
      const gRoles = inferGeneralRole(g);
      return gRoles.some(r => targetRoles.includes(r));
    })
    .slice(0, 5);
}