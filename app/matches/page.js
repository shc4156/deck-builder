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
  // 클릭된 장수 / 전법 팝업 관리를 위한 State
const [selectedModalGeneral, setSelectedModalGeneral] = useState(null);
const [selectedModalTactic, setSelectedModalTactic] = useState(null);

  // 📜 열람인 닉네임 (대조록 직인용)
  const [userNickname, setUserNickname] = useState('백정');

  useEffect(() => {
    const fetchUserNickname = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('프로필 조회 실패:', error.message);
          return;
        }

        if (profile && profile.nickname) {
          setUserNickname(profile.nickname);
        }
      } catch (err) {
        console.error('닉네임 로드 중 예외 발생:', err);
      }
    };

    fetchUserNickname();
  }, []);

  useEffect(() => {
    async function fetchPinnedDecks() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('pinned_decks')
          .eq('id', user.id)
          .single();
        
        // 🔹 [수정] Array.isArray로 확인 후 배열일 때만 set, 아니면 빈 배열([]) 설정
        if (data?.pinned_decks && Array.isArray(data.pinned_decks)) {
          setMyPinnedDecks(data.pinned_decks);
        } else {
          setMyPinnedDecks([]);
        }
      }
    }
    fetchPinnedDecks();
  }, []);

  // 📌 핀 토글
