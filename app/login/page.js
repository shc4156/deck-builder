'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '../components/PageLayout'; 
import { supabase } from '../lib/supabaseClient'; 

export default function LoginPage() {
  const router = useRouter();
  
  const [isLoginMode, setIsLoginMode] = useState(true);

  // --- 로그인 상태 ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginMsg, setLoginMsg] = useState('');

  // --- 비밀번호 찾기 상태 ---
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotNickname, setForgotNickname] = useState('');
  const [forgotStatusMsg, setForgotStatusMsg] = useState('');
  const [isSending, setIsSending] = useState(false);

  // --- 회원가입 상태 ---
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupNickname, setSignupNickname] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [serverName, setServerName] = useState('');
  const [allianceName, setAllianceName] = useState('');
  const [signupMsg, setSignupMsg] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);

  // 환경변수에서 승인 코드 불러오기 (설정 안 되어있으면 기본값 적용)
  const CMD_CODE = process.env.NEXT_PUBLIC_COMMAND_CODE || '0000';
  const MBR_CODE = process.env.NEXT_PUBLIC_MEMBER_CODE || '1414';
  const GST_CODE = process.env.NEXT_PUBLIC_GUEST_CODE || '9999';

  // 1. 일반 로그인 핸들러
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginMsg('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoginMsg('로그인 실패: 이메일이나 비밀번호를 확인해주세요.');
      setIsLoggingIn(false);
    } else {
      router.push('/');
    }
  };

  // 2. 회원가입 핸들러
  const handleSignup = async (e) => {
    e.preventDefault();
    setIsSigningUp(true);
    setSignupMsg('');

    // 승인 코드에 따른 권한(role) 판별
    let role = 'guest';
    if (accessCode === CMD_CODE) {
      role = 'admin';
    } else if (accessCode === MBR_CODE) {
      role = 'member';
    } else if (accessCode === GST_CODE) {
      role = 'guest';
    } else {
      setSignupMsg('올바른 승인 코드가 아닙니다.');
      setIsSigningUp(false);
      return;
    }

    // 외부인일 경우 서버명과 맹이름 필수 확인
    if (accessCode === GST_CODE) {
      if (!serverName.trim() || !allianceName.trim()) {
        setSignupMsg('외부 인원 코드를 입력하셨습니다. 소속 서버와 맹 이름을 반드시 기입해 주세요.');
        setIsSigningUp(false);
        return;
      }
    }

    try {
      // Auth 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
      });

      if (authError) {
        setSignupMsg(`가입 실패: ${authError.message}`);
        setIsSigningUp(false);
        return;
      }

      // 프로필 테이블에 데이터 삽입
      if (authData?.user) {
        const { error: profileError } = await supabase.from('profiles').insert([
          {
            id: authData.user.id,
            email: signupEmail,
            nickname: signupNickname,
            role: role,
            server_name: serverName,
            alliance_name: allianceName
          }
        ]);

        if (profileError) {
          setSignupMsg(`프로필 생성 중 오류: ${profileError.message}`);
        } else {
          setSignupMsg('새로운 막사가 성공적으로 개설되었습니다! 이제 로그인하여 접속해 주십시오.');
          // 입력 폼 초기화 및 로그인 모드로 전환
          setSignupEmail('');
          setSignupPassword('');
          setSignupNickname('');
          setAccessCode('');
          setServerName('');
          setAllianceName('');
          setIsLoginMode(true);
        }
      }
    } catch (err) {
      console.error('가입 중 예외 발생:', err);
      setSignupMsg('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSigningUp(false);
    }
  };

  // 3. 비밀번호 재설정 핸들러
  const handleSendResetEmail = async () => {
    if (!forgotNickname.trim()) {
      setForgotStatusMsg('닉네임을 입력해 주세요.');
      return;
    }

    setIsSending(true);
    setForgotStatusMsg('');

    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('nickname', forgotNickname.trim())
        .single();

      if (profileError || !userProfile?.email) {
        setForgotStatusMsg('일치하는 닉네임 정보를 찾을 수 없습니다.');
        setIsSending(false);
        return;
      }

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        userProfile.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setForgotStatusMsg(`발송 실패: ${resetError.message}`);
      } else {
        setForgotStatusMsg('등록된 이메일로 비밀번호 재설정 링크가 발송되었습니다. 이메일함을 확인해주세요.');
        setForgotNickname('');
      }
    } catch (err) {
      console.error('재설정 요청 중 오류:', err);
      setForgotStatusMsg('요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
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
      <div style={{ padding: '25px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '8vh' }}>
        
        <div className="scroll-panel" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
          
          {/* 로그인 / 회원가입 탭 전환 */}
          <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '2px solid rgba(139,94,52,0.2)' }}>
            <button 
              type="button"
              onClick={() => { setIsLoginMode(true); setSignupMsg(''); }}
              style={{ flex: 1, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.05rem', fontWeight: isLoginMode ? 'bold' : 'normal', color: isLoginMode ? 'var(--seal-dark)' : 'rgba(0,0,0,0.5)', borderBottom: isLoginMode ? '3px solid var(--seal-dark)' : 'none' }}
            >
              막사 입장 (로그인)
            </button>
            <button 
              type="button"
              onClick={() => { setIsLoginMode(false); setLoginMsg(''); setIsForgotOpen(false); }}
              style={{ flex: 1, padding: '12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.05rem', fontWeight: !isLoginMode ? 'bold' : 'normal', color: !isLoginMode ? 'var(--seal-dark)' : 'rgba(0,0,0,0.5)', borderBottom: !isLoginMode ? '3px solid var(--seal-dark)' : 'none' }}
            >
              새 막사 개설
            </button>
          </div>

          {isLoginMode ? (
            <>
              {/* === 로그인 영역 === */}
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column' }}>
                <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} required />
                <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required />
                <button className="seal-button" type="submit" disabled={isLoggingIn} style={{ width: '100%', marginTop: '8px' }}>
                  {isLoggingIn ? '입장 중...' : '로그인'}
                </button>
              </form>

              {loginMsg && (
                <p style={{ marginTop: '12px', color: 'var(--seal-dark)', fontSize: '0.9rem', textAlign: 'center' }}>
                  {loginMsg}
                </p>
              )}

              <hr style={{ margin: '24px 0', border: 'none', borderTop: '1px dashed rgba(139,94,52,0.4)' }} />

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => { setIsForgotOpen(!isForgotOpen); setForgotStatusMsg(''); }}
                  style={{ background: 'none', border: 'none', color: 'var(--seal-dark)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
                >
                  비밀번호를 잊으셨나요?
                </button>
              </div>

              {isForgotOpen && (
                <div style={{ marginTop: '20px', padding: '16px', border: '1px solid var(--gold)', borderRadius: '4px', backgroundColor: 'var(--paper-soft)' }}>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--ink-text)' }}>
                    🔑 비밀번호 재설정
                  </p>
                  <input
                    type="text"
                    placeholder="가입 시 사용한 닉네임 입력"
                    value={forgotNickname}
                    onChange={(e) => setForgotNickname(e.target.value)}
                    style={inputStyle}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendResetEmail()}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" className="seal-button" onClick={handleSendResetEmail} disabled={isSending} style={{ flex: 1 }}>
                      {isSending ? '발송 중...' : '재설정 링크 전송'}
                    </button>
                  </div>
                  {forgotStatusMsg && (
                    <p style={{ fontSize: '0.85rem', marginTop: '12px', color: 'var(--seal-dark)', lineHeight: '1.4' }}>
                      {forgotStatusMsg}
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* === 회원가입 영역 === */}
              <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column' }}>
                <input type="email" placeholder="사용할 이메일" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} style={inputStyle} required />
                <input type="password" placeholder="비밀번호 (6자 이상)" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} style={inputStyle} required minLength={6} />
                <input type="text" placeholder="닉네임 (삼국지용 닉네임)" value={signupNickname} onChange={(e) => setSignupNickname(e.target.value)} style={inputStyle} required />
                <input type="text" placeholder="승인 코드 (지휘부/일반/외부)" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} style={inputStyle} required />
                
                {/* 외부 인원 코드를 입력했을 때만 나타나는 추가 입력란 */}
                {accessCode === GST_CODE && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(139,41,31,0.04)', border: '1px solid var(--gold)', borderRadius: '4px', marginBottom: '12px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--seal-dark)' }}>
                      외부 유저 환영합니다! 소속 정보를 기입해 주세요.
                    </p>
                    <input type="text" placeholder="소속 서버 (예: 1서버)" value={serverName} onChange={(e) => setServerName(e.target.value)} style={{ ...inputStyle, marginBottom: '8px' }} required={accessCode === GST_CODE} />
                    <input type="text" placeholder="소속 맹 이름 (예: 무적맹)" value={allianceName} onChange={(e) => setAllianceName(e.target.value)} style={{ ...inputStyle, marginBottom: '0' }} required={accessCode === GST_CODE} />
                  </div>
                )}

                <button className="seal-button" type="submit" disabled={isSigningUp} style={{ width: '100%', marginTop: '8px' }}>
                  {isSigningUp ? '개설 중...' : '막사 개설하기'}
                </button>
              </form>

              {signupMsg && (
                <p style={{ marginTop: '16px', color: 'var(--seal-dark)', fontSize: '0.9rem', textAlign: 'center', lineHeight: '1.4' }}>
                  {signupMsg}
                </p>
              )}
            </>
          )}

        </div>
      </div>
    </PageLayout>
  );
}