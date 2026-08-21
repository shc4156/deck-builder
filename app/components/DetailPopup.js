'use client';
import { useState } from 'react';
import GlossaryText from './GlossaryText';
import GlossaryModal from './GlossaryModal';
import { generalRoleColors, generalRoleLabels } from '../../styles/roleColors';
import { tacticRoleColors, tacticRoleLabels } from '../../styles/roleColors';
import { getSubtypeOptions } from '../../data/troopMastery';

// 장수/전법 이름 클릭 시 뜨는 상세 팝업.
// MatchesTab/SquadsTab 등에서 이름(span)에 onClick={() => setDetailTarget({ type: 'general', name })}
// 형태로 연결하고, generals/tactics/connections 배열을 그대로 넘겨주면 이 컴포넌트가 알아서 찾는다.
//
// props:
//  - target: { type: 'general' | 'tactic', name: string } | null  (null이면 렌더 안 함)
//  - onClose: () => void
//  - generals, tactics: useDeckAssets()에서 받아온 전체 배열
//  - connections: (선택) 인연 배열 — 장수 상세에서 관련 인연을 보여줄 때 사용
export default function DetailPopup({ target, onClose, generals = [], tactics = [], connections = [] }) {
  const [glossaryTerm, setGlossaryTerm] = useState(null);

  if (!target) return null;

  const isGeneral = target.type === 'general';
  const data = isGeneral
    ? generals.find(g => g.name === target.name)
    : tactics.find(t => t.name === target.name);

  if (!data) return null;

  const relatedConnections = isGeneral
    ? connections.filter(conn => Array.isArray(conn.members) && conn.members.includes(data.name))
    : [];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16,
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'var(--bg-surface)', border: '0.5px solid var(--border-strong)',
            borderRadius: 12, padding: 20, maxWidth: 380, width: '100%',
            maxHeight: '80vh', overflowY: 'auto',
          }}
        >
          {isGeneral ? (
            <GeneralDetail general={data} setGlossaryTerm={setGlossaryTerm} relatedConnections={relatedConnections} />
          ) : (
            <TacticDetail tactic={data} setGlossaryTerm={setGlossaryTerm} generals={generals} />
          )}

          <button
            onClick={onClose}
            style={{
              marginTop: 18, width: '100%', padding: '9px 0', border: 'none', borderRadius: 8,
              background: 'var(--accent)', color: 'var(--accent-on)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>

      <GlossaryModal term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
    </>
  );
}

