// app/components/VersionBadge.js
'use client';
import { APP_VERSION, APP_VERSION_LABEL } from '../../data/version';

// PageLayout.js의 site-banner 안(제목 근처)에 삽입하는 작은 버전 배지.
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
        marginLeft: '10px',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        color: 'var(--gold-soft)',
        border: '1px solid rgba(184, 147, 90, 0.5)',
        borderRadius: '999px',
        background: 'rgba(184, 147, 90, 0.08)',
        verticalAlign: 'middle',
        cursor: 'default',
      }}
    >
      {APP_VERSION_LABEL} {APP_VERSION}
    </span>
  );
}