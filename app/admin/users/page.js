'use client';
import { useState } from 'react';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';
import { supabase } from '../../lib/supabaseClient';

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setStatusMsg('');
    setSelectedUser(null);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, email, role')
      .ilike('nickname', `%${searchTerm.trim()}%`)
      .limit(20);

    if (error) {
      console.error('유저 검색 실패:', error.message);
      setStatusMsg('검색 중 오류가 발생했습니다.');
    } else {
      setResults(data || []);
      if ((data || []).length === 0) {
        setStatusMsg('일치하는 닉네임이 없습니다.');
      }
    }
    setIsSearching(false);
  };

  const handleReset = async () => {
    if (!selectedUser) return;
    if (newPassword.length < 6) {
      setStatusMsg('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    setIsResetting(true);
    setStatusMsg('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatusMsg('로그인이 필요합니다.');
        setIsResetting(false);
        return;
      }

      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUser.id,
          newPassword,
          accessToken: session.access_token,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setStatusMsg(`실패: ${result.error}`);
      } else {
        setStatusMsg(`${selectedUser.nickname}님의 비밀번호가 변경되었습니다.`);
        setNewPassword('');
        setSelectedUser(null);
      }
    } catch (err) {
      console.error('비번 재설정 요청 중 예외:', err);
      setStatusMsg('요청 중 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  const inputStyle = {
    padding: '10px 12px',
    fontSize: '0.95rem',
    fontFamily: 'var(--font-body)',
    border: '1px solid var(--gold)',
    borderRadius: '4px',
    backgroundColor: 'var(--paper-soft)',
    color: 'var(--ink-text)',
    outline: 'none',
  };

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <Link href="/admin" style={{
          display: 'inline-block', marginBottom: '16px', padding: '6px 14px',
          border: '1px solid var(--gold)', color: 'var(--seal-dark)', fontWeight: 'bold',
          fontSize: '0.9rem', textDecoration: 'none'
        }}>
          ← 지휘부 도구로
        </Link>

        <div className="scroll-panel" style={{ maxWidth: '520px', margin: '0 auto' }}>
          <h2 className="classic-heading text-2xl font-bold" style={{ marginBottom: '20px' }}>
            🔑 맹원 비밀번호 재설정
          </h2>

          {/* 검색 */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="닉네임으로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button className="seal-button" onClick={handleSearch} disabled={isSearching}>
              {isSearching ? '검색 중...' : '검색'}
            </button>
          </div>

          {/* 검색 결과 */}
          {results.length > 0 && (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {results.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setStatusMsg(''); }}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: '4px',
                    border: selectedUser?.id === u.id ? '2px solid var(--seal-dark)' : '1px solid rgba(139,94,52,0.4)',
                    backgroundColor: selectedUser?.id === u.id ? 'rgba(139,41,31,0.08)' : 'var(--paper-soft)',
                    cursor: 'pointer',
                    color: 'var(--ink-text)',
                  }}
                >
                  <strong>{u.nickname}</strong>
                  <span style={{ marginLeft: '8px', fontSize: '0.85rem', opacity: 0.7 }}>
                    {u.email} {u.role === 'admin' ? '(지휘부)' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 선택된 유저 -> 새 비번 입력 */}
          {selectedUser && (
            <div style={{ borderTop: '1px dashed rgba(139,94,52,0.4)', paddingTop: '16px' }}>
              <p style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--ink-text)' }}>
                {selectedUser.nickname} 님의 새 비밀번호 설정
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="새 비밀번호 (6자 이상)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button className="seal-button" onClick={handleReset} disabled={isResetting}>
                  {isResetting ? '변경 중...' : '변경'}
                </button>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--seal-dark)', marginTop: '8px' }}>
                * 변경 후 새 비밀번호를 해당 맹원에게 직접 전달해 주세요.
              </p>
            </div>
          )}

          {statusMsg && (
            <p style={{ marginTop: '16px', fontSize: '0.9rem', color: 'var(--ink-text)' }}>
              {statusMsg}
            </p>
          )}
        </div>
      </div>
    </PageLayout>
  );
}