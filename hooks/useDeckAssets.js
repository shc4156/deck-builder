// hooks/useDeckAssets.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { useProfile, useProfileActions } from '../app/components/ProfileContext';

// page.js와 matches/page.js가 공통으로 쓰는 상태(보유 장수/전법, 로그인 유저, 티어덱 목록 등)와
// 그 상태를 채우는 로딩/저장 로직을 하나의 훅으로 묶음
//
// 리팩토링 포인트:
// 1) generals/tactics/synergies/tier_decks(+ connections/formations/general_roles)는
//    더 이상 브라우저에서 Supabase로 직접 쿼리하지 않고, /api/deck-assets 캐싱 API
//    하나로만 요청한다. (이 라우트는 프로덕션 빌드에서 1시간 동안 Vercel 엣지에 캐싱됨)
// 2) selected_generals/selected_tactics/pinned_decks는 이 훅이 따로 profiles를
//    조회하지 않고, ProfileContext(세션당 1회 로딩)에서 그대로 읽어온다.
// 3) StatusTab/SquadsTab/MatchesTab이 각자 useDeckAssets()를 부르기 때문에, 탭을
//    옮길 때마다(컴포넌트가 마운트될 때마다) /api/deck-assets를 또 부르지 않도록
//    아래에 "모듈 레벨" 캐시(브라우저 탭 하나가 떠 있는 동안 공유되는 메모리)를 둔다.
//    같은 브라우저 세션에서 이미 받아온 데이터가 있으면 그걸 그대로 재사용하고,
//    페이지를 새로고침하면(=이 모듈이 다시 로드되면) 캐시도 같이 초기화된다.
let staticAssetsCache = null;       // 마지막으로 받아온 데이터
let staticAssetsPromise = null;     // 지금 요청이 진행 중이면 그 Promise (동시에 여러 탭이 켜져도 fetch는 1번만)
let staticAssetsCachedAt = 0;
const STATIC_CACHE_TTL_MS = 10 * 60 * 1000; // 10분 — 이 시간이 지나면 다음 탭 진입 시 한 번 더 받아온다

function loadStaticAssetsOnce() {
  const isFresh = staticAssetsCache && (Date.now() - staticAssetsCachedAt < STATIC_CACHE_TTL_MS);
  if (isFresh) return Promise.resolve(staticAssetsCache);
  if (staticAssetsPromise) return staticAssetsPromise;

  staticAssetsPromise = fetch('/api/deck-assets')
    .then(res => res.json())
    .then(data => {
      staticAssetsCache = data;
      staticAssetsCachedAt = Date.now();
      return data;
    })
    .finally(() => {
      staticAssetsPromise = null;
    });

  return staticAssetsPromise;
}

export function useDeckAssets() {
  const [generals, setGenerals] = useState([]);
  const [tactics, setTactics] = useState([]);
  const [synergies, setSynergies] = useState([]);
  const [tierDecks, setTierDecks] = useState([]);
  const [connections, setConnections] = useState([]);
  const [formations, setFormations] = useState([]);
  const [generalRoles, setGeneralRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedGenerals, setSelectedGenerals] = useState([]);
  const [selectedTactics, setSelectedTactics] = useState([]);
  const [pinnedTierDeckIds, setPinnedTierDeckIds] = useState([]);

  const [isSaving, setIsSaving] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const profile = useProfile();
  const { userId, updateProfile } = useProfileActions();

  // 정적/공용 데이터: 캐시에 이미 있으면 fetch 없이 바로 반영, 없으면 그때 1번만 받아온다.
  useEffect(() => {
    let cancelled = false;

    async function loadStaticAssets() {
      setIsLoading(true);
      try {
        const data = await loadStaticAssetsOnce();
        if (cancelled) return;
        setGenerals(data.generals || []);
        setTactics(data.tactics || []);
        setSynergies(data.synergies || []);
        setTierDecks(data.tierDecks || []);
        setConnections(data.connections || []);
        setFormations(data.formations || []);
        setGeneralRoles(data.generalRoles || []);
      } catch (err) {
        console.error('정적 데이터 로딩 중 에러가 발생했습니다:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadStaticAssets();
    return () => { cancelled = true; };
  }, []);

  // 개인 데이터(보유 장수/전법, 핀 고정 티어덱): ProfileContext가 이미 세션당 1번
  // 로딩해둔 profile 값을 그대로 반영한다. profiles를 여기서 다시 조회하지 않는다.
  //
  // ⚠️ 주의: profile 객체는 (1) 탭/앱을 갔다왔을 때 Supabase가 자동으로 쏘는
  // onAuthStateChange(토큰 갱신 등)나 (2) updateProfile()을 호출하는 아무 동작
  // (티어덱 핀 고정, saveDeck 등)만으로도 새 참조로 재생성된다. 예전에는 이 effect가
  // [profile]이 바뀔 때마다 무조건 재동기화해서, 편성 중(아직 저장 전)이던 선택 상태를
  // DB에 마지막으로 저장된 값으로 되돌려버렸다 — 이게 "탭 전환 시 초기화"와
  // "클릭하자마자 선택취소되는 것처럼 보이는" 문제의 원인이었다.
  // 그래서 같은 userId에 대해서는 딱 한 번만(로그인/계정전환 시에만) 동기화한다.
  const syncedUserIdRef = useRef(undefined);
  useEffect(() => {
    if (!profile) return;
    if (syncedUserIdRef.current === userId) return; // 이미 이 유저 기준으로 동기화했으면 덮어쓰지 않음

    const loadedGens = profile.selected_generals ? profile.selected_generals.split(',') : [];
    const loadedTacts = profile.selected_tactics ? profile.selected_tactics.split(',') : [];
    setSelectedGenerals(loadedGens);
    setSelectedTactics(loadedTacts);
    setPinnedTierDeckIds(Array.isArray(profile.pinned_decks) ? profile.pinned_decks : []);
    syncedUserIdRef.current = userId;
  }, [profile, userId]);

  const toggleGeneral = (id) => {
    setSelectedGenerals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleTactic = (id) => {
    setSelectedTactics(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleTierDeckPin = async (deckId) => {
    const next = pinnedTierDeckIds.includes(deckId)
      ? pinnedTierDeckIds.filter(id => id !== deckId)
      : [...pinnedTierDeckIds, deckId];

    setPinnedTierDeckIds(next);

    if (!userId) return;
    const { error } = await updateProfile({ pinned_decks: next });
    if (error) console.error('티어덱 핀 저장 실패:', error.message);
  };

  const saveDeck = async () => {
    if (!userId) return alert('로그인이 필요합니다.');

    setIsSaving(true);
    setCountdown(3);
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);

    const { error } = await updateProfile({
      selected_generals: selectedGenerals.join(','),
      selected_tactics: selectedTactics.join(',')
    });

    clearInterval(timer);
    setIsSaving(false);
    setCountdown(0);

    if (error) alert('저장 실패: ' + error.message);
    else alert('보유 현황이 성공적으로 저장되었습니다!');
  };

  return {
    generals, tactics, synergies, tierDecks, connections, formations, generalRoles,
    isLoading,
    selectedGenerals, selectedTactics,
    setSelectedGenerals, setSelectedTactics,
    toggleGeneral, toggleTactic,
    pinnedTierDeckIds, setPinnedTierDeckIds, toggleTierDeckPin,
    saveDeck, isSaving, countdown
  };
}