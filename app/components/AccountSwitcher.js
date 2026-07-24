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
          padding: '6px 14px',
    border: '1px solid var(--gold)',
    background: 'transparent',
    color: '#ffffff', // 👈 원하는 색상으로 변경 (예: #ffffff, #000000, #d4af37 등)
    fontWeight: 'bold',
    fontSize: '0.85rem',
    cursor: 'pointer'
        }}
      >
        {displayNickname} 전환 ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: '4px',
          backgroundColor: 'var(--paper-soft)', border: '1px solid var(--gold)',
          minWidth: '180px', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
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
    justify: 'space-between',
    alignItems: 'center'
  }}
>
  {/* 🟢 계정 닉네임/이메일 글자 색상 지정 */}
  <span style={{ color: '#222222' }}>{String(displayName)}</span>

  {/* 🟢 삭제 버튼 글자 색상 지정 */}
  <button 
    onClick={(e) => handleRemoveAccount(e, accountEmail)}
    style={{ color: '#ff4d4f', border: 'none', background: 'transparent', cursor: 'pointer' }}
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
              fontSize: '0.85rem',
              fontWeight: 'bold',
              color: 'var(--gold)',
              backgroundColor: 'rgba(212,175,55,0.05)'
            }}
          >
            + 다른 계정으로 로그인
          </div>
        </div>
      )}
    </div>
  );
}