'use client';
import { GLOSSARY_FLAT } from '../../data/glossary';

export default function GlossaryModal({ term, onClose }) {
  if (!term) return null;
  const entry = GLOSSARY_FLAT[term];
  if (!entry) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#f5ebd3', border: '1px solid #d7ccc8', borderRadius: '8px',
          padding: '24px', maxWidth: '360px', width: '90%'
        }}
      >
        <span style={{
          display: 'inline-block', marginBottom: '10px', padding: '3px 10px',
          borderRadius: '2px', backgroundColor: '#3e2723', color: '#fff', fontSize: '0.8rem', fontWeight: 'bold'
        }}>
          {entry.category}
        </span>
        <h3 style={{ margin: '0 0 10px 0', color: '#3e2723' }}>{term}</h3>
        <p style={{ margin: 0, color: '#5d4037', lineHeight: '1.6' }}>{entry.definition}</p>
        <button
          onClick={onClose}
          style={{
            marginTop: '18px', padding: '8px 16px', border: 'none', borderRadius: '4px',
            backgroundColor: '#3e2723', color: '#fff', cursor: 'pointer', fontWeight: 'bold'
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}