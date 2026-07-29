'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useProfile, useProfileActions } from '../app/components/ProfileContext';

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
  // 라운드픽(연무 드래프트) 3종 중 게임 내에서 실제로 선택한 것 — null이면 아직 미선택
  //   'general'        : ① 무장 다시뽑기 — 10명 중 1명 교체
  //   'tactic'          : ② 전법 다시뽑기 — 20개 중 2개 교체
  //   'tactic_support'  : ③ 전법 지원 — 교체 없음, 보라 전법만 추가
  draftMode: null,
  // ① 무장 다시뽑기 결과: 10명 중 어떤 장수를 어떤 장수로 바꿨는지
  replacedGeneral: { from: null, to: null },
  // ② 전법 다시뽑기 결과: 20개 중 어떤 전법 2개를 어떤 전법으로 바꿨는지
  replacedTactics: [
    { from: null, to: null },
    { from: null, to: null },
  ],
  supportGeneral: null, // 지원 무장 1명 (모든 모드 공통)
  supportTactics: [],   // 지원 전법 2개 — 등급 무관 (모든 모드 공통)
  supportPurpleTactic: null, // ③ 전법 지원 전용 — 보라 등급 전법 1개 추가 슬롯
};

// DB 저장 폭주 방지용 디바운스 지연(ms) — 창고 체크박스를 연속으로 누를 때마다
// 매번 update 쿼리를 날리지 않고, 마지막 변경 후 이 시간만큼 조용하면 한 번만 저장한다.
const SAVE_DEBOUNCE_MS = 600;

export function useYeonmuStorage() {
  const weekKeyRef = useRef(getCurrentWeekKey());
  const profile = useProfile();
  const { userId, updateProfile } = useProfileActions();

  const [warehouse, setWarehouse] = useState(EMPTY_WAREHOUSE);
  const [isReady, setIsReady] = useState(false);

  // profiles.yeonmu_warehouse가 로드되면(로그인 세션 확인 완료 시점) 여기서 초기 상태를 채운다.
  // ProfileContext가 세션당 1회만 profiles를 읽어오므로, profile 객체가 바뀔 때만 반응하면 된다.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!userId) {
      // 로그인 안 된 상태 — 창고를 비워두고 저장은 시도하지 않는다.
      setWarehouse(EMPTY_WAREHOUSE);
      setIsReady(true);
      hydratedRef.current = false;
      return;
    }
    // profile이 아직 안 왔으면(ProfileContext가 fetch 중) 대기
    if (profile === null) return;

    const stored = profile.yeonmu_warehouse;
    if (stored && stored.weekKey === weekKeyRef.current) {
      setWarehouse({ ...EMPTY_WAREHOUSE, ...stored.data });
    } else {
      // 새 주가 시작됐거나 저장된 게 없으면 빈 창고로 시작
      setWarehouse(EMPTY_WAREHOUSE);
    }
    hydratedRef.current = true;
    setIsReady(true);
  }, [userId, profile]);

  // warehouse가 바뀔 때마다 DB에 저장 (초기 로딩 반영 전에는 저장하지 않도록 hydratedRef로 가드)
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!isReady || !userId || !hydratedRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      updateProfile({
        yeonmu_warehouse: { weekKey: weekKeyRef.current, data: warehouse },
      }).then(({ error }) => {
        if (error) console.error('연무대회 창고 저장 실패:', error);
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [warehouse, isReady, userId, updateProfile]);

  const resetWarehouse = useCallback(() => {
    setWarehouse(EMPTY_WAREHOUSE);
    if (userId) {
      updateProfile({
        yeonmu_warehouse: { weekKey: weekKeyRef.current, data: EMPTY_WAREHOUSE },
      }).then(({ error }) => {
        if (error) console.error('연무대회 창고 초기화 실패:', error);
      });
    }
  }, [userId, updateProfile]);

  return { warehouse, setWarehouse, isReady, resetWarehouse, isLoggedIn: !!userId };
}