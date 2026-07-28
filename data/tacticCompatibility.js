// data/tacticCompatibility.js
//
// tactics_rows.json(77개) 설명을 분석해서, "발동 메커니즘이 실질적으로 같은" 전법끼리
// 묶고(family), 같은 family 안에서 등급(황금>보라)/수치/부가효과를 비교해 순위를 매겼습니다.
//
// rank가 낮을수록(1이 가장 좋음) 상위호환에 가깝고, 같은 rank는 "동급(상황별 선택)"입니다.
// note는 왜 그 순위인지에 대한 근거(등급/수치/부가효과 비교)입니다.
//
// 주의: 이건 텍스트 설명 기반 휴리스틱 분류입니다. 인게임 실전 밸런스(장수 스탯 궁합, PvP 메타)까지
// 반영된 게 아니므로, squadEngine에서는 "가산점 소스"로만 쓰고 절대적 우선순위로 쓰지 않는 걸 추천해요.

export const TACTIC_FAMILIES = [
  // ── 액티브 · 문무 ──────────────────────────────
  {
    id: 'active_civmil_mixed',
    label: '문무 혼합딜(무력/지력 최고치 타겟)',
    members: [
      { id: '35', name: '문무겸비', rank: 1, note: '준비 없이 즉시, 무력/지력 최고 적 각각에게 딜 분산' },
      { id: '34', name: '천하평론', rank: 1, note: '아군 최고스탯 유닛이 전체 적에게 딜 — 광역이라 역할이 다름(동급/상황별)' },
      { id: '36', name: '방화범', rank: 2, note: '1턴 준비 필요, 화공 조건부라 발동 조건이 더 까다로움' },
    ],
  },

  // ── 액티브 · 방어 ──────────────────────────────
  {
    id: 'active_def_taunt_buff',
    label: '광역 도발 + 자기 생존 버프',
    members: [
      { id: '43', name: '견고한 방어', rank: 1, note: '황금, 도발+받는 피해 직접 감소(15~30%)로 효과가 명확' },
      { id: 'tac_044', name: '청야 전술', rank: 2, note: '보라, 도발은 같지만 통솔 증가라는 간접 효과라 방어력 상승폭이 불확실' },
    ],
  },
  {
    id: 'active_def_debuff',
    label: '무장 해제형 디버프(방덕 계열)',
    members: [
      { id: 'tac_045', name: '적군 굴복', rank: 1, note: '독자적 메커니즘 — 같은 패밀리 내 대체 후보 없음' },
    ],
  },

  // ── 액티브 · 병기 ──────────────────────────────
  {
    id: 'active_weapon_prep_aoe',
    label: '준비형 전체 고배율 병기딜',
    members: [
      { id: '11', name: '기습 제압', rank: 1, note: '순수 배율(150~300%)이 가장 높음, 부가효과 없이 심플' },
      { id: '9', name: '칠군수몰', rank: 2, note: '배율은 낮지만(130~260%) 상태이상(용수+능력소진/무장해제) 추가' },
    ],
  },
  {
    id: 'active_weapon_prep_single',
    label: '준비형 단일 고배율 병기딜',
    members: [
      { id: '16', name: '포위 돌파', rank: 1, note: '황금, 대상의 받는 피해까지 증가시켜 다른 딜러와 시너지 좋음' },
      { id: '21', name: '응전', rank: 2, note: '보라, 자기 방관통만 증가 — 순수 대미지 기여는 비슷하나 등급 낮음' },
    ],
  },
  {
    id: 'active_weapon_instant_aoe',
    label: '즉시 발동 전체 병기딜',
    members: [
      { id: '14', name: '팔방전', rank: 1, note: '황금, 발동률 55%로 가장 안정적 + 공포 부여' },
      { id: '20', name: '화검', rank: 2, note: '보라, 발동률 40%, 화공 부여' },
      { id: '10', name: '파죽지세', rank: 2, note: '황금이지만 발동률이 27.5~50%로 가장 낮음 — 자기 회심 버프는 덤' },
    ],
  },
  {
    id: 'active_weapon_single_debuff',
    label: '단일 대상 디버프 부여형 병기딜',
    members: [
      { id: '12', name: '압도적 승리', rank: 1, note: '황금, 군량고갈 상태면 40~80% 추가딜까지 — 조건부 화력 상승폭 큼' },
      { id: '19', name: '기풍당당', rank: 2, note: '보라, 폭풍 부여 + 선공 감소(유틸형)' },
      { id: '18', name: '측면 공격', rank: 2, note: '보라, 공포 부여 + 2회 발동' },
    ],
  },
  {
    id: 'active_weapon_multi_target',
    label: '2인 대상 병기딜(자버프/디버프 동반)',
    members: [
      { id: '13', name: '찬란한 위명', rank: 1, note: '황금, 자기 회유 버프 + 2인 딜' },
      { id: '22', name: '민중 봉기', rank: 2, note: '보라, 군량고갈 부여지만 등급이 낮음' },
    ],
  },
  {
    id: 'active_weapon_multihit',
    label: '다단 히트형 병기딜',
    members: [
      { id: '15', name: '퇴로 매복', rank: 1, note: '4회 발동으로 히트 수가 가장 많음' },
      { id: '18', name: '측면 공격', rank: 2, note: '2회 발동 — 위 즉시딜 패밀리와 중복 소속(디버프+다단 성격 둘 다 있음)' },
    ],
  },
  {
    id: 'active_weapon_storm_synergy',
    label: '폭풍 상태 시너지형',
    members: [
      { id: '17', name: '구름과 바람', rank: 1, note: '폭풍 상태 적 대상 시 추가딜 + 자기 폭풍 시 피신 확률 증가' },
      { id: '19', name: '기풍당당', rank: 1, note: '폭풍을 직접 부여 — 17과 조합하면 시너지, 대체재라기보단 콤보 관계' },
    ],
  },

  // ── 액티브 · 보조 ──────────────────────────────
  {
    id: 'active_support_buff',
    label: '2인 대상 액티브 버프',
    members: [
      { id: '38', name: '강철의 의지', rank: 1, note: '연타+회유 버프 — 독자적' },
    ],
  },
  {
    id: 'active_support_debuff',
    label: '2인 대상 스탯 디버프',
    members: [
      { id: '37', name: '전략 계획', rank: 1, note: '무력/지력/통솔/선공 동시 감소 — 독자적' },
    ],
  },

  // ── 액티브 · 책략 ──────────────────────────────
  {
    id: 'active_strategy_prep_aoe',
    label: '준비형 전체 책략딜',
    members: [
      { id: '27', name: '기문둔갑', rank: 1, note: '황금, 상태이상 중첩당 피해 계수 증가(최대 5회) — 순수 화력 확장성 최고' },
      { id: '29', name: '재해 이용', rank: 2, note: '황금이지만 아군도 같이 맞음(자신 제외) — 아군 스플래시 리스크' },
    ],
  },
  {
    id: 'active_strategy_single_burst',
    label: '즉시 단일 고배율 책략딜(디버프 조건부 추가딜)',
    members: [
      { id: '26', name: '출기불의', rank: 1, note: '기본 배율(175~350%) 자체가 가장 높음' },
      { id: '24', name: '최상의 지략', rank: 2, note: '혼란 부여 + 조건부 추가딜 있지만 기본 배율은 26보다 낮음' },
      { id: '31', name: '속수무책', rank: 3, note: '보라, 배율(100~200%)이 가장 낮음, 능력소진 부여' },
    ],
  },
  {
    id: 'active_strategy_2target',
    label: '2인 대상 책략딜',
    members: [
      { id: '23', name: '예측의 신', rank: 1, note: '황금, 배율(90~180%) + 50% 확률 능력소진' },
      { id: '32', name: '양책 수립', rank: 2, note: '보라, 자기 지력 버프 동반하지만 등급 낮음' },
      { id: '30', name: '수중전', rank: 3, note: '보라, 홍수 상태 조건부라 기본 화력이 가장 낮음(50~100%)' },
    ],
  },
  {
    id: 'active_strategy_multihit_prep',
    label: '준비형 다단히트 단일 책략딜',
    members: [
      { id: '25', name: '청천벽력', rank: 1, note: '5회 시전, 홍수 상태 시 추가딜 — 독자적' },
    ],
  },
  {
    id: 'active_strategy_dot_hybrid',
    label: '전체+연속 준비 혼합 책략딜',
    members: [
      { id: '28', name: '화공전술', rank: 1, note: '전체 1회 + 준비 3회 추가타 구조 — 독자적' },
      { id: '33', name: '결정적인 수', rank: 2, note: '2인 대상 + 허약 부여 후 조건부 추가딜, 28과는 느슨한 유사군' },
    ],
  },

  // ── 액티브 · 치유 ──────────────────────────────
  {
    id: 'active_heal_single',
    label: '단일 대상 고배율 치유',
    members: [
      { id: '41', name: '청낭 치료', rank: 1, note: '치유량 동일(130~260%)인데 디버프 3개 제거까지 붙어 40보다 명확한 상위호환' },
      { id: '40', name: '예리한 판단', rank: 2, note: '치유량은 같지만 부가효과가 정신 회복(단일 버프) 하나뿐' },
    ],
  },
  {
    id: 'active_heal_multi',
    label: '2인 대상 치유',
    members: [
      { id: '39', name: '청풍 질주', rank: 1, note: '황금, 치유량(90~180%)도 더 높고 디버프 1개 제거까지 있어 42보다 우위' },
      { id: '42', name: '전장의 노래', rank: 2, note: '보라, 치유량(65~130%) 낮은 대신 통솔 버프 부여' },
    ],
  },

  // ── 지휘 · 문무 ──────────────────────────────
  {
    id: 'command_civmil_solo',
    label: '지휘 문무 단독형',
    members: [
      { id: '6', name: '문과 무', rank: 1, note: '매턴 확률 2인 병기+책략 복합딜 — 이 데이터 안에서는 독자적' },
    ],
  },

  // ── 추격 · 방어 ──────────────────────────────
  {
    id: 'chase_def_solo',
    label: '추격 방어 단독형',
    members: [
      { id: 'tac_058', name: '경무장', rank: 1, note: '일반공격 후 2인 방어 스택 부여 — 이 데이터 안에서는 독자적' },
    ],
  },

  // ── 지휘 · 방어 ──────────────────────────────
  {
    id: 'command_def_survival',
    label: '팀 생존형 커맨드(느슨한 유사군)',
    members: [
      { id: '8', name: '전쟁 종식', rank: 1, note: '전군 대상 방어 스택(확률형) — 팀 전체 보호' },
      { id: '7', name: '허점 공략', rank: 2, note: '자신+랜덤 1인 한정 피해 감소 — 범위가 좁아 하위' },
    ],
  },

  // ── 지휘 · 보조 ──────────────────────────────
  {
    id: 'command_support_permastack',
    label: '전투 내내 지속되는 영구 중첩 버프',
    members: [
      { id: '3', name: '준비 완료', rank: 1, note: '2인 대상, 주는 피해 % 영구 중첩 — 적용 범위가 더 넓음' },
      { id: '1', name: '백전불태', rank: 2, note: '최고 스탯 유닛 1인 한정 스탯 중첩 — 대상이 한정적' },
    ],
  },
  {
    id: 'command_support_hybrid',
    label: '생존+딜러 지원 혼합형',
    members: [
      { id: '2', name: '결사의 다짐', rank: 1, note: '전열 치유+피해감소, 무력 최고 유닛 추가딜까지 이중 효과' },
      { id: '5', name: '정의의 희생', rank: 1, note: '전군 연타 버프 + 정신회복 + 자기 위협 흡수 — 다른 방식의 이중 효과, 동급 취급' },
    ],
  },
  {
    id: 'command_support_core',
    label: '딜러 코어 확정 발동형',
    members: [
      { id: '4', name: '인재 기용', rank: 1, note: '회심/모책 확정 발동 + 피해 증가 — 독자적' },
    ],
  },

  // ── 지휘 · 책략 ──────────────────────────────
  {
    id: 'command_strategy_dot_single',
    label: '단일 대상 도트형 책략딜',
    members: [
      { id: 'tac_075', name: '보급 차단', rank: 1, note: '군량고갈 확정 부여 후 매턴 딜, 황금' },
      { id: 'tac_077', name: '비상한 전략', rank: 2, note: '보라, 매턴 10%씩 딜 증가하지만 상태이상 부여가 없음' },
    ],
  },
  {
    id: 'command_strategy_aoe_special',
    label: '전군 상태이상 연계형',
    members: [
      { id: 'tac_076', name: '광풍의 분노', rank: 1, note: '홀짝 턴마다 전체/단일 책략딜 전환 — 독자적' },
    ],
  },

  // ── 추격 · 병기 (일반공격 연계) ──────────────────────────────
  {
    id: 'chase_weapon_single_burst',
    label: '일반공격 연계 즉시 단일 고배율 병기딜',
    members: [
      { id: 'tac_048', name: '철기병 돌격', rank: 1, note: '배율(200~400%)이 압도적으로 높음(매턴 감소 페널티는 있음)' },
      { id: 'tac_049', name: '허점 공격', rank: 2, note: '140~280% + 허약 상태 조건부 30% 추가딜' },
      { id: 'tac_051', name: '무방비 공격', rank: 2, note: '140~280% + 능력소진→위협 연계, 049와 동급' },
      { id: 'tac_047', name: '천리기습', rank: 3, note: '140~280%지만 조건(선공 1위+후열) 충족이 더 까다로움' },
      { id: 'tac_050', name: '원문사극', rank: 4, note: '기본 배율(110~220%)이 가장 낮음, 대신 액티브 발동률 버프' },
    ],
  },
  {
    id: 'chase_weapon_aoe',
    label: '일반공격 연계 광역/다수 병기딜',
    members: [
      { id: 'tac_052', name: '천군 소탕', rank: 1, note: '전체 대상 + 영구 중첩 강화 — 유일한 순수 전체딜' },
      { id: 'tac_046', name: '신속전개', rank: 2, note: '2인 대상 + 자기 선공 버프' },
      { id: 'tac_055', name: '야습', rank: 3, note: '2인 대상, 보라 등급, 조건부 추가딜' },
    ],
  },
  {
    id: 'chase_weapon_utility',
    label: '일반공격 연계 유틸(디버프 중심, 배율 낮음)',
    members: [
      { id: 'tac_054', name: '적진 교란', rank: 1, note: '혼란 부여 — 범용성 높은 CC' },
      { id: 'tac_053', name: '순간 돌습', rank: 2, note: '통솔 감소 — 효과가 국지적' },
    ],
  },

  // ── 추격 · 책략 ──────────────────────────────
  {
    id: 'chase_strategy_single',
    label: '일반공격 연계 단일 책략딜',
    members: [
      { id: 'tac_056', name: '창고 기습', rank: 1, note: '배율(150~300%) 더 높고 군량고갈 조건부 추가딜까지, 황금' },
      { id: 'tac_057', name: '넘치는 계획', rank: 2, note: '보라, 배율(125~250%) 낮고 후열 우선이라는 조건 있음' },
    ],
  },

  // ── 패시브 · 방어 ──────────────────────────────
  {
    id: 'passive_def_survival',
    label: '패시브 생존형(느슨한 유사군)',
    members: [
      { id: 'tac_074', name: '고요한 제압', rank: 1, note: '받는 피해 감소폭(17.5~35%)이 가장 크고 확정 발동' },
      { id: 'tac_073', name: '세금 과징수', rank: 2, note: '피해 감소폭(5~10%)은 작지만 회복까지 동반, 조건부 4중첩' },
    ],
  },

  // ── 패시브 · 병기 ──────────────────────────────
  {
    id: 'passive_weapon_onattack_splash',
    label: '일반공격 연계 피해 전달형',
    members: [
      { id: 'tac_060', name: '일인천군', rank: 1, note: '확률적 2인 전달 + 무력 비교 조건부 추가딜, 황금' },
      { id: 'tac_061', name: '강습', rank: 2, note: '단일 전달만 가능, 보라' },
    ],
  },
  {
    id: 'passive_weapon_selfstack',
    label: '자버프 중첩형',
    members: [
      { id: 'tac_059', name: '용맹한 삼국', rank: 1, note: '회유+주는피해 중첩, 3스택 시 폭발딜 — 독자적' },
    ],
  },
  {
    id: 'passive_weapon_counter',
    label: '반격/생존형',
    members: [
      { id: 'tac_062', name: '위기의 결전', rank: 1, note: '반격 확률 + 받는 피해 감소 — 독자적' },
    ],
  },

  // ── 패시브 · 보조 ──────────────────────────────
  {
    id: 'passive_support_dmg_amp',
    label: '주는 피해 증폭형 자버프',
    members: [
      { id: 'tac_065', name: '예리한 통찰', rank: 1, note: '방관통+피해%, 황금 — 순수 딜 증폭 폭이 가장 큼' },
      { id: 'tac_068', name: '늠름한 자태', rank: 2, note: '연타+피해%, 보라 — 증폭폭이 상대적으로 작음' },
    ],
  },
  {
    id: 'passive_support_active_focused',
    label: '액티브 전법 전용 버프',
    members: [
      { id: 'tac_067', name: '신의 가호', rank: 1, note: '액티브 발동률+피해 — 독자적' },
    ],
  },
  {
    id: 'passive_support_strategy_focused',
    label: '책략 계열 지력 버프',
    members: [
      { id: 'tac_066', name: '충신의 기재', rank: 1, note: '묘책+지력 중첩 — 독자적' },
    ],
  },

  // ── 패시브 · 책략 ──────────────────────────────
  {
    id: 'passive_strategy_conditional_extra',
    label: '조건부 추가 발동형 패시브',
    members: [
      { id: 'tac_064', name: '독설가', rank: 1, note: '디버프 트리거 시 추가 책략딜 — 안정적 확률(60%) 및 턴당 2회' },
      { id: 'tac_063', name: '패잔병 척결', rank: 2, note: '책략딜 후 확률 일반공격 부여, 턴당 1회 제한' },
    ],
  },

  // ── 패시브 · 치유 ──────────────────────────────
  {
    id: 'passive_heal_self',
    label: '자가 회복형',
    members: [
      { id: 'tac_072', name: '지혜의 바람', rank: 1, note: '매턴 확정 자가 회복(70~140%)으로 회복량이 가장 큼' },
      { id: 'tac_071', name: '전쟁 조달', rank: 2, note: '무력 버프는 있지만 회복량(55~110%)은 072보다 낮음' },
    ],
  },
  {
    id: 'passive_heal_team',
    label: '팀 힐형',
    members: [
      { id: 'tac_069', name: '전력 지원', rank: 1, note: '황금, 조건부지만 2인 회복(25~50%)' },
      { id: 'tac_070', name: '평화의 기운', rank: 2, note: '보라, 전열 전체 확정 회복(45~90%) — 확정성은 높지만 등급 낮음' },
    ],
  },
];

