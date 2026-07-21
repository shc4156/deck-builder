'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import TacticCard from '../components/TacticCard';
import PageLayout from '../components/PageLayout';

export default function TacticsPage() {
  const [tactics, setTactics] = useState([]);
  const [selectedTactic, setSelectedTactic] = useState(null);

useEffect(() => {
    async function fetchTactics() {
      // .order('name', { ascending: true })를 추가했습니다.
      const { data } = await supabase
        .from('tactics')
        .select('*')
        .order('name', { ascending: true }); 
      
      if (data) setTactics(data);
    }
    fetchTactics();
  }, []);

  return (
    <PageLayout>
      <h1>전법 도감</h1>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '20px', 
        marginTop: '20px' 
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
<<<<<<< HEAD
}
=======
}
>>>>>>> d4eb085 (전체 수정)
