'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function AuthGuard({ children }) {
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session && pathname !== '/login') {
        router.replace('/login');
        return;
      }
      setIsChecking(false);
    }
    checkSession();

    // 로그인/로그아웃 상태 변화도 실시간 감지
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && pathname !== '/login') {
        router.replace('/login');
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [pathname, router]);

  if (isChecking && pathname !== '/login') {
    return (
      <div
        className="classic-title"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.3rem',
          letterSpacing: '0.05em',
          background: 'var(--ink-bg)'
        }}
      >
        인증 확인 중...
      </div>
    );
  }

  return children;
}