// app/components/VersionBadge.js
'use client';
import { APP_VERSION, APP_VERSION_LABEL } from '../../data/version';

// PageLayout.js 상단 다크 툴바 안에 삽입하는 작은 버전 배지.
// 클릭하면 변경 이력을 알림창으로 보여줌(간단한 1차 구현 — 필요시 모달로 교체 가능).
export default function VersionBadge() {
  return (
    <span
      title="버전 정보"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        padding: '2px 8px',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-muted)',
        border: '0.5px solid var(--border-strong)',
        borderRadius: '999px',
        background: 'var(--bg-surface)',
        verticalAlign: 'middle',
        cursor: 'default',
      }}
    >
      {APP_VERSION_LABEL} {APP_VERSION}
    </span>
  );
}