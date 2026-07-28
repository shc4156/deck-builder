'use client';
import { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'yeonmu-warehouse-v1';

// 화요일 06:00을 주차 기준 시점으로 삼는다.
// 지금 시각 기준으로 "가장 최근에 지난 화요일 06:00" 날짜(YYYY-MM-DD)를 weekKey로 만든다.
function getCurrentWeekKey(now = new Date()) {
  const d = new Date(now);
  const day = d.getDay(); // 0=일 ... 2=화 ... 6=토
  const hour = d.getHours();

  // 이번 주 화요일까지 며칠 남았는지/지났는지 계산
  let diffToTuesday = (day - 2 + 7) % 7; // 오늘이 화요일이면 0
  if (diffToTuesday === 0 && hour < 6) {
    // 화요일이지만 06:00 이전이면 아직 지난 주 화요일 기준
    diffToTuesday = 7;
  }

  const tuesday = new Date(d);
  tuesday.setDate(d.getDate() - diffToTuesday);
  tuesday.setHours(0, 0, 0, 0);

  const y = tuesday.getFullYear();
  const m = String(tuesday.getMonth() + 1).padStart(2, '0');
  const dd = String(tuesday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const EMPTY_WAREHOUSE = {
  generals: [],       // 무장 10명 (name 배열)
  tactics: [],         // 전법 20개 (name 배열)
  supportGeneral: null, // 지원 무장 1명
  supportTactics: [],   // 지원 전법 2개
};

export function useYeonmuStorage() {
  const weekKeyRef = useRef(getCurrentWeekKey());
  const [warehouse, setWarehouse] = useState(EMPTY_WAREHOUSE);
  const [isReady, setIsReady] = useState(false);

  // 최초 마운트 시 localStorage 확인 → 주차가 다르면 자동 초기화
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.weekKey === weekKeyRef.current) {
          setWarehouse({ ...EMPTY_WAREHOUSE, ...parsed.data });
        } else {
          // 새 주가 시작됨 → 지난 주 데이터는 버리고 새로 시작
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('연무대회 창고 불러오기 실패:', e);
    } finally {
      setIsReady(true);
    }
  }, []);

  // warehouse가 바뀔 때마다 저장 (최초 로딩 이후부터)
  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ weekKey: weekKeyRef.current, data: warehouse })
      );
    } catch (e) {
      console.error('연무대회 창고 저장 실패:', e);
    }
  }, [warehouse, isReady]);

  const resetWarehouse = () => {
    setWarehouse(EMPTY_WAREHOUSE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('연무대회 창고 초기화 실패:', e);
    }
  };

  return { warehouse, setWarehouse, isReady, resetWarehouse };
}