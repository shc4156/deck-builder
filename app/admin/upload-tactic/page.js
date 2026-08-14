'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PageLayout from '../../components/PageLayout';

export default function UploadTacticPage() {
  const [tactics, setTactics] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [results, setResults] = useState([]); // 진행 상황 로그
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function loadTactics() {
      const { data } = await supabase
        .from('tactics')
        .select('id, name')
        .order('name', { ascending: true });
      if (data) setTactics(data);
    }
    loadTactics();
  }, []);

  // 파일 하나를 크롭해서 blob으로 반환
  async function cropImage(file) {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise(r => img.onload = r);

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const sx = img.width * 0.17;
    const sy = img.height * 0.22;
    const cropWidth = img.width * 0.18;
    const cropHeight = img.height * 0.48;

    ctx.drawImage(img, sx, sy, cropWidth, cropHeight, 0, 0, 300, 400);
    return await new Promise(r => canvas.toBlob(r, 'image/png'));
  }

  // 파일명(확장자 제외)에서 이름 추출
  function getNameFromFile(file) {
    return file.name.replace(/\.[^/.]+$/, '').trim();
  }

  async function handleBulkUpload() {
    if (imageFiles.length === 0) return alert('이미지 파일을 선택하세요.');
    setIsUploading(true);
    setResults([]);

    // 서버 API가 요청자 신원(admin 여부)을 확인해야 하므로, 현재 로그인 세션의
    // accessToken을 한 번만 꺼내둔다.
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    for (const file of imageFiles) {
      const fileName = getNameFromFile(file);
      const matched = tactics.find(t => t.name === fileName);

      if (!matched) {
        setResults(prev => [...prev, { file: file.name, status: 'unmatched', message: `"${fileName}"와 일치하는 전법을 찾을 수 없음` }]);
        continue;
      }

      try {
        const blob = await cropImage(file);
        const storageFileName = `tactic_${Date.now()}_${matched.id}.png`;

        // storage 업로드 + DB update를 서버측 API(서비스 롤 키, RLS 우회)에 위임한다.
        const formData = new FormData();
        formData.append('file', blob, storageFileName);
        formData.append('tacticId', matched.id);
        formData.append('accessToken', accessToken);

        const res = await fetch('/api/admin/upload-tactic-image', {
          method: 'POST',
          body: formData,
        });
        const result = await res.json();

        if (!result.success) {
          setResults(prev => [...prev, { file: file.name, status: 'error', message: result.error || '업로드 실패' }]);
          continue;
        }

        setResults(prev => [...prev, { file: file.name, status: 'success', message: `"${matched.name}" 등록 완료` }]);
      } catch (e) {
        setResults(prev => [...prev, { file: file.name, status: 'error', message: '처리 중 오류: ' + e.message }]);
      }
    }

    setIsUploading(false);
  }

  return (
    <PageLayout>
      <div style={{ padding: '40px' }}>
        <h1 className="classic-heading text-2xl font-bold">전법 이미지 일괄 업로드</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          파일명이 전법 이름과 정확히 일치해야 합니다 (예: 칠군수몰.png)
        </p>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImageFiles(Array.from(e.target.files))}
        />
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{imageFiles.length}개 파일 선택됨</p>

        <br />
        <button
          className="seal-button"
          onClick={handleBulkUpload}
          disabled={isUploading}
          style={{ padding: '10px 20px', cursor: isUploading ? 'not-allowed' : 'pointer' }}
        >
          {isUploading ? '업로드 중...' : '일괄 업로드 시작'}
        </button>

        {results.length > 0 && (
          <div style={{ marginTop: '30px', maxWidth: '600px' }}>
            <h3 style={{ color: 'var(--text-primary)' }}>진행 결과 ({results.filter(r => r.status === 'success').length}/{results.length} 성공)</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {results.map((r, i) => (
                <li key={i} style={{
                  padding: '8px 12px', marginBottom: '4px', borderRadius: '4px',
                  backgroundColor: r.status === 'success' ? 'rgba(78,154,99,0.15)' : r.status === 'unmatched' ? 'rgba(184,135,58,0.15)' : 'rgba(192,69,61,0.15)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}>
                  <strong>{r.file}</strong>: {r.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageLayout>
  );
}