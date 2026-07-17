'use client';
import Link from 'next/link';
import { useProfile } from './ProfileContext';
import AccountSwitcher from './AccountSwitcher';
import { supabase } from '../lib/supabaseClient';

export default function PageLayout({ children }) {
  const profile = useProfile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="site-banner" style={{ position: 'relative' }}>
  {/* 왼쪽 상단: 지휘부 도구 */}
  {profile?.role === 'admin' && (
    <Link
      href="/admin/letters"
      style={{
        position: 'absolute', top: '18px', left: '24px',
        padding: '6px 16px', border: '1px solid #d4af37', borderRadius: '3px',
        color: '#d4af37', fontSize: '0.85rem', fontWeight: 'bold',
        letterSpacing: '1px', textDecoration: 'none',
        backgroundColor: 'rgba(212,175,55,0.08)'
      }}
    >
      ⚔ 지휘부 도구
    </Link>
  )}

  {/* 오른쪽 상단: 계정 전환 + 로그아웃 */}
  <div style={{
    position: 'absolute', top: '18px', right: '24px',
    display: 'flex', gap: '10px', alignItems: 'center'
  }}>
    <AccountSwitcher />
    <button onClick={handleLogout} style={{ /* 기존 스타일 그대로 */ }}>
      로그아웃
    </button>
  </div>

        <div className="site-banner-titlerow">
          <span className="site-banner-ornament" />
          <h1 className="site-banner-title">편제방(編制房)</h1>
          <span className="site-banner-ornament" />
        </div>
        <p className="site-banner-subtitle">삼국지 천하결전 덱 편성 · 14서버 꼬마맹 백정</p>
      </header>
      <main style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  );
}