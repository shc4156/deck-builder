// main_stat에 따른 추천 장비 옵션 정의
export const RECOMMENDED_EQUIPMENT_STATS: Record<string, { primary: string; secondary: string[] }> = {
  무력: {
    primary: '무력',
    secondary: ['물리 피해 증가', '방어 관통', '회심률'],
  },
  지력: {
    primary: '지력',
    secondary: ['책략 피해 증가', '간파', '치유율/회복량'],
  },
  통솔: {
    primary: '통솔',
    secondary: ['받는 피해 감소', '방어/가드률', 'HP 증가'],
  },
  선공: {
    primary: '속도/선공',
    secondary: ['선제 공격', '추격 피해', '연타율'],
  },
};

/**
 * 장수의 main_stat을 받아 추천 장비 옵션 정보를 반환하는 헬퍼 함수
 */
export const getRecommendedEquipmentOptions = (mainStat: string) => {
  return RECOMMENDED_EQUIPMENT_STATS[mainStat] || RECOMMENDED_EQUIPMENT_STATS['지력'];
};