'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import FormationGridVisual from '../components/FormationGridVisual';
import GlossaryText from '../components/GlossaryText';
import GlossaryModal from '../components/GlossaryModal';
import { getActiveSynergiesFromSetup, matchFormationInfo } from '../../data/synergies';
import { findAlternativeTactics } from '../../data/tacticAlternatives';
import { useDeckAssets } from '../../hooks/useDeckAssets';
import { supabase } from '../lib/supabaseClient';

export default function MatchesPage() {
  const {
    generals = [], tactics = [], tierDecks = [], isLoading,
    selectedGenerals = [], selectedTactics = []
  } = useDeckAssets();

  const [deckFilter, setDeckFilter] = useState('all');
  const [glossaryTerm, setGlossaryTerm] = useState(null);
  const [myPinnedDecks, setMyPinnedDecks] = useState([]);

  useEffect(() => {
    async function fetchPinnedDecks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('pinned_decks')
          .eq('id', user.id)
          .single();
        
        if (data?.pinned_decks) {
          setMyPinnedDecks(data.pinned_decks);
        }
      }
    }
    fetchPinnedDecks();
  }, []);

  // 📌 핀 토글
  const togglePin = async (deckId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let newPins = [...myPinnedDecks];
    if (newPins.includes(deckId)) {
      newPins = newPins.filter(id => id !== deckId);
    } else {
      newPins.push(deckId);
    }

    setMyPinnedDecks(newPins);
    await supabase.from('profiles').update({ pinned_decks: newPins }).eq('id', user.id);
  };

  // 🛠️ 메인 전법과 서브/대체 전법을 명확히 분리하여 파싱
  const parseDeckSetup = (deck) => {
    const heroes = [];
    
    const parseJson = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };

    for (let i = 1; i <= 3; i++) {
      const name = deck[`hero${i}_name`]?.trim();
      if (!name) continue;

      const t1Main = deck[`hero${i}_tactic1_main`]?.trim();
      const t1Sub = parseJson(deck[`hero${i}_tactic1_sub`]);
      const t2Main = deck[`hero${i}_tactic2_main`]?.trim();
      const t2Sub = parseJson(deck[`hero${i}_tactic2_sub`]);

      const mainTactics = [t1Main, t2Main].filter(Boolean);
      // DB에 명시된 서브/대체 전법들
      const dbSubTactics = [...t1Sub, ...t2Sub].filter(Boolean);

      heroes.push({
        general_name: name,
        stat_focus: deck[`hero${i}_stat`] || '속성 미정',
        main_tactics: mainTactics,       // 메인 추천 전법
        db_sub_tactics: dbSubTactics,   // DB 등록 대체 전법
        added_tactics: mainTactics,     // 매칭 및 UI 메인 노출용
        arts_of_war: {
          unique: deck[`hero${i}_unique_art_of_war`],
          common: parseJson(deck[`hero${i}_common_art_of_war`])
        },
        equipment_options: parseJson(deck[`hero${i}_equip`])
      });
    }
    return heroes;
  };

  // 📊 매칭률 계산
  const calculateMatch = (deck) => {
    const deckSetup = parseDeckSetup(deck);
    if (deckSetup.length === 0) {
      return { totalPercent: 0, matchedGenCount: 0, matchedTactCount: 0, deckGens: [], deckTactics: [], myGenNames: [], myTactNames: [], parsedSetup: [] };
    }

    const deckGens = deckSetup.map(g => g.general_name);
    // 주요 매칭 대상 전법 (메인 전법 위주로 산정)
    const deckTactics = deckSetup.flatMap(g => g.main_tactics.length > 0 ? g.main_tactics : g.added_tactics);

    const myGenNames = (generals || [])
      .filter(g => (selectedGenerals || []).includes(g.id))
      .map(g => g.name);
    const matchedGenCount = deckGens.filter(name => myGenNames.includes(name)).length;

    const myTactNames = (tactics || [])
      .filter(t => (selectedTactics || []).includes(t.id))
      .map(t => t.name);
    const matchedTactCount = deckTactics.filter(name => myTactNames.includes(name)).length;

    const genScore = (matchedGenCount / 3) * 60; // 장수 보유 점수 60점
    const tactScore = deckTactics.length > 0 ? (matchedTactCount / deckTactics.length) * 40 : 0; // 전법 보유 점수 40점
    const totalPercent = Math.round(genScore + tactScore);

    return {
      totalPercent,
      matchedGenCount,
      matchedTactCount,
      deckGens,
      deckTactics,
      myGenNames,
      myTactNames,
      parsedSetup: deckSetup
    };
  };

  // 📌 핀 고정 우선 정렬
  const filteredDecks = (tierDecks || [])
    .filter(deck => {
      if (deckFilter === 'all') return true;
      return deck.deck_type === deckFilter;
    })
    .map(deck => ({
      ...deck,
      matchInfo: calculateMatch(deck)
    }))
    .sort((a, b) => {
      const aPinned = myPinnedDecks.includes(a.id);
      const bPinned = myPinnedDecks.includes(b.id);

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      return b.matchInfo.totalPercent - a.matchInfo.totalPercent;
    });

  if (isLoading) {
    return (
      <PageLayout>
        <h1 className="classic-title text-3xl font-bold text-center" style={{ marginTop: '80px' }}>
          천하 결전 무장 도감 데이터를 수집하고 있습니다...
        </h1>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <nav className="classic-tabbar" style={{ marginBottom: '35px' }}>
          <Link href="/?tab=my-assets" className="classic-tab">나의 보유 현황</Link>
          <Link href="/?tab=dictionary" className="classic-tab">통합 도감</Link>
          <span className="classic-tab active">티어덱 매칭</span>
          <Link href="/squads" className="classic-tab">1-5군 추천 편성</Link>
        </nav>

        <h1 className="classic-heading text-3xl font-bold mb-2">티어덱 &amp; 개척추천 매칭</h1>
        <p style={{ color: 'var(--gold-soft)', marginBottom: '30px', fontSize: '1.05rem', fontWeight: 500 }}>
          현재 보유하신 막사 자산을 토대로 천하를 호령할 수 있는 최적의 군사 배치를 정렬하여 제안합니다. (📌 핀 고정 시 최상단 고정)
        </p>

        <div className="classic-subtab-bar">
          <button onClick={() => setDeckFilter('all')} className={`classic-subtab ${deckFilter === 'all' ? 'active' : ''}`}>
            전체 전략표 ({tierDecks.length})
          </button>
          <button onClick={() => setDeckFilter('tier')} className={`classic-subtab ${deckFilter === 'tier' ? 'active' : ''}`}>
            종결 티어덱 ({tierDecks.filter(d => d.deck_type === 'tier').length})
          </button>
          <button onClick={() => setDeckFilter('start')} className={`classic-subtab ${deckFilter === 'start' ? 'active' : ''}`}>
            개척 추천덱 ({tierDecks.filter(d => d.deck_type === 'start').length})
          </button>
        </div>

        <div className="deck-general-grid" style={{ marginBottom: '22px' }}>
          {filteredDecks.map(deck => {
            const { totalPercent, myGenNames, myTactNames, parsedSetup } = deck.matchInfo;
            const isStartDeck = deck.deck_type === 'start';
            
            // "0,1,1,1,0,0" 형태의 문자열을 숫자 배열로 파싱
            const formationGrid = deck.formation ? deck.formation.split(',').map(Number) : [];
            const formationInfo = matchFormationInfo(formationGrid);
            const isPinned = myPinnedDecks.includes(deck.id);

            const staticOwnedTactics = parsedSetup.flatMap(g => {
              if (!g.added_tactics) return [];
              return g.added_tactics.filter(tName => myTactNames.includes(tName));
            });

            const dynamicUsedTactics = [...staticOwnedTactics];

            return (
              <div 
                key={deck.id} 
                className="scroll-panel" 
                style={{ 
                  padding: '28px', 
                  position: 'relative',
                  border: isPinned ? '2px solid var(--gold)' : '1px solid rgba(184,147,90,0.25)',
                  boxShadow: isPinned ? '0 0 10px rgba(184,147,90,0.2)' : 'none'
                }}
              >
                {/* 📌 핀 버튼 영역 */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(deck.id);
                  }}
                  style={{ 
                    position: 'absolute', top: '24px', left: '24px', 
                    fontSize: '1.5rem', cursor: 'pointer', background: 'transparent', border: 'none', zIndex: 10,
                    filter: isPinned ? 'none' : 'grayscale(100%) opacity(0.6)'
                  }}
                  title={isPinned ? "고정 해제" : "최상단 고정"}
                >
                  📌
                </button>

                <div style={{ position: 'absolute', top: '24px', right: '28px', textAlign: 'right' }}>
                  <span style={{
                    padding: '5px 10px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--paper-soft)',
                    backgroundColor: isStartDeck ? 'var(--jade)' : 'var(--seal)', marginRight: '14px', verticalAlign: 'middle', letterSpacing: '1px'
                  }}>
                    {isStartDeck ? '개척추천' : '종결진격'}
                  </span>
                  <span style={{
                    fontSize: '2.1rem', fontWeight: '900', verticalAlign: 'middle', fontFamily: 'var(--font-display)',
                    color: totalPercent >= 85 ? 'var(--seal)' : totalPercent >= 60 ? 'var(--gold)' : 'var(--ink-text)'
                  }}>
                    {totalPercent}%
                  </span>
                </div>

                {/* 덱 이름 & 설명 */}
                <h3 className="deck-title classic-heading" style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '6px', borderBottom: '2px solid var(--gold)', paddingBottom: '6px', width: '65%', paddingLeft: '35px' }}>
                  {deck.deck_name}
                </h3>
                {deck.description && (
                  <p style={{ color: 'var(--seal-dark)', fontSize: '0.95rem', marginBottom: '14px', paddingLeft: '35px', fontWeight: 'bold' }}>
                    {deck.description}
                  </p>
                )}
                
                {/* 인연 정보 */}
                <div style={{ margin: '15px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getActiveSynergiesFromSetup(parsedSetup).map((s, idx) => (
                    <span key={idx} style={{
                      padding: '4px 10px',
                      backgroundColor: 'rgba(166, 50, 42, 0.08)',
                      border: '1px solid var(--seal)',
                      color: 'var(--seal-dark)',
                      fontSize: '0.85rem',
                      fontWeight: '900'
                    }}>
                      [{s.name}] <GlossaryText text={s.effect} onTermClick={setGlossaryTerm} />
                    </span>
                  ))}
                </div>

                {/* 진형 정보 */}
                <div style={{ marginBottom: '25px', fontSize: '1.05rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--paper-soft)', padding: '14px 20px', border: '1px solid rgba(184,147,90,0.35)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ backgroundColor: 'var(--seal)', padding: '4px 10px', fontWeight: 'bold', color: 'var(--paper-soft)', fontSize: '0.85rem' }}>추천 군진</span>
                      <span style={{ fontWeight: '900', color: 'var(--seal-dark)', fontSize: '1.2rem' }}>{formationInfo.name}</span>
                    </div>
                    <div style={{ fontSize: '1.05rem', color: 'var(--ink-text)', fontWeight: 'bold', marginTop: '4px', paddingLeft: '2px' }}>
                      군진효과: {formationInfo.effect}
                    </div>
                  </div>
                  <FormationGridVisual gridData={formationGrid} />
                </div>

                {/* 장수 카드 3인 목록 */}
                <div className="deck-general-grid" style={{ marginBottom: '22px' }}>
                  {parsedSetup.map((gSetup, idx) => {
                    const isGenOwned = myGenNames.includes(gSetup.general_name);
                    const matchedGeneralData = generals.find(g => g.name === gSetup.general_name);
                    const dbImageUrl = matchedGeneralData?.image_url || '/images/generals/default.jpg';

                    return (
                      <div
                        key={idx}
                        style={{
                          border: isGenOwned ? '3px solid var(--seal)' : '1px dashed rgba(184,147,90,0.4)',
                          padding: '16px',
                          backgroundColor: isGenOwned ? 'var(--paper-soft)' : 'rgba(232,220,192,0.5)',
                          filter: isGenOwned ? 'none' : 'grayscale(60%)',
                          opacity: isGenOwned ? 1 : 0.75,
                          display: 'flex',
                          flexDirection: 'column',
                          justify: 'space-between'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                            <div style={{ width: '55px', height: '50px', overflow: 'hidden', backgroundColor: 'var(--paper)', border: '2px solid var(--gold)', flexShrink: 0 }}>
                              <img src={dbImageUrl} alt={gSetup.general_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/images/generals/default.jpg'; }} />
                            </div>
                            <div>
                              <span style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--ink-text)', letterSpacing: '0.5px' }}>
                                {gSetup.general_name}
                              </span>
                              <div style={{ fontSize: '0.88rem', color: 'var(--paper-soft)', marginTop: '5px', fontWeight: 'bold', backgroundColor: 'var(--ink-text)', padding: '2px 7px', width: 'fit-content' }}>
                                속성: {gSetup.stat_focus}
                              </div>
                            </div>
                          </div>

                          {/* 추천 전법 영역 */}
                          <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '12px', marginBottom: '14px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '0.5px' }}>추천 전법</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {gSetup.added_tactics && gSetup.added_tactics.map((tName, tIdx) => {
                                const isTacticOwnedInProfile = myTactNames.includes(tName);
                                const matchedTacticData = tactics.find(t => t.name === tName);
                                if (isTacticOwnedInProfile) dynamicUsedTactics.push(tName);

                                return (
                                  <div key={tIdx} style={{ marginBottom: '4px' }}>
                                    <div style={{
                                      padding: '7px 12px', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                      backgroundColor: isTacticOwnedInProfile ? 'rgba(63,93,84,0.12)' : 'rgba(43,35,24,0.05)',
                                      color: isTacticOwnedInProfile ? 'var(--jade)' : 'rgba(43,35,24,0.55)',
                                      border: isTacticOwnedInProfile ? '2px solid var(--jade)' : '2px solid rgba(43,35,24,0.2)'
                                    }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {matchedTacticData?.image_url && (
                                          <img
                                            src={matchedTacticData.image_url}
                                            alt={tName}
                                            style={{ width: '22px', height: '30px', objectFit: 'cover', border: '1px solid var(--gold)' }}
                                          />
                                        )}
                                        {tName}
                                      </span>
                                      <span style={{ fontSize: '0.85rem' }}>{isTacticOwnedInProfile ? '✓' : '✗'}</span>
                                    </div>

                                    {!isTacticOwnedInProfile && (
                                      <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginTop: '6px', paddingLeft: '6px', fontWeight: 'bold', backgroundColor: 'rgba(166,50,42,0.08)', padding: '4px', borderLeft: '3px solid var(--seal)' }}>
                                        {(() => {
                                          const alts = findAlternativeTactics({
                                            generalName: gSetup.general_name,
                                            recommendedTacticName: tName,
                                            tactics,
                                            generals,
                                            selectedTactics,
                                            usedTacticsInDeck: dynamicUsedTactics,
                                          });
                                          if (alts.length > 0) {
                                            dynamicUsedTactics.push(alts[0]);
                                            return `대체 전법 제안: ${alts.join(', ')}`;
                                          }
                                          return '대체 가능 전법 자산 없음';
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 권장 병법 영역 */}
                          {!isStartDeck && gSetup.arts_of_war && (
                            <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '10px', marginBottom: '4px' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--ink-text)', fontWeight: 'bold', marginBottom: '6px' }}>권장 병법</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {gSetup.arts_of_war.unique && (
                                  <div style={{ padding: '4px 8px', fontSize: '0.85rem', backgroundColor: 'rgba(184,147,90,0.18)', border: '2px solid var(--gold)', color: 'var(--seal-dark)', fontWeight: 'bold', width: 'fit-content' }}>
                                    고유: {gSetup.arts_of_war.unique}
                                  </div>
                                )}
                                {gSetup.arts_of_war.common && gSetup.arts_of_war.common.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {gSetup.arts_of_war.common.map((warName, wIdx) => (
                                      <span key={wIdx} className="recommend-tag" style={{ fontSize: '0.82rem' }}>
                                        {warName}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 장비 추천 속성 가이드 */}
                <div style={{
                  borderTop: '2px solid var(--gold)',
                  fontSize: '0.95rem',
                  backgroundColor: 'var(--paper-soft)',
                  padding: '14px 18px',
                  marginTop: '10px'
                }}>
                  <span style={{ fontWeight: 'bold', color: 'var(--seal-dark)', display: 'block', marginBottom: '8px', fontSize: '1.05rem' }}>
                    장비 추천 속성 가이드
                  </span>
                  <div style={{ color: 'var(--ink-text)', lineHeight: '1.5', display: 'flex', flexWrap: 'wrap', gap: '20px', fontWeight: 'bold' }}>
                    {parsedSetup.map((g, i) => (
                      <div key={i}>
                        <span style={{ color: 'var(--seal-dark)' }}>{g.general_name}</span>: {g.equipment_options && g.equipment_options.length > 0 ? g.equipment_options.join(' / ') : '속성 조율 중'}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <GlossaryModal term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
    </PageLayout>
  );
}