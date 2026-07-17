// app/squads/page.js
'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import FormationGridVisual from '../components/FormationGridVisual';
import GlossaryText from '../components/GlossaryText';
import GlossaryModal from '../components/GlossaryModal';
import { getActiveSynergiesFromSetup, matchFormationInfo } from '../../data/synergies'; 
import { useDeckAssets } from '../../hooks/useDeckAssets';
import { supabase } from '../lib/supabaseClient';
import { buildOptimalSquads } from '../../utils/squadEngine';

export default function AutoSquadsPage() {
  const COMING_SOON = true; // 배포 전 이 값만 false로 바꾸면 원래 기능 복구

  if (COMING_SOON) {
    return (
      <PageLayout>
        <div style={{ padding: '25px', minHeight: '100vh' }}>
          <nav className="classic-tabbar" style={{ marginBottom: '35px' }}>
            <Link href="/?tab=my-assets" className="classic-tab">나의 보유 현황</Link>
            <Link href="/?tab=dictionary" className="classic-tab">통합 도감</Link>
            <Link href="/matches" className="classic-tab">티어덱 매칭</Link>
            <span className="classic-tab active">1-5군 추천 편성</span>
          </nav>
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--ink-text)' }}>
            <h1 className="classic-heading text-3xl font-bold" style={{ marginBottom: '16px' }}>
              1-5군 자동 편성 (준비중)
            </h1>
            <p style={{ fontSize: '1.05rem', color: 'var(--gold-soft)' }}>
              더 정교한 편성 로직을 다듬고 있습니다. 조금만 기다려 주세요!
            </p>
          </div>
        </div>
      </PageLayout>
    );
  }

  const {
    generals, tactics, tierDecks, isLoading,
    selectedGenerals, selectedTactics
  } = useDeckAssets();

  const [glossaryTerm, setGlossaryTerm] = useState(null);
  const [squads, setSquads] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);

  const handleGeneralClick = (deckId, slotIndex, general) => {
    console.log("클릭된 덱:", deckId, "슬롯 번호:", slotIndex);
    setEditingSlot({ deckId, slotIndex, general });
  };

  // 장수 교체 로직 (이 함수를 모달의 onSave에 연결할 예정)
  const handleUpdateGeneral = (deckId, slotIdx, newGeneral) => {
    setSquads(prev => prev.map(deck => {
      if (deck.id !== deckId) return deck;

      const updatedSetup = [...deck.deck_setup];
      // 선택한 장수로 교체
      updatedSetup[slotIdx] = {
        ...updatedSetup[slotIdx],
        general_name: newGeneral.name, // 이름 교체
        matchedGenData: newGeneral     // 실제 장수 데이터 연결
      };

      return { ...deck, deck_setup: updatedSetup };
    }));
    setEditingSlot(null); // 편집 완료 후 모달 닫기
  };

  const [myPinnedDecks, setMyPinnedDecks] = useState([]);

  const myGenNames = useMemo(() => 
    generals.filter(g => selectedGenerals.includes(g.id)).map(g => g.name.trim()),
  [generals, selectedGenerals]);

  const myTactNames = useMemo(() => 
    tactics.filter(t => selectedTactics.includes(t.id)).map(t => t.name.trim()),
  [tactics, selectedTactics]);

  useEffect(() => {
    async function fetchPinnedDecks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('pinned_decks').eq('id', user.id).single();
        if (data?.pinned_decks) setMyPinnedDecks(data.pinned_decks);
      }
    }
    fetchPinnedDecks();
  }, []);

  // 외부 엔진을 통해 1-5군 생성 위임
  useEffect(() => {
    if (isLoading || tierDecks.length === 0 || generals.length === 0 || tactics.length === 0) return;
    if (selectedGenerals.length === 0) return;

    const generatedSquads = buildOptimalSquads({
      tierDecks, generals, tactics, myGenNames, myTactNames, 
      pinnedDeckIds: myPinnedDecks, selectedTactics
    });

    setSquads(generatedSquads);
  }, [isLoading, tierDecks, generals, tactics, myGenNames, myTactNames, myPinnedDecks, selectedTactics]);

  if (isLoading) {
    return (
      <PageLayout>
        <h1 className="classic-title text-3xl font-bold text-center" style={{ marginTop: '80px' }}>
          천하 결전 정예 군단을 편성하고 있습니다...
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
          <Link href="/matches" className="classic-tab">티어덱 매칭</Link>
          <span className="classic-tab active">1-5군 추천 편성</span>
        </nav>

        <h1 className="classic-heading text-3xl font-bold mb-2">중복 방지 1-5군 자동 편성</h1>
        <p style={{ color: 'var(--gold-soft)', marginBottom: '30px', fontSize: '1.05rem', fontWeight: 500 }}>
          보유 자산을 총동원하여 자원 충돌 없이 빈칸을 모두 메운 5개의 최정예 부대를 제안합니다.
        </p>

        {squads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--ink-text)', fontSize: '1.2rem', fontWeight: 'bold' }}>
            편성 가능한 군단이 없습니다. 장수 상태를 더 확보하거나 선택해 주세요.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            {squads.map(deck => {
              const formationInfo = matchFormationInfo(deck.formation_grid);
              const isPinned = myPinnedDecks.includes(deck.id);

              return (
                <div key={`${deck.id}-${deck.squadNum}`} className="scroll-panel" style={{ padding: '28px', border: isPinned ? '2px solid var(--gold)' : '1px solid rgba(184,147,90,0.25)' }}>
                  <div style={{ position: 'absolute', top: '24px', right: '28px', textAlign: 'right' }}>
                    <span style={{ padding: '5px 12px', fontSize: '1rem', fontWeight: 'bold', color: 'var(--paper-soft)', backgroundColor: 'var(--seal)', marginRight: '14px' }}>
                      제 {deck.squadNum} 군
                    </span>
                    {isPinned && <span style={{ marginRight: '10px', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--seal)' }}>📌 고정 출진</span>}
                  </div>

                  <h3 className="classic-heading" style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '14px', borderBottom: '2px solid var(--gold)', paddingBottom: '6px', width: '65%' }}>
                    {deck.tier_name}
                  </h3>

                  <div style={{ marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--paper-soft)', padding: '14px 20px', border: '1px solid rgba(184,147,90,0.35)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ backgroundColor: 'var(--seal)', padding: '4px 10px', fontWeight: 'bold', color: 'var(--paper-soft)', fontSize: '0.85rem' }}>추천 진형</span>
                        <span style={{ fontWeight: '900', color: 'var(--seal-dark)', fontSize: '1.2rem' }}>{formationInfo.name}</span>
                      </div>
                    </div>
                    <FormationGridVisual gridData={deck.formation_grid} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '22px' }}>
                    {deck.deck_setup.map((gSetup, idx) => {
                      const matchedGeneralData = generals.find(g => g.name.trim() === gSetup.general_name.trim());
                      const dbImageUrl = matchedGeneralData?.image_url || '/images/generals/default.jpg';

                      return (
                        <div
                          key={idx}
                          onClick={() => handleGeneralClick(deck.id, idx, matchedGeneralData)}
                          style={{
                            border: '3px solid var(--seal)',
                            padding: '16px',
                            backgroundColor: 'var(--paper-soft)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            cursor: 'pointer'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
                              <div style={{ width: '55px', height: '50px', overflow: 'hidden', backgroundColor: 'var(--paper)', border: '2px solid var(--gold)', flexShrink: 0 }}>
                                <img src={dbImageUrl} alt={gSetup.general_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div>
                                <span style={{ fontSize: '1.3rem', fontWeight: '900', color: 'var(--ink-text)' }}>
                                  {gSetup.general_name} {gSetup.isSubstituted && <span style={{ fontSize: '0.8rem', color: 'var(--seal)', fontWeight: 'bold' }}>(대체)</span>}
                                </span>
                                <div style={{ fontSize: '0.88rem', color: 'var(--paper-soft)', marginTop: '5px', fontWeight: 'bold', backgroundColor: 'var(--ink-text)', padding: '2px 7px', width: 'fit-content' }}>
                                  속성: {gSetup.stat_focus || '균형 투자'}
                                </div>
                              </div>
                            </div>

                            <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '12px', marginBottom: '14px' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 'bold' }}>장착 확정 전법</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {gSetup.added_tactics_detailed.map((tData, tIdx) => {
                                  const isGolden = tData.grade === '황금';
                                  const matchedTacticData = tactics.find(t => t.name.trim() === tData.name.trim());

                                  return (
                                    <div key={tIdx} style={{
                                      padding: '7px 12px', fontSize: '0.95rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                      backgroundColor: isGolden ? 'rgba(184,147,90,0.15)' : 'rgba(63,93,84,0.12)', 
                                      color: isGolden ? 'var(--seal-dark)' : 'var(--jade)', 
                                      border: isGolden ? '2px solid var(--gold)' : '2px solid var(--jade)'
                                    }}>
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {matchedTacticData?.image_url && <img src={matchedTacticData.image_url} alt={tData.name} style={{ width: '22px', height: '30px', border: '1px solid var(--gold)' }} />}
                                        {tData.name} {isGolden && '⭐'}
                                      </span>
                                      <span style={{ fontSize: '0.85rem' }}>✓</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '10px', marginBottom: '4px' }}>
                              <div style={{ fontSize: '0.85rem', color: 'var(--ink-text)', fontWeight: 'bold', marginBottom: '6px' }}>최적 병법 세팅</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {gSetup.arts_of_war?.unique && (
  <div style={{ padding: '4px 8px', fontSize: '0.85rem', backgroundColor: 'rgba(184,147,90,0.18)', border: '2px solid var(--gold)', color: 'var(--seal-dark)', fontWeight: 'bold', width: 'fit-content' }}>
    고유: {gSetup.arts_of_war.unique}
  </div>
)}
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
  {gSetup.arts_of_war?.common?.map((warName, wIdx) => (
    <span key={wIdx} className="recommend-tag" style={{ fontSize: '0.82rem' }}>{warName}</span>
  ))}
</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div style={{ borderTop: '2px solid var(--gold)', fontSize: '0.95rem', backgroundColor: 'var(--paper-soft)', padding: '14px 18px', marginTop: '10px' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--seal-dark)', display: 'block', marginBottom: '8px', fontSize: '1.05rem' }}>장비 추천 속성 가이드</span>
                    <div style={{ color: 'var(--ink-text)', lineHeight: '1.5', display: 'flex', flexWrap: 'wrap', gap: '20px', fontWeight: 'bold' }}>
                      {deck.deck_setup.map((g, i) => (
                        <div key={i}><span style={{ color: 'var(--seal-dark)' }}>{g.general_name}</span>: {g.equipment_options ? g.equipment_options.join(' / ') : '속성 조율 중'}</div>
                      ))}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
      <GlossaryModal term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
    </PageLayout>
  );
}