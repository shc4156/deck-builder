'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const CATEGORIES = ['디자인', '편의성', '기능', '기타'];

export default function FeedbackForm({ userNickname }) {
  const [category, setCategory] = useState('기능');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async () => {
    setErrorMsg('');

    if (rating === 0) {
      setErrorMsg('별점을 선택해 주세요.');
      return;
    }
    if (!comment.trim()) {
      setErrorMsg('의견을 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMsg('로그인이 필요합니다.');
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from('feedback').insert({
        user_id: user.id,
        nickname: userNickname || null,
        category,
        rating,
        comment: comment.trim(),
      });

      if (error) {
        console.error('피드백 저장 실패:', error.message);
        setErrorMsg('제출 중 오류가 발생했습니다. 다시 시도해 주세요.');
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
      setCategory('기능');
      setRating(0);
      setComment('');
    } catch (err) {
      console.error('피드백 제출 중 예외:', err);
      setErrorMsg('제출 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="scroll-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h2 className="classic-heading text-2xl font-bold" style={{ marginBottom: '12px' }}>
          소중한 의견 감사합니다
        </h2>
        <p style={{ color: 'var(--ink-text)', opacity: 0.8, marginBottom: '24px' }}>
          남겨주신 피드백은 다음 개선에 반영하겠습니다.
        </p>
        <button className="seal-button" onClick={() => setSubmitted(false)}>
          의견 하나 더 남기기
        </button>
      </div>
    );
  }

  return (
    <div className="scroll-panel" style={{ maxWidth: '560px', margin: '0 auto' }}>
      <h2 className="classic-heading text-2xl font-bold" style={{ marginBottom: '8px' }}>
        의견 남기기
      </h2>
      <p style={{ color: 'var(--ink-text)', opacity: 0.8, marginBottom: '24px', fontSize: '0.9rem' }}>
        불편한 점, 개선했으면 하는 점, 원하는 기능을 자유롭게 남겨 주세요.
      </p>

      {/* 카테고리 선택 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: 'var(--ink-text)' }}>
          카테고리
        </label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '6px 16px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                border: '1px solid var(--gold)',
                backgroundColor: category === c ? 'var(--seal-dark)' : 'var(--paper-soft)',
                color: category === c ? 'white' : 'var(--ink-text)',
                transition: 'all 0.15s',
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 별점 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: 'var(--ink-text)' }}>
          만족도
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              aria-label={`${n}점`}
              style={{
                fontSize: '1.8rem',
                lineHeight: 1,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: n <= rating ? 'var(--gold)' : 'rgba(139,94,52,0.3)',
                transition: 'color 0.15s',
              }}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      {/* 코멘트 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: 'var(--ink-text)' }}>
          의견
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          placeholder="예: 전법 필터에 '패시브'만 따로 보는 옵션이 있으면 좋겠어요."
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '0.95rem',
            fontFamily: 'var(--font-body)',
            border: '1px solid var(--gold)',
            borderRadius: '4px',
            backgroundColor: 'var(--paper-soft)',
            color: 'var(--ink-text)',
            resize: 'vertical',
          }}
        />
      </div>

      {errorMsg && (
        <p style={{ color: 'var(--seal-dark)', fontSize: '0.85rem', marginBottom: '12px' }}>
          {errorMsg}
        </p>
      )}

      <div style={{ textAlign: 'center' }}>
        <button className="seal-button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? '제출 중...' : '의견 제출하기'}
        </button>
      </div>
    </div>
  );
}