'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient'; // 경로에 맞게 확인
import { getSavedAccounts, removeAccount } from '../lib/accountSwitcher';
import { useProfile } from './ProfileContext';

export default function AccountSwitcher() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const profile = useProfile();

  useEffect(() => {
    if (open) {
      setAccounts(getSavedAccounts());
    }
  }, [open]);

  const switchTo = async (account) => {
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password: account.password
    });
    if (error) {
      alert('전환 실패: ' + error.message);
      return;
    }
    window.location.href = '/';
  };

  const handleRemoveAccount = (e, email) => {
    e.stopPropagation();
    if (confirm('이 계정을 목록에서 삭제할까요?')) {
      removeAccount(email);
      setAccounts(getSavedAccounts());
    }
  };

  const displayNickname = typeof profile?.nickname === 'string' ? profile.nickname : '계정';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '4px 10px',
          border: '0.5px solid var(--border-strong)',
          borderRadius: 6,
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          fontSize: 11,
          cursor: 'pointer'
        }}
      >
        {displayNickname} 전환 ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          backgroundColor: 'var(--bg-surface)', border: '0.5px solid var(--border-strong)',
          borderRadius: 8, minWidth: '180px', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          {accounts.map((acc, index) => {
            const accountEmail = typeof acc?.email === 'string' ? acc.email : (typeof acc === 'string' ? acc : '');
            const rawNickname = typeof acc?.nickname === 'string' ? acc.nickname : null;
            const displayName = rawNickname || accountEmail || '계정';

            return (
              <div
  key={accountEmail || index}
  onClick={() => switchTo(acc)}
  style={{
    padding: '10px 14px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '0.5px solid var(--border)',
  }}
>
  <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{String(displayName)}</span>

  <button 
    onClick={(e) => handleRemoveAccount(e, accountEmail)}
    style={{ color: '#D9534F', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12 }}
  >
    삭제
  </button>
</div>
            );
          })}

          <div
            onClick={() => { window.location.href = '/login'; }}
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              textAlign: 'center',
              fontSize: '0.8rem',
              fontWeight: 500,
              color: 'var(--accent)',
              backgroundColor: 'rgba(184,135,58,0.08)'
            }}
          >
            + 다른 계정으로 로그인
          </div>
        </div>
      )}
    </div>
  );
}