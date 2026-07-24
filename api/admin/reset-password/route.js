import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// 요청자(호출한 관리자)의 세션을 검증하기 위한 일반 클라이언트
const supabaseAuthCheck = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const { targetUserId, newPassword, accessToken } = await request.json();

    if (!targetUserId || !newPassword || !accessToken) {
      return NextResponse.json({ error: '필요한 값이 누락되었습니다.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    // 1. 요청을 보낸 사람이 실제로 로그인된 유저인지 확인
    const { data: { user: requester }, error: authError } =
      await supabaseAuthCheck.auth.getUser(accessToken);

    if (authError || !requester) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 2. 그 유저가 admin 권한을 가지고 있는지 profiles 테이블에서 확인
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profileError || !requesterProfile || requesterProfile.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 없습니다.' }, { status: 403 });
    }

    // 3. 실제 비밀번호 변경 (service_role 키로만 가능한 Admin API)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('비밀번호 재설정 API 에러:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}