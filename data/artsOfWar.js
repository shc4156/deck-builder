// data/artsOfWar.js
// 삼국지 천하결전 범용 병법(일반병법) 마스터 데이터
export const COMMON_ARTS_OF_WAR = {
  defense_survival: [
    { name: "피험", effect: "받는 피해가 4.5% 감소한다." },
    { name: "병정", effect: "전투 시작 후 4턴 동안 받는 피해가 6% 감소한다." },
    { name: "수세", effect: "자신이 후열이면 받는 피해가 5% 감소한다." },
    { name: "수토", effect: "자신이 전열이면 받는 피해가 5% 감소한다." },
    { name: "합전", effect: "받는 병기 피해 5.5% 감소." },
    { name: "선전", effect: "전투 시작 후, 4턴 동안 받는 병기 피해가 9% 감소한다." },
    { name: "모전", effect: "받는 책략 피해 5.5% 감소." },
    { name: "연지", effect: "짝수 턴에 받는 책략 피해가 9% 감소한다." },
    { name: "기임", effect: "전투 1번째 턴에 적군 전체에게 피해를 준다." },
  ],
  healing_support: [
    { name: "치병", effect: "받는 치유 효과가 6% 증가한다." },
    { name: "군용", effect: "자신이 전열이면 받는 치유 효과가 8% 증가한다." },
    { name: "연사", effect: "통솔이 15포인트 증가한다." },
    { name: "근선", effect: "전체 아군이 회복 효과를 받은 후, 1턴 동안 통솔이 10 증가한다." },
    { name: "선위", effect: "우군 2명의 회유가 3.5% 증가한다." },
    { name: "선지", effect: "우군 2명의 심리 공격이 3.5% 증가한다." },
    { name: "비전", effect: "우군 2명의 병기 피해가 3.5% 증가한다." },
    { name: "정시", effect: "우군 2명의 책략 피해가 3.5% 증가한다." },
    { name: "피용", effect: "우군 2명이 받는 병기 피해가 3.5% 감소한다." },
    { name: "겁지", effect: "우군 2명이 받는 책략 피해가 3.5% 감소한다." },
    { name: "연기", effect: "전열에 시전하는 치유 증가폭이 8% 증가한다." },
    { name: "고무", effect: "치유 증가폭이 6% 증가한다." },
    { name: "원도", effect: "병력이 가장 낮은 아군에게 치유 시, 1턴 동안 피해 6.5% 감소." },
  ],
  attack_power_pursuit: [
    { name: "작전", effect: "병기 피해가 6.5% 증가한다." },
    { name: "승전", effect: "전투 시작 후 4턴 동안 병기 피해가 8% 증가한다." },
    { name: "구전", effect: "병기 피해를 준 후, 병기 피해가 1.8% 증가하며, 최대 5회 중첩된다." },
    { name: "병도", effect: "홀수 턴에 병기 피해가 9.9% 증가한다." },
    { name: "돌투", effect: "추격 전법 발동률이 3.5% 증가한다." },
    { name: "돌전", effect: "추격 전법 피해가 7% 증가한다." },
    { name: "질전", effect: "전투 시작 후 4턴 동안 추격 전법 피해가 9% 증가한다." },
    { name: "질투", effect: "전투 시작 후 4턴 동안 추격 전법 발동률이 5% 증가한다." },
    { name: "지속전", effect: "피해를 준 후, 추격 전법 발동률 1.2% 증가(최대 4회 중첩)." },
    { name: "만투", effect: "피해를 준 후, 추격 전법 피해 2.5% 증가(최대 4회 중첩)." },
    { name: "임용", effect: "추격 전법 발동 후, 자신 받는 피해 5.5% 감소(2턴)." },
  ],
  critical_pierce: [
    { name: "적복", effect: "회심 확률이 3% 증가한다." },
    { name: "분적", effect: "홀수 턴에 회심 확률이 5.5% 증가한다." },
    { name: "적음", effect: "전투 시작 후 3턴 동안 회심 확률이 5% 증가한다." },
    { name: "공적", effect: "회심 발동 후, 60% 확률로 무력 5 포인트 증가(최대 4회 중첩)." },
    { name: "파적", effect: "관통이 6% 증가한다." },
    { name: "득세", effect: "피해를 준 후, 관통이 1.5% 증가(최대 5회 중첩)." },
    { name: "차세", effect: "홀수 턴에 관통이 9% 증가한다." },
  ],
  magic_strategy: [
    { name: "요적", effect: "책략 피해가 6% 증가한다." },
    { name: "기지", effect: "4번째 턴부터 책략 피해가 10% 증가한다." },
    { name: "탈계", effect: "피해를 준 후, 책략 피해가 1% 증가하며, 최대 8회 중첩된다." },
    { name: "심리", effect: "짝수 턴에 책략 피해가 9% 증가한다." },
    { name: "삼청", effect: "묘책 확률이 3% 증가한다." },
    { name: "모복", effect: "짝수 턴에 묘책 확률이 5.5% 증가한다." },
    { name: "후기", effect: "매 턴 종료 시, 묘책 확률이 1% 증가하며, 중첩될 수 있다." },
    { name: "기지(수기)", effect: "4번째 턴부터 책략 피해가 8.3% 증가한다." },
  ],
};

// 장수의 primary_role → 어울리는 일반병법 카테고리
// (방어 / 힐 / 무력·추격딜 / 무력·회심딜 / 책략딜 5분류)
export const ROLE_TO_ARTS_CATEGORY = {
  '탱커_방어': 'defense_survival',
  '힐러': 'healing_support',
  '딜_병기': 'attack_power_pursuit',
  '딜_혼합': 'critical_pierce',
  '딜_책략': 'magic_strategy',
  '디버퍼': 'magic_strategy',
  '버퍼': 'healing_support',
  '지휘_보조': 'magic_strategy',
};

export function getArtsCategoryForGeneral(generalData) {
  return ROLE_TO_ARTS_CATEGORY[generalData?.primary_role] || 'attack_power_pursuit';
}