// app/matches/page.js
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
<<<<<<< HEAD
import { supabase } from '../lib/supabaseClient'; // Supabase 임포트 확인

export default function MatchesPage() {
  const {
    generals, tactics, tierDecks, isLoading,
    selectedGenerals, selectedTactics
  } = useDeckAssets();

  const [deckFilter, setDeckFilter] = useState('all');
  const [glossaryTerm, setGlossaryTerm] = useState(null);
  const [myPinnedDecks, setMyPinnedDecks] = useState([]); 
=======
import { supabase } from '../lib/supabaseClient';

function normalizeDeck(deck) {
  const heroes = [1, 2, 3].map(num => {
    const name = deck[`hero${num}_name`];
    if (!name) return null;

    const t1Main = deck[`hero${num}_tactic1_main`];
    const t1Sub = deck[`hero${num}_tactic1_sub`] || [];
    const t2Main = deck[`hero${num}_tactic2_main`];
    const t2Sub = deck[`hero${num}_tactic2_sub`] || [];

    return {
      general_name: name,
      stat_focus: deck[`hero${num}_stat`] || '',
      tactics: [
        { main: t1Main, sub: t1Sub },
        { main: t2Main, sub: t2Sub }
      ].filter(t => t.main),
      added_tactics: [t1Main, ...t1Sub, t2Main, ...t2Sub].filter(Boolean),
      arts_of_war: {
        unique: deck[`hero${num}_unique_art_of_war`] || null,
        common: deck[`hero${num}_common_art_of_war`] || []
      },
      equipment_options: deck[`hero${num}_equip`] || []
    };
  }).filter(Boolean);

  return {
    ...deck,
    tier_name: deck.deck_name,
    description: deck.description,
    deck_setup: heroes,
    formation_grid: deck.formation ? deck.formation.split(',').map(Number) : [0, 0, 0, 0, 0, 0]
  };
}

export default function MatchesPage() {
  const {
    generals, tactics, tierDecks: rawTierDecks, isLoading,
    selectedGenerals, selectedTactics
  } = useDeckAssets();

  const [glossaryTerm, setGlossaryTerm] = useState(null);
  const [myPinnedDecks, setMyPinnedDecks] = useState([]);

  const tierDecks = (rawTierDecks || []).map(normalizeDeck);
>>>>>>> d4eb085 (전체 수정)

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
<<<<<<< HEAD
          setMyPinnedDecks(data.pinned_decks);
=======
          setMyPinnedDecks(data.pinned_decks.map(Number));
>>>>>>> d4eb085 (전체 수정)
        }
      }
    }
    fetchPinnedDecks();
  }, []);

<<<<<<< HEAD
  // 대체 전법 탐색은 data/tacticAlternatives.js의 findAlternativeTactics로 공용화됨.
  // (utils/squadEngine.js의 1-5군 자동편성에서도 동일 함수를 사용 — 매칭 페이지가
  // 보여주는 "대체 전법 제안"과 실제 스쿼드에 배정되는 전법이 항상 같은 결과를 내도록 통일)

  // 핀 토글 및 즉각 업데이트
=======
>>>>>>> d4eb085 (전체 수정)
  const togglePin = async (deckId) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

<<<<<<< HEAD
    let newPins = [...myPinnedDecks];
    
    if (newPins.includes(deckId)) {
      newPins = newPins.filter(id => id !== deckId);
    } else {
      newPins.push(deckId);
    }

    setMyPinnedDecks(newPins);
    await supabase.from('profiles').update({ pinned_decks: newPins }).eq('id', user.id);
  };

  // 매칭률 계산
=======
    const numericDeckId = Number(deckId);
    let newPins = [...myPinnedDecks].map(Number);

    if (newPins.includes(numericDeckId)) {
      newPins = newPins.filter(id => id !== numericDeckId);
    } else {
      newPins.push(numericDeckId);
    }

    setMyPinnedDecks(newPins);

    const { error } = await supabase
      .from('profiles')
      .update({ pinned_decks: newPins })
      .eq('id', user.id);

    if (error) {
      console.error('핀 상태 저장 오류:', error);
    }
  };

