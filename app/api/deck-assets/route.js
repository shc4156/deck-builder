import { supabaseAdmin } from '../../lib/supabaseAdmin';

// 정적/공용 데이터 전용 캐싱 API.
// generals/tactics/synergies/tier_decks/general_connections/formations/general_roles는
// 모든 유저가 똑같은 내용을 보고 자주 안 바뀌는 데이터라, 여기서 한 번에 모아 응답하고
// Vercel 엣지가 아래 시간(초) 동안 이 응답을 캐싱해서 재사용한다.
// 즉, 유저가 몇 명이든 Supabase에는 이 시간 간격으로 딱 1번만 실제 쿼리가 나간다.
export const revalidate = 3600; // 1시간

export async function GET() {
  const [genRes, tactRes, synRes, tierRes, connRes, formRes, roleRes] = await Promise.all([
    supabaseAdmin.from('generals').select('*').order('name'),
    supabaseAdmin.from('tactics').select('*').order('name'),
    supabaseAdmin.from('synergies').select('*'),
    supabaseAdmin.from('tier_decks').select('*').order('id'),
    supabaseAdmin.from('general_connections').select('*'),
    supabaseAdmin.from('formations').select('*'),
    supabaseAdmin.from('general_roles').select('*'),
  ]);

  return Response.json({
    generals: genRes.data || [],
    tactics: tactRes.data || [],
    synergies: synRes.data || [],
    tierDecks: tierRes.data || [],
    connections: connRes.data || [],
    formations: formRes.data || [],
    generalRoles: roleRes.data || [],
  });
}