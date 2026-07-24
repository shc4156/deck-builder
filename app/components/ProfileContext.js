'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
  async function fetchProfile(userId) {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('nickname, role')
      .eq('id', userId)
      .single();

    if (data) setProfile(data);
  }

  // 1. 초기 세션 확인
  supabase.auth.getSession().then(({ data: { session } }) => {
    fetchProfile(session?.user?.id);
  });

  // 2. 로그인/로그아웃/계정전환 등 인증 상태 변경 감지
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    fetchProfile(session?.user?.id);
  });

  return () => subscription.unsubscribe();
}, []);

  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}