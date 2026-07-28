'use client';
import { useState, useEffect } from 'react';
import TacticCard from '../components/TacticCard';
import PageLayout from '../components/PageLayout';

export default function TacticsPage() {
  const [tactics, setTactics] = useState([]);
  const [selectedTactic, setSelectedTactic] = useState(null);

useEffect(() => {
    async function fetchTactics() {
      // 이 페이지만 따로 Supabase를 조회하지 않고, 다른 탭들과 같은
      // /api/deck-assets 캐싱 API(1시간 revalidate)를 재사용한다.
      const res = await fetch('/api/deck-assets');
      const data = await res.json();
      setTactics(data.tactics || []);
    }
    fetchTactics();
  }, []);

  return (
    <PageLayout>
      <header style={{ padding: '20px var(--pad-page) 14px', borderBottom: '0.5px solid var(--border)' }}>
        <p className="header-eyebrow" style={{ margin: '0 0 4px' }}>SANGUOZHI · DECK OPS</p>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 500, color: 'var(--text-primary)' }}>전법 도감</h1>
      </header>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '20px',
        padding: '20px var(--pad-page)',
      }}>
        {tactics.map(t => (
          <TacticCard 
            key={t.id} 
            tactic={t} 
            isSelected={selectedTactic?.id === t.id}
            onSelect={setSelectedTactic}
          />
        ))}
      </div>
    </PageLayout>
  );
}