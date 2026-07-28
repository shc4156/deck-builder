'use client';
import { GLOSSARY_FLAT } from '../../data/glossary';

// DetailPopup(장수/전법 상세 팝업)과 톤을 맞춘 다크 오퍼레이션 스타일.
// Dictionary.js(한지톤 페이지) 안에서도 이 팝업만은 다크 카드로 뜨도록 통일함.
export default function GlossaryModal({ term, onClose }) {
  if (!term) return null;
  const entry = GLOSSARY_FLAT[term];
  if (!entry) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1100, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', border: '0.5px solid var(--border-strong)',
          borderRadius: 12, padding: 20, maxWidth: 360, width: '100%',
        }}
      >
        <span style={{
          display: 'inline-block', marginBottom: 10, padding: '3px 10px',
          borderRadius: 4, background: 'rgba(184,135,58,0.15)', border: '0.5px solid rgba(184,135,58,0.35)',
          color: 'var(--accent)', fontSize: 11.5, fontWeight: 700,
        }}>
          {entry.category}
        </span>
        <h3 style={{ margin: '0 0 10px 0', fontSize: 18, color: 'var(--text-primary)' }}>{term}</h3>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {entry.definition}
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: 18, width: '100%', padding: '9px 0', border: 'none', borderRadius: 8,
            background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}