>>>>>>> d4eb085 (전체 수정)
  const calculateMatch = (deck) => {
    if (!deck.deck_setup || !Array.isArray(deck.deck_setup)) {
      return { totalPercent: 0, matchedGenCount: 0, matchedTactCount: 0, deckGens: [], deckTactics: [], myGenNames: [], myTactNames: [] };
    }

    const deckGens = deck.deck_setup.map(g => g.general_name);
<<<<<<< HEAD
    const deckTactics = deck.deck_setup.flatMap(g => g.added_tactics || []);
=======
    const deckTactics = deck.deck_setup.flatMap(g => g.tactics.map(t => t.main)).filter(Boolean);
>>>>>>> d4eb085 (전체 수정)

    const myGenNames = generals
      .filter(g => selectedGenerals.includes(g.id))
      .map(g => g.name);
    const matchedGenCount = deckGens.filter(name => myGenNames.includes(name)).length;

    const myTactNames = tactics
      .filter(t => selectedTactics.includes(t.id))
      .map(t => t.name);
    const matchedTactCount = deckTactics.filter(name => myTactNames.includes(name)).length;

    const genScore = (matchedGenCount / 3) * 50;
    const tactScore = deckTactics.length > 0 ? (matchedTactCount / deckTactics.length) * 50 : 0;
    const totalPercent = Math.round(genScore + tactScore);

    return {
      totalPercent,
      matchedGenCount,
      matchedTactCount,
      deckGens,
      deckTactics,
      myGenNames,
      myTactNames
    };
  };

<<<<<<< HEAD
  // ★ 핵심 정렬 변경: 핀 찍은 덱(Pinned)은 매칭 점수와 관계없이 0순위로 맨 위에 정렬
  const filteredDecks = tierDecks
    .filter(deck => {
      if (deckFilter === 'all') return true;
      return deck.deck_type === deckFilter;
    })
=======
  const filteredDecks = tierDecks
