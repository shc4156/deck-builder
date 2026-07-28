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
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          minHeight: '100vh',
          background: 'var(--bg-page)',
        }}
      >
        <p style={{
          margin: 0, fontSize: '11px', color: 'var(--accent)',
          letterSpacing: '0.05em', fontFamily: 'var(--font-mono)',
        }}>
          SANGUOZHI · DECK OPS
        </p>
        <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
          인증 확인 중...
        </p>
      </div>
    );
  }

  return children;
}