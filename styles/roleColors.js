// styles/roleColors.js
// 전법 role, 장수 primary_role에 공통으로 쓰는 배지 색상 매핑
// tactics.role / generals.primary_role 값과 1:1 대응

export const tacticRoleColors = {
  '딜_병기': { bg: 'rgba(166,50,42,0.15)', border: '#a6322a', text: '#7a241d' },
  '딜_책략': { bg: 'rgba(44,74,107,0.15)', border: '#2c4a6b', text: '#1f3450' },
  '딜_혼합': { bg: 'rgba(139,38,38,0.12)', border: '#8b2626', text: '#6b1c1c' },
  '힐': { bg: 'rgba(45,90,39,0.15)', border: '#2d5a27', text: '#1f4019' },
  '버프_아군': { bg: 'rgba(184,147,90,0.2)', border: '#b8935a', text: '#7a5f34' },
  '버프_자신': { bg: 'rgba(184,147,90,0.15)', border: '#b8935a', text: '#7a5f34' },
  '디버프': { bg: 'rgba(90,45,90,0.15)', border: '#5a2d5a', text: '#3f1f3f' },
  '방어_아군': { bg: 'rgba(90,110,120,0.15)', border: '#5a6e78', text: '#3f4d54' },
  '방어_자신': { bg: 'rgba(90,110,120,0.12)', border: '#5a6e78', text: '#3f4d54' },
  '도발': { bg: 'rgba(184,134,11,0.18)', border: '#b8860b', text: '#7a5907' },
  '지원_복합': { bg: 'rgba(107,76,107,0.15)', border: '#6b4c6b', text: '#4a344a' }
};

export const tacticRoleLabels = {
  '딜_병기': '병기딜',
  '딜_책략': '책략딜',
  '딜_혼합': '혼합딜',
  '힐': '힐',
  '버프_아군': '아군버프',
  '버프_자신': '자버프',
  '디버프': '디버프',
  '방어_아군': '아군방어',
  '방어_자신': '자기방어',
  '도발': '도발',
  '지원_복합': '복합지원'
};

// 장수 primary_role 색상은 전법 role과 유사군끼리 맞춰서 재사용
export const generalRoleColors = {
  '딜_병기': tacticRoleColors['딜_병기'],
  '딜_책략': tacticRoleColors['딜_책략'],
  '딜_혼합': tacticRoleColors['딜_혼합'],
  '힐러': tacticRoleColors['힐'],
  '버퍼': tacticRoleColors['버프_아군'],
  '디버퍼': tacticRoleColors['디버프'],
  '탱커_도발': tacticRoleColors['도발'],
  '탱커_방어': tacticRoleColors['방어_아군'],
  '지휘_보조': tacticRoleColors['지원_복합']
};

export const generalRoleLabels = {
  '딜_병기': '병기딜러',
  '딜_책략': '책략딜러',
  '딜_혼합': '혼합딜러',
  '힐러': '힐러',
  '버퍼': '버퍼',
  '디버퍼': '디버퍼',
  '탱커_도발': '도발탱커',
  '탱커_방어': '방어탱커',
  '지휘_보조': '지휘보조'
};

// tags(전법)/secondary_roles(장수) 배지에 쓰는 짧은 라벨 (필요한 만큼만 매핑, 없으면 원문 그대로 표시)
export const tagLabels = {
  '조건부발동': '조건부',
  '디버프부여': '디버프부여',
  '회복포함': '회복포함',
  '자힐': '자힐',
  '방어스택부여': '방어스택',
  '통솔감소': '통솔감소',
  '지력감소': '지력감소',
  '무력감소': '무력감소',
  '선공감소': '선공감소',
  '제어부여': '제어',
  '준비형': '준비형',
  '지력영향': '지력영향',
  '통솔영향': '통솔영향',
  '무력영향': '무력영향',
  '후열우선': '후열우선',
  '전열우선': '전열우선',
  '다단히트': '다단히트'
};