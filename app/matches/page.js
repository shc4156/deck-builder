// app/matches/page.js
'use client';
import { useState, useEffect, useMemo } from 'react';
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
  const { generals, tactics, tierDecks, isLoading, selectedGenerals, selectedTactics } = useDeckAssets();

  const [deckFilter, setDeckFilter] = useState('all');
  const [glossaryTerm, setGlossaryTerm] = useState(null);
  const [myPinnedDecks, setMyPinnedDecks] = useState([]);

  // 핀 불러오기
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

  // deck_setup 안전 파싱
  const parsedTierDecks = useMemo(() => {
    return tierDecks.map(deck => ({
      ...deck,
      deck_setup: typeof deck.deck_setup === 'string' 
        ? JSON.parse(deck.deck_setup) 
        : (Array.isArray(deck.deck_setup) ? deck.deck_setup : [])
    }));
  }, [tierDecks]);

  const calculateMatch = (deck) => {
    if (!deck.deck_setup?.length) return { totalPercent: 0 };

    const deckGens = deck.deck_setup.map(g => g.general_name);
    const deckTactics = deck.deck_setup.flatMap(g => g.added_tactics || []);

    const myGenNames = generals
      .filter(g => selectedGenerals.includes(g.id))
      .map(g => g.name);

    const myTactNames = tactics
      .filter(t => selectedTactics.includes(t.id))
      .map(t => t.name);

    const matchedGen = deckGens.filter(name => myGenNames.includes(name)).length;
    const matchedTact = deckTactics.filter(name => myTactNames.includes(name)).length;

    const genScore = (matchedGen / 3) * 50;
    const tactScore = deckTactics.length ? (matchedTact / deckTactics.length) * 50 : 0;

    return { totalPercent: Math.round(genScore + tactScore) };
  };

  const filteredDecks = useMemo(() => {
    return parsedTierDecks
      .filter(deck => deckFilter === 'all' || deck.deck_type === deckFilter)
      .map(deck => ({ ...deck, matchInfo: calculateMatch(deck) }))
      .sort((a, b) => {
        const aPinned = myPinnedDecks.includes(a.id);
        const bPinned = myPinnedDecks.includes(b.id);
        if (aPinned && !bPinned) return -1;
        if (!aPinned && bPinned) return 1;
        return b.matchInfo.totalPercent - a.matchInfo.totalPercent;
      });
  }, [parsedTierDecks, deckFilter, myPinnedDecks, generals, tactics, selectedGenerals, selectedTactics]);

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
          현재 보유하신 막사 자산을 토대로 최적의 군사 배치를 정렬하여 제안합니다. (📌 핀 고정 시 최상단)
        </p>

        <div className="classic-subtab-bar" style={{ marginBottom: '25px' }}>
          <button onClick={() => setDeckFilter('all')} className={`classic-subtab ${deckFilter === 'all' ? 'active' : ''}`}>
            전체
          </button>
          <button onClick={() => setDeckFilter('tier')} className={`classic-subtab ${deckFilter === 'tier' ? 'active' : ''}`}>
            종결 티어덱
          </button>
          <button onClick={() => setDeckFilter('start')} className={`classic-subtab ${deckFilter === 'start' ? 'active' : ''}`}>
            개척 추천덱
          </button>
        </div>

        <div className="deck-general-grid">
          {filteredDecks.map(deck => {
            const { totalPercent } = deck.matchInfo || { totalPercent: 0 };
            const isStartDeck = deck.deck_type === 'start';
            const formationInfo = matchFormationInfo(deck.formation_grid);
            const isPinned = myPinnedDecks.includes(deck.id);
            const safeSetup = deck.deck_setup || [];

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
                {/* 핀 버튼 */}
                <button 
                  onClick={() => togglePin(deck.id)}
                  style={{ position: 'absolute', top: '24px', left: '24px', fontSize: '1.6rem', background: 'none', border: 'none', zIndex: 10 }}
                >
                  {isPinned ? '📌' : '📍'}
                </button>

                <div style={{ position: 'absolute', top: '24px', right: '28px', textAlign: 'right' }}>
                  <span style={{
                    padding: '5px 12px', fontSize: '0.85rem', fontWeight: 'bold', color: 'white',
                    backgroundColor: isStartDeck ? 'var(--jade)' : 'var(--seal)', marginRight: '12px'
                  }}>
                    {isStartDeck ? '개척추천' : '종결'}
                  </span>
                  <span style={{ fontSize: '2.1rem', fontWeight: '900' }}>
                    {totalPercent}%
                  </span>
                </div>

                <h3 className="deck-title classic-heading" style={{ paddingLeft: '45px', marginBottom: '14px' }}>
                  {deck.tier_name}
                </h3>

                <div style={{ marginBottom: '20px' }}>
                  <FormationGridVisual gridData={deck.formation_grid} />
                </div>

                {/* 장수 목록 */}
                <div className="deck-general-grid">
                  {safeSetup.map((gSetup, idx) => (
                    <div key={idx} style={{ padding: '16px', border: '1px solid #ddd', marginBottom: '12px' }}>
                      <strong>{gSetup.general_name}</strong>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>속성: {gSetup.stat_focus}</div>
                      <div style={{ fontSize: '0.9rem', marginTop: '8px' }}>
                        추천 전법: {gSetup.added_tactics ? gSetup.added_tactics.join(', ') : '-'}
                      </div>
                    </div>
                  ))}
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
