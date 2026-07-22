'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import FormationGridVisual from '../components/FormationGridVisual';
import { useDeckAssets } from '../../hooks/useDeckAssets';
import { recommendFullSquadsVs } from '../lib/squadRecommendationVs';
import { simulateBattle } from '../lib/battleEngine';
import { supabase } from '../lib/supabaseClient'; // 상대 경로에 맞게 조정



export default function BattleVsPage() {
  // 💡 연구 중 안내 화면 (나중에 모의 대결 기능 작업 재개 시 이 return 블록만 주석 처리하거나 삭제하시면 됩니다)
  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {/* 상단 탭바 유지 */}
        <nav className="classic-tabbar" style={{ marginBottom: '50px', width: '100%' }}>
          <Link href="/?tab=my-assets" className="classic-tab">나의 보유 현황</Link>
          <Link href="/?tab=dictionary" className="classic-tab">통합 도감</Link>
          <Link href="/matches" className="classic-tab">티어덱 매칭</Link>
          <Link href="/squads" className="classic-tab">1-5군 추천 편성</Link>
          <span className="classic-tab active">⚔️ 모의 대결</span>
        </nav>

        <div className="scroll-panel" style={{ padding: '60px 40px', border: '2px solid var(--gold)', borderRadius: '8px', maxWidth: '600px', backgroundColor: 'var(--paper-soft)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🧪 📜 ⚔️</div>
          <h1 className="classic-heading text-3xl font-bold mb-4" style={{ color: 'var(--gold-dark, #b8935a)' }}>
            천하 모의전 연구 중
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--ink-text)', lineHeight: '1.7', marginBottom: '10px' }}>
            현재 8턴 시뮬레이션 계산 엔진 및 부대 데이터 정교화 작업을 진행하고 있습니다.
          </p>
          <p style={{ fontSize: '0.95rem', color: '#888' }}>
            빠른 시일 내에 보다 정확한 모의 대결 기능으로 찾아뵙겠습니다.
          </p>
        </div>
      </div>
    </PageLayout>
  );

  // --- 기존의 useState, useEffect, handleRunBattle 및 메인 JSX 구문은 이 아래에 그대로 유지 ---
  const { generals = [], tactics = [], selectedGenerals = [], selectedTactics = [], tierDecks = [], isLoading } = useDeckAssets();

  const [selectedMySquadIndex, setSelectedMySquadIndex] = useState('');
  const [selectedEnemyDeckId, setSelectedEnemyDeckId] = useState('');
  const [battleResult, setBattleResult] = useState(null);

  // 유저가 직접 저장한 1~5군 부대 데이터를 저장할 state
const [userSquads, setUserSquads] = useState([]);
const [isLoadingSquads, setIsLoadingSquads] = useState(true);

// Supabase에서 저장된 1~5군 부대 불러오기
useEffect(() => {
  async function fetchUserSquads() {
    try {
      setIsLoadingSquads(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsLoadingSquads(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('squads')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('스쿼드 불러오기 실패:', error.message);
      } else if (data && data.squads) {
        setUserSquads(data.squads); // 👈 저장된 1~5군 배열 데이터 반영
      }
    } catch (err) {
      console.error('스쿼드 로드 예외 발생:', err);
    } finally {
      setIsLoadingSquads(false);
    }
  }

  fetchUserSquads();
}, []);

const mySquads = useMemo(() => {
  // ⭕ 필수 데이터가 없거나 배열이 아닌 경우 빈 배열 반환 (TypeError 방지)
  if (
    !Array.isArray(generals) ||
    !Array.isArray(tactics) ||
    !Array.isArray(selectedGenerals) ||
    !Array.isArray(selectedTactics) ||
    !Array.isArray(tierDecks)
  ) {
    return [];
  }

  // 데이터가 모두 정상적으로 로드된 후 추천 실행
  const squads = recommendFullSquadsVs(
    tierDecks,
    generals,
    tactics,
    selectedGenerals,
    selectedTactics
  );

  return squads || [];
}, [tierDecks, generals, tactics, selectedGenerals, selectedTactics]);

// 💡 저장된 squads가 있으면 우선 적용, 없으면 추천 squads 사용
const displaySquads = userSquads.length > 0 ? userSquads : mySquads;

// 선택된 아군 및 적군 객체
const selectedMySquad = selectedMySquadIndex !== '' ? displaySquads[Number(selectedMySquadIndex)] : null;
const selectedEnemyDeck = tierDecks.find(d => String(d.id) === String(selectedEnemyDeckId));

// 💡 통합 및 수정된 전투 실행 핸들러
const handleRunBattle = () => {
  // 1. 아군 부대 선택 여부 및 데이터 존재 확인
  const activeSquads = userSquads.length > 0 ? userSquads : mySquads;
  const mySquad = selectedMySquadIndex !== '' ? activeSquads[Number(selectedMySquadIndex)] : null;

  if (!mySquad) {
    alert('출전시킬 아군 부대를 먼저 선택해 주세요.');
    return;
  }

  if (!selectedEnemyDeck) {
    alert('맞붙을 상대 티어덱을 선택해 주세요.');
    return;
  }

  // 2. 시뮬레이션 계산 실행
  const result = simulateBattle(mySquad, selectedEnemyDeck, 500);
  setBattleResult(result);
};

  if (isLoading) {
    return (
      <PageLayout>
        <h1 className="classic-title text-2xl font-bold text-center" style={{ marginTop: '80px' }}>
          전장 데이터 및 1-5군 부대를 편성하고 있습니다...
        </h1>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        {/* 상단 탭바 */}
        <nav className="classic-tabbar" style={{ marginBottom: '35px' }}>
          <Link href="/?tab=my-assets" className="classic-tab">나의 보유 현황</Link>
          <Link href="/?tab=dictionary" className="classic-tab">통합 도감</Link>
          <Link href="/matches" className="classic-tab">티어덱 매칭</Link>
          <Link href="/squads" className="classic-tab">1-5군 추천 편성</Link>
          <span className="classic-tab active">⚔️ 모의 대결</span>
        </nav>

        <h1 className="classic-heading text-3xl font-bold mb-2">⚔️ 천하 모의전 (8턴 시뮬레이터)</h1>
        <p style={{ color: 'var(--gold-soft)', marginBottom: '30px' }}>
          실제 내 장수/전법으로 구성된 **1~5군 추천 부대**와 상대 티어덱 간 500회 모의전을 실행합니다.
        </p>

        {/* 부대 선택 그리드 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '30px' }}>
          
          {/* [좌측] 아군 1~5군 부대 선택 */}
          <div className="scroll-panel" style={{ padding: '20px', border: '2px solid var(--gold)' }}>
            <h2 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--gold)' }}>
              🛡️ 아군 (내 1~5군 선택)
            </h2>
            <select
  value={selectedMySquadIndex}
  onChange={(e) => {
    setSelectedMySquadIndex(e.target.value);
    setBattleResult(null);
              }}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                backgroundColor: 'var(--paper-soft)',
                border: '1px solid var(--gold)',
                color: 'var(--ink-text)',
                fontWeight: 'bold',
                marginBottom: '20px'
              }}
            >
  <option value="">-- 내 1~5군 부대 선택 --</option>
  {displaySquads.map((squad, idx) => (
    <option key={idx} value={idx}>
      [{squad.squadNum || idx + 1}군] {squad.deck_name || `${idx + 1}군 추천 부대`} {squad.score ? `(점수: ${squad.score}점)` : ''}
    </option>
  ))}
</select>

            {selectedMySquad && (
  <div style={{ backgroundColor: 'var(--paper-soft)', padding: '16px', border: '1px solid rgba(184,147,90,0.3)', borderRadius: '4px' }}>
    <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '10px' }}>
      [{Number(selectedMySquadIndex) + 1}군] {selectedMySquad.deck_name || selectedMySquad.name || '내 부대'}
    </h3>

    {/* 장수 및 전법 목록 */}
    <div style={{ fontSize: '0.9rem', marginBottom: '12px', lineHeight: '1.6' }}>
      <strong>🛡️ 장수 구성:</strong>
      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '4px' }}>
        {(selectedMySquad.heroes || selectedMySquad.generals || []).map((hero, idx) => {
          const heroName = typeof hero === 'object' ? (hero.general_name || hero.name) : hero;
          const tactic1 = typeof hero === 'object' ? hero.tactic1_name : null;
          const tactic2 = typeof hero === 'object' ? hero.tactic2_name : null;
          const tacticsText = [tactic1, tactic2].filter(Boolean).join(', ');

          return (
            <li key={idx}>
              <span style={{ fontWeight: 'bold', color: 'var(--ink-text)' }}>{heroName || `장수 ${idx + 1}`}</span>
              {tacticsText && <span style={{ color: '#666', fontSize: '0.85rem' }}> ({tacticsText})</span>}
            </li>
          );
        })}
      </ul>
    </div>

    {/* 진형 Visual */}
    <div style={{ marginTop: '10px' }}>
      <strong style={{ fontSize: '0.85rem', color: '#666' }}>📍 진형 배치:</strong>
      <FormationGridVisual 
        formation={selectedMySquad.formation || '0,1,0,0,1,1'} 
        heroes={selectedMySquad.heroes || selectedMySquad.generals} 
      />
    </div>
  </div>
)}
          </div>

          {/* [우측] 상대 티어덱 선택 */}
          <div className="scroll-panel" style={{ padding: '20px', border: '2px solid var(--seal)' }}>
            <h2 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--seal-dark)' }}>
              ⚔️ 적군 (상대 티어덱 선택)
            </h2>
            <select
              value={selectedEnemyDeckId}
              onChange={(e) => {
                setSelectedEnemyDeckId(e.target.value);
                setBattleResult(null);
              }}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '1rem',
                backgroundColor: 'var(--paper-soft)',
                border: '1px solid var(--seal)',
                color: 'var(--ink-text)',
                fontWeight: 'bold',
                marginBottom: '20px'
              }}
            >
              <option value="">-- 맞붙을 상대 티어덱 선택 --</option>
              {tierDecks.map(deck => (
                <option key={deck.id} value={deck.id}>
                  {deck.deck_name}
                </option>
              ))}
            </select>

            {selectedEnemyDeck && (
  <div style={{ backgroundColor: 'rgba(166, 50, 42, 0.05)', padding: '16px', border: '1px solid rgba(166, 50, 42, 0.3)', borderRadius: '4px' }}>
    <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '6px', color: 'var(--seal-dark)' }}>
      {selectedEnemyDeck.deck_name}
    </h3>
    
    {selectedEnemyDeck.description && (
      <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#666' }}>
        {selectedEnemyDeck.description}
      </p>
    )}

    {/* 장수 및 전법 목록 */}
    <div style={{ fontSize: '0.9rem', marginBottom: '12px', lineHeight: '1.6' }}>
      <strong style={{ color: 'var(--seal-dark)' }}>⚔️ 적군 장수 구성:</strong>
      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '4px' }}>
        {(selectedEnemyDeck.generals || selectedEnemyDeck.heroes || []).map((hero, idx) => {
          const heroName = typeof hero === 'object' ? (hero.general_name || hero.name) : hero;
          const tactic1 = typeof hero === 'object' ? hero.tactic1_name : null;
          const tactic2 = typeof hero === 'object' ? hero.tactic2_name : null;
          const tacticsText = [tactic1, tactic2].filter(Boolean).join(', ');

          return (
            <li key={idx}>
              <span style={{ fontWeight: 'bold', color: 'var(--ink-text)' }}>{heroName || `장수 ${idx + 1}`}</span>
              {tacticsText && <span style={{ color: '#666', fontSize: '0.85rem' }}> ({tacticsText})</span>}
            </li>
          );
        })}
      </ul>
    </div>

    {/* 진형 Visual */}
    <div style={{ marginTop: '10px' }}>
      <strong style={{ fontSize: '0.85rem', color: '#666' }}>📍 진형 배치:</strong>
      <FormationGridVisual 
        formation={selectedEnemyDeck.formation || '0,1,0,0,1,1'} 
        heroes={selectedEnemyDeck.generals || selectedEnemyDeck.heroes} 
      />
    </div>
  </div>
)}
          </div>

        </div>

        {/* 시뮬레이션 개시 버튼 및 리포트 */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            disabled={!selectedMySquad || !selectedEnemyDeck}
            onClick={handleRunBattle}
            style={{
              padding: '14px 40px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              backgroundColor: selectedMySquad && selectedEnemyDeck ? 'var(--seal)' : '#888',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedMySquad && selectedEnemyDeck ? 'pointer' : 'not-allowed',
            }}
          >
            ⚔️ 8턴 모의 대결 개시 (500회) ⚔️
          </button>

          {/* 승률 및 전투 로그 결과 표시 */}
          {battleResult && (
            <div className="scroll-panel" style={{ marginTop: '30px', padding: '25px', border: '2px solid var(--gold)', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: '20px' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#888' }}>승리 확률</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--seal)' }}>{battleResult.winRate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#888' }}>무승부</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#666' }}>{battleResult.drawRate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#888' }}>패배 확률</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2b5c8f' }}>{battleResult.loseRate}%</div>
                </div>
              </div>


              {/* 1회차 전투 상세 로그 */}
              <h4 style={{ fontWeight: 'bold', marginBottom: '10px', borderBottom: '1px solid var(--gold)', paddingBottom: '5px' }}>
                📜 샘플 전투 로그 (1회차)
              </h4>
              <div style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: 'var(--paper-soft)', padding: '12px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                {battleResult.sampleLogs.map((log, i) => (
                  <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </PageLayout>
  );
}