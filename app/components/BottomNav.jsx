'use client';

import {
  IconUser,
  IconLayoutGrid,
  IconUsers,
  IconSwords,
  IconChartBar,
} from '@tabler/icons-react';

// tab 키는 app/page.js의 TAB_COMPONENTS 키와 일치해야 합니다.
// 연무/시뮬은 아직 배포하지 않아 비활성화 상태로 노출 — 추후 추가 예정임을 보여줍니다.
// (실제 이동은 app/page.js의 DISABLED_TABS에서도 막혀 있습니다. 정식 오픈 시
//  여기서 disabled를 지우고 DISABLED_TABS에서도 함께 제거하세요.)
const NAV_ITEMS = [
  { tab: 'status', label: '현황', icon: IconUser },
  { tab: 'matches', label: '티어덱', icon: IconLayoutGrid },
  { tab: 'squads', label: '편성', icon: IconUsers },
  { tab: 'tournament', label: '연무', icon: IconSwords },
  { tab: 'simulate', label: '시뮬', icon: IconChartBar, disabled: true },
];

// current: 현재 활성 탭 키, onChange(tabKey): 탭 전환 콜백
export default function BottomNav({ current, onChange }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '10px 0',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--bg-page)',
        borderTop: '0.5px solid var(--border)',
      }}
    >
      {NAV_ITEMS.map(({ tab, label, icon: Icon, disabled }) => {
        const active = current === tab;

        return (
          <button
            key={tab}
            type="button"
            disabled={disabled}
            onClick={() => !disabled && onChange?.(tab)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              flex: 1,
              background: 'none',
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              textDecoration: 'none',
              color: active ? 'var(--accent)' : 'var(--text-muted)',
              opacity: disabled ? 0.4 : 1,
            }}
          >
            <Icon size={18} stroke={1.75} />
            <span style={{ fontSize: 10, fontWeight: active ? 500 : 400 }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
