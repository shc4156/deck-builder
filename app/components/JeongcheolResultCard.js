// app/components/JeongcheolResultCard.js
'use client';
import { forwardRef } from 'react';
import RouteMiniMap from './RouteMiniMap';

function fmt(n) {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR');
}

function fmtEta(step) {
  if (step.hoursFromNow == null) return '계산 불가';
  if (step.hoursFromNow <= 0) return '지금 바로';
  const h = Math.floor(step.hoursFromNow);
  const m = Math.round((step.hoursFromNow - h) * 60);
  return `${h}시간 ${m}분 후`;
}

// LetterImageCard.js와 동일하게, 화면 밖에 실제로 렌더링해두고 html2canvas로 캡처하는 용도.
const JeongcheolResultCard = forwardRef(function JeongcheolResultCard(
  { routeName, steps, total, currentStock, hourlyProduction },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        width: '640px',
        fontFamily: '"Noto Serif KR", "Nanum Myeongjo", serif',
        background: 'linear-gradient(180deg, #f4e6c4 0%, #ecd9a8 100%)',
        border: '2px solid #8a6a2e',
        boxShadow: 'inset 0 0 0 6px #f9f0da, inset 0 0 0 8px #8a6a2e',
        padding: '30px 38px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '18px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 16px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#fdf3dd',
            backgroundColor: '#9c2b2b',
            borderRadius: '2px',
            letterSpacing: '3px',
          }}
        >
          정철 계산
        </span>
        <h1 style={{ margin: '10px 0 0 0', fontSize: '24px', fontWeight: 800, color: '#4a2f12' }}>
          {routeName || '무제 루트'}
        </h1>
      </div>

      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #8a6a2e 15%, #8a6a2e 85%, transparent)', marginBottom: '18px' }} />

      <div style={{ marginBottom: '18px' }}>
        <RouteMiniMap steps={steps} width={560} height={260} />
      </div>

      <div style={{ fontSize: '15px', color: '#3a2a12' }}>
        {steps.map((s, i) => (
          <div
            key={s.id ?? i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '8px 0',
              borderBottom: i < steps.length - 1 ? '1px dashed rgba(138,106,46,0.35)' : 'none',
            }}
          >
            <div>
              <span style={{ fontWeight: 700 }}>{i + 1}. {s.name || '(이름 없음)'}</span>
              <span style={{ opacity: 0.7, marginLeft: '6px' }}>Lv.{s.level}</span>
              {!s.connected && <span style={{ marginLeft: '6px', color: '#9c2b2b', fontWeight: 700 }}>미연결</span>}
              {s.enemyStart && <span style={{ marginLeft: '6px', color: '#22437d', fontWeight: 700 }}>적진</span>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700 }}>{fmt(s.total)} 정철</div>
              <div style={{ fontSize: '12px', opacity: 0.75 }}>{fmtEta(s)}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #b8935a 15%, #b8935a 85%, transparent)', margin: '18px 0 12px 0' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', color: '#3a2a12' }}>
        <span>현재 보유 {fmt(currentStock)} · 시간당 +{fmt(hourlyProduction)}</span>
        <span style={{ fontWeight: 900, fontSize: '19px' }}>총 {fmt(total)} 정철</span>
      </div>
    </div>
  );
});

export default JeongcheolResultCard;