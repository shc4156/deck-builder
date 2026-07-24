import { createClient } from '@supabase/supabase-js';

// ⚠️ 이 파일은 서버 사이드(API route)에서만 import 해야 합니다.
// SUPABASE_SERVICE_ROLE_KEY는 절대 클라이언트 번들에 노출되면 안 됩니다.
// (NEXT_PUBLIC_ 접두사를 붙이지 마세요!)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);