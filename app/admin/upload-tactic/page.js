'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';

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

        const { error: uploadError } = await supabase.storage
          .from('generals')
          .upload(storageFileName, blob, { cacheControl: '3600', upsert: true });

        if (uploadError) {
          setResults(prev => [...prev, { file: file.name, status: 'error', message: '업로드 실패: ' + uploadError.message }]);
          continue;
        }

        const { data: publicData } = supabase.storage.from('generals').getPublicUrl(storageFileName);

        const { error: updateError } = await supabase
          .from('tactics')
          .update({ image_url: publicData.publicUrl })
          .eq('id', matched.id);

        if (updateError) {
          setResults(prev => [...prev, { file: file.name, status: 'error', message: 'DB 업데이트 실패: ' + updateError.message }]);
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
    <div style={{ padding: '40px', backgroundColor: '#f4ece0' }}>
      <h1>전법 이미지 일괄 업로드</h1>
      <p style={{ color: '#5d4037', fontSize: '0.9rem' }}>
        파일명이 전법 이름과 정확히 일치해야 합니다 (예: 칠군수몰.png)
      </p>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setImageFiles(Array.from(e.target.files))}
      />
      <p style={{ fontSize: '0.85rem', color: '#8d6e63' }}>{imageFiles.length}개 파일 선택됨</p>

      <br />
      <button
        onClick={handleBulkUpload}
        disabled={isUploading}
        style={{ padding: '10px 20px', cursor: isUploading ? 'not-allowed' : 'pointer' }}
      >
        {isUploading ? '업로드 중...' : '일괄 업로드 시작'}
      </button>

      {results.length > 0 && (
        <div style={{ marginTop: '30px', maxWidth: '600px' }}>
          <h3>진행 결과 ({results.filter(r => r.status === 'success').length}/{results.length} 성공)</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {results.map((r, i) => (
              <li key={i} style={{
                padding: '8px 12px', marginBottom: '4px', borderRadius: '4px',
                backgroundColor: r.status === 'success' ? '#e8f5e9' : r.status === 'unmatched' ? '#fff3e0' : '#ffebee',
                fontSize: '0.9rem'
              }}>
                <strong>{r.file}</strong>: {r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}