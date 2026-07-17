// data/synergies.js
// 인게임 6대 공식 진형 마스터 데이터 정의
export const FORMATIONS_MASTER = [
  { name: "일자진", grid: [1, 1, 1, 0, 0, 0], effect: "전열이 받는 피해 8% 감소" },
  { name: "기형진", grid: [0, 1, 0, 0, 1, 1], effect: "전열 피해 6% 감소, 후열 주는 피해 12% 증가" },
  { name: "안형진", grid: [0, 1, 1, 1, 0, 0], effect: "전열 통솔 20 포인트 증가, 후열 주는 피해 15% 증가" },
  { name: "방원진", grid: [1, 1, 0, 0, 0, 1], effect: "전열 받는 피해 5% 감소, 후열 연타 확률 40% 증가" },
  { name: "추형진", grid: [0, 1, 0, 1, 0, 1], effect: "전열 주는 피해 16% 증가, 후열 받는 피해 5% 감소" },
  { name: "어린진", grid: [1, 0, 0, 0, 1, 1], effect: "전열 피신 12% 증가, 후열 회심/묘책 확률 8% 증가" }
];

export const SYNERGY_MASTER = [
  { "name": "천하삼분", "req": 3, "members": ["조조", "유비", "손권"], "effect": "부대 내 인연 무장이 받는 피해 6% 감소" },
  { "name": "도원결의", "req": 3, "members": ["유비", "관우", "장비"], "effect": "3번째 턴에 모든 디버프 제거" },
  { "name": "완벽한 조합", "req": 2, "members": ["유비", "손상향"], "effect": "부대 내 인연 무장이 받는 책략 피해 6% 감소" },
  { "name": "황실의 인연", "req": 2, "members": ["유비", "감부인"], "effect": "부대 내 인연 무장이 받는 병기 피해 6% 감소" },
  { "name": "소열제", "req": 1, "members": ["유비"], "effect": "등극 시즌 촉 진영 보너스 50% 증가" },
  { "name": "명실상부", "req": 2, "members": ["제갈량", "뉴제갈량", "황월영"], "effect": "부대 내 인연 무장이 받는 치유 효과 8% 증가" },
  { "name": "서촉의 지혜", "req": 3, "members": ["제갈량", "뉴제갈량", "서서", "방통", "법정"], "effect": "부대 내 인연 무장이 받는 책략 피해 8% 감소" },
  { "name": "나라의 동량", "req": 3, "members": ["제갈량", "뉴제갈량", "주유", "사마의"], "effect": "전투 최초 3회 책략 피해 50% 증가" },
  { "name": "제갈 가문", "req": 2, "members": ["제갈근", "제갈량", "뉴제갈량"], "effect": "방어 관통/간파 증가, 무장 1명당 전체 방어 관통/간파 5% 추가 증가" },
  { "name": "오호상장", "req": 3, "members": ["관우", "장비", "황충", "조운", "마초"], "effect": "회심 확률 10% 증가" },
  { "name": "깊은 의리", "req": 2, "members": ["관우", "관평", "주창", "관은병"], "effect": "방어 관통 6% 증가" },
  { "name": "서랑의 철기", "req": 2, "members": ["마초", "마운록", "마등"], "effect": "추격 전법 피해 8% 증가" },
  { "name": "서랑의 영웅", "req": 2, "members": ["마등", "마초"], "effect": "병기 피해 5% 증가" },
  { "name": "5대 군사", "req": 3, "members": ["곽가", "정욱", "순욱", "순유", "가후"], "effect": "간파 5% 증가, 받는 피해 4% 감소" },
  { "name": "궁술 대결", "req": 2, "members": ["서황", "허저"], "effect": "방어 관통 5% 증가" },
  { "name": "궁중의 미", "req": 2, "members": ["조비", "견희"], "effect": "받는 병기 피해 6% 감소" },
  { "name": "조위의 종장", "req": 2, "members": ["하후돈", "하후연", "조인", "조순", "조진", "조홍"], "effect": "최고 속성 15포인트 증가" },
  { "name": "오자양장", "req": 2, "members": ["우금", "장합", "서황", "장료", "악진"], "effect": "방어 관통 6% 증가" },
  { "name": "하북 정장", "req": 2, "members": ["안량", "문추", "장합"], "effect": "무력 20포인트 증가" },
  { "name": "한말의 혼란", "req": 2, "members": ["동탁", "여포", "이유", "화웅"], "effect": "통솔 20포인트 증가" },
  { "name": "격동의 인연", "req": 2, "members": ["여포", "초선"], "effect": "일반 공격/추격 피해 12% 감소" },
  { "name": "용맹한 비장", "req": 2, "members": ["여포", "장료", "진궁"], "effect": "회유 10% 증가" },
  { "name": "적진 돌격", "req": 2, "members": ["여포", "고순"], "effect": "병기 피해 5% 증가" },
  { "name": "황건봉기", "req": 3, "members": ["장각", "장보", "장량", "장녕", "장만성"], "effect": "액티브 발동률 8% 증가" },
  { "name": "자연의 도법", "req": 3, "members": ["장각", "우길", "좌자"], "effect": "준비 전법 20% 확률로 준비 1턴 건너뜀" },
  { "name": "태평성대", "req": 2, "members": ["장각", "장녕"], "effect": "받는 병기 피해 6% 감소" },
  { "name": "우아한 자태", "req": 2, "members": ["왕이", "보연사", "대교", "견희", "장춘화"], "effect": "피해 시 35% 확률로 대상 최고 속성 5 감소 (5회 중첩)" },
  { "name": "난세의 미인", "req": 3, "members": ["초선", "채문희", "주씨", "견희", "왕이", "손상향", "감부인"], "effect": "전투 시작 시 방어 2스택 획득" },
  { "name": "천상천하", "req": 2, "members": ["손권", "보연사"], "effect": "첫 3턴 받는 피해 12% 감소" },
  { "name": "위업 계승", "req": 1, "members": ["손권"], "effect": "등극 시즌 오 진영 보너스 50% 증가" },
  { "name": "고육지계", "req": 2, "members": ["주유", "황개"], "effect": "우군 피해 후 받는 액티브 피해 12% 감소" },
  { "name": "조정의 기둥", "req": 2, "members": ["주유", "육항"], "effect": "이상 상태 목표에게 주는 피해 8% 증가" },
  { "name": "괄목상대", "req": 2, "members": ["여몽", "노숙"], "effect": "3턴 시작 시 받는 액티브 피해 12% 감소" },
  { "name": "부창부수", "req": 2, "members": ["주유", "소교"], "effect": "액티브 전법 발동률 4% 증가" },
  { "name": "동오 대도독", "req": 3, "members": ["주유", "노숙", "여몽", "육선"], "effect": "심리 공격 8% 획득" },
  { "name": "신정 격전", "req": 2, "members": ["태사자", "손책"], "effect": "무력 20포인트 증가" },
  { "name": "만궁일격", "req": 2, "members": ["태사자", "감녕", "능통"], "effect": "일반 공격 피해 8% 증가" },
  { "name": "오국의 미녀", "req": 2, "members": ["소교", "대교", "보연사"], "effect": "지력 20포인트 증가" },
  { "name": "경건한 의식", "req": 2, "members": ["손책", "대교"], "effect": "통솔 20포인트 증가" },
  { "name": "강표의 호신", "req": 2, "members": ["황개", "감녕", "서상", "정보", "주태", "능통", "장흠", "정보", "동습", "한당", "진무", "반장"], "effect": "통솔 10포인트 증가, 받는 피해 3% 감소" },
  { "name": "호위의 의지", "req": 2, "members": ["조조", "허저", "전위"], "effect": "일반 공격 피해 12% 증가" },
  { "name": "황위 계승", "req": 2, "members": ["조조", "조비"], "effect": "통솔 20포인트 증가" },
  { "name": "무황과 선후", "req": 2, "members": ["변부인", "조조"], "effect": "초반 3턴 받는 책략 피해 15% 감소" },
  { "name": "위국의 왕", "req": 1, "members": ["조조"], "effect": "등극 시즌 위 진영 보너스 50% 증가" },
  { "name": "사세삼공", "req": 2, "members": ["원소", "원술"], "effect": "받는 책략/병기 피해 3% 감소" }
];

