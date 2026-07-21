// hooks/useDeckAssets.js
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../app/lib/supabaseClient'; // 실제 프로젝트 구조에 맞게 경로 조정 필요

// page.js와 matches/page.js가 공통으로 쓰는 상태(보유 장수/전법, 로그인 유저, 티어덱 목록 등)와
// 그 상태를 채우는 로딩/저장 로직을 하나의 훅으로 묶음
export function useDeckAssets() {
  const [generals, setGenerals] = useState([]);
  const [tactics, setTactics] = useState([]);
  const [synergies, setSynergies] = useState([]);
  const [tierDecks, setTierDecks] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedGenerals, setSelectedGenerals] = useState([]);
  const [selectedTactics, setSelectedTactics] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    }
    getSession();
  }, []);

  useEffect(() => {
    async function initData() {
      setIsLoading(true);
      try {
        const [genRes, tactRes, synergyRes, tierRes] = await Promise.all([
          supabase.from('generals').select('*').order('name'),
          supabase.from('tactics').select('*').order('name'),
          supabase.from('synergies').select('*'),
          supabase.from('tier_decks').select('*').order('id')
        ]);

        setGenerals(genRes.data || []);
        setTactics(tactRes.data || []);
        setSynergies(synergyRes.data || []);
        setTierDecks(tierRes.data || []);

        if (user && user.id) {
          const { data: profileRes } = await supabase
            .from('profiles')
            .select('selected_generals, selected_tactics')
            .eq('id', user.id)
            .single();

          if (profileRes) {
            const loadedGens = profileRes.selected_generals ? profileRes.selected_generals.split(',') : [];
            const loadedTacts = profileRes.selected_tactics ? profileRes.selected_tactics.split(',') : [];
            setSelectedGenerals(loadedGens);
            setSelectedTactics(loadedTacts);
          }
        }
      } catch (err) {
        console.error("데이터 로딩 중 에러가 발생했습니다:", err);
      } finally {
        setIsLoading(false);
      }
    }

    initData();
  }, [user]);

  const toggleGeneral = (id) => {
    setSelectedGenerals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleTactic = (id) => {
    setSelectedTactics(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const saveDeck = async () => {
    if (!user) return alert('로그인이 필요합니다.');

    setIsSaving(true);
    setCountdown(3);
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);

    const { error } = await supabase
      .from('profiles')
      .update({
        selected_generals: selectedGenerals.join(','),
        selected_tactics: selectedTactics.join(',')
      })
      .eq('id', user.id);

    clearInterval(timer);
    setIsSaving(false);
    setCountdown(0);

    if (error) alert('저장 실패: ' + error.message);
    else alert('보유 현황이 성공적으로 저장되었습니다!');
  };

  return {
    generals, tactics, synergies, tierDecks, user, isLoading,
    selectedGenerals, selectedTactics,
    toggleGeneral, toggleTactic,
    saveDeck, isSaving, countdown
  };
<<<<<<< HEAD
}
=======
}
>>>>>>> d4eb085 (전체 수정)
