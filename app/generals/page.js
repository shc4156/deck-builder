'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient'; 
import GeneralCard from '../components/GeneralCard';
import PageLayout from '../components/PageLayout';

export default function GeneralsPage() {
  const [generals, setGenerals] = useState([]);
  const [filter, setFilter] = useState('전체');
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    async function fetchData() {
      // 장수 데이터 불러오기 (가나다순 정렬 적용)
      const { data: genData } = await supabase
        .from('generals')
        .select('*')
        .order('name', { ascending: true });
        
      if (genData) setGenerals(genData);
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
      <div style={{ marginBottom: '20px' }}>
        <h1 className="text-3xl font-bold text-gray-800">나의 장수 도감</h1>
      </div>

      <div className="mb-8 flex space-x-2">
        {factions.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '10px 20px',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              backgroundColor: filter === f ? '#e74c3c' : '#bdc3c7',
              color: filter === f ? '#fff' : '#2c3e50'
            }}
            
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
        {filteredGenerals.map((gen) => (
          <GeneralCard 
            key={gen.id} 
            general={gen} 
            isSelected={selectedIds.includes(gen.id)} 
            onSelect={toggleSelect} 
          />
        ))}
      </div>
    </PageLayout>
  );
}
