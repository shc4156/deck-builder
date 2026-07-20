// hooks/useDeckAssets.js
'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../app/lib/supabaseClient';

export function useDeckAssets() {
  // 1. Generals
  const generalsQuery = useQuery({
    queryKey: ['generals'],
    queryFn: async () => {
      const { data } = await supabase.from('generals').select('*').order('name');
      return data || [];
    },
  });

  // 2. Tactics
  const tacticsQuery = useQuery({
    queryKey: ['tactics'],
    queryFn: async () => {
      const { data } = await supabase.from('tactics').select('*').order('name');
      return data || [];
    },
  });

  // 3. Tier Decks
  const tierDecksQuery = useQuery({
    queryKey: ['tierDecks'],
    queryFn: async () => {
      const { data } = await supabase.from('tier_decks').select('*').order('tier_name');
      return data || [];
    },
  });

  // 4. General Roles (새로 추가)
  const generalRolesQuery = useQuery({
    queryKey: ['generalRoles'],
    queryFn: async () => {
      // Supabase 테이블이 있으면 아래 사용
      // const { data } = await supabase.from('general_roles').select('*');
      // return data || [];

      // 아직 테이블이 없다면 JSON 파일에서 불러오기
      const res = await fetch('/data/general_roles_rows.json');
      if (!res.ok) return [];
      return res.json();
    },
  });

  // 5. General Connections (연계 데이터)
  const connectionsQuery = useQuery({
    queryKey: ['generalConnections'],
    queryFn: async () => {
      const res = await fetch('/data/general_connections_rows.json');
      if (!res.ok) return [];
      return res.json();
    },
  });

  const isLoading = 
    generalsQuery.isLoading || 
    tacticsQuery.isLoading || 
    tierDecksQuery.isLoading ||
    generalRolesQuery.isLoading ||
    connectionsQuery.isLoading;

  return {
    generals: generalsQuery.data || [],
    tactics: tacticsQuery.data || [],
    tierDecks: tierDecksQuery.data || [],
    generalRoles: generalRolesQuery.data || [],     // ← 새로 추가
    generalConnections: connectionsQuery.data || [], // ← 새로 추가

    isLoading,
    error: generalsQuery.error || tacticsQuery.error || tierDecksQuery.error,
    
    // 선택된 자산 (필요 시)
    selectedGenerals: [],
    selectedTactics: [],
  };
}
