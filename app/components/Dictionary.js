'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import GeneralCard from './GeneralCard';
import TacticCard from './TacticCard';
import { inferGeneralRole, inferTacticRole, findRecommendedGenerals } from '../../data/roleInference';
import GlossaryText from './GlossaryText';
import GlossaryModal from './GlossaryModal';

export default function Dictionary({ generals, tactics, activeSynergies, selectedGenerals, selectedTactics }) {
  const [glossaryTerm, setGlossaryTerm] = useState(null);
  const [dictSubTab, setDictSubTab] = useState('generals');
  const [detailGeneral, setDetailGeneral] = useState(null);
  const [detailTactic, setDetailTactic] = useState(null);
  const [synergyMaster, setSynergyMaster] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    async function loadSynergies() {
      const { data } = await supabase
        .from('synergies')
        .select('name, req_count, members, effect')
        .order('name', { ascending: true });
      if (data) setSynergyMaster(data);
    }
    loadSynergies();
  }, []);

  // 상세 패널 내용물 (장수)
  const renderGeneralDetail = () => (
    detailGeneral ? (
      <>
        {detailGeneral.image_url && (
          <img
            src={detailGeneral.image_url}
            alt={detailGeneral.name}
            style={{ width: '100%', maxWidth: '220px', display: 'block', margin: '0 auto 12px auto', border: '2px solid var(--gold)' }}
          />
        )}
        <h3 className="classic-heading" style={{ margin: '0 0 6px 0', fontSize: '1.4rem' }}>{detailGeneral.name}</h3>
        <p style={{ margin: '0 0 4px 0', color: 'var(--ink-text)', fontWeight: 'bold' }}>
          {detailGeneral.faction} · {detailGeneral.position} · {detailGeneral.troop_type || '병종 정보없음'}
        </p>
        <span className="role-badge">
          역할: {inferGeneralRole(detailGeneral)}
        </span>
        <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '10px', marginBottom: '10px' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--seal-dark)', marginBottom: '4px' }}>
            고유전법: {detailGeneral.unique_tactic_name || '정보없음'}
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ink-text)', lineHeight: '1.5' }}>
            {detailGeneral.unique_tactic_effect
              ? <GlossaryText text={detailGeneral.unique_tactic_effect} onTermClick={setGlossaryTerm} />
              : '고유전법 설명이 등록되지 않았습니다.'}
          </p>
        </div>
        {detailGeneral.unique_arts && Object.keys(detailGeneral.unique_arts).length > 0 && (
          <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '10px' }}>
            <div style={{ fontWeight: 'bold', color: 'var(--seal-dark)', marginBottom: '4px' }}>고유병법</div>
            {Object.entries(detailGeneral.unique_arts).map(([artName, artDesc]) => (
              <div key={artName} style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold', color: 'var(--ink-text)', fontSize: '0.9rem' }}>{artName}</div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--ink-text)', lineHeight: '1.5' }}>
                  <GlossaryText text={String(artDesc)} onTermClick={setGlossaryTerm} />
                </p>
              </div>
            ))}
          </div>
        )}
      </>
    ) : (
      <p style={{ color: 'var(--ink-text)', opacity: 0.6 }}>장수 카드를 클릭하면 상세 정보가 여기에 표시됩니다.</p>
    )
  );

  // 상세 패널 내용물 (전법)
  const renderTacticDetail = () => (
    detailTactic ? (
      <>
        {detailTactic.image_url && (
          <img
            src={detailTactic.image_url}
            alt={detailTactic.name}
            style={{ width: '100%', maxWidth: '220px', display: 'block', margin: '0 auto 12px auto', border: '2px solid var(--gold)' }}
          />
        )}
        <h3 className="classic-heading" style={{ margin: '0 0 6px 0', fontSize: '1.4rem' }}>{detailTactic.name}</h3>
        <span className="role-badge">
          계열: {inferTacticRole(detailTactic)}
        </span>
        <p style={{ margin: '0 0 14px 0', fontSize: '0.95rem', color: 'var(--ink-text)', lineHeight: '1.5' }}>
          {detailTactic.description
            ? <GlossaryText text={detailTactic.description} onTermClick={setGlossaryTerm} />
            : '전법 설명이 등록되지 않았습니다.'}
        </p>
        <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '10px' }}>
          <div style={{ fontWeight: 'bold', color: 'var(--seal-dark)', marginBottom: '8px' }}>추천 장수</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {findRecommendedGenerals(detailTactic, generals).length > 0 ? (
              findRecommendedGenerals(detailTactic, generals).map(g => (
                <span key={g.id} className="recommend-tag">{g.name}</span>
              ))
            ) : (
              <span style={{ color: 'var(--ink-text)', opacity: 0.6, fontSize: '0.9rem' }}>계열이 일치하는 장수를 찾지 못했습니다.</span>
            )}
          </div>
        </div>
      </>
    ) : (
      <p style={{ color: 'var(--ink-text)', opacity: 0.6 }}>전법 카드를 클릭하면 상세 정보가 여기에 표시됩니다.</p>
    )
  );

  const closeModal = () => {
    setDetailGeneral(null);
    setDetailTactic(null);
  };

  return (
    <>
      <div>
        <h1 className="classic-heading text-3xl font-bold mb-4">통합 도감</h1>

        <div className="classic-subtab-bar">
          <button onClick={() => setDictSubTab('generals')} className={`classic-subtab ${dictSubTab === 'generals' ? 'active' : ''}`}>장수도감</button>
          <button onClick={() => setDictSubTab('tactics')} className={`classic-subtab ${dictSubTab === 'tactics' ? 'active' : ''}`}>전법도감</button>
          <button onClick={() => setDictSubTab('synergies')} className={`classic-subtab ${dictSubTab === 'synergies' ? 'active' : ''}`}>인연도감</button>
        </div>

        {/* 장수도감 */}
        {dictSubTab === 'generals' && (
          <div className="dict-layout">
            <div className="dict-card-grid">
              {generals.map(gen => (
                <GeneralCard
                  key={gen.id}
                  general={gen}
                  isSelected={selectedGenerals.includes(gen.id)}
                  onSelect={(g) => setDetailGeneral(g)}
                />
              ))}
            </div>

            {/* 데스크탑: 사이드 패널 그대로 유지 */}
            {!isMobile && (
              <div className="scroll-panel" style={{ position: 'sticky', top: '20px', minHeight: '300px' }}>
                {renderGeneralDetail()}
              </div>
            )}
          </div>
        )}

        {/* 전법도감 */}
        {dictSubTab === 'tactics' && (
          <div className="dict-layout">
            <div className="dict-card-grid">
              {tactics.map(t => (
                <TacticCard
                  key={t.id}
                  tactic={t}
                  isSelected={selectedTactics.includes(t.id)}
                  onSelect={(tac) => setDetailTactic(tac)}
                />
              ))}
            </div>

            {!isMobile && (
              <div className="scroll-panel" style={{ position: 'sticky', top: '20px', minHeight: '300px' }}>
                {renderTacticDetail()}
              </div>
            )}
          </div>
        )}

        {/* 인연도감 */}
        {dictSubTab === 'synergies' && (
          <section className="scroll-panel">
            {(() => {
              const selectedNames = generals
                .filter(g => selectedGenerals.includes(g.id))
                .map(g => g.name);

              const synergyStatus = synergyMaster.map(s => {
                const matchedMembers = s.members.filter(m => selectedNames.includes(m));
                return { ...s, matchedMembers, isComplete: matchedMembers.length >= s.req_count };
              });

              synergyStatus.sort((a, b) => {
                if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
                return b.matchedMembers.length - a.matchedMembers.length;
              });

              const completeCount = synergyStatus.filter(s => s.isComplete).length;

              return (
                <>
                  <h2 className="classic-heading text-2xl font-bold mb-4">
                    인연 목록 ({completeCount}/{synergyStatus.length}개 결성됨)
                  </h2>
                  <div className="synergy-grid">
                    {synergyStatus.map(synergy => (
                      <div key={synergy.name} className={`synergy-card ${synergy.isComplete ? 'complete' : ''}`}>
                        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {synergy.isComplete && <span style={{ color: 'var(--gold)' }}>✔</span>}
                          {synergy.name} ({synergy.matchedMembers.length}/{synergy.req_count}인 결의)
                        </h3>
                        <p style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--ink-text)', fontWeight: '600' }}>
                          구성 무장: {synergy.members.map((m, i) => (
                            <span key={m} style={{
                              color: synergy.matchedMembers.includes(m) ? 'var(--seal-dark)' : 'var(--ink-text)',
                              opacity: synergy.matchedMembers.includes(m) ? 1 : 0.55,
                              fontWeight: synergy.matchedMembers.includes(m) ? 'bold' : 'normal'
                            }}>
                              {m}{i < synergy.members.length - 1 ? ', ' : ''}
                            </span>
                          ))}
                        </p>
                        <p style={{ margin: '0', fontSize: '1.05rem', color: 'var(--ink-text)', fontWeight: 'bold', lineHeight: '1.4' }}>
                          인연 효과: <GlossaryText text={synergy.effect} onTermClick={setGlossaryTerm} />
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </section>
        )}
      </div>

      {/* 모바일: 상세정보를 화면 중앙 모달로 */}
      {isMobile && (detailGeneral || detailTactic) && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="scroll-panel"
            style={{
              maxHeight: '85vh', overflowY: 'auto', width: '100%', maxWidth: '420px',
              position: 'relative'
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: 'absolute', top: '10px', right: '10px',
                background: 'var(--seal)', color: 'var(--paper-soft)',
                border: 'none', width: '32px', height: '32px', borderRadius: '50%',
                fontSize: '1.1rem', cursor: 'pointer', zIndex: 10
              }}
            >
              ✕
            </button>
            {dictSubTab === 'generals' ? renderGeneralDetail() : renderTacticDetail()}
          </div>
        </div>
      )}

      <GlossaryModal term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
    </>
  );
}