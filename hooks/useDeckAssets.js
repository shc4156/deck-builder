'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../app/lib/supabaseClient';

export function useDeckAssets() {
  const [generals, setGenerals] = useState([]);
  const [tactics, setTactics] = useState([]);
  const [tierDecks, setTierDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedGenerals, setSelectedGenerals] = useState([]);
  const [selectedTactics, setSelectedTactics] = useState([]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [genRes, tacRes, deckRes] = await Promise.all([
          supabase.from('generals').select('*'),
          supabase.from('tactics').select('*'),
          supabase.from('tier_decks').select('*')
        ]);

        if (genRes.data) setGenerals(genRes.data);
        if (tacRes.data) setTactics(tacRes.data);
        if (deckRes.data) setTierDecks(deckRes.data);

        // 로그인 유저의 선택 상태 불러오기
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('my_generals, my_tactics')
            .eq('id', user.id)
            .single();

          if (profile) {
            if (profile.my_generals) setSelectedGenerals(profile.my_generals);
            if (profile.my_tactics) setSelectedTactics(profile.my_tactics);
          }
        }
      } catch (err) {
        console.error('데이터 로딩 실패:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const toggleGeneral = (id) => {
    setSelectedGenerals(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const toggleTactic = (id) => {
    setSelectedTactics(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  return {
    generals,
    tactics,
    tierDecks,
    isLoading,
    selectedGenerals,
    selectedTactics,
    toggleGeneral,
    toggleTactic,
  };
}