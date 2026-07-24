'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { factionColors, tacticColors } from '../styles/colors';
import PageLayout from './components/PageLayout';
import { useDeckAssets } from '../hooks/useDeckAssets';
import Dictionary from './components/Dictionary';
import { recommendFullSquads } from './lib/squadRecommendation';
import { matchFormationInfo } from '../data/synergies';
import ScreenshotChecker from './components/ScreenshotChecker';
import { supabase } from './lib/supabaseClient';
import FeedbackForm from './components/FeedbackForm';

const HANJA_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export default function MyDeckPage() {
  const {
    generals, tactics, synergies, tierDecks, isLoading,
    selectedGenerals, selectedTactics,
    toggleGeneral, toggleTactic,
    saveDeck, isSaving, countdown
  } = useDeckAssets();

  const [activeTab, setActiveTab] = useState('my-assets');
  const [showNotice, setShowNotice] = useState(true);

  // 🔹 필터 상태 추가 (기본값: '전체')
  const [generalFactionFilter, setGeneralFactionFilter] = useState('전체');
  const [tacticGradeFilter, setTacticGradeFilter] = useState('전체');

  // 📜 발행인 닉네임 (등용 명부 직인용)
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
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && ['my-assets', 'dictionary', 'auto-squad'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  const getActiveSynergies = () => {
    const selectedNames = generals
      .filter(gen => selectedGenerals.includes(gen.id))
      .map(gen => gen.name);

    return synergies.filter(synergy => {
      if (!synergy.members || !Array.isArray(synergy.members)) return false;
      const matchedCount = synergy.members.filter(member =>
        selectedNames.includes(member)
      ).length;
      return matchedCount >= synergy.req_count;
    });
  };

  const activeSynergies = getActiveSynergies();

  // 🔹 장수 필터링 로직
  const filteredGenerals = generals.filter(gen => {
    if (generalFactionFilter === '전체') return true;
    return gen.faction === generalFactionFilter;
  });

  // 🔹 전법 필터링 로직
  const filteredTactics = tactics.filter(t => {
    if (tacticGradeFilter === '전체') return true;
    return t.grade === tacticGradeFilter;
  });

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        {/* 상단 삼국지 전통 가로형 탭바 */}
        <nav className="classic-tabbar mb-8 flex-wrap justify-center sm:justify-start gap-2 border-b border-[var(--gold)]/30 pb-3">
          <button
            onClick={() => setActiveTab('my-assets')}
            className={`classic-tab ${activeTab === 'my-assets' ? 'active' : ''}`}
          >
            나의 보유 현황
          </button>
          <button
            onClick={() => setActiveTab('dictionary')}
            className={`classic-tab ${activeTab === 'dictionary' ? 'active' : ''}`}
          >
            통합 도감
          </button>
          <Link href="/matches" className="classic-tab">
            티어덱 매칭
          </Link>
          <Link href="/squads" className="classic-tab">
            1-5군 추천 편성
          </Link>
          <Link href="/vs" className="classic-tab">⚔️ 모의 대결</Link>
          <button
  onClick={() => setActiveTab('feedback')}
  className={`classic-tab ${activeTab === 'feedback' ? 'active' : ''}`}
>
  📝 의견 남기기
</button>
        </nav>

        {isLoading ? (
          <h1 className="classic-title text-3xl font-bold text-center" style={{ marginTop: '80px' }}>
            천하 결전 무장 도감 데이터를 수집하고 있습니다...
          </h1>
        ) : (
          <>
            {/* 1. 나의 보유 현황 탭 — 등용 명부(等用名簿) 문서 형태 */}
            {activeTab === 'my-assets' && (
              <div
                style={{
                  position: 'relative',
                  background: 'linear-gradient(180deg, var(--paper-soft) 0%, var(--paper) 45%, var(--paper-soft) 100%)',
                  border: '3px double var(--gold)',
                  borderRadius: '6px',
                  padding: '40px 44px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2), inset 0 0 80px rgba(139,94,52,0.08)',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--ink-text)',
                  overflow: 'hidden'
                }}
              >
                {/* 얇은 이중 테두리 */}
                <div style={{
                  position: 'absolute', inset: '9px', border: '1px solid rgba(139,94,52,0.3)',
                  borderRadius: '3px', pointerEvents: 'none'
                }} />

                {/* ---------------- 머리말: 세로 제목 + 직인 ---------------- */}
                <div style={{
                  position: 'relative', zIndex: 1,
                  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                  borderBottom: '2px solid var(--gold)', paddingBottom: '20px', marginBottom: '28px'
                }}>
                  <div style={{
                    writingMode: 'vertical-rl', textOrientation: 'upright',
                    fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.2em',
                    color: 'var(--seal-dark)', flexShrink: 0, marginRight: '18px', lineHeight: 1.3
                  }}>
                    等用名簿
                  </div>

                  <div style={{ flex: 1, textAlign: 'center', paddingTop: '4px' }}>
                    <h1 className="classic-title text-3xl font-bold" style={{ margin: 0, color: 'var(--ink-text)' }}>
                      나의 보유 현황
                    </h1>
                    <p style={{ color: 'var(--ink-text)', opacity: 0.85, marginTop: '10px', fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.6 }}>
                      현재 실제 막사에 등용된 장수와 확보한 전법들을 정밀히 체크해 주십시오.<br />
                      이 명부에 기록된 자산이 곧 출정 편성의 근거가 됩니다.
                    </p>
                  </div>

                  {/* 낙관형 직인 */}
                  <div style={{ flexShrink: 0, marginLeft: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{
                      width: '68px', height: '68px',
                      border: '3px solid var(--seal-dark)',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(139,41,31,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transform: 'rotate(-3deg)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                    }}>
                      <span style={{
                        writingMode: 'vertical-rl', textOrientation: 'upright',
                        fontSize: '0.9rem', fontWeight: 900, color: 'var(--seal-dark)', letterSpacing: '0.1em'
                      }}>
                        {userNickname || '맹원'}印
                      </span>
                    </div>
                    <span style={{ fontSize: '0.65rem', color: 'var(--gold-soft)', marginTop: '6px' }}>등용주 직인</span>
                  </div>
                </div>

                <ScreenshotChecker
                  generals={generals}
                  tactics={tactics}
                  selectedGenerals={selectedGenerals}
                  selectedTactics={selectedTactics}
                  toggleGeneral={toggleGeneral}
                  toggleTactic={toggleTactic}
                />

                {/* ---------------- 第一條: 보유 장수 ---------------- */}
                <section style={{ position: 'relative', zIndex: 1, marginTop: '24px', paddingBottom: '26px', borderBottom: '1px dashed rgba(139,94,52,0.4)' }}>
                  <div className="scroll-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                      <h2 className="classic-heading text-2xl font-bold" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ color: 'var(--seal-dark)', fontWeight: 900 }}>第{HANJA_NUM[0]}條</span>
                        보유 장수 선택 ({selectedGenerals.length}명)
                      </h2>

                      {/* 🔹 장수 진영 필터 버튼 */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['전체', '위', '촉', '오', '군'].map(faction => (
                          <button
                            key={faction}
                            onClick={() => setGeneralFactionFilter(faction)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: '1px solid var(--gold)',
                              backgroundColor: generalFactionFilter === faction
                                ? (factionColors[faction] || 'var(--seal-dark)')
                                : 'var(--paper-soft)',
                              color: generalFactionFilter === faction ? 'white' : 'var(--ink-text)',
                              transition: 'all 0.15s'
                            }}
                          >
                            {faction}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="asset-grid">
                      {filteredGenerals.map(gen => (
                        <button
                          key={gen.id}
                          onClick={() => toggleGeneral(gen.id)}
                          style={{
                            padding: '12px',
                            fontSize: '1.05rem',
                            fontFamily: 'var(--font-body)',
                            backgroundColor: selectedGenerals.includes(gen.id) ? (factionColors[gen.faction] || '#8d6e63') : 'var(--paper-soft)',
                            border: selectedGenerals.includes(gen.id) ? '2px solid var(--ink-text)' : `2px solid ${factionColors[gen.faction] || '#cbd5e1'}`,
                            color: selectedGenerals.includes(gen.id) ? 'white' : 'var(--ink-text)',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                        >
                          {gen.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ---------------- 第二條: 보유 전법 ---------------- */}
                <section style={{ position: 'relative', zIndex: 1, marginTop: '24px' }}>
                  <div className="scroll-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '16px' }}>
                      <h2 className="classic-heading text-2xl font-bold" style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span style={{ color: 'var(--seal-dark)', fontWeight: 900 }}>第{HANJA_NUM[1]}條</span>
                        보유 전법 선택 ({selectedTactics.length}개)
                      </h2>

                      {/* 🔹 전법 등급 필터 버튼 */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {['전체', '황금', '보라'].map(grade => (
                          <button
                            key={grade}
                            onClick={() => setTacticGradeFilter(grade)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              border: '1px solid var(--gold)',
                              backgroundColor: tacticGradeFilter === grade
                                ? (tacticColors[grade] || 'var(--seal-dark)')
                                : 'var(--paper-soft)',
                              color: tacticGradeFilter === grade ? 'white' : 'var(--ink-text)',
                              transition: 'all 0.15s'
                            }}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="asset-grid">
                      {filteredTactics.map(t => (
                        <button
                          key={t.id}
                          onClick={() => toggleTactic(t.id)}
                          style={{
                            padding: '12px',
                            fontSize: '1.05rem',
                            fontFamily: 'var(--font-body)',
                            backgroundColor: selectedTactics.includes(t.id) ? (t.grade === '보라' ? tacticColors['보라'] : tacticColors['황금']) : 'var(--paper-soft)',
                            border: selectedTactics.includes(t.id) ? '2px solid var(--ink-text)' : `2px solid ${t.grade === '보라' ? tacticColors['보라'] : tacticColors['황금']}`,
                            color: selectedTactics.includes(t.id) ? 'white' : 'var(--ink-text)',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                          }}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* ---------------- 하단: 기록 보존 + 확인 낙관 ---------------- */}
                <div style={{
                  position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '14px', marginTop: '36px', paddingTop: '20px',
                  borderTop: '1px solid rgba(139,94,52,0.3)'
                }}>
                  <button className="seal-button" onClick={saveDeck} disabled={isSaving}>
                    {isSaving ? `막사 정보 기록 중... (${countdown})` : '보유 현황 기록 보존하기'}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--ink-text)', opacity: 0.75 }}>
                      본 명부는 {userNickname} 님의 명의로 기록됨
                    </span>
                    <div style={{
                      width: '38px', height: '38px', border: '2px solid var(--seal-dark)', borderRadius: '4px',
                      backgroundColor: 'rgba(139,41,31,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transform: 'rotate(4deg)'
                    }}>
                      <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--seal-dark)' }}>記</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. 통합 도감 탭 */}
            {activeTab === 'dictionary' && (
              <Dictionary
                generals={generals}
                tactics={tactics}
                activeSynergies={activeSynergies}
                selectedGenerals={selectedGenerals}
                selectedTactics={selectedTactics}
              />
            )}
            {/* 3. 의견 남기기 탭 */}
{activeTab === 'feedback' && (
  <FeedbackForm userNickname={userNickname} />
)}

          </>
        )}
      </div>

      {/* 📢 피드백 안내 팝업 모달 */}
{showNotice && (
  <div style={{
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  }}>
    <div className="scroll-panel" style={{
      width: '100%',
      maxWidth: '440px',
      backgroundColor: 'var(--paper-soft)',
      border: '2px solid var(--gold)',
      borderRadius: '8px',
      padding: '28px 24px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      textAlign: 'center',
      position: 'relative'
    }}>
      <h3 className="classic-title text-2xl font-bold" style={{ marginBottom: '14px', color: 'var(--seal-dark)' }}>
        🚨 테스트 버전 안내
      </h3>
      
      <p style={{ fontSize: '0.95rem', color: 'var(--ink-text)', lineHeight: '1.6', marginBottom: '16px' }}>
        현재 <strong>천하결전 덱 편성 웹앱</strong>은 정식 오픈 전 <strong>테스트 버전</strong>입니다. 
      </p>

      <div style={{
        padding: '14px',
        backgroundColor: 'rgba(139,41,31,0.05)',
        border: '1px dashed var(--gold)',
        borderRadius: '6px',
        marginBottom: '20px'
      }}>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--seal-dark)', fontWeight: 'bold', lineHeight: '1.5' }}>
          💬 여러분의 적극적인 피드백을 기다립니다!
        </p>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: 'var(--ink-text)', opacity: 0.85 }}>
          사용 중 발생한 오류나 추가되었으면 하는 기능이 있다면 상단 [📝 의견 남기기] 탭을 통해 아낌없이 전해 주세요.
        </p>
      </div>

      <button
        className="seal-button"
        onClick={() => setShowNotice(false)}
        style={{ width: '100%', padding: '10px 0', fontSize: '0.95rem' }}
      >
        확인했습니다 (막사 입장)
      </button>
    </div>
  </div>
)}
    </PageLayout>
  );
}
