'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout'; // 경로에 맞게 수정
import { supabase } from '../lib/supabaseClient'; // 경로에 맞게 수정

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasValidSession, setHasValidSession] = useState(false);

  // 컴포넌트 마운트 시 URL을 통해 전달된 인증 세션이 유효한지 확인
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
      } else {
        setStatusMsg('유효하지 않거나 만료된 접근입니다. 로그인 페이지에서 비밀번호 재설정을 다시 요청해 주세요.');
      }
      setSessionChecked(true);
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setStatusMsg('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatusMsg('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsUpdating(true);
    setStatusMsg('');

    // 로그인된 세션을 기반으로 새 비밀번호 업데이트 적용
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setStatusMsg(`오류: ${error.message}`);
      setIsUpdating(false);
    } else {
      setStatusMsg('✅ 비밀번호가 성공적으로 변경되었습니다! 잠시 후 로그인 페이지로 이동합니다.');
      // 변경 성공 후 보안을 위해 즉시 로그아웃 처리 후 로그인 페이지로 리다이렉트
      await supabase.auth.signOut();
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body)',
    border: '1px solid var(--gold)',
    borderRadius: '4px',
    backgroundColor: 'var(--paper-soft)',
    color: 'var(--ink-text)',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '12px'
  };

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh' }}>
        
        <div className="scroll-panel" style={{ width: '100%', maxWidth: '400px' }}>
          <h2 className="classic-heading text-2xl font-bold" style={{ marginBottom: '20px', textAlign: 'center' }}>
            🔑 새 비밀번호 설정
          </h2>

          {!sessionChecked ? (
            <p style={{ textAlign: 'center', color: 'var(--ink-text)' }}>인증 정보 확인 중...</p>
          ) : !hasValidSession ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--seal-dark)', marginBottom: '16px', lineHeight: '1.5' }}>
                {statusMsg}
              </p>
              <button className="seal-button" onClick={() => router.push('/login')}>
                로그인 페이지로 돌아가기
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-text)', marginBottom: '16px', textAlign: 'center' }}>
                사용하실 새로운 비밀번호를 입력해 주세요.
              </p>

              <input
                type="password"
                placeholder="새 비밀번호 (6자 이상)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="새 비밀번호 확인"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={inputStyle}
              />
              
              <button className="seal-button" onClick={handleUpdatePassword} disabled={isUpdating} style={{ width: '100%', marginTop: '8px' }}>
                {isUpdating ? '변경 중...' : '비밀번호 변경하기'}
              </button>

              {statusMsg && (
                <p style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--seal-dark)', textAlign: 'center', lineHeight: '1.4' }}>
                  {statusMsg}
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </PageLayout>
  );
}