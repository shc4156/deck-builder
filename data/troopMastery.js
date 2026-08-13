// data/troopMastery.js
// 시즌2 병종 진급(Lv35) / 병종 정통(Lv40) / 병부 시스템 데이터
// 출처: S2 시즌 공략 PDF "IV. 병종 진급과 병종 정통", "V. 병부 및 병종 추가 콘텐츠"
//
// 코드 전반(TROOP_BONUS_RULES, TROOP_TYPE_BONUS, generals.troop_type, tier_decks.hero_troop)이
// 전부 '방패병/창병/기병/궁병' 4종(coarse) 기준으로 되어 있어, 이 파일도 같은 4종을
// 최상위 key로 씀. 진급 시 실제로 갈리는 8종 세부 병종(중방패병/검방패병 등)은
// 그 아래 subtypes 배열로 둠 — 장수 한 명이 고정으로 가지는 값이 아니라
// "이 coarse 병종으로 진급할 때 고를 수 있는 두 갈래" 개념이기 때문.

export const TROOP_UNLOCK_INFO = {
  advanceLevel: 35,
  advanceCost: 50000, // 동전
  masteryLevel: 40,
  masteryCost: 30000, // 동전, 진급 기반에서 추가 해제
  note: "패업 '일방 할거' 단계에서 개방. 병부로 미보유 고급 병종 추가 시 무장당 최대 2개까지 가능(시즌 중 변경 불가, 무장 초기화 시에만 반환)."
};

// coarse 병종별 두 세부 진급 계열: 병종특성(진급 시 자동) + 전용정통(정통 해제 시 선택)
export const TROOP_MASTERY = {
  방패병: {
    subtypes: {
      중방패병: {
        classTrait: { name: '불굴', effect: '1턴 동안 매 턴 시작 시 받는 피해 8% 감소, 자신의 행동 종료 후 4%로 감소' },
        exclusiveMastery: { name: '굳건한 태세', effect: '피해를 받을 때마다 50% 확률로 병력 회복(치유율 40%, 통솔 영향, 매턴 최대 2회)' },
        recommendedGenerals: ['우금', '조인', '장각']
      },
      검방패병: {
        classTrait: { name: '정신 집중', effect: '전투 중 처음 제어 상태가 될 경우 55% 확률로 1턴간 정신 회복 획득' },
        exclusiveMastery: { name: '핏빛 전투', effect: '이상 상태 피격 후 65% 확률로 주는 피해 4% 증가(2턴 지속, 최대 2회 중첩)' },
        recommendedGenerals: ['장량', '장보', '조조', '유비']
      }
    },
    generalMastery: [
      { name: '백전백승', effect: '액티브 전법 피해 6% 증가' },
      { name: '포진 대기', effect: '궁병에게 주는 피해가 8% 증가' },
      { name: '철벽 방어', effect: '받는 병기 피해 6% 감소' },
      { name: '보보위영', effect: '통솔이 자신보다 낮은 적군에게 받는 피해 4% 감소' },
      { name: '확고한 정비', effect: '주는 치유 효과 10% 증가' }
    ]
  },
  창병: {
    subtypes: {
      단창병: {
        classTrait: { name: '격전', effect: '받는 피해 3% 감소. 4턴째부터 주는 피해 8~10% 증가하며 전투 종료 시까지 지속' },
        exclusiveMastery: { name: '완전 무장', effect: '주는 피해 3% 증가, 받는 피해 3% 감소' },
        recommendedGenerals: ['육손', '전위', '장합', '정보']
      },
      장창병: {
        classTrait: { name: '파훼', effect: '일반 공격 후 65% 확률로 2턴 동안 목표 통솔 8 감소(최대 2회 중첩)' },
        exclusiveMastery: {
          name: '견정불이(堅貞不移)',
          effect: '피격 시 피해 감소(피감) 스택을 중첩 — 전투가 길어질수록 방어력이 극대화되는 창병 최강의 방어 정통',
          isKeyMastery: true
        },
        recommendedGenerals: ['허저', '여몽', '장비', '감부인', '조운']
      }
    },
    generalMastery: [
      { name: '적진 제압', effect: '관통 4% 증가' },
      { name: '예리한 공격', effect: '일반 공격 피해 8% 증가' },
      { name: '장창거마', effect: '기병에게 주는 피해 8% 증가' },
      { name: '창벽', effect: '받는 추격 전법 피해 8% 감소' },
      { name: '초지일관', effect: '매 턴 행동 시 40% 확률(손실 병력 영향)로 방어 1스택 획득' }
    ]
  },
  기병: {
    subtypes: {
      경기병: {
        classTrait: { name: '질주', effect: '전투 시작 후 3턴 동안 피신율 3% 증가, 피해 5% 증가' },
        exclusiveMastery: { name: '승세추격', effect: '병력 50% 미만인 적군에게 주는 피해 6% 증가' },
        recommendedGenerals: ['조운', '하후연', '마초', '마운록', '여포']
      },
      중기병: {
        classTrait: { name: '강인', effect: '통솔이 10 증가하고, 자신이 이상 상태일 경우 받는 피해가 5% 감소' },
        exclusiveMastery: { name: '철마금과', effect: '전열 배치 시 후열 적군에게 받는 피해 6% 감소' },
        recommendedGenerals: ['하후돈', '주창', '관우', '가후']
      }
    },
    generalMastery: [
      { name: '용맹한 용사', effect: '고유 액티브 전법 발동률 5% 증가' },
      { name: '기병 돌진', effect: '회심 피해 8% 증가' },
      { name: '방패 파괴', effect: '방패병에게 주는 피해 8% 증가' },
      { name: '적진 돌격', effect: '받는 계략 피해 6% 감소' },
      { name: '여유만만', effect: '피신 발동 후 자신의 병력 회복(치유율 55%, 통솔 영향, 매턴 최대 2회)' }
    ]
  },
  궁병: {
    subtypes: {
      장궁병: {
        classTrait: { name: '통찰', effect: '매 턴 처음 피해를 준 후 1턴 동안 목표가 받는 피해 5% 증가' },
        exclusiveMastery: { name: '전우 동심', effect: '아군 치유 시 60% 확률로 병력 추가 회복(치유율 50%, 지력 영향, 매턴 최대 2회)' },
        recommendedGenerals: ['소교', '전풍', '법정', '순욱']
      },
      노병: {
        classTrait: { name: '강노', effect: '주는 피해 5% 증가, 목표 보유 이상 상태 1개당 추가 1%(최대 8%)' },
        exclusiveMastery: { name: '후방 와해', effect: '후열 적군에게 주는 피해 5% 증가' },
        recommendedGenerals: ['육손', '주유', '황충', '제갈량']
      }
    },
    generalMastery: [
      { name: '완벽한 사격', effect: '전투 시작 후 최초 3턴 동안 추격 전법 발동률 5% 증가' },
      { name: '빗발치는 화살', effect: '묘책 피해 8% 증가' },
      { name: '날카로운 화살', effect: '창병에게 주는 피해 8% 증가' },
      { name: '공수 겸비', effect: '받는 액티브 전법 피해 8% 감소' },
      { name: '치밀한 계획', effect: '적군에게 제어 상태 부여 시 65% 확률로 지력·통솔 10 추가 감소(1턴 지속)' }
    ]
  }
};

