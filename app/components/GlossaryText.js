'use client';
import { useMemo } from 'react';
import { GLOSSARY_FLAT } from '../../data/glossary';

// 긴 용어부터 매칭해야 "방어"가 "방어관통"/"방어파괴" 안의 부분 문자열로 먼저 잘리는 걸 방지
const SORTED_TERMS = Object.keys(GLOSSARY_FLAT).sort((a, b) => b.length - a.length);

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MATCH_PATTERN = new RegExp(`(${SORTED_TERMS.map(escapeRegExp).join('|')})`, 'g');

export default function GlossaryText({ text, onTermClick }) {
  const segments = useMemo(() => {
    if (!text) return [];
    const parts = text.split(MATCH_PATTERN);
    return parts.filter(p => p !== undefined && p !== '');
  }, [text]);

  return (
    <>
      {segments.map((seg, i) =>
        GLOSSARY_FLAT[seg] ? (
          <span
            key={i}
            onClick={(e) => { e.stopPropagation(); onTermClick(seg); }}
            style={{
              color: '#1565c0',
              fontWeight: 'bold',
              cursor: 'pointer',
              borderBottom: '1px dashed #1565c0',
              whiteSpace: 'nowrap'
            }}
          >
            {seg}
          </span>
        ) : (
          <span key={i}>{seg}</span>
        )
      )}
    </>
  );
}