function GeneralDetail({ general, setGlossaryTerm, relatedConnections }) {
  // 역할 배지: supabase generals.preferred_tactic_type을 우선 사용한다.
  // (예전엔 primary_role 기준으로 표시했는데, "제갈량-책략딜러"처럼 실제 선호 전법 유형과
  // 어긋나 보이는 경우가 있어 더 구체적인 신호인 preferred_tactic_type으로 교체)
  const displayRole = general.preferred_tactic_type || general.primary_role;
  const roleStyle = generalRoleColors[displayRole] || { bg: 'rgba(184,147,90,0.15)', border: 'var(--accent)', text: 'var(--accent)' };
  const roleLabel = generalRoleLabels[displayRole] || displayRole;

  return (
    <>
      {general.image_url && (
        <img
          src={general.image_url}
          alt={general.name}
          style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto 14px auto', borderRadius: 8, border: '0.5px solid var(--border-strong)' }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 19, color: 'var(--text-primary)' }}>{general.name}</h3>
        {roleLabel && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
            background: roleStyle.bg, border: `0.5px solid ${roleStyle.border}`, color: roleStyle.text,
          }}>
            {roleLabel}
          </span>
        )}
      </div>

      <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
        {[general.faction, general.position, general.troop_type].filter(Boolean).join(' · ') || '정보 없음'}
      </p>

      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 4, fontSize: 13.5 }}>
          고유전법: {general.unique_tactic_name || '정보없음'}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          {general.unique_tactic_effect
            ? <GlossaryText text={general.unique_tactic_effect} onTermClick={setGlossaryTerm} />
            : '고유전법 설명이 등록되지 않았습니다.'}
        </p>
      </div>

      {general.unique_arts && Object.keys(general.unique_arts).length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6, fontSize: 13.5 }}>고유병법</div>
          {Object.entries(general.unique_arts).map(([artName, artDesc]) => (
            <div key={artName} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12.5 }}>{artName}</div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <GlossaryText text={String(artDesc)} onTermClick={setGlossaryTerm} />
              </p>
            </div>
          ))}
        </div>
      )}

      {general.troop_type && (
        <TroopMasterySection coarseTroopType={general.troop_type} />
      )}

      {relatedConnections.length > 0 && (
        <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
          <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6, fontSize: 13.5 }}>관련 인연</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {relatedConnections.map((conn, idx) => (
              <div key={idx} style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>[{conn.name}]</span>{' '}
                <GlossaryText text={conn.effect} onTermClick={setGlossaryTerm} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function TroopMasterySection({ coarseTroopType }) {
  const subtypeOptions = getSubtypeOptions(coarseTroopType);
  if (subtypeOptions.length === 0) return null;

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
      <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 2, fontSize: 13.5 }}>
        병종 진급 (S2, Lv.35+)
      </div>
      <p style={{ margin: '0 0 8px 0', fontSize: 11, color: 'var(--text-faded)' }}>
        Lv.35 진급 시 아래 두 갈래 중 하나를 선택하고, Lv.40에서 해당 계열의 전용 정통 또는 일반 정통 중 1개를 장착합니다.
      </p>
      {subtypeOptions.map(opt => (
        <div key={opt.subtypeName} style={{ marginBottom: 8, paddingLeft: 8, borderLeft: '2px solid var(--border)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 12.5 }}>
            {opt.subtypeName}
            <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: 11.5 }}>
              {' '}— {opt.classTrait?.name}(고유특성)
            </span>
          </div>
          <p style={{ margin: '2px 0 4px 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {opt.classTrait?.effect}
          </p>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>전용 정통 · {opt.exclusiveMastery?.name}</span>
            {' '}{opt.exclusiveMastery?.effect}
          </div>
        </div>
      ))}
    </div>
  );
}

function TacticDetail({ tactic, setGlossaryTerm, generals }) {
  const roleStyle = tacticRoleColors[tactic.role] || { bg: 'rgba(184,147,90,0.15)', border: 'var(--accent)', text: 'var(--accent)' };
  const roleLabel = tacticRoleLabels[tactic.role] || tactic.role;

  const recommendedGenerals = generals.filter(g =>
    g.primary_role === tactic.role || (g.secondary_roles || []).includes(tactic.role)
  ).slice(0, 8);

  return (
    <>
      {tactic.image_url && (
        <img
          src={tactic.image_url}
          alt={tactic.name}
          style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto 14px auto', borderRadius: 8, border: '0.5px solid var(--border-strong)' }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <h3 style={{ margin: 0, fontSize: 19, color: 'var(--text-primary)' }}>{tactic.name}</h3>
        {roleLabel && (
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
            background: roleStyle.bg, border: `0.5px solid ${roleStyle.border}`, color: roleStyle.text,
          }}>
            {roleLabel}
          </span>
        )}
      </div>

      <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
        {[tactic.type, tactic.trait].filter(Boolean).join(' · ') || '정보 없음'}
      </p>

      <p style={{ margin: '0 0 14px 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {tactic.description
          ? <GlossaryText text={tactic.description} onTermClick={setGlossaryTerm} />
          : '전법 설명이 등록되지 않았습니다.'}
      </p>

      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 10 }}>
        <div style={{ fontWeight: 600, color: 'var(--accent)', marginBottom: 6, fontSize: 13.5 }}>추천 장수</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {recommendedGenerals.length > 0 ? (
            recommendedGenerals.map(g => (
              <span key={g.id} style={{
                fontSize: 12, padding: '3px 8px', borderRadius: 4,
                background: 'rgba(184,135,58,0.12)', color: 'var(--accent)', border: '0.5px solid rgba(184,135,58,0.3)',
              }}>
                {g.name}
              </span>
            ))
          ) : (
            <span style={{ fontSize: 12.5, color: 'var(--text-faded)' }}>계열이 일치하는 장수를 찾지 못했습니다.</span>
          )}
        </div>
      </div>
    </>
  );
}