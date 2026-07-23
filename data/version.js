// app/data/version.js
// 버전은 semver(major.minor.patch) 형식을 따릅니다.
// - major: 큰 구조 개편(리디자인 전면 적용, DB 스키마 대변경 등)
// - minor: 새 기능 추가(신규 페이지/도구 추가)
// - patch: 버그 수정, 소규모 UI 조정
//
// package.json의 version 필드와 값을 맞춰서 관리하는 걸 권장합니다.
export const APP_VERSION = '1.0.0';

// 배지에 표시할 짧은 라벨(선택) — 없으면 버전 숫자만 표시됨
export const APP_VERSION_LABEL = '版';

// 최근 변경 이력 (선택 사항, 필요할 때만 갱신)
export const VERSION_HISTORY = [
  {
    version: '1.0.0',
    date: '2026-07-23',
    notes: '클래식 리디자인 전면 적용(서신작성소·맹적부·도감록·주간리포트 등), 버전 표기 체계 도입',
  },
];