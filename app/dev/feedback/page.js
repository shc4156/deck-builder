'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';
import { supabase } from '../../lib/supabaseClient';

// ⚠️ 여기에 본인의 Supabase Auth UID를 입력하세요.
// Supabase 대시보드 > Authentication > Users 에서 본인 계정의 UID를 복사해서 넣으면 됩니다.
// 위 SQL 정책의 'MY_UID_HERE'와 반드시 동일한 값이어야 합니다.
const MY_UID = 'ac97723f-ea00-41b6-abc3-12ac452f368f';

const CATEGORIES = ['전체', '디자인', '편의성', '기능', '기타'];
const CATEGORY_ORDER = ['디자인', '편의성', '기능', '기타'];

export default function DevFeedbackPage() {
  const [authState, setAuthState] = useState('checking'); // checking | denied | ok
  const [feedbackList, setFeedbackList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [sortMode, setSortMode] = useState('date'); // date | category
  const [noteDrafts, setNoteDrafts] = useState({}); // { [feedbackId]: '입력중인 업데이트 내용' }
  const [savingId, setSavingId] = useState(null);

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

  const fetchFeedback = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('feedback')
      .select('id, nickname, category, rating, comment, created_at, resolved, resolved_note, resolved_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('피드백 조회 실패:', error.message);
    } else {
      setFeedbackList(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (authState === 'ok') fetchFeedback();
  }, [authState]);

  // 완료 처리 / 완료 취소
  const toggleResolved = async (item, willResolve) => {
    setSavingId(item.id);
    const note = willResolve ? (noteDrafts[item.id] ?? item.resolved_note ?? '') : null;

    const { error } = await supabase
      .from('feedback')
      .update({
        resolved: willResolve,
        resolved_note: willResolve ? note : null,
        resolved_at: willResolve ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    if (error) {
      console.error('완료 처리 실패:', error.message);
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    } else {
      await fetchFeedback();
    }
    setSavingId(null);
  };

  let displayList = feedbackList.filter(f =>
    categoryFilter === '전체' ? true : f.category === categoryFilter
  );

  if (sortMode === 'date') {
    displayList = [...displayList].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } else {
    displayList = [...displayList].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category);
      const bi = CATEGORY_ORDER.indexOf(b.category);
      if (ai !== bi) return ai - bi;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

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

        <h1 className="classic-heading text-3xl font-bold" style={{ marginBottom: '8px' }}>
          📝 피드백 모음 (비공개)
        </h1>
        <p style={{ color: 'var(--ink-text)', opacity: 0.75, marginBottom: '20px', fontSize: '0.9rem' }}>
          완료 처리하면서 남기는 "업데이트 내용"은{' '}
          <Link href="/updates" style={{ color: 'var(--gold)', fontWeight: 'bold' }}>/updates</Link>
          {' '}페이지에 모두에게 공개됩니다.
        </p>

        {/* 카테고리 필터 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              style={{
                padding: '6px 16px', fontSize: '0.9rem', fontWeight: 'bold', borderRadius: '4px',
                cursor: 'pointer', border: '1px solid var(--gold)',
                backgroundColor: categoryFilter === c ? 'var(--seal-dark)' : 'var(--paper-soft)',
                color: categoryFilter === c ? 'white' : 'var(--ink-text)', transition: 'all 0.15s',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* 정렬 방식 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--ink-text)', opacity: 0.7 }}>정렬:</span>
          {[{ key: 'date', label: '날짜순' }, { key: 'category', label: '카테고리순' }].map((s) => (
            <button
              key={s.key}
              onClick={() => setSortMode(s.key)}
              style={{
                padding: '5px 14px', fontSize: '0.85rem', fontWeight: 'bold', borderRadius: '4px',
                cursor: 'pointer', border: '1px solid var(--gold)',
                backgroundColor: sortMode === s.key ? 'var(--seal-dark)' : 'transparent',
                color: sortMode === s.key ? 'white' : 'var(--ink-text)', transition: 'all 0.15s',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ color: 'var(--ink-text)', opacity: 0.7 }}>불러오는 중...</p>
        ) : displayList.length === 0 ? (
          <p style={{ color: 'var(--ink-text)', opacity: 0.7 }}>해당하는 피드백이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {displayList.map((f) => (
              <div
                key={f.id}
                className="scroll-panel"
                style={{
                  padding: '18px 20px',
                  opacity: f.resolved ? 0.75 : 1,
                  border: f.resolved ? '1px solid rgba(58,160,90,0.5)' : undefined,
                }}
              >
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '10px', flexWrap: 'wrap', gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 'bold', padding: '3px 10px',
                      borderRadius: '4px', border: '1px solid var(--gold)', color: 'var(--ink-text)'
                    }}>
                      {f.category}
                    </span>
                    <span style={{ color: 'var(--gold)', fontSize: '1rem' }}>
                      {'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}
                    </span>
                    {f.resolved && (
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#3aa05a' }}>
                        ✅ 완료
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-text)', opacity: 0.6 }}>
                    {f.nickname || '익명'} · {new Date(f.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>

                <p style={{ margin: '0 0 12px', color: 'var(--ink-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {f.comment}
                </p>

                {/* 완료 처리 영역 */}
                {f.resolved ? (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{
                      flex: 1, fontSize: '0.85rem', color: 'var(--ink-text)',
                      background: 'rgba(58,160,90,0.08)', border: '1px solid rgba(58,160,90,0.3)',
                      borderRadius: '4px', padding: '8px 12px'
                    }}>
                      <strong>업데이트 내용:</strong> {f.resolved_note || '(내용 없음)'}
                    </div>
                    <button
                      onClick={() => toggleResolved(f, false)}
                      disabled={savingId === f.id}
                      style={{
                        padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--border-strong)',
                        borderRadius: '4px', background: 'transparent', color: 'var(--ink-text)', cursor: 'pointer'
                      }}
                    >
                      완료 취소
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <textarea
                      rows={2}
                      placeholder="완료 처리 시 공개될 업데이트 내용을 입력하세요 (예: 신속전개 전법 표시 오류 수정)"
                      value={noteDrafts[f.id] ?? ''}
                      onChange={(e) => setNoteDrafts(prev => ({ ...prev, [f.id]: e.target.value }))}
                      style={{
                        flex: 1, padding: '8px 10px', fontSize: '0.85rem', fontFamily: 'var(--font-body)',
                        border: '1px solid var(--gold)', borderRadius: '4px',
                        backgroundColor: 'var(--paper-soft)', color: 'var(--ink-text)', resize: 'vertical'
                      }}
                    />
                    <button
                      onClick={() => toggleResolved(f, true)}
                      disabled={savingId === f.id}
                      className="seal-button"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {savingId === f.id ? '처리 중...' : '완료 처리'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}