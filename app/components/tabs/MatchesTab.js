'use client';
import { useState } from 'react';
import FormationGridVisual from '../FormationGridVisual';
import GlossaryText from '../GlossaryText';
import GlossaryModal from '../GlossaryModal';
import DetailPopup from '../DetailPopup';
import { getActiveSynergiesFromSetup, matchFormationInfo } from '../../../data/synergies';
import { findAlternativeTactics } from '../../../data/tacticAlternatives';
import { useDeckAssets } from '../../../hooks/useDeckAssets';
import { useProfile } from '../ProfileContext';

// ---------------------------------------------------------------------------
// 실제 tier_decks 테이블 스키마 (2026-07 확인):
//   deck_name, description, formation ("0,1,1,1,0,0" 문자열)
//   hero{1,2,3}_name, hero{1,2,3}_stat
//   hero{1,2,3}_tactic1_main, hero{1,2,3}_tactic1_sub(JSON 배열 문자열)
//   hero{1,2,3}_tactic2_main, hero{1,2,3}_tactic2_sub(JSON 배열 문자열)
//   hero{1,2,3}_unique_art_of_war, hero{1,2,3}_common_art_of_war(JSON 배열 문자열)
//   hero{1,2,3}_equip(JSON 배열 문자열)
// deck_type / tier_name / formation_grid / deck_setup 컬럼은 존재하지 않음.
// ---------------------------------------------------------------------------

// 좌(전열/후열) → 1번 장수, 중(전열/후열) → 2번 장수, 우(전열/후열) → 3번 장수 순으로 배치.
// 배열 구조: [전열좌, 전열중, 전열우, 후열좌, 후열중, 후열우]
// 예외: 가운데 전열·후열이 모두 1인 진형(기린진 등)은 1번=가운데 전열, 2번=가운데 후열, 3번=좌/우 남은 칸
function buildFormationGridData(formationGrid, parsedSetup) {
  const gridData = new Array(formationGrid.length).fill('');
  if (!parsedSetup.length) return gridData;

  const idxLeft = [0, 3].filter(i => formationGrid[i] === 1);
  const idxCenter = [1, 4].filter(i => formationGrid[i] === 1);
  const idxRight = [2, 5].filter(i => formationGrid[i] === 1);

  if (idxCenter.length === 2) {
    // 기린진류: 가운데 전열/후열에 2명 + 좌우 중 한 칸에 1명
    const [centerFront, centerBack] = idxCenter.sort((a, b) => a - b);
    if (parsedSetup[0]) gridData[centerFront] = parsedSetup[0].general_name;
    if (parsedSetup[1]) gridData[centerBack] = parsedSetup[1].general_name;
    const sideIdx = [...idxLeft, ...idxRight][0];
    if (sideIdx !== undefined && parsedSetup[2]) gridData[sideIdx] = parsedSetup[2].general_name;
  } else {
    // 일반 케이스: 좌/중/우 각 한 칸씩
    [idxLeft[0], idxCenter[0], idxRight[0]].forEach((idx, i) => {
      if (idx !== undefined && parsedSetup[i]) gridData[idx] = parsedSetup[i].general_name;
    });
  }

  return gridData;
}

function matchTier(pct) {
  if (pct >= 85) return 'high';
  if (pct >= 60) return 'mid';
  return 'low';
}

const MATCH_COLOR = {
  high: '#3F9EA8', // 진영색(초록/파랑/빨강)과 겹치지 않는 청록
  mid: 'var(--accent)',
  low: 'var(--text-faded)',
};

