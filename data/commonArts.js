// 범용 병법(일반병법) 마스터 데이터
export const COMMON_ARTS_MASTER = {
  defense_survival: [
    { name: "피험", effect: "받는 피해가 4.5% 감소한다." },
    { name: "합전", effect: "받는 병기 피해 5.5% 감소." },
    { name: "모전", effect: "받는 책략 피해 5.5% 감소." },
    { name: "병정", effect: "전투 시작 후 4턴 동안 받는 피해가 6% 감소한다." }
  ],
  healing_support: [
    { name: "치병", effect: "받는 치유 효과가 6% 증가한다." },
    { name: "연사", effect: "통솔이 15포인트 증가한다." },
    { name: "고무", effect: "치유 증가폭이 6% 증가한다." },
    { name: "연기", effect: "전열에 시전하는 치유 증가폭이 8% 증가한다." }
  ],
  attack_power_pursuit: [
    { name: "작전", effect: "병기 피해가 6.5% 증가한다." },
    { name: "돌전", effect: "추격 전법 피해가 7% 증가한다." },
    { name: "구전", effect: "병기 피해를 준 후, 병기 피해가 1.8% 증가하며, 최대 5회 중첩된다." },
    { name: "질전", effect: "전투 시작 후 4턴 동안 추격 전법 피해가 9% 증가한다." }
  ],
  critical_pierce: [
    { name: "적복", effect: "회심 확률이 3% 증가한다." },
    { name: "파적", effect: "관통이 6% 증가한다." },
    { name: "득세", effect: "피해를 준 후, 관통이 1.5% 증가(최대 5회 중첩)." },
    { name: "분적", effect: "홀수 턴에 회심 확률이 5.5% 증가한다." }
  ],
  magic_strategy: [
    { name: "요적", effect: "책략 피해가 6% 증가한다." },
    { name: "삼청", effect: "묘책 확률이 3% 증가한다." },
    { name: "탈계", effect: "피해를 준 후, 책략 피해가 1% 증가하며, 최대 8회 중첩된다." },
    { name: "심리", effect: "짝수 턴에 책략 피해가 9% 증가한다." }
  ]
};