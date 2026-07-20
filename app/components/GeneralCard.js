// components/GeneralCard.js
import { generalRoleColors, generalRoleLabels, tagLabels } from '../../styles/roleColors';

export default function GeneralCard({ general, isSelected, onSelect }) {
  const factionColors = {
    '위': '#2c4a6b', '촉': '#2d5a27', '오': '#8b2626', '군': '#b8860b'
  };
  const borderColor = factionColors[general.faction] || '#8e735b';

  const roleStyle = generalRoleColors[general.primary_role] || { bg: 'rgba(142,115,91,0.15)', border: '#8e735b', text: '#5c4a3a' };
  const roleLabel = generalRoleLabels[general.primary_role] || general.primary_role;
  const secondaryRoles = general.secondary_roles || [];

  const cardStyle = isSelected && general.image_url
    ? {
        backgroundImage: `linear-gradient(rgba(28,24,21,0.75), rgba(28,24,21,0.75)), url('${general.image_url}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: 'var(--paper-soft)',
        border: '3px solid var(--seal)',
        boxShadow: '0 0 0 3px rgba(166,50,42,0.25)',
        textShadow: '1px 1px 3px #000'
      }
    : {
        backgroundColor: 'var(--paper-soft)',
        color: 'var(--ink-text)',
        border: '3px double var(--gold)',
        borderLeft: `6px solid ${borderColor}`
      };

  return (
    <div
      onClick={() => onSelect(general)}
      style={{
        padding: '16px',
        borderRadius: '2px',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        height: '320px',           // 추천 전법 표시 공간 확보
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        fontFamily: 'var(--font-body)',
        ...cardStyle
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '2px',
          backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : roleStyle.bg,
          border: `1px solid ${isSelected ? 'var(--gold-soft)' : roleStyle.border}`,
          color: isSelected ? 'var(--gold-soft)' : roleStyle.text
        }}>
          {roleLabel}
        </span>
      </div>

      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>{general.name}</h3>
      <div style={{ fontSize: '13px', lineHeight: '1.8', marginBottom: '12px' }}>
        <p style={{ margin: '0' }}>진영: {general.faction}</p>
        <p style={{ margin: '0' }}>포지션: {general.position}</p>
        <p style={{ margin: '0' }}>병종: {general.troop_type || '정보없음'}</p>
      </div>

      {/* 추천 전법 표시 */}
      {general.recommended_tactics && general.recommended_tactics.length > 0 && (
        <div style={{ 
          marginTop: 'auto', 
          padding: '10px', 
          backgroundColor: isSelected ? 'rgba(0,0,0,0.3)' : 'rgba(43,35,24,0.08)', 
          borderRadius: '4px',
          fontSize: '12px',
          textAlign: 'left'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '6px', color: isSelected ? '#ffd700' : '#8e735b' }}>
            추천 전법
          </div>
          <ul style={{ margin: 0, paddingLeft: '16px', lineHeight: '1.4' }}>
            {general.recommended_tactics.slice(0, 5).map((tactic, idx) => (
              <li key={idx} style={{ marginBottom: '2px' }}>{tactic}</li>
            ))}
            {general.recommended_tactics.length > 5 && (
              <li style={{ color: isSelected ? '#ccc' : '#777' }}>+ {general.recommended_tactics.length - 5}개 더</li>
            )}
          </ul>
        </div>
      )}

      {/* 부역할 태그 */}
      {secondaryRoles.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginTop: '8px' }}>
          {secondaryRoles.slice(0, 2).map((tag, idx) => (
            <span key={idx} style={{
              fontSize: '10px', padding: '1px 6px', borderRadius: '2px',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(43,35,24,0.06)',
              border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(43,35,24,0.2)'}`,
              color: isSelected ? 'var(--paper-soft)' : 'rgba(43,35,24,0.65)'
            }}>
              {tagLabels[tag] || tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        height: '250px', // 역할 배지 추가로 살짝 더 키움
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        fontFamily: 'var(--font-body)',
        ...cardStyle
      }}
    >
      {/* 진영은 좌측 컬러바로 이미 표시되므로, 상단엔 역할 배지만 노출해 정보 중복을 피함 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
        <span style={{
          fontSize: '11px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '2px',
          backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : roleStyle.bg,
          border: `1px solid ${isSelected ? 'var(--gold-soft)' : roleStyle.border}`,
          color: isSelected ? 'var(--gold-soft)' : roleStyle.text
        }}>
          {roleLabel}
        </span>
      </div>

      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 'bold' }}>{general.name}</h3>
      <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
        <p style={{ margin: '0' }}>진영: {general.faction}</p>
        <p style={{ margin: '0' }}>포지션: {general.position}</p>
        <p style={{ margin: '0' }}>병종: {general.troop_type || '정보없음'}</p>
        <p style={{ margin: '0', fontWeight: 'bold', color: isSelected ? 'var(--gold-soft)' : 'var(--seal-dark)' }}>
          {general.unique_tactic_name}
        </p>
      </div>

      {/* 부역할 태그: 최대 2개만 노출 (딜러 안에서도 조건부딜/생존형 같은 세부 성향 구분용) */}
      {secondaryRoles.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
          {secondaryRoles.slice(0, 2).map((tag, idx) => (
            <span key={idx} style={{
              fontSize: '10px', padding: '1px 6px', borderRadius: '2px',
              backgroundColor: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(43,35,24,0.06)',
              border: `1px solid ${isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(43,35,24,0.2)'}`,
              color: isSelected ? 'var(--paper-soft)' : 'rgba(43,35,24,0.65)'
            }}>
              {tagLabels[tag] || tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
