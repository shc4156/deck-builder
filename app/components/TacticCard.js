import { tacticRoleColors, tacticRoleLabels, tagLabels } from '../../styles/roleColors';

export default function TacticCard({ tactic, isSelected, onSelect }) {
  const roleStyle = tacticRoleColors[tactic.role] || { bg: 'rgba(142,115,91,0.15)', border: '#8e735b', text: '#D9C9B0' };
  const roleLabel = tacticRoleLabels[tactic.role] || tactic.role;
  const tags = tactic.tags || [];

  // 시즌 뱃지: 시즌2는 신규 콘텐츠라는 걸 한눈에 구분할 수 있게 강조색을 다르게 준다.
  const isNewSeason = tactic.season === 'S2';
  const seasonBadge = {
    label: tactic.season || 'S1',
    bg: isNewSeason ? 'rgba(58,123,200,0.22)' : 'rgba(255,255,255,0.08)',
    border: isNewSeason ? '#3A7BC8' : 'rgba(255,255,255,0.3)',
    text: isNewSeason ? '#9fd0ff' : 'rgba(255,255,255,0.6)',
  };

  const cardStyle = isSelected && tactic.image_url
    ? {
        backgroundImage: `linear-gradient(rgba(28,24,21,0.75), rgba(28,24,21,0.75)), url('${tactic.image_url}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'var(--text-primary)',
        border: '3px solid var(--seal)',
        boxShadow: '0 0 0 3px rgba(166,50,42,0.25)',
        textShadow: '1px 1px 3px #000'
      }
    : {
        backgroundColor: 'var(--paper-soft)',
        color: 'var(--ink-text)',
        border: '3px double var(--gold)',
        borderLeft: `6px solid ${roleStyle.border}` // 역할별 좌측 컬러바 - 도감에서 한눈에 구분되도록
      };

  return (
    <div
      onClick={() => onSelect(tactic)}
      style={{
        padding: '16px', borderRadius: '2px', cursor: 'pointer',
        textAlign: 'center', height: '220px', display: 'flex',
        flexDirection: 'column', justifyContent: 'flex-start',
        fontFamily: 'var(--font-body)',
        transition: 'all 0.3s ease', position: 'relative', ...cardStyle
      }}
    >
      {/* 시즌 뱃지: 우측 상단에 고정 */}
      <span style={{
        position: 'absolute', top: '8px', right: '8px',
        fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '2px',
        backgroundColor: seasonBadge.bg,
        border: `1px solid ${seasonBadge.border}`,
        color: seasonBadge.text,
        letterSpacing: '0.02em',
      }}>
        {seasonBadge.label}
      </span>

      {/* 역할 배지: 선택 여부와 무관하게 항상 표시, 선택 시엔 어두운 배경 위라 텍스트만 밝게 조정 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
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
              backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.2)'}`,
              color: isSelected ? 'var(--text-primary)' : 'rgba(255,255,255,0.65)'
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