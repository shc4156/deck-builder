'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

// profiles 테이블 전체를 세션당 딱 1번만 읽어와 여기서 공유한다.
// (예전에는 StatusTab/SquadsTab/VsTab/MatchesTab이 각자 supabase.auth.getUser() +
//  .from('profiles').select(...)를 따로 호출해서 탭을 옮길 때마다 profiles 조회가 중복 발생했음)
const ProfileContext = createContext({ profile: null, userId: null, updateProfile: async () => {} });

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    async function fetchProfile(uid) {
      if (!uid) {
        setProfile(null);
        return;
      }
      // 탭들이 필요로 하던 컬럼(닉네임/역할/보유 장수·전법/핀 고정 티어덱/1-5군 편성)을
      // 여기서 한 번에 가져와 profile 하나로 공유한다.
      const { data } = await supabase
        .from('profiles')
        .select('nickname, role, selected_generals, selected_tactics, pinned_decks, squads')
        .eq('id', uid)
        .single();

      if (data) setProfile(data);
    }

    // 1. 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id || null);
      fetchProfile(session?.user?.id);
    });

    // 2. 로그인/로그아웃/계정전환 등 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id || null);
      fetchProfile(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // profiles를 업데이트할 때 이 함수를 쓰면, Supabase에 쓰는 동시에
  // 로컬 profile state도 즉시 갱신된다. 그러면 저장 직후 다른 탭으로 이동해도
  // profiles를 다시 안 긁어오고 이 갱신된 값을 그대로 재사용한다.
  const updateProfile = useCallback(async (partial) => {
    if (!userId) return { error: new Error('로그인이 필요합니다.') };
    const { error } = await supabase.from('profiles').update(partial).eq('id', userId);
    if (!error) {
      setProfile(prev => ({ ...(prev || {}), ...partial }));
    }
    return { error };
  }, [userId]);

  return (
    <ProfileContext.Provider value={{ profile, userId, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

// 기존 코드(PageLayout.js, AccountSwitcher.js)는 useProfile()이 profile 객체를
// 바로 반환하는 걸 기대하고 있어서, 그 형태는 그대로 유지한다.
export function useProfile() {
  return useContext(ProfileContext).profile;
}

// 새로 프로필을 쓰거나(update) userId가 필요한 곳에서 쓰는 확장 훅.
export function useProfileActions() {
  const { userId, updateProfile } = useContext(ProfileContext);
  return { userId, updateProfile };
}
