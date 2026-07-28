'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import { useDeckAssets } from '../../hooks/useDeckAssets';
import { inferGeneralRole, inferTacticRole, findRecommendedGenerals } from '../../data/roleInference';
import { GLOSSARY_CATEGORIES } from '../../data/glossary';
import { factionColors } from '../../styles/colors';
import {
  IconChevronLeft,
  IconChevronRight,
  IconSearch,
  IconLink,
  IconBolt,
  IconUser,
  IconLayoutGrid,
  IconUsers,
  IconSwords,
  IconChartBar,
} from '@tabler/icons-react';

const CATEGORIES = [
  { key: 'generals', label: '장수도감' },
  { key: 'tactics', label: '전법도감' },
  { key: 'synergies', label: '인연도감' },
  { key: 'combos', label: '장수 콤보' },
  { key: 'glossary', label: '용어사전' },
];

// 하단 탭: 홈(/)의 각 탭으로 딥링크. 홈은 ?tab= 쿼리를 읽어 해당 탭을 바로 엽니다.
// 연무/시뮬은 배포 시 잠시 닫아두기로 해서 목록에서 뺐습니다(BottomNav.jsx와 동일한 기준).
const BOTTOM_NAV = [
  { tab: 'status', label: '현황', icon: IconUser },
  { tab: 'matches', label: '티어덱', icon: IconLayoutGrid },
  { tab: 'squads', label: '편성', icon: IconUsers },
  // { tab: 'tournament', label: '연무', icon: IconSwords },
  // { tab: 'simulate', label: '시뮬', icon: IconChartBar },
];

