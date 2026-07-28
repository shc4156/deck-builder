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
    <div
      style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(3, 54px)',
        gridTemplateRows: 'repeat(2, 50px)',
        gap: '5px',
        padding: '8px',
        background: 'var(--bg-surface)',
        border: '0.5px solid var(--border)',
        borderRadius: 8,
      }}
    >
      {parsedGrid.map((heroName, idx) => {
        const isFilled = Boolean(heroName);
        const isFront = idx < 3; // 0,1,2: 전열 / 3,4,5: 후열

        const nameFontSize = !isFilled
          ? undefined
          : heroName.length >= 4
          ? '0.72rem'
          : heroName.length === 3
          ? '0.8rem'
          : '0.92rem';

        return (
          <div
            key={idx}
            onClick={() => onCellClick && onCellClick(idx)}
            title={isFilled ? `${heroName} (클릭하여 전/후 이동)` : '빈 슬롯'}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              cursor: isFilled ? 'pointer' : 'default',
              transition: 'background 0.15s ease, border-color 0.15s ease',
              border: isFilled
                ? `0.5px solid ${isFront ? 'var(--accent)' : '#4f8fdb'}`
                : '1px dashed var(--border)',
              background: isFilled
                ? isFront
                  ? 'rgba(184,135,58,0.16)'
                  : 'rgba(79,143,219,0.16)'
                : 'transparent',
              color: isFilled ? 'var(--text-primary)' : 'var(--text-faded)',
              userSelect: 'none',
            }}
          >
            {isFilled ? (
              <>
                <span
                  style={{
                    fontSize: nameFontSize,
                    fontWeight: 600,
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {heroName}
                </span>
                <span
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 500,
                    marginTop: 2,
                    color: isFront ? 'var(--accent)' : '#4f8fdb',
                  }}
                >
                  {isFront ? '전열' : '후열'}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '0.66rem' }}>{isFront ? '전열' : '후열'}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}