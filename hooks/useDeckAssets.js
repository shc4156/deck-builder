// hooks/useDeckAssets.js
'use client';
import { useState, useEffect } from 'react';

export function useDeckAssets() {
  const [generals, setGenerals] = useState([]);
  const [tactics, setTactics] = useState([]);
  const [tierDecks, setTierDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Supabase에서 불러오기 (기존 방식 유지)
        const [gensRes, tacticsRes, decksRes] = await Promise.all([
          fetch('/api/generals'),     // 필요시 API route 만들어야 함
          fetch('/api/tactics'),
          fetch('/api/tier-decks')
        ]);

        const gens = await gensRes.json();
        const tacts = await tacticsRes.json();
        const decks = await decksRes.json();

        setGenerals(gens);
        setTactics(tacts);
        setTierDecks(decks);
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
        // fallback: JSON 파일에서 불러오기
        try {
          const [g, t, d] = await Promise.all([
            fetch('/data/generals_rows.json').then(r => r.json()),
            fetch('/data/tactics.json').then(r => r.json()), // 파일명 확인
            fetch('/data/tier_decks_rows.json').then(r => r.json())
          ]);
          setGenerals(g);
          setTactics(t);
          setTierDecks(d);
        } catch (e) {
          console.error("fallback도 실패", e);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  return {
    generals,
    tactics,
    tierDecks,
    isLoading,
    selectedGenerals: [],   // 필요시 상태 관리 추가
    selectedTactics: []
  };
}
