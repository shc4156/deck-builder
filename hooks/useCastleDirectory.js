// hooks/useCastleDirectory.js
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../app/lib/supabaseClient';
import { CASTLE_COORDINATE_SEED } from '../data/castleCoordinates';

// 성 좌표 데이터를 관리하는 훅.
// 1) 코드에 미리 넣어둔 시드 데이터(CASTLE_COORDINATE_SEED)
// 2) Supabase의 castles 테이블에 저장된 데이터 (다른 관리자가 수동 입력한 것 포함)
// 두 소스를 합쳐서 하나의 목록으로 제공하고, 이름이 겹치면 DB 값을 우선함
// (누군가 좌표를 수정해서 다시 저장했을 수 있으므로).
//
// ── Supabase에 아래 테이블이 필요합니다 (한 번만 실행) ──
// create table castles (
//   name text primary key,
//   x numeric not null,
//   y numeric not null,
//   updated_at timestamptz default now()
// );

export function useCastleDirectory() {
  const [dbCastles, setDbCastles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function fetchCastles() {
      const { data, error } = await supabase.from('castles').select('name, x, y');
      if (active && !error && data) setDbCastles(data);
      if (active) setLoading(false);
    }
    fetchCastles();
    return () => { active = false; };
  }, []);

  const allCastles = useMemo(() => {
    const map = new Map();
    CASTLE_COORDINATE_SEED.forEach((c) => map.set(c.name, c));
    dbCastles.forEach((c) => map.set(c.name, c));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [dbCastles]);

  const findCastle = useCallback((name) => {
    if (!name) return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    return allCastles.find((c) => c.name === trimmed) || null;
  }, [allCastles]);

  const saveCastle = useCallback(async (name, x, y) => {
    const trimmed = name.trim();
    if (!trimmed) return { error: '이름 없음' };
    const { error } = await supabase.from('castles').upsert(
      { name: trimmed, x, y, updated_at: new Date().toISOString() },
      { onConflict: 'name' }
    );
    if (!error) {
      setDbCastles((prev) => [...prev.filter((c) => c.name !== trimmed), { name: trimmed, x, y }]);
    }
    return { error };
  }, []);

  return { allCastles, findCastle, saveCastle, loading };
}