const togglePin = async (deckId) => {
  // 1. 타입을 문자열로 통일
  const targetId = String(deckId);

  // 2. 현재 핀 목록에서도 문자열로 다루어 비교 (타입 차이로 인한 이슈 방지)
  const currentPinnedList = Array.isArray(myPinnedDecks) ? myPinnedDecks : [];
const isAlreadyPinned = currentPinnedList.some(id => String(id) === targetId);

  let newPins = [];
  if (isAlreadyPinned) {
    // 핀 해제: Target ID 제외
    newPins = myPinnedDecks.filter(id => String(id) !== targetId);
  } else {
    // 핀 추가
    newPins = [...myPinnedDecks, deckId];
  }

  // 3. UI 상태 먼저 즉시 업데이트 (사용자 반응성 향상)
  setMyPinnedDecks(newPins);

  // 4. Supabase DB 업데이트
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ pinned_decks: newPins })
      .eq('id', user.id);

    if (error) {
      console.error('핀 업데이트 실패:', error);
      // 실패 시 원래 상태로 복구하고 싶다면 이전 값을 백업해두고 되돌릴 수 있습니다.
    }
  } catch (err) {
    console.error('핀 토글 중 오류 발생:', err);
  }
};

  // 🛠️ 메인 전법과 서브 전법 파싱
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
      const dbSubTactics = [...t1Sub, ...t2Sub].filter(Boolean);

      heroes.push({
        general_name: name,
        stat_focus: deck[`hero${i}_stat`] || '속성 미정',
        main_tactics: mainTactics.length > 0 ? mainTactics : ['전법 정보 없음'],
        db_sub_tactics: dbSubTactics,
        added_tactics: mainTactics,
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
          <Link href="/vs" className="classic-tab">⚔️ 모의 대결</Link>
        </nav>

        {/* ============================================================
            📜 전략대조록(戰略對照錄) — 문서형 헤더
        ============================================================ */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, var(--paper-soft) 0%, var(--paper) 45%, var(--paper-soft) 100%)',
            border: '3px double var(--gold)',
            borderRadius: '6px',
            padding: '32px 40px',
            marginBottom: '30px',
            boxShadow: '0 8px 26px rgba(0,0,0,0.18), inset 0 0 70px rgba(139,94,52,0.08)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute', inset: '8px', border: '1px solid rgba(139,94,52,0.3)',
            borderRadius: '3px', pointerEvents: 'none'
          }} />

          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'
          }}>
            <div style={{
              writingMode: 'vertical-rl', textOrientation: 'upright',
              fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.2em',
              color: 'var(--seal-dark)', flexShrink: 0, marginRight: '18px', lineHeight: 1.3
            }}>
              戰略對照錄
            </div>

            <div style={{ flex: 1, textAlign: 'center', paddingTop: '2px' }}>
              <h1 className="classic-heading text-3xl font-bold mb-2" style={{ margin: 0 }}>
                티어덱 &amp; 개척추천 매칭
              </h1>
              <p style={{ color: 'var(--ink-text)', opacity: 0.85, marginTop: '10px', fontSize: '1.02rem', fontWeight: 500, lineHeight: 1.6 }}>
                현재 보유하신 막사 자산을 토대로 천하를 호령할 수 있는 최적의 군사 배치를 정렬하여 제안합니다.<br />
                (📌 핀 고정 시 최상단 고정)
              </p>
            </div>

            <div style={{ flexShrink: 0, marginLeft: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '62px', height: '62px',
                border: '3px solid var(--seal-dark)',
                borderRadius: '4px',
                backgroundColor: 'rgba(139,41,31,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'rotate(-3deg)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
              }}>
                <span style={{
                  writingMode: 'vertical-rl', textOrientation: 'upright',
                  fontSize: '0.85rem', fontWeight: 900, color: 'var(--seal-dark)', letterSpacing: '0.1em'
                }}>
                  {userNickname || '맹원'}覽
                </span>
              </div>
              <span style={{ fontSize: '0.65rem', color: 'var(--ink-text)', opacity: 0.7, marginTop: '6px' }}>열람인 직인</span>
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, marginTop: '22px', borderTop: '1px dashed rgba(139,94,52,0.4)', paddingTop: '18px' }}>
            <div className="classic-subtab-bar">
              <button onClick={() => setDeckFilter('all')} className={`classic-subtab ${deckFilter === 'all' ? 'active' : ''}`}>
                전체 전략표 ({tierDecks.length})
              </button>
            </div>
          </div>
        </div>

        <div className="deck-general-grid" style={{ marginBottom: '22px' }}>
          {filteredDecks.map((deck, deckIdx) => {
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

                {/* 📋 문서 항목번호 */}
                <span style={{
                  position: 'absolute', top: '24px', left: '58px',
                  fontSize: '0.78rem', fontWeight: 900, color: 'var(--seal-dark)',
                  letterSpacing: '0.05em'
                }}>
                  第{deckIdx + 1}號
                </span>

                <div style={{ position: 'absolute', top: '24px', right: '28px', textAlign: 'right' }}>
              
                  <span style={{
                    fontSize: '2.1rem', fontWeight: '900', verticalAlign: 'middle', fontFamily: 'var(--font-display)',
                    color: totalPercent >= 85 ? 'var(--seal)' : totalPercent >= 60 ? 'var(--gold)' : 'var(--ink-text)'
                  }}>
                    {totalPercent}%
                  </span>
                </div>

                {/* 덱 이름 & 설명 */}
                <h3 className="deck-title classic-heading" style={{ fontSize: '1.6rem', fontWeight: '900', marginBottom: '6px', borderBottom: '2px solid var(--gold)', paddingBottom: '6px', width: '65%', paddingLeft: '35px', marginTop: '18px' }}>
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
                      <span style={{ backgroundColor: 'var(--seal)', padding: '4px 10px', fontWeight: 'bold', color: 'var(--paper-soft)', fontSize: '0.85rem' }}>추천 진형</span>
                      <span style={{ fontWeight: '900', color: 'var(--seal-dark)', fontSize: '1.2rem' }}>{formationInfo.name}</span>
                    </div>
                    <div style={{ fontSize: '1.05rem', color: 'var(--ink-text)', fontWeight: 'bold', marginTop: '4px', paddingLeft: '2px' }}>
                      진형효과: {formationInfo.effect}
                    </div>
                  </div>
                  {/* ⭕ 수정: 0과 1 위치에 맞춰 실제 장수 이름(parsedSetup)을 매핑한 배열 전달 */}
<FormationGridVisual 
  gridData={(() => {
    let heroIdx = 0;
    // formationGrid [0, 1, 1, 1, 0, 0]의 1인 위치에 parsedSetup의 장수 이름을 차례대로 채워넣음
    return formationGrid.map(val => {
      if (val === 1 && parsedSetup[heroIdx]) {
        return parsedSetup[heroIdx++].general_name;
      }
      return '';
    });
  })()} 
/>
                </div>

                {/* 장수 카드 3인 목록 */}
<div className="deck-general-grid" style={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', 
  gap: '16px', 
  marginBottom: '22px',
  width: '100%',
  boxSizing: 'border-box'
}}>
  {parsedSetup.map((gSetup, idx) => {
    const isGenOwned = myGenNames.includes(gSetup.general_name);
    const matchedGeneralData = (generals || []).find(g => g.name === gSetup.general_name);
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
          justifyContent: 'space-between',
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden' // 내용물이 박스를 빠져나가지 않도록 방지
        }}
      >
        <div>
          {/* 장수 정보 프로필 */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px', width: '100%' }}>
            <div style={{ width: '50px', height: '48px', overflow: 'hidden', backgroundColor: 'var(--paper)', border: '2px solid var(--gold)', flexShrink: 0 }}>
              <img src={dbImageUrl} alt={gSetup.general_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.src = '/images/generals/default.jpg'; }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--ink-text)', display: 'block', wordBreak: 'break-all' }}>
                {gSetup.general_name}
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--paper-soft)', marginTop: '4px', fontWeight: 'bold', backgroundColor: 'var(--ink-text)', padding: '2px 6px', width: 'fit-content', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                속성: {gSetup.stat_focus}
              </div>
            </div>
          </div>

          {/* 추천 전법 영역 */}
          <div style={{ borderTop: '2px dashed rgba(184,147,90,0.4)', paddingTop: '12px', marginBottom: '14px', width: '100%', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              권장 메인 전법
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              {gSetup.main_tactics.map((tName, tIdx) => {
                const isTacticOwnedInProfile = (myTactNames || []).includes(tName);
                const matchedTacticData = (tactics || []).find(t => t.name === tName);
                if (isTacticOwnedInProfile) dynamicUsedTactics.push(tName);

                return (
                  <div key={tIdx} style={{ width: '100%', boxSizing: 'border-box' }}>
                    {/* 보유 상태와 상관없이 DB 추천 전법 이름은 항상 노출 */}
                    <div style={{
                      padding: '7px 10px', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      backgroundColor: isTacticOwnedInProfile ? 'rgba(63,93,84,0.12)' : 'rgba(43,35,24,0.05)',
                      color: isTacticOwnedInProfile ? 'var(--jade)' : 'rgba(43,35,24,0.65)',
                      border: isTacticOwnedInProfile ? '2px solid var(--jade)' : '2px solid rgba(43,35,24,0.2)',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {matchedTacticData?.image_url && (
                          <img
                            src={matchedTacticData.image_url}
                            alt={tName}
                            style={{ width: '20px', height: '26px', objectFit: 'cover', border: '1px solid var(--gold)', flexShrink: 0 }}
                          />
                        )}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tName}</span>
                      </span>
                      <span style={{ fontSize: '0.85rem', flexShrink: 0, marginLeft: '6px' }}>{isTacticOwnedInProfile ? '✓' : '✗'}</span>
                    </div>

                                    {/* 메인 전법 미보유 시: DB 서브전법 + Generals.recommended_tactics + 유저 보유자산 종합 제안 */}
{!isTacticOwnedInProfile && (
  <div style={{ 
    fontSize: '0.82rem', 
    color: 'var(--seal-dark)', 
    marginTop: '5px', 
    padding: '6px', 
    fontWeight: 'bold', 
    backgroundColor: 'rgba(166,50,42,0.08)', 
    borderLeft: '3px solid var(--seal)',
    wordBreak: 'break-word',
    width: '100%',
    boxSizing: 'border-box'
  }}>
    {(() => {
      // 1. tier_decks의 서브전법 중 유저가 보유한 전법
      const ownedDbSub = (gSetup.db_sub_tactics || []).filter(st => myTactNames.includes(st) && !dynamicUsedTactics.includes(st));

      // 2. Generals 테이블의 recommended_tactics 데이터 가져오기
      let generalRecTactics = [];
      if (matchedGeneralData?.recommended_tactics) {
        const rawRecs = matchedGeneralData.recommended_tactics;
        if (Array.isArray(rawRecs)) generalRecTactics = rawRecs;
        else {
          try { generalRecTactics = JSON.parse(rawRecs); } catch { generalRecTactics = []; }
        }
      }
      // 유저가 보유 중인 해당 장수 전용 추천 전법 추출
      const ownedGeneralRecs = generalRecTactics.filter(rt => myTactNames.includes(rt) && !dynamicUsedTactics.includes(rt));

      // 3. 대체 전법 탐색 엔진(findAlternativeTactics) 알고리즘 결과
      const algoAlts = findAlternativeTactics({
        generalName: gSetup.general_name,
        recommendedTacticName: tName,
        tactics,
        generals,
        selectedTactics,
        usedTacticsInDeck: dynamicUsedTactics,
      });

      // 1, 2, 3의 결과를 중복 없이 순서대로 병합 (우선순위: 덱 서브 전법 > 장수 보유 추천 전법 > 알고리즘 추천)
      const combinedAlts = Array.from(new Set([...ownedDbSub, ...ownedGeneralRecs, ...algoAlts]));

      if (combinedAlts.length > 0) {
        dynamicUsedTactics.push(combinedAlts[0]);
        return `🔄 대체 전법: ${combinedAlts.join(', ')}`;
      }
      
      // 유저가 보유한 대체 전법이 하나도 없는 경우: 후보군 안내
      const allSubCandidates = Array.from(new Set([...(gSetup.db_sub_tactics || []), ...generalRecTactics]));
      if (allSubCandidates.length > 0) {
        return `💡 권장 대체 옵션: ${allSubCandidates.slice(0, 3).join(', ')} (미보유)`;
      }

      return '대체 가능 전법 없음';
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