// tacticId -> family(들) 역인덱스. 한 전법이 여러 family에 걸칠 수 있음(예: 측면 공격).
export function buildTacticFamilyIndex(families = TACTIC_FAMILIES) {
  const index = {};
  for (const family of families) {
    for (const member of family.members) {
      const key = member.id;
      if (!index[key]) index[key] = [];
      index[key].push({ familyId: family.id, familyLabel: family.label, rank: member.rank, note: member.note });
    }
  }
  return index;
}

// 두 전법이 같은 family에 속하는지, 속한다면 substitute 우선순위 점수를 반환.
// baseId: 티어덱 원본 전법, candidateId: 대체 후보 전법
export function getSubstituteScore(baseId, candidateId, index = buildTacticFamilyIndex()) {
  const baseFamilies = index[baseId] || [];
  const candidateFamilies = index[candidateId] || [];
  let best = null;

  for (const bf of baseFamilies) {
    for (const cf of candidateFamilies) {
      if (bf.familyId !== cf.familyId) continue;
      // rank가 같거나 더 좋으면(작으면) 보너스가 크고, rank가 base보다 나쁘면 페널티성 보너스
      const rankDiff = cf.rank - bf.rank; // 0 이하면 동급 이상
      const score = rankDiff <= 0 ? 100 : Math.max(10, 100 - rankDiff * 25);
      if (!best || score > best.score) {
        best = { score, familyId: bf.familyId, familyLabel: bf.familyLabel };
      }
    }
  }
  return best; // null이면 같은 family 없음(=이 데이터 기준으로는 대체 근거 없음)
}