// coarse 병종명 유효성 체크에 씀 (troop_type / hero_troop 값 검증용)
export const COARSE_TROOP_TYPES = Object.keys(TROOP_MASTERY);

export function getTroopMasteryInfo(coarseTroopType) {
  return TROOP_MASTERY[coarseTroopType?.trim()] || null;
}

// 두 세부 진급(subtype) 중 어느 쪽이 이 장수에게 더 맞는지는 자동 판별하지 않고
// 도감/1-5군 화면에서 두 옵션을 그대로 보여주는 용도로 사용.
export function getSubtypeOptions(coarseTroopType) {
  const info = getTroopMasteryInfo(coarseTroopType);
  if (!info) return [];
  return Object.entries(info.subtypes).map(([subtypeName, data]) => ({ subtypeName, ...data }));
}

// 장수 역할(primary_role) → 어느 coarse 병종의 진급/정통이 그 역할과 잘 맞는지 가중치
// (각 병종의 classTrait/exclusiveMastery 성격을 참고해 수기로 매핑)
export const ROLE_TROOP_AFFINITY = {
  탱커_방어: { 방패병: 25, 창병: 20 },
  딜_병기: { 기병: 22, 창병: 15 },
  딜_책략: { 궁병: 22 },
  딜_혼합: { 기병: 12, 궁병: 12 },
  힐러: { 궁병: 18, 방패병: 10 },
  지휘_보조: { 궁병: 16, 방패병: 10 },
  디버퍼: { 창병: 18, 궁병: 14 },
  버퍼: { 궁병: 14, 방패병: 12 },
};