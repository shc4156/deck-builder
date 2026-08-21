'use client';
import { useState, useEffect } from 'react';
import { factionColors, tacticColors } from '../../../styles/colors';
import { useDeckAssets } from '../../../hooks/useDeckAssets';
import { useProfile } from '../ProfileContext';
import FeedbackForm from '../FeedbackForm';
import Link from 'next/link';
import { IconBook2, IconMessage2, IconX, IconChevronDown, IconChevronUp } from '@tabler/icons-react';

// 통합 도감 탭(Dictionary)은 새 구조에서 /encyclopedia 로 옮겨졌으므로 이 페이지에서 제거했습니다.
// recommendFullSquads, matchFormationInfo는 이 파일에서 쓰이지 않아 정리했습니다.
// activeTab 상태도 이 페이지가 "보유 현황" 하나만 담당하게 되면서 제거했습니다.
// (통합 도감/의견 남기기를 다시 이 파일 안에서 탭으로 쓰고 싶다면 이 주석 지우고 되돌리면 됩니다)

export default function StatusTab({ onNavigate }) {
  const {
    generals, tactics, isLoading,
    selectedGenerals, selectedTactics,
    setSelectedGenerals, setSelectedTactics,
    toggleGeneral, toggleTactic,
    saveDeck, isSaving, countdown
  } = useDeckAssets();

  const [showNotice, setShowNotice] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [dontShowNoticeAgain, setDontShowNoticeAgain] = useState(false);

  // 안내 팝업: 이전에 "다시 보지 않기"를 선택한 적이 없을 때만 띄운다.
  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('status-notice-dismissed');
    if (!dismissed) setShowNotice(true);
  }, []);

  const closeNotice = () => {
    if (dontShowNoticeAgain) {
      localStorage.setItem('status-notice-dismissed', '1');
    }
    setShowNotice(false);
  };

  const [generalFactionFilter, setGeneralFactionFilter] = useState('전체');
  const [tacticGradeFilter, setTacticGradeFilter] = useState('전체');
  const [tacticTypeFilter, setTacticTypeFilter] = useState('전체');
  const [generalsCollapsed, setGeneralsCollapsed] = useState(false);
  const [tacticsCollapsed, setTacticsCollapsed] = useState(false);

  // 닉네임은 여기서 profiles를 따로 조회하지 않고 ProfileContext(세션당 1회 로딩)에서 읽는다.
  const profile = useProfile();
  const userNickname = profile?.nickname || '백정';

  const filteredGenerals = generals.filter(gen => {
    if (generalFactionFilter === '전체') return true;
    return gen.faction === generalFactionFilter;
  });

  const filteredTactics = tactics.filter(t => {
    const gradeMatch = tacticGradeFilter === '전체' || t.grade === tacticGradeFilter;
    const typeMatch = tacticTypeFilter === '전체' || t.type === tacticTypeFilter;
    return gradeMatch && typeMatch;
  });

  return (
    <>
      <div style={{ maxWidth: 480, margin: '0 auto', background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)' }}>

        {/* ---------------- 헤더: 타이틀 + 백과사전/의견남기기 아이콘 ---------------- */}
        <header style={{
          padding: '20px var(--pad-page) 14px',
          borderBottom: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <p className="header-eyebrow" style={{ margin: '0 0 4px' }}>SANGUOZHI · DECK OPS</p>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>보유 현황</h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '6px 0 0', fontFamily: 'var(--font-mono)' }}>
              장수 {selectedGenerals.length} · 전법 {selectedTactics.length}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowFeedback(true)}
              aria-label="의견 남기기"
              style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', border: 'none', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <IconMessage2 size={17} stroke={1.75} />
            </button>
            <Link
              href="/encyclopedia"
              aria-label="백과사전"
              style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-surface)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', cursor: 'pointer' }}
            >
              <IconBook2 size={18} stroke={1.75} />
            </Link>
          </div>
        </header>

        {isLoading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>
            데이터를 불러오는 중입니다...
          </p>
        ) : (
          <div style={{ padding: '0 var(--pad-page) 24px' }}>

            {/* ---------------- 보유 장수 ---------------- */}
            <section style={{ marginTop: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => setGeneralsCollapsed(prev => !prev)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', color: 'var(--text-primary)',
                  }}
                >
                  <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
                    보유 장수 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({selectedGenerals.length}명)</span>
                  </h2>
                  {generalsCollapsed
                    ? <IconChevronDown size={16} stroke={1.75} style={{ color: 'var(--text-muted)' }} />
                    : <IconChevronUp size={16} stroke={1.75} style={{ color: 'var(--text-muted)' }} />}
                </button>
                {!generalsCollapsed && (
                <button
                  onClick={() => {
                    const idsInView = filteredGenerals.map(g => g.id);
                    const allSelected = idsInView.every(id => selectedGenerals.includes(id));
                    setSelectedGenerals(prev => allSelected
                      ? prev.filter(id => !idsInView.includes(id))
                      : Array.from(new Set([...prev, ...idsInView]))
                    );
                  }}
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 4,
                    border: '0.5px solid var(--border-strong)', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  {filteredGenerals.every(g => selectedGenerals.includes(g.id)) ? '전체 해제' : '전체 선택'}
                </button>
                )}
              </div>
              {!generalsCollapsed && (
              <>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {['전체', '위', '촉', '오', '군'].map(faction => {
                  const active = generalFactionFilter === faction;
                  const dotColor = factionColors[faction];
                  return (
                    <button
                      key={faction}
                      onClick={() => setGeneralFactionFilter(faction)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 11, padding: '5px 10px', borderRadius: 4,
                        cursor: 'pointer',
                        background: active ? 'var(--accent)' : 'transparent',
                        color: active ? 'var(--accent-on)' : 'var(--text-secondary)',
                        border: active ? 'none' : '0.5px solid var(--border-strong)',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      {dotColor && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                      )}
                      {faction}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 8 }}>
                {filteredGenerals.map(gen => {
                  const selected = selectedGenerals.includes(gen.id);
                  const barColor = factionColors[gen.faction] || 'var(--text-muted)';
                  return (
                    <button
                      key={gen.id}
                      onClick={() => toggleGeneral(gen.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        padding: '10px 12px', textAlign: 'left',
                        borderRadius: 10, cursor: 'pointer',
                        background: selected ? 'rgba(184,135,58,0.08)' : 'var(--bg-surface)',
                        border: 'none',
                        borderLeft: `2px solid ${barColor}`,
                        opacity: selected ? 1 : 0.55,
                        transition: 'opacity 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <span style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{
                            fontSize: 14, fontWeight: selected ? 500 : 400, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {gen.name}
                          </span>
                          <span style={{
                            fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                            background: gen.season === 'S2' ? 'rgba(58,123,200,0.18)' : 'rgba(255,255,255,0.08)',
                            color: gen.season === 'S2' ? '#5b9fe0' : 'var(--text-muted)',
                            border: `1px solid ${gen.season === 'S2' ? 'rgba(58,123,200,0.4)' : 'var(--border-strong)'}`,
                          }}>
                            {gen.season || 'S1'}
                          </span>
                        </span>
                        <span style={{
                          display: 'block', marginTop: 2, fontSize: 10.5, color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {gen.primary_role || '\u00A0'}
                        </span>
                      </span>
                      <span style={{
                        width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 700, lineHeight: 1,
                        background: selected ? 'var(--accent)' : 'transparent',
                        color: selected ? 'var(--accent-on)' : 'transparent',
                        border: selected ? 'none' : '0.5px solid var(--border-strong)',
                      }}>
                        {selected ? '✓' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
              </>
              )}
            </section>


            {/* ---------------- 보유 전법 ---------------- */}
            <section style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                <button
                  onClick={() => setTacticsCollapsed(prev => !prev)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', color: 'var(--text-primary)',
                  }}
                >
                  <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>
                    보유 전법 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({selectedTactics.length}개)</span>
                  </h2>
                  {tacticsCollapsed
                    ? <IconChevronDown size={16} stroke={1.75} style={{ color: 'var(--text-muted)' }} />
                    : <IconChevronUp size={16} stroke={1.75} style={{ color: 'var(--text-muted)' }} />}
                </button>
                {!tacticsCollapsed && (
                <button
                  onClick={() => {
                    const idsInView = filteredTactics.map(t => t.id);
                    const allSelected = idsInView.every(id => selectedTactics.includes(id));
                    setSelectedTactics(prev => allSelected
                      ? prev.filter(id => !idsInView.includes(id))
                      : Array.from(new Set([...prev, ...idsInView]))
                    );
                  }}
                  style={{
                    fontSize: 11, padding: '5px 10px', borderRadius: 4,
                    border: '0.5px solid var(--border-strong)', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  {filteredTactics.every(t => selectedTactics.includes(t.id)) ? '전체 해제' : '전체 선택'}
                </button>
                )}
              </div>
              {!tacticsCollapsed && (
              <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {['전체', '황금', '보라'].map(grade => {
                  const active = tacticGradeFilter === grade;
                  const dotColor = tacticColors[grade];
                  return (
                    <button
                      key={grade}
                      onClick={() => setTacticGradeFilter(grade)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        fontSize: 11, padding: '5px 10px', borderRadius: 4,
                        cursor: 'pointer',
                        background: active ? 'var(--accent)' : 'transparent',
                        color: active ? 'var(--accent-on)' : 'var(--text-secondary)',
                        border: active ? 'none' : '0.5px solid var(--border-strong)',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      {dotColor && (
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block' }} />
                      )}
                      {grade}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {['전체', '액티브', '추격', '패시브', '지휘'].map(type => {
                  const active = tacticTypeFilter === type;
                  return (
                    <button
                      key={type}
                      onClick={() => setTacticTypeFilter(type)}
                      style={{
                        fontSize: 11, padding: '5px 10px', borderRadius: 4,
                        cursor: 'pointer',
                        background: active ? 'var(--accent)' : 'transparent',
                        color: active ? 'var(--accent-on)' : 'var(--text-secondary)',
                        border: active ? 'none' : '0.5px solid var(--border-strong)',
                        fontWeight: active ? 500 : 400,
                      }}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 8 }}>
                {filteredTactics.map(t => {
                  const selected = selectedTactics.includes(t.id);
                  const barColor = tacticColors[t.grade] || 'var(--text-muted)';
                  if (!tacticColors[t.grade]) {
                    // tacticColors에 t.grade 값과 일치하는 키가 없다는 뜻입니다.
                    // 콘솔에서 실제 grade 값과 tacticColors의 키를 비교해보세요.
                    console.warn('[tacticColors 매칭 실패]', { name: t.name, grade: t.grade, tacticColorsKeys: Object.keys(tacticColors) });
                  }
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTactic(t.id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
                        padding: '10px 12px', textAlign: 'left',
                        borderRadius: 10, cursor: 'pointer',
                        background: selected ? 'rgba(184,135,58,0.08)' : 'var(--bg-surface)',
                        border: 'none',
                        borderLeft: `2px solid ${barColor}`,
                        opacity: selected ? 1 : 0.55,
                        transition: 'opacity 0.15s ease, background 0.15s ease',
                      }}
                    >
                      <span style={{ flex: 1, overflow: 'hidden' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{
                            fontSize: 14, fontWeight: selected ? 500 : 400, color: 'var(--text-primary)',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>
                            {t.name}
                          </span>
                          <span style={{
                            fontSize: 8.5, fontWeight: 700, padding: '1px 4px', borderRadius: 3, flexShrink: 0,
                            background: t.season === 'S2' ? 'rgba(58,123,200,0.18)' : 'rgba(255,255,255,0.08)',
                            color: t.season === 'S2' ? '#5b9fe0' : 'var(--text-muted)',
                            border: `1px solid ${t.season === 'S2' ? 'rgba(58,123,200,0.4)' : 'var(--border-strong)'}`,
                          }}>
                            {t.season || 'S1'}
                          </span>
                        </span>
                        <span style={{
                          display: 'block', marginTop: 2, fontSize: 10.5, color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {[t.type, t.trait].filter(Boolean).join(' / ') || '\u00A0'}
                        </span>
                      </span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                        {t.tier && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: barColor, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                            {t.tier}
                          </span>
                        )}
                        <span style={{
                          width: 15, height: 15, borderRadius: '50%', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 700, lineHeight: 1,
                          background: selected ? 'var(--accent)' : 'transparent',
                          color: selected ? 'var(--accent-on)' : 'transparent',
                          border: selected ? 'none' : '0.5px solid var(--border-strong)',
                        }}>
                          {selected ? '✓' : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              </>
              )}
            </section>

            {/* ---------------- 저장 ---------------- */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginTop: 28, paddingTop: 18, borderTop: '0.5px solid var(--border)' }}>
              <button
                onClick={saveDeck}
                disabled={isSaving}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 8,
                  background: 'var(--accent)', color: 'var(--accent-on)',
                  border: 'none', fontWeight: 500, fontSize: 14,
                  cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.7 : 1,
                }}
              >
                {isSaving ? `기록 중... (${countdown})` : '보유 현황 저장'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {userNickname} 님 계정으로 저장됩니다
              </span>
            </div>

            {/* ---------------- 플로팅 저장 버튼: 하단 네비게이션 바로 위에 항상 고정, 목록 끝까지 안 내려가도 바로 저장 가능 ---------------- */}
            <div style={{
              position: 'fixed',
              bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
              left: 0, right: 0,
              maxWidth: 480, margin: '0 auto',
              padding: '0 var(--pad-page)',
              zIndex: 90,
              pointerEvents: 'none',
            }}>
              <button
                onClick={saveDeck}
                disabled={isSaving}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 8,
                  background: 'var(--accent)', color: 'var(--accent-on)',
                  border: 'none', fontWeight: 500, fontSize: 14,
                  cursor: isSaving ? 'default' : 'pointer', opacity: isSaving ? 0.9 : 1,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
                  pointerEvents: 'auto',
                }}
              >
                {isSaving ? `기록 중... (${countdown})` : '보유 현황 저장'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ---------------- 테스트 버전 안내 팝업 ---------------- */}
      {showNotice && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 380, background: 'var(--bg-surface)', border: '0.5px solid var(--border-strong)', textAlign: 'center', padding: '28px 22px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 500 }}>테스트 버전 안내</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 16px' }}>
              현재 천하결전 덱 편성 웹앱은 정식 오픈 전 테스트 버전입니다.
            </p>
            <div style={{ padding: 12, background: 'var(--bg-page)', borderRadius: 8, marginBottom: 18, textAlign: 'left' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>여러분의 피드백을 기다립니다</p>
              <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                오류나 추가되었으면 하는 기능은 헤더의 말풍선 아이콘으로 남겨주세요.
              </p>
            </div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
              fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={dontShowNoticeAgain}
                onChange={(e) => setDontShowNoticeAgain(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              다시 보지 않기
            </label>
            <button
              onClick={closeNotice}
              style={{ width: '100%', padding: '10px 0', borderRadius: 8, background: 'var(--accent)', color: 'var(--accent-on)', border: 'none', fontWeight: 500, fontSize: 13, cursor: 'pointer' }}
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}

      {/* ---------------- 의견 남기기 모달 ---------------- */}
{showFeedback && (
  <div
    onClick={() => setShowFeedback(false)}   // ← 추가: 바깥 클릭 시 닫힘
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20,
    }}
  >
    <div
      className="card"
      onClick={(e) => e.stopPropagation()}   // ← 추가: 카드 내부 클릭은 안 닫히게
      style={{ width: '100%', maxWidth: 420, background: 'var(--bg-surface)', border: '0.5px solid var(--border-strong)', padding: 20, position: 'relative' }}
    >
      <button
        onClick={() => setShowFeedback(false)}
        aria-label="닫기"
        style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
      >
        <IconX size={18} />
      </button>
      <FeedbackForm userNickname={userNickname} />
    </div>
  </div>
)}
    </>
  );
}