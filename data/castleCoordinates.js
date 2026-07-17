// data/castleCoordinates.js
//
// 성 이름 → 좌표(x, y) + 레벨 + 종류(성/관문) 매핑 시드 데이터입니다.
// 지금까지 올려주신 스크린샷에서 확인 가능한 성만 우선 등록했습니다.
// 여기 없는 성은 서신 작성 화면에서 좌표를 한 번 수동으로 입력하면
// Supabase의 castles 테이블에 자동 저장되어, 그 다음부터는 자동으로 불러와집니다.
//
// type: 'castle'(일반 성지) | 'gate'(관문)
// 지금까지 스크린샷에서 좌표가 직접 공개된 곳은 전부 일반 성지였고,
// 관문(예: 무승관)은 아직 좌표가 확인된 스크린샷이 없어 등록하지 못했습니다.
// 관문 성을 선택한 화면 스크린샷을 주시면 type: 'gate'로 추가해드릴게요.
//
// 새 스크린샷을 더 주시면 이 배열에 항목을 추가해드릴게요.

export const CASTLE_COORDINATE_SEED = [
  // 예주
  { name: '초현', x: 1087, y: 911, level: 11, type: 'castle' },
  { name: '진현', x: 1065, y: 808, level: 9, type: 'castle' },
  { name: '허창', x: 1034, y: 743, level: 15, type: 'castle' },
  { name: '장사', x: 983, y: 857, level: 13, type: 'castle' },
  { name: '영양', x: 924, y: 734, level: 11, type: 'castle' },
  { name: '남둔', x: 1035, y: 666, level: 9, type: 'castle' },
  { name: '무양', x: 928, y: 629, level: 13, type: 'castle' },
  { name: '신채', x: 1058, y: 616, level: 11, type: 'castle' },
  { name: '용항', x: 1166, y: 897, level: 9, type: 'castle' },
  { name: '여음', x: 1123, y: 746, level: 11, type: 'castle' },
  { name: '신양', x: 1060, y: 522, level: 9, type: 'castle' },
  { name: '안풍', x: 1164, y: 655, level: 9, type: 'castle' },
  { name: '양현', x: 865, y: 618, level: 16, type: 'castle' },

  // 사예
  { name: '밀현', x: 881, y: 821, level: 14, type: 'castle' },
  { name: '신정', x: 901, y: 787, level: 16, type: 'castle' },
  { name: '언사', x: 812, y: 753, level: 18, type: 'castle' },
  { name: '개봉', x: 934, y: 909, level: 14, type: 'castle' },
  { name: '호뢰관', x: 748, y: 809, level: 16, type: 'castle' },
  { name: '형양', x: 775, y: 842, level: 16, type: 'castle' },
  { name: '신성', x: 801, y: 679, level: 16, type: 'castle' },
  { name: '육혼', x: 823, y: 605, level: 14, type: 'castle' },
  { name: '맹지', x: 787, y: 540, level: 14, type: 'castle' },
  { name: '홍농', x: 703, y: 621, level: 18, type: 'castle' },
  { name: '노씨', x: 671, y: 559, level: 14, type: 'castle' },
  { name: '함곡관', x: 722, y: 673, level: 16, type: 'castle' },
  { name: '낙양', x: 728, y: 737, level: 20, type: 'castle' },
  { name: '동관', x: 688, y: 508, level: 16, type: 'castle' },
  { name: '맹진', x: 669, y: 723, level: 16, type: 'castle' },
  { name: '지현', x: 632, y: 666, level: 16, type: 'castle' },
  { name: '중모', x: 837, y: 874, level: 14, type: 'castle' },
  { name: '안읍', x: 565, y: 645, level: 14, type: 'castle' },
  { name: '장안', x: 530, y: 376, level: 15, type: 'castle' },
  { name: '회현', x: 648, y: 786, level: 18, type: 'castle' },
  { name: '휘현', x: 667, y: 858, level: 14, type: 'castle' },

  // 옹주
  { name: '무관', x: 870, y: 472, level: 11, type: 'castle' },
  { name: '상현', x: 831, y: 450, level: 9, type: 'castle' },
  { name: '상락', x: 750, y: 457, level: 11, type: 'castle' },
  { name: '남전', x: 760, y: 390, level: 9, type: 'castle' },
  { name: '정현', x: 665, y: 443, level: 13, type: 'castle' },
  { name: '두현', x: 597, y: 359, level: 9, type: 'castle' },
  { name: '파상', x: 652, y: 334, level: 9, type: 'castle' },
  { name: '완성', x: 909, y: 526, level: 8, type: 'castle' },
];