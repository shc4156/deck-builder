'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import PageLayout from './components/PageLayout';
import BottomNav from './components/BottomNav';
import { Analytics } from "@vercel/analytics/next"

// 각 탭은 처음 열릴 때만 코드가 로드됩니다 (특히 squads가 커서 효과가 큽니다).
// ssr: false로 두는 이유: 전부 클라이언트에서 Supabase를 호출하는 컴포넌트라
// 서버 렌더링 시도할 필요가 없고, 초기 페인트도 더 빨라집니다.
const StatusTab = dynamic(() => import('./components/tabs/StatusTab'), { ssr: false });
const MatchesTab = dynamic(() => import('./components/tabs/MatchesTab'), { ssr: false });
const SquadsTab = dynamic(() => import('./components/tabs/SquadsTab'), { ssr: false });
const VsTab = dynamic(() => import('./components/tabs/VsTab'), { ssr: false });
const YeonmuTab = dynamic(() => import('./components/tabs/YeonmuTab'), { ssr: false });

// 'dictionary'는 /encyclopedia라는 별도 라우트로 옮겨졌으므로 여기 없습니다.
const TAB_COMPONENTS = {
  status: StatusTab,
  matches: MatchesTab,
  squads: SquadsTab,
  vs: VsTab,
  tournament: YeonmuTab,
};

// 배포 시 잠시 닫아두는 탭들 — 여기 다시 추가하면 컴포넌트/코드는 그대로 둔 채 막을 수 있습니다.
// (2026-08-14: 모의 대결(vs) 정교화 버전 반영 후 재오픈)
const DISABLED_TABS = [];
const isTabEnabled = (key) => Boolean(TAB_COMPONENTS[key]) && !DISABLED_TABS.includes(key);

function HomeInner() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(isTabEnabled(initialTab) ? initialTab : 'status');

  const handleNavigate = (nextTab) => {
    if (isTabEnabled(nextTab)) {
      setTab(nextTab);
    } else {
      // 닫아둔 탭이거나 아직 준비 안 된 탭 — 조용히 무시하는 대신 로그만 남깁니다.
      console.warn(`[BottomNav] "${nextTab}" 탭은 현재 닫혀 있습니다.`);
    }
  };

  const ActiveTab = TAB_COMPONENTS[tab] ?? StatusTab;

  return (
    <PageLayout>
      <ActiveTab onNavigate={handleNavigate} />
      <BottomNav current={tab} onChange={handleNavigate} />
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}