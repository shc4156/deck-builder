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
      // 관리자가 임시번호를 발급한 계정이면, 본인이 새 비밀번호를 설정하기 전까지
      // reset-password 페이지 외 다른 곳으로 접근하지 못하게 강제 이동시킨다.
      if (session && pathname !== '/reset-password' && pathname !== '/login') {
        const { data: profile } = await supabase
          .from('profiles')
          .select('must_reset_password')
          .eq('id', session.user.id)
          .single();

        if (profile?.must_reset_password) {
          router.replace('/reset-password');
          return;
        }
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