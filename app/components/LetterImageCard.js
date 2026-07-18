// app/components/LetterImageCard.js
'use client';
import { forwardRef } from 'react';

// 서신 본문 안의 {y}...{y} / {r}...{r} / {b}...{b} / {g}...{g} 강조 태그를
// 실제 색깔이 입혀진 텍스트로 변환하기 위한 색상 매핑
const TAG_COLORS = {
  y: '#a9791a',
  r: '#9c2b2b',
  b: '#22437d',
  g: '#22592f',
};

// 서신 종류별 뱃지 색상
const CATEGORY_COLORS = {
  공성서신: '#9c2b2b',
  전쟁서신: '#22437d',
  법령: '#22592f',
  공지: '#8a6a2e',
  안내문: '#8a6a2e',
  서신: '#8a6a2e',
};

function CategoryBadge({ category }) {
  if (!category) return null;
  const color = CATEGORY_COLORS[category] || '#8a6a2e';
  return (
    <div style={{ textAlign: 'center', marginBottom: '10px' }}>
      <span
        style={{
          display: 'inline-block',
          padding: '4px 16px',
          fontSize: '13px',
          fontWeight: 700,
          color: '#fdf3dd',
          backgroundColor: color,
          borderRadius: '2px',
          letterSpacing: '3px',
        }}
      >
        {category}
      </span>
    </div>
  );
}

// 하단에 찍히는 길드(맹) 직인 — 붉은 관인 느낌의 도장
function GuildSeal({ text = '꼬마맹' }) {
  const chars = text.split('');
  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '46px',
        padding: '8px 0',
        border: '3px double #a02020',
        color: '#a02020',
        opacity: 0.85,
        transform: 'rotate(-6deg)',
      }}
    >
      {chars.map((c, i) => (
        <span key={i} style={{ fontSize: '17px', fontWeight: 900, lineHeight: '1.35' }}>
          {c}
        </span>
      ))}
    </div>
  );
}

function parseLineSegments(line) {
  const segments = [];
  let lastIndex = 0;
  const regex = /\{(y|r|b|g)\}([\s\S]*?)\{\1\}/g;
  let match;
  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), color: null });
    }
    segments.push({ text: match[2], color: TAG_COLORS[match[1]] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length || segments.length === 0) {
    segments.push({ text: line.slice(lastIndex), color: null });
  }
  return segments;
}

// 인게임 서신창을 흉내낸 "두루마리" 스타일 카드.
// html2canvas로 캡처할 대상이므로 화면에 보이지 않는 위치에 렌더링해서 사용합니다.
const LetterImageCard = forwardRef(function LetterImageCard({ title, bodyText, category }, ref) {
  const lines = (bodyText || '').split('\n');

  const scrollRod = (
    <div
      style={{
        height: '22px',
        margin: '0 14px',
        background: 'linear-gradient(180deg, #6b4423 0%, #45280f 50%, #6b4423 100%)',
        borderRadius: '4px',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '-8px',
          top: '2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #7a5330, #3a2210)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: '-8px',
          top: '2px',
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #7a5330, #3a2210)',
        }}
      />
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: '680px',
        fontFamily: '"Noto Serif KR", "Nanum Myeongjo", serif',
        background: 'linear-gradient(180deg, #f4e6c4 0%, #ecd9a8 100%)',
        border: '2px solid #8a6a2e',
        boxShadow: 'inset 0 0 0 6px #f9f0da, inset 0 0 0 8px #8a6a2e',
      }}
    >
      <div style={{ paddingTop: '10px' }}>{scrollRod}</div>

      <div style={{ padding: '28px 44px 34px 44px' }}>
        <CategoryBadge category={category} />

        {/* 인장 + 제목 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '18px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '6px',
              background: 'radial-gradient(circle at 35% 30%, #c0392b, #7a1f18)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.35)',
              transform: 'rotate(-4deg)',
              flexShrink: 0,
            }}
          >
            <span style={{ color: '#f6dcb0', fontSize: '22px', fontWeight: 900, letterSpacing: '-1px' }}>印</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, color: '#4a2f12', letterSpacing: '2px', textAlign: 'center' }}>
            {title || '무제 서신'}
          </h1>
        </div>

        {/* 상단 구분선 */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #8a6a2e 15%, #8a6a2e 85%, transparent)', marginBottom: '6px' }} />
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #b8935a 15%, #b8935a 85%, transparent)', marginBottom: '24px' }} />

        {/* 본문 */}
        <div style={{ fontSize: '17px', lineHeight: '1.9', color: '#3a2a12' }}>
          {lines.map((line, i) => (
            <div key={i} style={{ minHeight: line.trim() ? 'auto' : '12px' }}>
              {line.trim() === ''
                ? '\u00A0'
                : parseLineSegments(line).map((seg, j) => (
                    <span key={j} style={{ color: seg.color || '#3a2a12', fontWeight: seg.color ? 800 : 400 }}>
                      {seg.text}
                    </span>
                  ))}
            </div>
          ))}
        </div>

        {/* 하단 구분선 */}
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #b8935a 15%, #b8935a 85%, transparent)', marginTop: '28px', marginBottom: '6px' }} />
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #8a6a2e 15%, #8a6a2e 85%, transparent)', marginBottom: '18px' }} />

        <div style={{ textAlign: 'right' }}>
          <GuildSeal text="꼬마맹" />
        </div>
      </div>

      <div style={{ paddingBottom: '10px' }}>{scrollRod}</div>
    </div>
  );
});

export default LetterImageCard;