// components/FormationGridVisual.js
export default function FormationGridVisual({ gridData, onCellClick }) {
  let parsedGrid = ['', '', '', '', '', ''];

  try {
    if (Array.isArray(gridData)) {
      parsedGrid = gridData;
    } else if (typeof gridData === 'string') {
      parsedGrid = JSON.parse(gridData);
    }
  } catch {
    parsedGrid = ['', '', '', '', '', ''];
  }

  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      gap: '6px',
      backgroundColor: '#2b261f',
      padding: '8px',
      borderRadius: '8px',
      border: '1px solid #7a6341',
      boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
      alignSelf: 'center'
    }}>
      {/* 6칸 그리드 (상단: 전열 3칸 / 하단: 후열 3칸) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 46px)',
        gap: '5px'
      }}>
        {parsedGrid.map((heroName, idx) => {
          const isFilled = Boolean(heroName);
          const isFront = idx < 3; // 0,1,2: 전열 / 3,4,5: 후열

          return (
            <div
              key={idx}
              onClick={() => onCellClick && onCellClick(idx)}
              title={isFilled ? `${heroName} (클릭하여 전/후 이동)` : '빈 슬롯'}
              style={{
                width: '46px',
                height: '42px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '5px',
                fontSize: '0.78rem',
                fontWeight: 'bold',
                cursor: isFilled ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                border: isFilled 
                  ? (isFront ? '1.5px solid #e0a96d' : '1.5px solid #6b9ac4')
                  : '1px dashed #554838',
                backgroundColor: isFilled 
                  ? (isFront ? '#8c2424' : '#1d4e89') 
                  : 'rgba(0,0,0,0.25)',
                color: isFilled ? '#ffffff' : '#554838',
                boxShadow: isFilled ? '0 2px 4px rgba(0,0,0,0.4)' : 'none',
                textAlign: 'center',
                userSelect: 'none'
              }}
            >
              {isFilled ? (
                <>
                  <span>{heroName.length > 2 ? heroName.slice(0, 2) : heroName}</span>
                  <span style={{ fontSize: '0.55rem', opacity: 0.7, marginTop: '1px' }}>
                    {isFront ? '전' : '후'}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: '0.65rem' }}>{isFront ? '전열' : '후열'}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}