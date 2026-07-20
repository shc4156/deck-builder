// components/TacticCard.js
export default function TacticCard({ tactic, isSelected, onSelect }) {
  return (
    <div
      onClick={() => onSelect(tactic)}
      style={{
        padding: '20px',
        border: isSelected ? '3px solid var(--seal)' : '2px solid #ddd',
        borderRadius: '8px',
        backgroundColor: isSelected ? 'var(--paper-soft)' : 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
        height: '220px',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', fontSize: '1.3rem' }}>{tactic.name}</h3>
      
      <div style={{ fontSize: '0.95rem', marginBottom: '12px', flex: 1 }}>
        {tactic.effect || '효과 정보 없음'}
      </div>

      <div style={{ marginTop: 'auto', fontSize: '0.85rem', color: '#666' }}>
        {tactic.category || '분류 없음'}
      </div>
    </div>
  );
}        fontSize: '13px',
        margin: '0 0 10px 0',
        opacity: 0.9,
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {tactic.description || tactic.effect || '효과 정보 없음'}
      </p>

      {/* 추천 장수 표시 */}
      {tactic.recommended_generals && tactic.recommended_generals.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #eee' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px', color: '#8e735b' }}>
            추천 장수
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tactic.recommended_generals.slice(0, 4).map((gen, idx) => (
              <span key={idx} style={{
                fontSize: '0.75rem',
                padding: '2px 6px',
                backgroundColor: '#f4e8d1',
                borderRadius: '4px',
                color: '#5c4a3a'
              }}>
                {gen}
              </span>
            ))}
            {tactic.recommended_generals.length > 4 && (
              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                +{tactic.recommended_generals.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 부가특성 태그 */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
          {tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} style={{
              fontSize: '10px', padding: '1px 6px', borderRadius: '2px',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(43,35,24,0.06)',
              border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(43,35,24,0.2)'}`,
              color: isSelected ? 'var(--paper-soft)' : 'rgba(43,35,24,0.65)'
            }}>
              {tagLabels[tag] || tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span style={{ fontSize: '10px', opacity: 0.6 }}>+{tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
        fontSize: '13px',
        margin: '0 0 10px 0',
        opacity: 0.9,
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {tactic.description || tactic.effect || '효과 정보 없음'}
      </p>

      {/* 추천 장수 표시 */}
      {tactic.recommended_generals && tactic.recommended_generals.length > 0 && (
        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #eee' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '4px', color: '#8e735b' }}>
            추천 장수
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tactic.recommended_generals.slice(0, 4).map((gen, idx) => (
              <span key={idx} style={{
                fontSize: '0.75rem',
                padding: '2px 6px',
                backgroundColor: '#f4e8d1',
                borderRadius: '4px',
                color: '#5c4a3a'
              }}>
                {gen}
              </span>
            ))}
            {tactic.recommended_generals.length > 4 && (
              <span style={{ fontSize: '0.75rem', color: '#888' }}>
                +{tactic.recommended_generals.length - 4}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 부가특성 태그 */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
          {tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} style={{
              fontSize: '10px', padding: '1px 6px', borderRadius: '2px',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(43,35,24,0.06)',
              border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(43,35,24,0.2)'}`,
              color: isSelected ? 'var(--paper-soft)' : 'rgba(43,35,24,0.65)'
            }}>
              {tagLabels[tag] || tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span style={{ fontSize: '10px', opacity: 0.6 }}>+{tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
                color: '#5c4a3a'
              }}>
                {gen}
              </span>
            ))}
            {tactic.recommended_generals.length > 6 && (
              <span style={{ fontSize: '0.8rem', color: '#888' }}>
                +{tactic.recommended_generals.length - 6}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '2px',
          backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : roleStyle.bg,
          border: `1px solid ${isSelected ? 'var(--gold-soft)' : roleStyle.border}`,
          color: isSelected ? 'var(--gold-soft)' : roleStyle.text
        }}>
          {roleLabel}
        </span>
      </div>

      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>{tactic.name}</h3>

      <p style={{
        fontSize: '13px',
        margin: '0 0 10px 0',
        opacity: 0.9,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>{tactic.description}</p>

      {/* 부가특성 태그: 최대 3개만 노출, 넘치면 생략 (카드가 태그로 도배되지 않도록) */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginTop: 'auto' }}>
          {tags.slice(0, 3).map((tag, idx) => (
            <span key={idx} style={{
              fontSize: '10px', padding: '1px 6px', borderRadius: '2px',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(43,35,24,0.06)',
              border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(43,35,24,0.2)'}`,
              color: isSelected ? 'var(--paper-soft)' : 'rgba(43,35,24,0.65)'
            }}>
              {tagLabels[tag] || tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span style={{ fontSize: '10px', opacity: 0.6 }}>+{tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}