// 덱의 장수들과 인연 마스터를 대조하여 활성화된 인연만 뽑아내는 함수
// (기존 파일 상단의 getActiveSynergies(deckSetup)를 이름만 바꿔 그대로 옮김 —
//  컴포넌트 내부의 "선택 보유 장수 기준" getActiveSynergies와 이름이 겹치지 않도록 함)
export const getActiveSynergiesFromSetup = (deckSetup) => {
  const currentGeneralNames = deckSetup.map(g => g.general_name);
  return SYNERGY_MASTER.filter(s => {
    const matchedCount = s.members.filter(m => currentGeneralNames.includes(m)).length;
    return matchedCount >= s.req;
  });
};

// 진형 grid 좌표를 FORMATIONS_MASTER와 대조해 이름/효과를 찾아주는 함수
export const matchFormationInfo = (rawGrid) => {
  if (!rawGrid) return { name: "진형 조율 중", effect: "지정된 진형 속성이 없습니다." };

  let parsedGrid = [];
  try {
    if (typeof rawGrid === 'string') {
      parsedGrid = JSON.parse(rawGrid);
    } else if (Array.isArray(rawGrid)) {
      parsedGrid = rawGrid;
    }
  } catch (e) {
    if (typeof rawGrid === 'string') {
      parsedGrid = rawGrid.split(',').map(num => parseInt(num.trim(), 10));
    }
  }

  if (!Array.isArray(parsedGrid) || parsedGrid.length !== 6) {
    return { name: "수기 연동 오류", effect: "6칸 진형 좌표 데이터 규격이 맞지 않습니다." };
  }

  const matched = FORMATIONS_MASTER.find(f =>
    f.grid.every((val, index) => val === parsedGrid[index])
  );

  if (matched) {
    return { name: matched.name, effect: matched.effect };
  }

  return { name: `맞춤진형 (${parsedGrid.join('')})`, effect: "유저 지정 수기 정렬 효과 연동" };
};