'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getSavedAccounts, removeAccount } from '../lib/accountSwitcher';
import { useProfile } from './ProfileContext';

export default function AccountSwitcher() {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState([]); // 👈 State로 변경
  const profile = useProfile();
  useEffect(() => {
    if (open) {
      setAccounts(getSavedAccounts());
    }
  }, [open]);

  console.log('현재 Profile Context 값:', profile); // 👈 디버깅용 로그

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

  const handleRemove = (e, email) => {
    e.stopPropagation();
    if (confirm('이 계정을 목록에서 삭제할까요?')) {
      removeAccount(email);
      setAccounts(getSavedAccounts()); // 👈 React State로 깔끔하게 갱신
    }
  };

  //if (accounts.length === 0) return null;
  // 닉네임 텍스트 안전 추출
  const displayNickname = typeof profile?.nickname === 'string' ? profile.nickname : '계정';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 14px',
          border: '1px solid var(--gold)',
          background: 'transparent',
          color: 'var(--gold)',
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
        {/* 저장된 계정 목록 */}
        {accounts.map(acc => (
          <div
            key={acc.email}
            onClick={() => switchTo(acc)}
            style={{
              padding: '10px 14px', cursor: 'pointer', display: 'flex',
              justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(184,147,90,0.3)', fontSize: '0.9rem',
              color: 'var(--ink-text)'
            }}
          >
            <span>{acc.nickname}</span>
            <span
              onClick={(e) => handleRemove(e, acc.email)}
              style={{ color: '#c0392b', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
              삭제
            </span>
          </div>
        ))}

        {/* ➕ 저장된 계정이 없거나 추가 계정을 연결할 수 있는 버튼 */}
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