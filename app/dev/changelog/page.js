'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';
import { supabase } from '../../lib/supabaseClient';

// 이전 /dev/feedback/page.js에 넣으신 것과 동일한 UID
const MY_UID = 'ac97723f-ea00-41b6-abc3-12ac452f368f';

export default function DevChangelogPage() {
  const [authState, setAuthState] = useState('checking'); // checking | denied | ok
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.id !== MY_UID) {
        setAuthState('denied');
        return;
      }
      setAuthState('ok');
    };
    checkAccess();
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('changelog')
      .select('id, content, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('업데이트 기록 조회 실패:', error.message);
    } else {
      setEntries(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (authState === 'ok') fetchEntries();
  }, [authState]);

  const handleAdd = async () => {
    if (!draft.trim()) return;
    setIsSaving(true);
    const { error } = await supabase.from('changelog').insert({ content: draft.trim() });
    if (error) {
      console.error('기록 추가 실패:', error.message);
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    } else {
      setDraft('');
      await fetchEntries();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    const { error } = await supabase.from('changelog').delete().eq('id', id);
    if (error) {
      alert('삭제 중 오류가 발생했습니다: ' + error.message);
    } else {
      await fetchEntries();
    }
  };

  if (authState === 'checking') {
    return (
      <PageLayout>
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--ink-text)' }}>
          확인 중...
        </div>
      </PageLayout>
    );
  }

  if (authState === 'denied') {
    return (
      <PageLayout>
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <h1 className="classic-heading text-2xl font-bold" style={{ marginBottom: '12px' }}>
            접근 권한이 없습니다
          </h1>
          <Link href="/" style={{ color: 'var(--gold)' }}>← 홈으로 돌아가기</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <Link href="/" style={{
          display: 'inline-block', marginBottom: '16px', padding: '6px 14px',
          border: '1px solid var(--gold)', color: 'var(--seal-dark)', fontWeight: 'bold',
          fontSize: '0.9rem', textDecoration: 'none'
        }}>
          ← 홈으로
        </Link>
        <span style={{ marginLeft: 10 }}>
          <Link href="/dev/feedback" style={{ fontSize: '0.85rem', color: 'var(--gold)' }}>
            피드백 모음으로 →
          </Link>
        </span>

        <h1 className="classic-heading text-3xl font-bold" style={{ marginTop: '16px', marginBottom: '8px' }}>
          🛠️ 수정 기록 (비공개)
        </h1>
        <p style={{ color: 'var(--ink-text)', opacity: 0.75, marginBottom: '20px', fontSize: '0.9rem' }}>
          피드백과 무관하게 직접 고친 내용을 한 줄씩 남기면{' '}
          <Link href="/updates" style={{ color: 'var(--gold)', fontWeight: 'bold' }}>/updates</Link>
          {' '}페이지에 자동으로 함께 표시됩니다.
        </p>

        {/* 새 기록 입력 */}
        <div className="scroll-panel" style={{ padding: '18px 20px', marginBottom: '24px', maxWidth: '640px' }}>
          <textarea
            rows={2}
            placeholder="예: 1-5군 편성에서 진형 변경 시 이름이 사라지던 오류 수정"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '0.9rem',
              fontFamily: 'var(--font-body)', border: '1px solid var(--gold)', borderRadius: '4px',
              backgroundColor: 'var(--paper-soft)', color: 'var(--ink-text)', resize: 'vertical'
            }}
          />
          <div style={{ textAlign: 'right', marginTop: '10px' }}>
            <button className="seal-button" onClick={handleAdd} disabled={isSaving || !draft.trim()}>
              {isSaving ? '저장 중...' : '기록 추가'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--ink-text)', opacity: 0.7 }}>불러오는 중...</p>
        ) : entries.length === 0 ? (
          <p style={{ color: 'var(--ink-text)', opacity: 0.7 }}>아직 기록이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '640px' }}>
            {entries.map((e) => (
              <div key={e.id} className="scroll-panel" style={{
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', gap: '12px'
              }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--ink-text)', lineHeight: 1.5 }}>{e.content}</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-text)', opacity: 0.55 }}>
                    {new Date(e.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  style={{
                    background: 'none', border: '1px solid var(--border-strong)', borderRadius: '4px',
                    padding: '4px 10px', fontSize: '0.75rem', color: 'var(--ink-text)', cursor: 'pointer', flexShrink: 0
                  }}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}