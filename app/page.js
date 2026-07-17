// app/page.js
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { factionColors, tacticColors } from '../styles/colors';
import PageLayout from './components/PageLayout';
import { useDeckAssets } from '../hooks/useDeckAssets';
import Dictionary from './components/Dictionary';
import { recommendFullSquads } from './lib/squadRecommendation';
import { matchFormationInfo } from '../data/synergies';

export default function MyDeckPage() {
  const {
  generals, tactics, synergies, tierDecks, isLoading,
  selectedGenerals, selectedTactics,
  toggleGeneral, toggleTactic,
  saveDeck, isSaving, countdown
} = useDeckAssets();

  const [activeTab, setActiveTab] = useState('my-assets');

  // 다른 페이지(예: 티어덱 매칭)에서 ?tab=dictionary 같은 쿼리를 달고 들어왔을 때
  // 해당 탭으로 바로 열리도록 반영 (useSearchParams는 Suspense가 필요해서 window로 직접 처리)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && ['my-assets', 'dictionary', 'auto-squad'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  

  // '통합 도감' 탭 전용: 현재 보유 장수 조합으로 활성화된 인연을 뽑는 함수
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

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        {/* 상단 삼국지 전통 가로형 탭바 */}
        <nav className="classic-tabbar" style={{ marginBottom: '35px' }}>
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
        </nav>

        {isLoading ? (
          <h1 className="classic-title text-3xl font-bold text-center" style={{ marginTop: '80px' }}>
            천하 결전 무장 도감 데이터를 수집하고 있습니다...
          </h1>
        ) : (
          <>
            {/* 1. 나의 보유 현황 탭 */}
            {activeTab === 'my-assets' && (
              <>
                <h1 className="classic-title text-3xl font-bold mb-2">나의 보유 현황</h1>
                <p style={{ color: 'var(--gold-soft)', marginBottom: '30px', fontSize: '1rem', fontWeight: 500 }}>
                  현재 실제 막사에 등용된 장수와 확보한 전법들을 정밀히 체크해 주십시오.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                  <section className="scroll-panel">
                    <h2 className="classic-heading text-2xl font-bold mb-4">
                      보유 장수 선택 ({selectedGenerals.length}명)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                      {generals.map(gen => (
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
                  </section>

                  <section className="scroll-panel">
                    <h2 className="classic-heading text-2xl font-bold mb-4">
                      보유 전법 선택 ({selectedTactics.length}개)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                      {tactics.map(t => (
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
                  </section>
                </div>

                <button className="seal-button" style={{ marginTop: '40px' }} onClick={saveDeck} disabled={isSaving}>
                  {isSaving ? `막사 정보 기록 중... (${countdown})` : '보유 현황 기록 보존하기'}
                </button>
              </>
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

          </>
        )}
      </div>
    </PageLayout>
  );
}