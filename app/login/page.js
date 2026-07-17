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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '100px' }}>
      <h1>천하결전 덱 빌더 - {isLoginMode ? '로그인' : '맹원 가입'}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '300px', marginTop: '20px' }}>
        <input type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '10px' }} />
        <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} style={{ padding: '10px' }} />

        {!isLoginMode && (
          <>
            <input type="text" placeholder="맹 닉네임" value={nickname} onChange={(e) => setNickname(e.target.value)} style={{ padding: '10px' }} />
            <input type="text" placeholder="승인코드" value={approvalCode} onChange={(e) => setApprovalCode(e.target.value)} style={{ padding: '10px' }} />
            <span style={{ fontSize: '12px', color: '#666' }}>* 승인코드는 지휘부에게 문의해주세요.</span>
          </>
        )}

        {isLoginMode ? (
          <>
            <button onClick={handleLogin} style={{ padding: '10px', backgroundColor: '#3498db', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>로그인</button>
            <p style={{ fontSize: '13px', textAlign: 'center', cursor: 'pointer', color: '#3498db', marginTop: '10px' }} onClick={() => setIsLoginMode(false)}>계정이 없으신가요? 맹원 가입하기</p>
          </>
        ) : (
          <>
            <button onClick={handleSignUp} style={{ padding: '10px', backgroundColor: '#2ecc71', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>가입하기</button>
            <p style={{ fontSize: '13px', textAlign: 'center', cursor: 'pointer', color: '#3498db', marginTop: '10px' }} onClick={() => setIsLoginMode(true)}>이미 계정이 있으신가요? 로그인하기</p>
          </>
        )}
      </div>
    </div>
  );
}