export default function MatchesTab({ onNavigate }) {
  // 닉네임/핀 고정 티어덱은 여기서 profiles를 따로 조회하지 않는다.
  // - 닉네임: ProfileContext(세션당 1회 로딩)
  // - 핀 고정 티어덱: useDeckAssets()가 이미 profile.pinned_decks 기준으로 들고 있는
  //   pinnedTierDeckIds/toggleTierDeckPin을 그대로 재사용(이 화면 전용 이름만 유지)
  const {
    generals = [], tactics = [], tierDecks = [], isLoading,
    selectedGenerals = [], selectedTactics = [], connections = [],
    pinnedTierDeckIds: myPinnedDecks = [], toggleTierDeckPin
  } = useDeckAssets();

  const profile = useProfile();
  const userNickname = profile?.nickname || '백정';

  const [deckFilter, setDeckFilter] = useState('all'); // all | pinned
  const [seasonFilter, setSeasonFilter] = useState('all'); // all | S1 | S2+3
  const [glossaryTerm, setGlossaryTerm] = useState(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [detailTarget, setDetailTarget] = useState(null); // { type: 'general'|'tactic', name } | null

  const togglePin = (deckId) => toggleTierDeckPin(deckId);

  const toggleExpand = (deckId) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(deckId) ? next.delete(deckId) : next.add(deckId);
      return next;
    });
  };

  // 🛠️ hero1~3_* 개별 컬럼을 장수 배열로 파싱 (실제 라이브 스키마 기준)
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
        troop: deck[`hero${i}_troop`] || null, // 시즌2+3부터 생긴 병종(장비 조합) 추천값 - 시즌1은 null
        main_tactics: mainTactics.length > 0 ? mainTactics : ['전법 정보 없음'],
        db_sub_tactics: dbSubTactics,
        added_tactics: mainTactics,
        arts_of_war: {
          unique: deck[`hero${i}_unique_art_of_war`] || null,
          common: parseJson(deck[`hero${i}_common_art_of_war`]),
        },
        equipment_options: parseJson(deck[`hero${i}_equip`]),
      });
    }
    return heroes;
  };

  // 📊 매칭률 계산 (메인 전법 위주로 산정)
  const calculateMatch = (deck) => {
    const deckSetup = parseDeckSetup(deck);
    if (deckSetup.length === 0) {
      return { totalPercent: 0, deckGens: [], deckTactics: [], myGenNames: [], myTactNames: [], parsedSetup: [] };
    }

    const deckGens = deckSetup.map(g => g.general_name);
    const deckTactics = deckSetup.flatMap(g => g.main_tactics.length > 0 ? g.main_tactics : g.added_tactics);

    const myGenNames = generals.filter(g => selectedGenerals.includes(g.id)).map(g => g.name);
    const matchedGenCount = deckGens.filter(name => myGenNames.includes(name)).length;

    const myTactNames = tactics.filter(t => selectedTactics.includes(t.id)).map(t => t.name);
    const matchedTactCount = deckTactics.filter(name => myTactNames.includes(name)).length;

    const genScore = (matchedGenCount / Math.max(deckGens.length, 1)) * 60;
    const tactScore = deckTactics.length > 0 ? (matchedTactCount / deckTactics.length) * 40 : 0;
    const totalPercent = Math.round(genScore + tactScore);

    return { totalPercent, deckGens, deckTactics, myGenNames, myTactNames, parsedSetup: deckSetup };
  };

  const filteredDecks = tierDecks
    .filter(deck => {
      if (deckFilter === 'pinned' && !myPinnedDecks.some(id => String(id) === String(deck.id))) return false;
      if (seasonFilter !== 'all' && (deck.season || 'S1') !== seasonFilter) return false;
      return true;
    })
    .map(deck => ({ ...deck, matchInfo: calculateMatch(deck) }))
    .sort((a, b) => {
      const aPinned = myPinnedDecks.some(id => String(id) === String(a.id));
      const bPinned = myPinnedDecks.some(id => String(id) === String(b.id));
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return b.matchInfo.totalPercent - a.matchInfo.totalPercent;
    });

  if (isLoading) {
    return (
      <>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>
          티어덱 데이터를 불러오는 중입니다...
        </p>
      </>
    );
  }

  return (
    <>
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)' }}>

        {/* ---------------- 헤더 ---------------- */}
        <header style={{ padding: '20px var(--pad-page) 14px', borderBottom: '0.5px solid var(--border)' }}>
          <p className="header-eyebrow" style={{ margin: '0 0 4px' }}>SANGUOZHI · DECK OPS</p>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 500 }}>티어덱 매칭</h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
            보유 자산 대조 · {tierDecks.length}종
          </p>
        </header>

        {/* ---------------- 필터 ---------------- */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '12px var(--pad-page) 0' }}>
          {[
            { key: 'all', label: `전체 (${tierDecks.length})` },
            { key: 'pinned', label: `고정핀 (${myPinnedDecks.length})` },
          ].map(f => {
            const active = deckFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setDeckFilter(f.key)}
                style={{
                  fontSize: 12.5, padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
                  background: active ? 'var(--accent)' : 'transparent',
                  color: active ? 'var(--accent-on)' : 'var(--text-secondary)',
                  border: active ? 'none' : '0.5px solid var(--border-strong)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ---------------- 시즌 필터 ---------------- */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '8px var(--pad-page) 0' }}>
          {[
            { key: 'all', label: '전체 시즌' },
            { key: 'S1', label: '시즌1' },
            { key: 'S2+3', label: '시즌2+3' },
          ].map(f => {
            const active = seasonFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setSeasonFilter(f.key)}
                style={{
                  fontSize: 12, padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
                  background: active ? 'rgba(58,123,200,0.18)' : 'transparent',
                  color: active ? '#5b9fe0' : 'var(--text-secondary)',
                  border: active ? '0.5px solid rgba(58,123,200,0.4)' : '0.5px solid var(--border-strong)',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* ---------------- 덱 리스트 ---------------- */}
        <div style={{ padding: '12px var(--pad-page) 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredDecks.map((deck, deckIdx) => {
            const { totalPercent, myGenNames, myTactNames, parsedSetup } = deck.matchInfo;
            const tier = matchTier(totalPercent);
            const barColor = MATCH_COLOR[tier];
            const isPinned = myPinnedDecks.some(id => String(id) === String(deck.id));
            const isOpen = expandedIds.has(deck.id);

            const formationGrid = deck.formation ? deck.formation.split(',').map(Number) : [];
            const formationInfo = matchFormationInfo(formationGrid);
            const dynamicUsedTactics = [];

            const memberPreview = parsedSetup.map((g, i) => {
              const owned = myGenNames.includes(g.general_name);
              return (
                <span key={i} style={{ color: owned ? 'var(--text-muted)' : 'var(--text-faded)' }}>
                  {g.general_name}{!owned && '(미보유)'}
                </span>
              );
            });

            return (
              <div
                key={deck.id}
                style={{
                  background: 'var(--bg-surface)',
                  borderRadius: 10,
                  overflow: 'hidden',
                  borderLeft: `3px solid ${barColor}`,
                }}
              >
                {/* 접힌 상태: 요약 행 */}
                <div
                  onClick={() => toggleExpand(deck.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', cursor: 'pointer' }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin(deck.id); }}
                    title={isPinned ? '고정 해제' : '최상단 고정'}
                    style={{
                      background: 'none', border: 'none', padding: 0, fontSize: 15.5, cursor: 'pointer',
                      color: isPinned ? 'var(--accent)' : 'var(--text-faded)', flexShrink: 0, width: 16,
                    }}
                  >
                    📌
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontSize: 15.5, color: 'var(--text-primary)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {deck.deck_name || '이름 없는 덱'}
                      </span>
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, flexShrink: 0,
                        background: deck.season === 'S2+3' ? 'rgba(58,123,200,0.18)' : 'rgba(255,255,255,0.08)',
                        color: deck.season === 'S2+3' ? '#5b9fe0' : 'var(--text-muted)',
                        border: `1px solid ${deck.season === 'S2+3' ? 'rgba(58,123,200,0.4)' : 'var(--border-strong)'}`,
                      }}>
                        {deck.season || 'S1'}
                      </span>
                    </span>
                    <p style={{
                      margin: '4px 0 0', fontSize: 12.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', gap: 4,
                    }}>
                      {memberPreview.reduce((acc, el, i) => i === 0 ? [el] : [...acc, ' · ', el], [])}
                    </p>
                  </div>

                  <span style={{ fontSize: 16.5, fontFamily: 'var(--font-mono)', fontWeight: 700, color: barColor, flexShrink: 0 }}>
                    {totalPercent}%
                  </span>
                  <span style={{
                    color: 'var(--text-faded)', fontSize: 12.5, flexShrink: 0,
                    transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease', display: 'inline-block',
                  }}>
                    ▶
                  </span>
                </div>

                <div style={{ height: 3, background: 'var(--border)', margin: '0 14px', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${totalPercent}%`, height: '100%', background: barColor }} />
                </div>

                {/* 펼친 상태: 상세 */}
                {isOpen && (
                  <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, borderTop: '0.5px solid var(--border)', marginTop: 10 }}>

                    {deck.description && (
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        {deck.description}
                      </p>
                    )}

                    {/* 진형 정보 */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      background: 'var(--bg-page)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          추천 진형 <b style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formationInfo.name}</b>
                        </span>
                        <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                          진형 효과: {formationInfo.effect}
                        </p>
                      </div>
                      <FormationGridVisual
                        gridData={buildFormationGridData(formationGrid, parsedSetup)}
                      />
                    </div>

                    {/* 인연(시너지) */}
                    {getActiveSynergiesFromSetup(parsedSetup).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {getActiveSynergiesFromSetup(parsedSetup).map((s, idx) => (
                          <span key={idx} style={{
                            fontSize: 12, padding: '3px 8px', borderRadius: 4,
                            background: 'rgba(184,135,58,0.12)', color: 'var(--accent)', border: '0.5px solid rgba(184,135,58,0.3)',
                          }}>
                            [{s.name}] <GlossaryText text={s.effect} onTermClick={setGlossaryTerm} />
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 장수별 카드 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {parsedSetup.map((gSetup, idx) => {
                        const isGenOwned = myGenNames.includes(gSetup.general_name);
                        const matchedGeneralData = generals.find(g => g.name === gSetup.general_name);

                        return (
                          <div
                            key={idx}
                            style={{
                              background: 'var(--bg-page)', borderRadius: 8, padding: '10px 12px',
                              borderLeft: `2px solid ${isGenOwned ? '#3F9EA8' : 'var(--border-strong)'}`,
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span
                                onClick={(e) => { e.stopPropagation(); setDetailTarget({ type: 'general', name: gSetup.general_name }); }}
                                style={{ fontSize: 14.5, color: 'var(--text-primary)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border-strong)', textUnderlineOffset: 3 }}
                              >
                                {gSetup.general_name}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                {gSetup.troop && (
                                  <span style={{
                                    fontSize: 11, padding: '1px 6px', borderRadius: 3,
                                    background: 'rgba(58,123,200,0.14)', color: '#5b9fe0',
                                    border: '1px solid rgba(58,123,200,0.35)',
                                  }}>
                                    {gSetup.troop}
                                  </span>
                                )}
                                {gSetup.stat_focus}
                              </span>
                            </div>

                            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {gSetup.main_tactics.map((tName, tIdx) => {
                                const isTacticOwned = myTactNames.includes(tName);
                                if (isTacticOwned) dynamicUsedTactics.push(tName);

                                return (
                                  <div key={tIdx}>
                                    <div style={{
                                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                      fontSize: 13, padding: '4px 8px', borderRadius: 5,
                                      background: isTacticOwned ? 'rgba(63,158,168,0.1)' : 'rgba(90,96,107,0.08)',
                                      color: isTacticOwned ? 'var(--text-primary)' : 'var(--text-muted)',
                                    }}>
                                      <span
                                        onClick={(e) => { e.stopPropagation(); setDetailTarget({ type: 'tactic', name: tName }); }}
                                        style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border-strong)', textUnderlineOffset: 3 }}
                                      >
                                        {tName}
                                      </span>
                                      <span style={{ fontSize: 11.5, color: isTacticOwned ? '#3F9EA8' : 'var(--text-faded)' }}>
                                        {isTacticOwned ? '✓' : '✗'}
                                      </span>
                                    </div>

                                    {!isTacticOwned && (
                                      <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 2, paddingLeft: 8 }}>
                                        {(() => {
                                          // 1. 덱 서브전법 중 유저가 보유한 전법
                                          const ownedDbSub = (gSetup.db_sub_tactics || []).filter(st => myTactNames.includes(st) && !dynamicUsedTactics.includes(st));

                                          // 2. generals 테이블의 recommended_tactics 중 유저 보유분
                                          let generalRecTactics = [];
                                          if (matchedGeneralData?.recommended_tactics) {
                                            const raw = matchedGeneralData.recommended_tactics;
                                            generalRecTactics = Array.isArray(raw) ? raw : (() => { try { return JSON.parse(raw); } catch { return []; } })();
                                          }
                                          const ownedGeneralRecs = generalRecTactics.filter(rt => myTactNames.includes(rt) && !dynamicUsedTactics.includes(rt));

                                          // 3. 대체 전법 탐색 알고리즘
                                          const algoAlts = findAlternativeTactics({
                                            generalName: gSetup.general_name,
                                            recommendedTacticName: tName,
                                            tactics, generals, selectedTactics,
                                            usedTacticsInDeck: dynamicUsedTactics,
                                          });

                                          const combinedAlts = Array.from(new Set([...ownedDbSub, ...ownedGeneralRecs, ...algoAlts]));

                                          if (combinedAlts.length > 0) {
                                            dynamicUsedTactics.push(combinedAlts[0]);
                                            return `🔄 대체 전법: ${combinedAlts.join(', ')}`;
                                          }
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

                            {/* 권장 병법 */}
                            {(gSetup.arts_of_war.unique || gSetup.arts_of_war.common.length > 0) && (
                              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>권장 병법:</span>
                                {gSetup.arts_of_war.unique && (
                                  <span style={{
                                    fontSize: 12, padding: '2px 6px', borderRadius: 4,
                                    background: 'rgba(184,135,58,0.15)', color: 'var(--accent)', fontWeight: 500,
                                  }}>
                                    {gSetup.arts_of_war.unique}
                                  </span>
                                )}
                                {gSetup.arts_of_war.common.map((warName, wIdx) => (
                                  <span key={wIdx} style={{ fontSize: 12, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                                    {warName}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                              장비 추천: {gSetup.equipment_options.length > 0 ? gSetup.equipment_options.join(' / ') : '속성 조율 중'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      <GlossaryModal term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
      <DetailPopup
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
        generals={generals}
        tactics={tactics}
        connections={connections}
      />
    </>
  );
}