'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState([]);

  // 승인 대기 명단 불러오기
  const fetchPendingUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false); // 승인 안 된(false) 사람만 가져옴

    if (!error) setPendingUsers(data);
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // 승인 처리 함수
  const handleApprove = async (userId, userNickname) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true })
      .eq('id', userId);

    if (error) {
      alert('승인 중 오류가 발생했습니다.');
    } else {
      alert(`${userNickname} 님이 승인되었습니다.`);
      fetchPendingUsers(); // 명단 새로고침
    }
  };

  return (
    <div style={{ padding: '40px' }}>
            {/* 돌아가기 버튼 추가 */}
      <button 
        onClick={() => window.location.href = '/'}
        style={{ marginBottom: '20px', padding: '8px 16px', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        ← 장수 도감으로 돌아가기
      </button>

      <h2>🛡️ 관리자: 승인 대기 명단</h2>
      {pendingUsers.length === 0 ? (
        <p>현재 승인 대기 중인 맹원이 없습니다.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {pendingUsers.map((user) => (
            <li key={user.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>닉네임:</strong> {user.nickname} <br/>
                <span style={{ fontSize: '13px', color: '#666' }}>이메일: {user.email}</span>
              </div>
              <button 
                onClick={() => handleApprove(user.id, user.nickname)}
                style={{ padding: '10px 20px', backgroundColor: '#e74c3c', color: 'white', border: 'none', cursor: 'pointer' }}>
                승인하기
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}