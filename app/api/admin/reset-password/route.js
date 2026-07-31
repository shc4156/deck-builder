import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// 지휘부 도구 > 맹원 비밀번호 재설정 전용 API.
// 클라이언트(admin/users/page.js)가 accessToken(요청자의 세션 토큰),
// targetUserId(재설정 대상 유저 id), newPassword(새 비밀번호)를 보내면,
// 1) accessToken으로 요청자가 누구인지 확인하고
// 2) 그 요청자의 profiles.role이 'admin'인지 검사한 뒤
// 3) 서비스 롤 키로 대상 유저의 비밀번호를 강제 변경한다.
export async function POST(request) {
  try {
    const { targetUserId, newPassword, accessToken } = await request.json();

    if (!targetUserId || !newPassword || !accessToken) {
      return Response.json({ error: '필요한 정보가 누락되었습니다.' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return Response.json({ error: '비밀번호는 최소 6자 이상이어야 합니다.' }, { status: 400 });
    }

    // 1) 요청자 신원 확인
    const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(accessToken);
    if (authError || !requester) {
      return Response.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 2) 요청자가 지휘부(admin)인지 확인
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .single();

    if (profileError || requesterProfile?.role !== 'admin') {
      return Response.json({ error: '권한이 없습니다.' }, { status: 403 });
    }

    // 3) 대상 유저 비밀번호 강제 변경
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (updateError) {
      return Response.json({ error: updateError.message }, { status: 400 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error('reset-password API 오류:', err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}