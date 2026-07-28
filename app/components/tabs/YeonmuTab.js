'use client';
import { useState, useMemo } from 'react';
import { useDeckAssets } from '../../../hooks/useDeckAssets';
import { useYeonmuStorage } from '../../../hooks/useYeonmuStorage';

/* ============================================================
   🎨 SquadsTab.js와 동일한 다크 오퍼레이션 테마 색상 상수
   (mockup_dark_formation.html 기준 — 값이 바뀌면 두 파일 모두 맞춰줘야 함)
============================================================ */
const SCROLL = {
  bg: '#0B0D11',
  paperLight: '#14171D',
  paperMid: '#1C2027',
  ink: '#EDEDED',
  inkFaint: '#8A8F98',
  border: '#3A3F4A',
  headerBorder: '#2A2E36',
  gold: '#B8873A',
  green: '#4E9A63',
  greenBg: '#1F2A22',
  greenSoft: '#8FBF9D',
  mono: 'var(--font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace)',
};

const WAREHOUSE_LIMITS = {
  generals: 10,
  tactics: 20,
  supportTactics: 2,
};

const STEPS = [
  { key: 'generals', label: '1. 무장' },
  { key: 'tactics', label: '2. 전법' },
  { key: 'support', label: '3. 지원' },
];

// 선택 전용 카드 (보유 여부 grayscale 없음 — 연무대회 창고는 보유 무관하게 전체 풀에서 선택)
function SelectableCard({ name, subLabel, isSelected, onClick, disabled }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        position: 'relative',
        borderRadius: '8px',
        background: SCROLL.paperMid,
        border: `1px solid ${isSelected ? SCROLL.gold : SCROLL.headerBorder}`,
        padding: '6px 4px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !isSelected ? 0.4 : 1,
      }}
    >
      <div style={{ width: '100%', aspectRatio: '1', borderRadius: '6px', background: SCROLL.headerBorder, marginBottom: '5px' }} />
      <p style={{ margin: 0, fontSize: '11px', color: SCROLL.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</p>
      {subLabel && (
        <p style={{ margin: 0, fontSize: '9px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono }}>{subLabel}</p>
      )}
      {isSelected && (
        <div style={{
          position: 'absolute', top: '3px', right: '3px', width: '14px', height: '14px',
          borderRadius: '50%', background: SCROLL.gold, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '9px', color: SCROLL.paperLight, fontWeight: 700,
        }}>✓</div>
      )}
    </div>
  );
}

export default function YeonmuTab() {
  const { generals = [], tactics = [], selectedGenerals = [], selectedTactics = [] } = useDeckAssets();
  const { warehouse, setWarehouse, isReady, resetWarehouse } = useYeonmuStorage();
  const [step, setStep] = useState('generals');

  const toggleGeneral = (name) => {
    setWarehouse((prev) => {
      const exists = prev.generals.includes(name);
      if (exists) {
        return { ...prev, generals: prev.generals.filter((n) => n !== name) };
      }
      if (prev.generals.length >= WAREHOUSE_LIMITS.generals) return prev;
      return { ...prev, generals: [...prev.generals, name] };
    });
  };

  const toggleTactic = (name) => {
    setWarehouse((prev) => {
      const exists = prev.tactics.includes(name);
      if (exists) {
        return { ...prev, tactics: prev.tactics.filter((n) => n !== name) };
      }
      if (prev.tactics.length >= WAREHOUSE_LIMITS.tactics) return prev;
      return { ...prev, tactics: [...prev.tactics, name] };
    });
  };

  // 3단계 후보: 창고 단계와 달리 "보유한" 장수/전법 중, 이미 창고에 있는 이름은 제외
  const supportGeneralCandidates = useMemo(() => {
    return generals.filter(
      (g) => selectedGenerals.includes(g.id) && !warehouse.generals.includes(g.name)
    );
  }, [generals, selectedGenerals, warehouse.generals]);

  const supportTacticCandidates = useMemo(() => {
    return tactics.filter(
      (t) => selectedTactics.includes(t.id) && !warehouse.tactics.includes(t.name)
    );
  }, [tactics, selectedTactics, warehouse.tactics]);

  if (!isReady) return null;

  return (
    <div style={{ background: SCROLL.bg, minHeight: '100%', padding: '16px' }}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>

        <div style={{ padding: '4px 0 14px' }}>
          <p style={{ fontSize: '11px', color: SCROLL.gold, letterSpacing: '0.05em', margin: '0 0 4px', fontFamily: SCROLL.mono }}>
            SANGUOZHI · YEONMU
          </p>
          <h2 style={{ margin: 0, fontSize: '17px', color: SCROLL.ink }}>창고 입력</h2>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {STEPS.map((s) => (
              <button
                key={s.key}
                onClick={() => setStep(s.key)}
                style={{
                  fontSize: '11px', padding: '5px 10px', borderRadius: '4px', border: `0.5px solid ${SCROLL.border}`,
                  background: step === s.key ? SCROLL.gold : 'transparent',
                  color: step === s.key ? SCROLL.paperLight : SCROLL.inkFaint,
                  fontWeight: step === s.key ? 600 : 400, cursor: 'pointer',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => { if (confirm('이번 주 창고 데이터를 모두 지울까요?')) resetWarehouse(); }}
            style={{ fontSize: '12px', border: `0.5px solid ${SCROLL.border}`, background: 'transparent', color: SCROLL.inkFaint, borderRadius: '6px', padding: '5px 10px' }}
          >
            초기화
          </button>
        </div>

        {step === 'generals' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>무장 10명 선택 (시작 4 + 드래프트 6)</span>
              <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                {warehouse.generals.length} / {WAREHOUSE_LIMITS.generals}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {generals.map((g) => (
                <SelectableCard
                  key={g.id}
                  name={g.name}
                  subLabel={`${g.faction || ''}${g.troop_type ? ' · ' + g.troop_type : ''}`}
                  isSelected={warehouse.generals.includes(g.name)}
                  disabled={warehouse.generals.length >= WAREHOUSE_LIMITS.generals && !warehouse.generals.includes(g.name)}
                  onClick={() => toggleGeneral(g.name)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'tactics' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>전법 20개 선택 (시작 8 + 드래프트 12)</span>
              <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                {warehouse.tactics.length} / {WAREHOUSE_LIMITS.tactics}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {tactics.map((t) => (
                <SelectableCard
                  key={t.id}
                  name={t.name}
                  subLabel={t.grade || ''}
                  isSelected={warehouse.tactics.includes(t.name)}
                  disabled={warehouse.tactics.length >= WAREHOUSE_LIMITS.tactics && !warehouse.tactics.includes(t.name)}
                  onClick={() => toggleTactic(t.name)}
                />
              ))}
            </div>
          </>
        )}

        {step === 'support' && (
          <>
            {/* TODO(다음 작업): 지원 무장 1명 / 전법 2개 후보에 추천 점수·이유 배지를 붙이는 부분은
                아직 점수 로직을 정하지 않아서 후보 목록만 우선 배치해둠.
                supportGeneralCandidates / supportTacticCandidates 는 이미 "보유 + 창고와 중복 제외" 필터까지 적용됨. */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>지원 무장 1명 (보유 목록 중)</span>
                <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                  {warehouse.supportGeneral ? 1 : 0} / 1
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {supportGeneralCandidates.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => setWarehouse((prev) => ({
                      ...prev,
                      supportGeneral: prev.supportGeneral === g.name ? null : g.name,
                    }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px', cursor: 'pointer',
                      background: warehouse.supportGeneral === g.name ? SCROLL.greenBg : SCROLL.paperMid,
                      borderLeft: warehouse.supportGeneral === g.name ? `2px solid ${SCROLL.green}` : '2px solid transparent',
                    }}
                  >
                    <div style={{ width: '34px', height: '34px', borderRadius: '6px', background: SCROLL.headerBorder, flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, flex: 1 }}>{g.name}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: SCROLL.inkFaint }}>지원 전법 2개 (보유 목록 중)</span>
                <span style={{ fontSize: '12px', color: SCROLL.gold, fontFamily: SCROLL.mono }}>
                  {warehouse.supportTactics.length} / {WAREHOUSE_LIMITS.supportTactics}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {supportTacticCandidates.map((t) => {
                  const isSel = warehouse.supportTactics.includes(t.name);
                  const isFull = warehouse.supportTactics.length >= WAREHOUSE_LIMITS.supportTactics;
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isFull && !isSel) return;
                        setWarehouse((prev) => ({
                          ...prev,
                          supportTactics: isSel
                            ? prev.supportTactics.filter((n) => n !== t.name)
                            : [...prev.supportTactics, t.name],
                        }));
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '8px',
                        cursor: isFull && !isSel ? 'not-allowed' : 'pointer',
                        opacity: isFull && !isSel ? 0.4 : 1,
                        background: isSel ? SCROLL.greenBg : SCROLL.paperMid,
                        borderLeft: isSel ? `2px solid ${SCROLL.green}` : '2px solid transparent',
                      }}
                    >
                      <div style={{ width: '30px', height: '30px', borderRadius: '6px', background: SCROLL.headerBorder, flexShrink: 0 }} />
                      <p style={{ margin: 0, fontSize: '12px', color: SCROLL.ink, flex: 1 }}>{t.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}