>>>>>>> d4eb085 (전체 수정)
    .map(deck => ({
      ...deck,
      matchInfo: calculateMatch(deck)
    }))
    .sort((a, b) => {
<<<<<<< HEAD
      const aPinned = myPinnedDecks.includes(a.id);
      const bPinned = myPinnedDecks.includes(b.id);

      // 1. 둘 다 핀 상태가 다를 때: 핀된 덱을 무조건 최상단으로 정렬
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // 2. 둘 다 핀 상태가 같을 때(둘 다 핀이거나, 둘 다 아니거나): 기존 매칭률 점수 순으로 정렬
=======
      const aPinned = myPinnedDecks.includes(Number(a.id));
      const bPinned = myPinnedDecks.includes(Number(b.id));

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

>>>>>>> d4eb085 (전체 수정)
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
<<<<<<< HEAD
  <Link href="/?tab=my-assets" className="classic-tab">나의 보유 현황</Link>
  <Link href="/?tab=dictionary" className="classic-tab">통합 도감</Link>
  <span className="classic-tab active">티어덱 매칭</span>
  {/* ★ /?tab=auto-squad 에서 /squads 로 경로 직접 수정 */}
  <Link href="/squads" className="classic-tab">1-5군 추천 편성</Link>
</nav>

        <h1 className="classic-heading text-3xl font-bold mb-2">티어덱 &amp; 개척추천 매칭</h1>
=======
          <Link href="/?tab=my-assets" className="classic-tab">나의 보유 현황</Link>
          <Link href="/?tab=dictionary" className="classic-tab">통합 도감</Link>
          <span className="classic-tab active">티어덱 매칭</span>
          <Link href="/squads" className="classic-tab">1-5군 추천 편성</Link>
        </nav>

        <h1 className="classic-heading text-3xl font-bold mb-2">티어덱 매칭</h1>
>>>>>>> d4eb085 (전체 수정)
        <p style={{ color: 'var(--gold-soft)', marginBottom: '30px', fontSize: '1.05rem', fontWeight: 500 }}>
          현재 보유하신 막사 자산을 토대로 천하를 호령할 수 있는 최적의 군사 배치를 정렬하여 제안합니다. (📌 핀 고정 시 최상단 고정)
        </p>

<<<<<<< HEAD
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
=======
        <div style={{ marginBottom: '20px', color: 'var(--gold-soft)', fontSize: '1.1rem', fontWeight: 'bold' }}>
          전체 추천 전략 ({tierDecks.length})
>>>>>>> d4eb085 (전체 수정)
        </div>

        <div className="deck-general-grid" style={{ marginBottom: '22px' }}>
          {filteredDecks.map(deck => {
            const { totalPercent, myGenNames, myTactNames } = deck.matchInfo;
<<<<<<< HEAD
            const isStartDeck = deck.deck_type === 'start';
            const formationInfo = matchFormationInfo(deck.formation_grid);
            const isPinned = myPinnedDecks.includes(deck.id);

            const staticOwnedTactics = deck.deck_setup.flatMap(g => {
              if (!g.added_tactics) return [];
              return g.added_tactics.filter(tName => myTactNames.includes(tName));
            });

=======
            const formationInfo = matchFormationInfo(deck.formation_grid);
            const isPinned = myPinnedDecks.includes(Number(deck.id));

            const staticOwnedTactics = deck.deck_setup.flatMap(g => 
              g.added_tactics.filter(tName => myTactNames.includes(tName))
            );
>>>>>>> d4eb085 (전체 수정)
            const dynamicUsedTactics = [...staticOwnedTactics];

            return (
              <div 
                key={deck.id} 
                className="scroll-panel" 
                style={{ 
                  padding: '28px', 
                  position: 'relative',
<<<<<<< HEAD
                  // ★ 핀 고정된 카드는 연한 황금빛 배경 테두리로 감싸 시각적 만족도를 높임
=======
>>>>>>> d4eb085 (전체 수정)
                  border: isPinned ? '2px solid var(--gold)' : '1px solid rgba(184,147,90,0.25)',
                  boxShadow: isPinned ? '0 0 10px rgba(184,147,90,0.2)' : 'none'
                }}
              >
<<<<<<< HEAD
                {/* 📌 핀 버튼 영역 */}
=======
>>>>>>> d4eb085 (전체 수정)
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
<<<<<<< HEAD
                    padding: '5px 10px', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--paper-soft)',
                    backgroundColor: isStartDeck ? 'var(--jade)' : 'var(--seal)', marginRight: '14px', verticalAlign: 'middle', letterSpacing: '1px'
                  }}>
                    {isStartDeck ? '개척추천' : '종결진격'}
                  </span>
                  <span style={{
=======
>>>>>>> d4eb085 (전체 수정)
                    fontSize: '2.1rem', fontWeight: '900', verticalAlign: 'middle', fontFamily: 'var(--font-display)',
                    color: totalPercent >= 85 ? 'var(--seal)' : totalPercent >= 60 ? 'var(--gold)' : 'var(--ink-text)'
                  }}>
                    {totalPercent}%
                  </span>
                </div>

<<<<<<< HEAD
                {/* 타이틀 왼쪽 패딩을 주어 핀 아이콘과 안 겹치게 조정 */}
                <h3 className="deck-title classic-heading" style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '14px', borderBottom: '2px solid var(--gold)', paddingBottom: '6px', width: '65%', paddingLeft: '35px' }}>
                  {deck.tier_name}
                </h3>
=======
                <h3 className="deck-title classic-heading" style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '8px', borderBottom: '2px solid var(--gold)', paddingBottom: '6px', width: '65%', paddingLeft: '35px' }}>
                  {deck.tier_name}
                </h3>

                {deck.description && (
                  <p style={{ color: 'var(--gold-soft)', paddingLeft: '35px', marginBottom: '14px', fontSize: '0.95rem' }}>
                    ※ {deck.description}
                  </p>
                )}
