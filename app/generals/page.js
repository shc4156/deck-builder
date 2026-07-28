'use client';
import { useEffect, useState } from 'react';
import GeneralCard from '../components/GeneralCard';
import PageLayout from '../components/PageLayout';

export default function GeneralsPage() {
  const [generals, setGenerals] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // 이 페이지만 따로 Supabase를 조회하지 않고, 다른 탭들과 같은
      // /api/deck-assets 캐싱 API(1시간 revalidate)를 재사용한다.
      const res = await fetch('/api/deck-assets');
      const data = await res.json();
      setGenerals(data.generals || []);
    }
    fetchData();
  }, []);

  const toggleSelect = (gen) => {
    setSelectedIds(prev => 
      prev.includes(gen.id) ? prev.filter(id => id !== gen.id) : [...prev, gen.id]
    );
  };

  const filteredGenerals = filter === '전체' 
    ? generals 
    : generals.filter(gen => gen.faction === filter);

  const factions = ['전체', '위', '촉', '오', '군'];

  return (
    <PageLayout>
      <header style={{ padding: '20px var(--pad-page) 14px', borderBottom: '0.5px solid var(--border)' }}>
        <p className="header-eyebrow" style={{ margin: '0 0 4px' }}>SANGUOZHI · DECK OPS</p>
        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 500, color: 'var(--text-primary)' }}>나의 장수 도감</h1>
      </header>

      <div style={{ padding: '16px var(--pad-page) 0' }}>
        <div style={{ marginBottom: '20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {factions.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'chip chip--active' : 'chip'}
              style={{ cursor: 'pointer' }}
            >
              {f}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', paddingBottom: '20px' }}>
          {filteredGenerals.map((gen) => (
            <GeneralCard 
              key={gen.id} 
              general={gen} 
              isSelected={selectedIds.includes(gen.id)} 
              onSelect={toggleSelect} 
            />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}