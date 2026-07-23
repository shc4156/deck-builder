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
        {/* ============================================================
            📜 통합 도감 — 문서형 헤더 (圖鑑錄 / 도감록)
        ============================================================ */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, var(--paper-soft) 0%, var(--paper) 45%, var(--paper-soft) 100%)',
            border: '3px double var(--gold)',
            borderRadius: '6px',
            padding: '30px 36px',
            marginBottom: '24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16), inset 0 0 60px rgba(139,94,52,0.08)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute', inset: '8px', border: '1px solid rgba(139,94,52,0.3)',
            borderRadius: '3px', pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              writingMode: 'vertical-rl', textOrientation: 'upright',
              fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.2em',
              color: 'var(--seal-dark)', flexShrink: 0, lineHeight: 1.3
            }}>
              圖鑑錄
            </div>

            <div>
              <h1 className="classic-heading text-3xl font-bold mb-2" style={{ margin: 0 }}>
                통합 도감
              </h1>
              <p style={{ color: 'var(--ink-text)', opacity: 0.8, marginTop: '10px', fontSize: '1.05rem', fontWeight: 500 }}>
                장수·전법·인연을 한 곳에서 열람하는 기록부입니다.
              </p>
            </div>
          </div>
        </div>

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
              // 이름 → 장수 데이터(얼굴 이미지 포함) 조회용 맵
              const generalByName = {};
              generals.forEach(g => { generalByName[g.name] = g; });

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
                      <div
                        key={synergy.name}
                        className={`synergy-card ${synergy.isComplete ? 'complete' : ''}`}
                        style={{ position: 'relative', overflow: 'hidden' }}
                      >
                        {/* 결성 완료 시 우상단에 큼직한 인장(印) 도장 */}
                        {synergy.isComplete && (
                          <div style={{
                            position: 'absolute', top: '10px', right: '10px',
                            width: '40px', height: '40px', borderRadius: '50%',
                            border: '2px solid var(--seal)', color: 'var(--seal)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.85rem', fontWeight: 900, transform: 'rotate(-12deg)',
                            opacity: 0.85, pointerEvents: 'none'
                          }}>
                            結
                          </div>
                        )}

                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '46px' }}>
                          {synergy.isComplete && <span style={{ color: 'var(--gold)' }}>✔</span>}
                          {synergy.name}
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--seal-dark)', opacity: 0.8 }}>
                            ({synergy.matchedMembers.length}/{synergy.req_count}인 결의)
                          </span>
                        </h3>

                        {/* 구성 무장: 얼굴 썸네일 + 이름 칩 */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                          {synergy.members.map((m) => {
                            const matched = synergy.matchedMembers.includes(m);
                            const gen = generalByName[m];
                            return (
                              <div key={m} style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '3px 9px 3px 3px', borderRadius: '999px',
                                backgroundColor: matched ? 'rgba(166,50,42,0.08)' : 'rgba(43,35,24,0.05)',
                                border: `1px solid ${matched ? 'var(--seal)' : 'rgba(43,35,24,0.18)'}`,
                                opacity: matched ? 1 : 0.55
                              }}>
                                {gen?.image_url ? (
                                  <img
                                    src={gen.image_url}
                                    alt={m}
                                    style={{
                                      width: '24px', height: '24px', borderRadius: '50%',
                                      objectFit: 'cover',
                                      filter: matched ? 'none' : 'grayscale(70%)',
                                      border: `1px solid ${matched ? 'var(--gold)' : 'rgba(43,35,24,0.25)'}`
                                    }}
                                  />
                                ) : (
                                  <span style={{
                                    width: '24px', height: '24px', borderRadius: '50%',
                                    backgroundColor: 'rgba(43,35,24,0.12)', display: 'inline-flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.7rem', color: 'var(--ink-text)'
                                  }}>
                                    {m.charAt(0)}
                                  </span>
                                )}
                                <span style={{
                                  fontSize: '0.85rem',
                                  color: matched ? 'var(--seal-dark)' : 'var(--ink-text)',
                                  fontWeight: matched ? 'bold' : 'normal'
                                }}>
                                  {m}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        <p style={{
                          margin: 0, fontSize: '1.02rem', color: 'var(--ink-text)', fontWeight: 'bold',
                          lineHeight: '1.5', borderTop: '1px dashed rgba(184,147,90,0.4)', paddingTop: '10px'
                        }}>
                          <span style={{ color: 'var(--seal-dark)' }}>인연 효과 · </span>
                          <GlossaryText text={synergy.effect} onTermClick={setGlossaryTerm} />
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