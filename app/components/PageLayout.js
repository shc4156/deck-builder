'use client';
import Link from 'next/link';
import { useProfile } from './ProfileContext';
import AccountSwitcher from './AccountSwitcher';
import VersionBadge from './VersionBadge';
import { supabase } from '../lib/supabaseClient';
import { useEffect } from 'react';
import { Analytics } from "@vercel/analytics/next"

export default function PageLayout({ children }) {
  const profile = useProfile();

  useEffect(() => {
  const ins = document.querySelector('.adsbygoogle');
  if (ins && ins.getAttribute('data-adsbygoogle-status')) return; // 이미 처리된 경우 스킵
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {
    console.error(e);
  }
}, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px', borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-page)', fontSize: 12,
      }}>
        {profile?.role === 'admin' || profile?.approval_code === '0000' ? (
          <Link
            href="/admin"
            style={{
              padding: '4px 10px',
              border: '0.5px solid var(--border-strong)',
              borderRadius: 6,
              color: 'var(--accent)',
              fontSize: 11,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            ⚔ 지휘부 도구
          </Link>
        ) : (
          <span />
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <VersionBadge />
          <AccountSwitcher />
          <button
            onClick={handleLogout}
            style={{
              background: 'none', border: 'none', color: 'var(--text-secondary)',
              fontSize: 11, cursor: 'pointer', padding: 0,
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
      <main style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        {children}

        {/* 여기에 광고 유닛 추가 */}
  <ins
    className="adsbygoogle"
    style={{ display: 'block' }}
    data-ad-client="ca-pub-8800882593980842"
    data-ad-slot="9477210356"
    data-ad-format="auto"
    data-full-width-responsive="true"
  />
      </main>
    </div>
  );
}