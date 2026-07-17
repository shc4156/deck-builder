// components/FormationGridVisual.js
'use client';

// 진형 [전열3칸, 후열3칸] 데이터를 전통 서막풍 격자로 그려주는 컴포넌트
export default function FormationGridVisual({ gridData }) {
  let parsed = [];
  try {
    parsed = typeof gridData === 'string' ? JSON.parse(gridData) : gridData;
  } catch (e) {
    if (typeof gridData === 'string') {
      parsed = gridData.split(',').map(num => parseInt(num.trim(), 10));
    }
  }

  if (!Array.isArray(parsed) || parsed.length !== 6) {
    parsed = [0, 0, 0, 0, 0, 0];
  }

  const frontRow = parsed.slice(0, 3);
  const backRow = parsed.slice(3, 6);

  const cellStyle = (isActive) => ({
    width: '26px',
    height: '26px',
    border: isActive ? '2px solid #8e24aa' : '1px solid #bcaaa4',
    borderRadius: '2px',
    backgroundColor: isActive ? '#d32f2f' : '#fcf8f2',
    boxShadow: isActive ? '0 0 4px rgba(211, 47, 47, 0.4)' : 'none',
    transition: 'all 0.3s ease'
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      backgroundColor: '#e7decb',
      padding: '8px 12px',
      borderRadius: '4px',
      width: 'fit-content',
      border: '1px solid #bcaaa4'
    }}>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#5d4037', width: '30px', fontWeight: 'bold' }}>전열</span>
        {frontRow.map((isActive, i) => (
          <div key={`front-${i}`} style={cellStyle(isActive === 1)} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: '#5d4037', width: '30px', fontWeight: 'bold' }}>후열</span>
        {backRow.map((isActive, i) => (
          <div key={`back-${i}`} style={cellStyle(isActive === 1)} />
        ))}
      </div>
    </div>
  );
}