export default function EncyclopediaPage() {
  const { generals, tactics, synergies, connections, selectedGenerals = [], isLoading } = useDeckAssets();

  const [category, setCategory] = useState('generals');
  const [query, setQuery] = useState('');
  const [detailGeneral, setDetailGeneral] = useState(null);
  const [detailTactic, setDetailTactic] = useState(null);

  const generalByName = useMemo(() => {
    const map = {};
    generals.forEach(g => { map[g.name] = g; });
    return map;
  }, [generals]);

  // 보유 장수 이름 셋 (선택된 id → name 변환)
  const ownedGeneralNames = useMemo(() => {
    return new Set(
      generals.filter(g => selectedGenerals.includes(g.id)).map(g => g.name)
    );
  }, [generals, selectedGenerals]);

  // ---------------- 장수 콤보(연결) 조회 헬퍼 ----------------
  const getCombosForGeneral = (generalName) => {
    if (!connections) return [];
    return connections
      .filter(c => c.leader_name === generalName || c.follower_name === generalName)
      .map(c => {
        const isLeader = c.leader_name === generalName;
        const partnerName = isLeader ? c.follower_name : c.leader_name;
        return { ...c, partnerName, isLeader };
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  };

  // ---------------- 검색 필터링 ----------------
  const filteredGenerals = useMemo(() => {
    if (!query.trim()) return generals;
    const q = query.trim();
    return generals.filter(g => g.name?.includes(q));
  }, [generals, query]);

  const filteredTactics = useMemo(() => {
    if (!query.trim()) return tactics;
    const q = query.trim();
    return tactics.filter(t => t.name?.includes(q) || t.description?.includes(q));
  }, [tactics, query]);

  const filteredSynergies = useMemo(() => {
    const base = !query.trim()
      ? synergies
      : synergies.filter(s => {
          const q = query.trim();
          return s.name?.includes(q) || (s.members || []).some(m => m.includes(q));
        });

    return base
      .map(s => {
        const matchedMembers = (s.members || []).filter(m => ownedGeneralNames.has(m));
        const progressPercent = s.req_count > 0
          ? Math.min(100, Math.round((matchedMembers.length / s.req_count) * 100))
          : 0;
        return { ...s, matchedMembers, isComplete: matchedMembers.length >= s.req_count, progressPercent };
      })
      .sort((a, b) => {
        if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
        return b.progressPercent - a.progressPercent;
      });
  }, [synergies, query, ownedGeneralNames]);

  const filteredCombos = useMemo(() => {
    const list = connections || [];
    if (!query.trim()) return list;
    const q = query.trim();
    return list.filter(c => c.leader_name?.includes(q) || c.follower_name?.includes(q));
  }, [connections, query]);

  const filteredGlossary = useMemo(() => {
    if (!query.trim()) return GLOSSARY_CATEGORIES;
    const q = query.trim();
    const result = {};
    Object.entries(GLOSSARY_CATEGORIES).forEach(([cat, terms]) => {
      const matched = Object.entries(terms).filter(([term, def]) => term.includes(q) || def.includes(q));
      if (matched.length > 0) result[cat] = Object.fromEntries(matched);
    });
    return result;
  }, [query]);

  const inputStyle = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
    background: 'var(--bg-surface)', borderRadius: 8, border: '0.5px solid var(--border)',
    margin: '0 var(--pad-page) 10px',
  };

  return (
    <PageLayout>
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)', paddingBottom: 90 }}>

        {/* ---------------- 헤더 ---------------- */}
        <header style={{ padding: '20px var(--pad-page) 14px', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Link href="/" aria-label="뒤로" style={{ color: 'var(--text-secondary)', display: 'flex' }}>
              <IconChevronLeft size={18} stroke={1.75} />
            </Link>
            <p className="header-eyebrow" style={{ margin: 0 }}>SANGUOZHI · DECK OPS</p>
          </div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>백과사전</h1>
        </header>

        {/* ---------------- 검색 ---------------- */}
        <div style={inputStyle}>
          <IconSearch size={15} stroke={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="장수, 전법, 용어 검색"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: 13,
            }}
          />
        </div>

        {/* ---------------- 카테고리 칩 ---------------- */}
        <div style={{ display: 'flex', gap: 6, padding: '0 var(--pad-page) 12px', overflowX: 'auto' }}>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => { setCategory(c.key); setDetailGeneral(null); setDetailTactic(null); }}
              style={{
                fontSize: 11, padding: '6px 10px', borderRadius: 4, whiteSpace: 'nowrap', cursor: 'pointer',
                background: category === c.key ? 'var(--accent)' : 'transparent',
                color: category === c.key ? 'var(--accent-on)' : 'var(--text-secondary)',
                border: category === c.key ? 'none' : '0.5px solid var(--border-strong)',
                fontWeight: category === c.key ? 500 : 400,
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>데이터를 불러오는 중입니다...</p>
        ) : (
          <div style={{ padding: '0 var(--pad-page)' }}>

            {/* ================= 장수도감 ================= */}
            {category === 'generals' && !detailGeneral && (
              <ListSection>
                {filteredGenerals.map(gen => (
                  <ListItem
                    key={gen.id}
                    barColor={factionColors[gen.faction] || 'var(--text-muted)'}
                    title={gen.name}
                    subtitle={[inferGeneralRole(gen)?.join?.(' · ') || gen.primary_role, gen.troop_type].filter(Boolean).join(' · ')}
                    onClick={() => setDetailGeneral(gen)}
                  />
                ))}
                {filteredGenerals.length === 0 && <EmptyNotice text="검색 결과가 없습니다." />}
              </ListSection>
            )}

            {category === 'generals' && detailGeneral && (
              <GeneralDetail
                general={detailGeneral}
                combos={getCombosForGeneral(detailGeneral.name)}
                onBack={() => setDetailGeneral(null)}
              />
            )}

            {/* ================= 전법도감 ================= */}
            {category === 'tactics' && !detailTactic && (
              <ListSection>
                {filteredTactics.map(tac => (
                  <ListItem
                    key={tac.id}
                    barColor="var(--accent)"
                    title={tac.name}
                    subtitle={inferTacticRole(tac)?.join?.(' · ') || tac.type}
                    onClick={() => setDetailTactic(tac)}
                  />
                ))}
                {filteredTactics.length === 0 && <EmptyNotice text="검색 결과가 없습니다." />}
              </ListSection>
            )}

            {category === 'tactics' && detailTactic && (
              <TacticDetail
                tactic={detailTactic}
                recommended={findRecommendedGenerals(detailTactic, generals)}
                onBack={() => setDetailTactic(null)}
              />
            )}

            {/* ================= 인연도감 ================= */}
            {category === 'synergies' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20 }}>
                {filteredSynergies.map(s => (
                  <div key={s.name} style={{
                    padding: 12, background: 'var(--bg-surface)', borderRadius: 10,
                    border: s.isComplete ? '0.5px solid var(--accent)' : '0.5px solid transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {s.isComplete && <span style={{ color: 'var(--accent)' }}>✔</span>}
                        {s.name}
                      </span>
                      <span style={{ fontSize: 11, color: s.isComplete ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {s.matchedMembers.length}/{s.req_count}인 · {s.progressPercent}%
                      </span>
                    </div>

                    <div style={{ height: 4, borderRadius: 999, background: 'var(--bg-page)', overflow: 'hidden', marginBottom: 8 }}>
                      <div style={{
                        width: `${s.progressPercent}%`, height: '100%',
                        background: s.isComplete ? 'var(--accent)' : 'var(--text-muted)',
                        transition: 'width 0.2s ease',
                      }} />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                      {(s.members || []).map(m => {
                        const owned = ownedGeneralNames.has(m);
                        return (
                          <span key={m} style={{
                            fontSize: 11, padding: '3px 8px', borderRadius: 999,
                            background: owned ? 'rgba(184,135,58,0.15)' : 'var(--bg-page)',
                            color: owned ? 'var(--accent)' : 'var(--text-secondary)',
                            border: owned ? '0.5px solid var(--accent)' : '0.5px solid var(--border-strong)',
                            fontWeight: owned ? 600 : 400,
                          }}>
                            {m}
                          </span>
                        );
                      })}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {s.effect}
                    </p>
                  </div>
                ))}
                {filteredSynergies.length === 0 && <EmptyNotice text="검색 결과가 없습니다." />}
              </div>
            )}

            {/* ================= 장수 콤보 ================= */}
            {category === 'combos' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 20 }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 4px' }}>
                  연의 효과는 인게임 공식 데이터가 아니며, 천하결전 카페 패밀리맨74님이 제안하신 커뮤니티 해석 자료를 반영한 것입니다.
                </p>
                {filteredCombos.map((c, i) => (
                  <ComboCard key={i} combo={c} />
                ))}
                {filteredCombos.length === 0 && <EmptyNotice text="검색 결과가 없습니다." />}
              </div>
            )}

            {/* ================= 용어사전 ================= */}
            {category === 'glossary' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 20 }}>
                {Object.entries(filteredGlossary).map(([cat, terms]) => (
                  <div key={cat}>
                    <p style={{ fontSize: 11, color: 'var(--accent)', letterSpacing: '0.05em', margin: '0 0 8px', fontFamily: 'var(--font-mono)' }}>
                      {cat.toUpperCase()}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {Object.entries(terms).map(([term, def]) => (
                        <div key={term} style={{ padding: 10, background: 'var(--bg-surface)', borderRadius: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{term}</span>
                          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{def}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {Object.keys(filteredGlossary).length === 0 && <EmptyNotice text="검색 결과가 없습니다." />}
              </div>
            )}
          </div>
        )}

        {/* ---------------- 하단 탭 (홈 탭으로 딥링크) ---------------- */}
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          maxWidth: 480, margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '10px 0', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          background: 'var(--bg-page)', borderTop: '0.5px solid var(--border)',
        }}>
          {BOTTOM_NAV.map(({ tab, label, icon: Icon, disabled }) => (
            disabled ? (
              <span
                key={tab}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1,
                  color: 'var(--text-muted)', fontSize: 10, opacity: 0.4,
                }}
              >
                <Icon size={18} stroke={1.75} />
                {label}
              </span>
            ) : (
              <Link
                key={tab}
                href={`/?tab=${tab}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1,
                  textDecoration: 'none', color: 'var(--text-muted)', fontSize: 10,
                }}
              >
                <Icon size={18} stroke={1.75} />
                {label}
              </Link>
            )
          ))}
        </nav>
      </div>
    </PageLayout>
  );
}

// ==================== 하위 컴포넌트 ====================

function ListSection({ children }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 20 }}>{children}</div>;
}

function ListItem({ barColor, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        background: 'var(--bg-surface)', borderRadius: 8, border: 'none',
        borderLeft: `2px solid ${barColor}`, cursor: 'pointer', textAlign: 'left', width: '100%',
      }}
    >
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 14, color: 'var(--text-primary)' }}>{title}</span>
        {subtitle && (
          <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--text-secondary)' }}>{subtitle}</span>
        )}
      </span>
      <IconChevronRight size={15} stroke={1.75} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
    </button>
  );
}

function EmptyNotice({ text }) {
  return <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 30 }}>{text}</p>;
}

function DetailHeader({ backLabel, onBack }) {
  return (
    <button
      onClick={onBack}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
        color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', padding: '10px 0', marginBottom: 4,
      }}
    >
      <IconChevronLeft size={16} stroke={1.75} />
      {backLabel}
    </button>
  );
}

function GeneralDetail({ general, combos, onBack }) {
  const positiveCombos = combos.filter(c => (c.score ?? 0) >= 0);
  const negativeCombos = combos.filter(c => (c.score ?? 0) < 0);

  return (
    <div style={{ paddingBottom: 20 }}>
      <DetailHeader backLabel="장수도감" onBack={onBack} />

      <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto 10px',
          background: 'var(--bg-surface)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, color: 'var(--accent)', overflow: 'hidden',
        }}>
          {general.image_url ? (
            <img src={general.image_url} alt={general.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : general.name?.charAt(0)}
        </div>
        <h2 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)' }}>{general.name}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {[inferGeneralRole(general)?.join?.(' · '), general.faction, general.troop_type].filter(Boolean).join(' · ')}
        </p>
      </div>

      {general.unique_tactic_name && (
        <div style={{ padding: 12, background: 'var(--bg-surface)', borderRadius: 8, marginBottom: 16 }}>
          <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
            고유전법 · {general.unique_tactic_name}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {general.unique_tactic_effect || '설명이 등록되지 않았습니다.'}
          </p>
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em', margin: '0 0 8px' }}>장수 콤보</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 8px' }}>
        연의 효과는 인게임 공식 데이터가 아니며, 천하결전 카페 패밀리맨74님이 제안하신 커뮤니티 해석 자료를 반영한 것입니다.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: positiveCombos.length ? 20 : 0 }}>
        {positiveCombos.length > 0 ? positiveCombos.map((c, i) => (
          <ComboCard key={i} combo={c} highlightName={general.name} />
        )) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>등록된 콤보가 없습니다.</p>
        )}
      </div>

      {negativeCombos.length > 0 && (
        <>
          <p style={{ fontSize: 11, color: 'var(--grade-s)', letterSpacing: '0.05em', margin: '0 0 8px' }}>피해야 할 조합</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {negativeCombos.map((c, i) => (
              <ComboCard key={i} combo={c} highlightName={general.name} negative />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TacticDetail({ tactic, recommended, onBack }) {
  return (
    <div style={{ paddingBottom: 20 }}>
      <DetailHeader backLabel="전법도감" onBack={onBack} />

      <h2 style={{ margin: '10px 0 4px', fontSize: 18, color: 'var(--text-primary)' }}>{tactic.name}</h2>
      <p style={{ margin: '0 0 14px', fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {inferTacticRole(tactic)?.join?.(' · ') || tactic.type}
      </p>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {tactic.description || '설명이 등록되지 않았습니다.'}
      </p>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em', margin: '0 0 8px' }}>추천 장수</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {recommended.length > 0 ? recommended.map(g => (
          <span key={g.id} style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 999,
            background: 'var(--bg-surface)', color: 'var(--text-primary)',
            border: '0.5px solid var(--border-strong)',
          }}>
            {g.name}
          </span>
        )) : (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>계열이 일치하는 장수를 찾지 못했습니다.</span>
        )}
      </div>
    </div>
  );
}

function ComboCard({ combo, highlightName, negative }) {
  const isNegative = negative || (combo.score ?? 0) < 0;
  const leaderLabel = combo.leader_name === highlightName ? highlightName : combo.leader_name;
  const followerLabel = combo.follower_name === highlightName ? highlightName : combo.follower_name;

  return (
    <div style={{
      padding: '10px 12px', background: 'var(--bg-surface)', borderRadius: 8,
      borderLeft: `2px solid ${isNegative ? 'var(--grade-s)' : 'var(--grade-b)'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 13, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <IconLink size={12} stroke={1.75} style={{ color: 'var(--text-muted)' }} />
          {leaderLabel} → {followerLabel}
        </span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: isNegative ? 'var(--grade-s)' : 'var(--grade-b)' }}>
          {combo.score > 0 ? `+${combo.score}` : combo.score}
        </span>
      </div>
      {combo.provides && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
          <IconBolt size={11} stroke={1.75} style={{ verticalAlign: 'middle', marginRight: 2, color: 'var(--accent)' }} />
          제공: {combo.provides}
        </p>
      )}
      {combo.follower_effect && (
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-secondary)' }}>
          효과: {combo.follower_effect}
        </p>
      )}
    </div>
  );
}