>>>>>>> d4eb085 (전체 수정)
                
                <div style={{ margin: '15px 0', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {getActiveSynergiesFromSetup(deck.deck_setup).map((s, idx) => (
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
                  <FormationGridVisual gridData={deck.formation_grid} />
                </div>

                <div className="deck-general-grid" style={{ marginBottom: '22px' }}>
                  {deck.deck_setup.map((gSetup, idx) => {
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
                          justifyContent: 'space-between'
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

                          <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '12px', marginBottom: '14px' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '0.5px' }}>추천 전법</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
<<<<<<< HEAD
                              {gSetup.added_tactics && gSetup.added_tactics.map((tName, tIdx) => {
                                const isTacticOwnedInProfile = myTactNames.includes(tName);
                                const matchedTacticData = tactics.find(t => t.name === tName);
                                if (isTacticOwnedInProfile) dynamicUsedTactics.push(tName);
=======
                              {gSetup.tactics.map((tGroup, tIdx) => {
                                const mainName = tGroup.main;
                                const isOwned = myTactNames.includes(mainName);
                                const matchedTacticData = tactics.find(t => t.name === mainName);
                                if (isOwned) dynamicUsedTactics.push(mainName);
>>>>>>> d4eb085 (전체 수정)

                                return (
                                  <div key={tIdx} style={{ marginBottom: '4px' }}>
                                    <div style={{
                                      padding: '7px 12px', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
<<<<<<< HEAD
                                      backgroundColor: isTacticOwnedInProfile ? 'rgba(63,93,84,0.12)' : 'rgba(43,35,24,0.05)',
                                      color: isTacticOwnedInProfile ? 'var(--jade)' : 'rgba(43,35,24,0.55)',
                                      border: isTacticOwnedInProfile ? '2px solid var(--jade)' : '2px solid rgba(43,35,24,0.2)'
=======
                                      backgroundColor: isOwned ? 'rgba(63,93,84,0.12)' : 'rgba(43,35,24,0.05)',
                                      color: isOwned ? 'var(--jade)' : 'rgba(43,35,24,0.55)',
                                      border: isOwned ? '2px solid var(--jade)' : '2px solid rgba(43,35,24,0.2)'
>>>>>>> d4eb085 (전체 수정)
                                    }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {matchedTacticData?.image_url && (
                                          <img
                                            src={matchedTacticData.image_url}
<<<<<<< HEAD
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
=======
                                            alt={mainName}
                                            style={{ width: '22px', height: '30px', objectFit: 'cover', border: '1px solid var(--gold)' }}
                                          />
                                        )}
                                        {mainName}
                                      </span>
                                      <span style={{ fontSize: '0.85rem' }}>{isOwned ? '✓' : '✗'}</span>
                                    </div>

                                    {!isOwned && (
                                      <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginTop: '6px', paddingLeft: '6px', fontWeight: 'bold', backgroundColor: 'rgba(166,50,42,0.08)', padding: '4px', borderLeft: '3px solid var(--seal)' }}>
                                        {tGroup.sub && tGroup.sub.length > 0 ? (
                                          `대체 전법: ${tGroup.sub.join(', ')}`
                                        ) : (() => {
                                          const alts = findAlternativeTactics({
                                            generalName: gSetup.general_name,
                                            recommendedTacticName: mainName,
>>>>>>> d4eb085 (전체 수정)
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

<<<<<<< HEAD
                          {!isStartDeck && gSetup.arts_of_war && (
=======
                          {gSetup.arts_of_war && (
>>>>>>> d4eb085 (전체 수정)
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
                    {deck.deck_setup.map((g, i) => (
                      <div key={i}>
<<<<<<< HEAD
                        <span style={{ color: 'var(--seal-dark)' }}>{g.general_name}</span>: {g.equipment_options ? g.equipment_options.join(' / ') : '속성 조율 중'}
=======
                        <span style={{ color: 'var(--seal-dark)' }}>{g.general_name}</span>: {g.equipment_options && g.equipment_options.length > 0 ? g.equipment_options.join(' / ') : '속성 조율 중'}
>>>>>>> d4eb085 (전체 수정)
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
<<<<<<< HEAD
}
=======
}
>>>>>>> d4eb085 (전체 수정)
