import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// 전법 이미지 업로드 전용 API (RLS 우회).
// upload-general-image/route.js와 동일한 구조 — 대상 테이블만 tactics로 바뀐 버전.
// 클라이언트(admin/upload-tactic/page.js)에서 크롭된 이미지 blob과 tacticId, accessToken을
// FormData로 보내면,
// 1) accessToken으로 요청자 신원 확인
// 2) 요청자의 profiles.role이 'admin'인지 검사
// 3) 서비스 롤 키로 storage 업로드 + tactics.image_url 업데이트 수행 (RLS 우회)
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const tacticId = formData.get('tacticId');
    const accessToken = formData.get('accessToken');

    if (!file || !tacticId || !accessToken) {
      return Response.json({ error: '필요한 정보가 누락되었습니다.' }, { status: 400 });
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

    // 3) storage 업로드 (기존 코드와 동일하게 generals 버킷을 그대로 사용)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storageFileName = `tactic_${Date.now()}_${tacticId}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('generals')
      .upload(storageFileName, buffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) {
      return Response.json({ error: '업로드 실패: ' + uploadError.message }, { status: 400 });
    }

    const { data: publicData } = supabaseAdmin.storage.from('generals').getPublicUrl(storageFileName);

    // 4) DB 업데이트 (서비스 롤 키라 RLS의 UPDATE 정책 부재와 무관하게 성공함)
    const { error: updateError } = await supabaseAdmin
      .from('tactics')
      .update({ image_url: publicData.publicUrl })
      .eq('id', tacticId);

    if (updateError) {
      return Response.json({ error: 'DB 업데이트 실패: ' + updateError.message }, { status: 400 });
    }

    return Response.json({ success: true, imageUrl: publicData.publicUrl });
  } catch (err) {
    console.error('upload-tactic-image API 오류:', err);
    return Response.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}