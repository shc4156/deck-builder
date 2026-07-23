'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { saveAccount } from '../lib/accountSwitcher';

const COMMAND_CODE = process.env.NEXT_PUBLIC_COMMAND_CODE || '지휘부코드';
const MEMBER_CODE = process.env.NEXT_PUBLIC_MEMBER_CODE || '맹원코드';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [approvalCode, setApprovalCode] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  const handleSignUp = async () => {
    let role;
    if (approvalCode === COMMAND_CODE) {
      role = 'admin';
    } else if (approvalCode === MEMBER_CODE) {
      role = 'user';
    } else {
      alert('승인코드가 올바르지 않습니다. 지휘부에게 문의해주세요.');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      alert(`가입 에러: ${authError.message}`);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: authData.user.id, email, nickname, is_approved: true, role }]);

      if (profileError) alert(`프로필 저장 에러: ${profileError.message}`);
      else {
        alert(`가입이 완료되었습니다! ${role === 'admin' ? '지휘부' : '맹원'}으로 등록되었습니다.`);
        setIsLoginMode(true);
      }
    }
  };

  const handleLogin = async () => {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      alert(`로그인 실패: ${authError.message}`);
      return;
    }

    if (authData.user) {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('is_approved, role, nickname')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profileData) {
        alert('프로필 정보를 가져오지 못했습니다.');
        return;
      }

      alert(`환영합니다, ${profileData.nickname}님!`);
      window.location.href = '/';
      saveAccount(profileData.nickname, email, password);
    }
  };

  const inputStyle = {
    padding: '13px 14px',
    background: 'var(--paper-soft)',
    border: '1px solid rgba(184,147,90,0.5)',
    color: 'var(--ink-text)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.95rem',
    outline: 'none',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        background: 'radial-gradient(ellipse at 50% -10%, var(--ink-bg-soft) 0%, var(--ink-bg) 60%)',
      }}
    >
      {/* ============================================================
          📜 로그인 / 가입 — 문서형 카드 (墨牒 / 묵첩: 검은 서첩)
      ============================================================ */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          background: 'linear-gradient(180deg, var(--paper-soft) 0%, var(--paper) 45%, var(--paper-soft) 100%)',
          border: '3px double var(--gold)',
          borderRadius: '6px',
          padding: '38px 32px 32px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.45), inset 0 0 60px rgba(139,94,52,0.08)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', inset: '8px', border: '1px solid rgba(139,94,52,0.3)',
          borderRadius: '3px', pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* 인장 마크 + 타이틀 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '26px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              border: '2px solid var(--seal)', color: 'var(--seal)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.3rem', fontWeight: 900, marginBottom: '14px',
              fontFamily: 'var(--font-display)'
            }}>
              盟
            </div>
            <h1 className="classic-heading" style={{ margin: 0, fontSize: '1.5rem', textAlign: 'center' }}>
              천하결전 덱 빌더
            </h1>
            <p style={{ margin: '6px 0 0 0', fontSize: '0.9rem', color: 'var(--ink-text)', opacity: 0.75, letterSpacing: '0.05em' }}>
              {isLoginMode ? '입맹(入盟) 확인' : '맹원 가입'}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            {!isLoginMode && (
              <>
                <input
                  type="text"
                  placeholder="맹 닉네임"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  style={inputStyle}
                />
                <input
                  type="text"
                  placeholder="승인코드"
                  value={approvalCode}
                  onChange={(e) => setApprovalCode(e.target.value)}
                  style={inputStyle}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--seal-dark)', fontWeight: 600 }}>
                  * 승인코드는 지휘부에게 문의해주세요.
                </span>
              </>
            )}

            {isLoginMode ? (
              <>
                <button onClick={handleLogin} className="seal-button" style={{ marginTop: '6px', width: '100%', textAlign: 'center' }}>
                  로그인
                </button>
                <p
                  style={{ fontSize: '0.85rem', textAlign: 'center', cursor: 'pointer', color: 'var(--seal-dark)', fontWeight: 600, marginTop: '8px' }}
                  onClick={() => setIsLoginMode(false)}
                >
                  계정이 없으신가요? 맹원 가입하기
                </p>
              </>
            ) : (
              <>
                <button onClick={handleSignUp} className="seal-button" style={{ marginTop: '6px', width: '100%', textAlign: 'center' }}>
                  가입하기
                </button>
                <p
                  style={{ fontSize: '0.85rem', textAlign: 'center', cursor: 'pointer', color: 'var(--seal-dark)', fontWeight: 600, marginTop: '8px' }}
                  onClick={() => setIsLoginMode(true)}
                >
                  이미 계정이 있으신가요? 로그인하기
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}