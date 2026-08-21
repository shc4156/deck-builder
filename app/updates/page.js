'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import { supabase } from '../lib/supabaseClient';

export default function UpdatesPage() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const [feedbackRes, changelogRes] = await Promise.all([
        supabase
          .from('feedback')
          .select('id, category, comment, resolved_note, resolved_at')
          .eq('resolved', true),
        supabase
          .from('changelog')
          .select('id, content, created_at'),
      ]);

      if (feedbackRes.error) console.error('피드백 반영 내역 조회 실패:', feedbackRes.error.message);
      if (changelogRes.error) console.error('수정 기록 조회 실패:', changelogRes.error.message);

      const fromFeedback = (feedbackRes.data || []).map((f) => ({
        id: `feedback-${f.id}`,
        date: f.resolved_at,
        text: f.resolved_note || f.comment,
        source: 'feedback',
        category: f.category,
      }));

      const fromChangelog = (changelogRes.data || []).map((c) => ({
        id: `changelog-${c.id}`,
        date: c.created_at,
        text: c.content,
        source: 'changelog',
        category: null,
      }));

      const merged = [...fromFeedback, ...fromChangelog].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

      setItems(merged);
      setIsLoading(false);
    };

    fetchAll();
  }, []);

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
          📜 업데이트 내역
        </h1>
        <p style={{ color: 'var(--ink-text)', opacity: 0.75, marginBottom: '28px', fontSize: '0.9rem' }}>
          맹원 여러분의 의견 반영 내역과 그 외 개선 사항을 함께 모았습니다.
        </p>

        {isLoading ? (
          <p style={{ color: 'var(--ink-text)', opacity: 0.7 }}>불러오는 중...</p>
        ) : items.length === 0 ? (
          <p style={{ color: 'var(--ink-text)', opacity: 0.7 }}>아직 등록된 업데이트 내역이 없습니다.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '720px' }}>
            {items.map((u) => (
              <div key={u.id} className="scroll-panel" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{
                    fontSize: '0.8rem', fontWeight: 'bold', padding: '3px 10px',
                    borderRadius: '4px', border: '1px solid var(--gold)', color: 'var(--ink-text)'
                  }}>
                    {u.source === 'feedback' ? (u.category || '피드백 반영') : '개선'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ink-text)', opacity: 0.6 }}>
                    {u.date ? new Date(u.date).toLocaleDateString('ko-KR') : ''}
                  </span>
                </div>
                <p style={{ margin: 0, color: 'var(--ink-text)', lineHeight: 1.6 }}>
                  ✅ {u.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}