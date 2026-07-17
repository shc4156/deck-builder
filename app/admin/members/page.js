// app/admin/members/page.js
'use client';
import { useState, useRef, useEffect } from 'react';  // useEffect 추가
import Link from 'next/link';
import * as XLSX from 'xlsx';
import PageLayout from '../../components/PageLayout';
import { supabase } from '../../lib/supabaseClient';

const COLUMN_MAP = {
  '캐릭터 ID': 'char_id',
  '멤버': 'member_name',
  '직업': 'job',
  '조별': 'group_name',
  '직위': 'position',
  '번영': 'prosperity',
  '주간 무훈': 'weekly_merit',
  '주간 공헌': 'weekly_contribution',
  '주둔지': 'garrison',
  '주 공성 횟수': 'siege_count',
};

function toNumber(v) {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

function todayWeekLabel() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (업로드한 날짜 기준)
}

export default function MemberManagementPage() {
  const [weekLabel, setWeekLabel] = useState(todayWeekLabel());
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [contribThreshold, setContribThreshold] = useState(20000);
  const [weeklyStats, setWeeklyStats] = useState([]); // 최근 3주치 DB 데이터
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      const rows = json.map((row) => {
        const mapped = {};
        for (const [korHeader, engKey] of Object.entries(COLUMN_MAP)) {
          mapped[engKey] = row[korHeader];
        }
        mapped.prosperity = toNumber(mapped.prosperity);
        mapped.weekly_merit = toNumber(mapped.weekly_merit);
        mapped.weekly_contribution = toNumber(mapped.weekly_contribution);
        mapped.siege_count = toNumber(mapped.siege_count);
        mapped.char_id = String(mapped.char_id);
        return mapped;
      }).filter((r) => r.char_id);

      setParsedRows(rows);
      setUploadMsg('');
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (parsedRows.length === 0) {
      alert('먼저 엑셀 파일을 선택해주세요.');
      return;
    }
    setIsUploading(true);
    setUploadMsg('');

    const records = parsedRows.map((r) => ({
      week_label: weekLabel,
      ...r,
    }));

    // week_label + char_id 기준으로 upsert (같은 주 재업로드 시 덮어쓰기)
    const { error } = await supabase
      .from('member_weekly_stats')
      .upsert(records, { onConflict: 'week_label,char_id' });

    setIsUploading(false);
    if (error) {
      setUploadMsg(`업로드 실패: ${error.message}`);
    } else {
      setUploadMsg(`${records.length}명의 데이터를 ${weekLabel} 주차로 저장했습니다.`);
      loadStats();
    }
  };

  // 최근 3주치(이번 주 포함) 데이터를 불러와서 연속 미활동 계산
  const loadStats = async () => {
    setIsLoadingStats(true);
    const { data, error } = await supabase
      .from('member_weekly_stats')
      .select('*')
      .order('week_label', { ascending: false })
      .order('member_name', { ascending: true });

    setIsLoadingStats(false);
    if (!error && data) {
      setWeeklyStats(data);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // 주차 목록 (최신순, 최대 3개만 연속성 판단에 사용)
  const weekLabels = [...new Set(weeklyStats.map((r) => r.week_label))].sort().reverse();
  const recentWeeks = weekLabels.slice(0, 3);

  // 사람별로 최근 주차 데이터 묶기
  const byPerson = {};
  weeklyStats.forEach((r) => {
    if (!byPerson[r.char_id]) byPerson[r.char_id] = {};
    byPerson[r.char_id][r.week_label] = r;
  });

  const latestWeek = recentWeeks[0];
  const currentWeekData = latestWeek ? weeklyStats.filter((r) => r.week_label === latestWeek) : [];

  const activeCount = currentWeekData.filter((r) => r.weekly_contribution > contribThreshold).length;
  const inactiveThisWeek = currentWeekData.filter((r) => r.weekly_contribution <= contribThreshold);

  // 2주 연속 비액티브(컷 대상): 최근 2주 데이터가 모두 존재하고, 둘 다 기준치 이하
  const cutTargets = [];
  if (recentWeeks.length >= 2) {
    const [w1, w2] = recentWeeks; // w1=이번주, w2=지난주
    Object.entries(byPerson).forEach(([charId, weeks]) => {
      const r1 = weeks[w1];
      const r2 = weeks[w2];
      if (r1 && r2 && r1.weekly_contribution <= contribThreshold && r2.weekly_contribution <= contribThreshold) {
        cutTargets.push(r1);
      }
    });
  }

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <Link href="/" style={{
          display: 'inline-block', marginBottom: '16px', padding: '6px 14px',
          border: '1px solid var(--gold)', color: 'var(--seal-dark)', fontWeight: 'bold',
          fontSize: '0.9rem', textDecoration: 'none'
        }}>
          ← 홈으로
        </Link>

        <h1 className="classic-heading text-3xl font-bold mb-2">인원 관리</h1>
        <p style={{ color: 'var(--gold-soft)', marginBottom: '24px', fontSize: '1.05rem', fontWeight: 500 }}>
          주간 맹원 데이터 엑셀을 업로드하면 액티브 현황과 관리·컷 대상을 자동으로 파악합니다.
        </p>

        {/* 업로드 영역 */}
        <div className="scroll-panel" style={{ padding: '24px', marginBottom: '30px' }}>
          <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>주간 데이터 업로드</h3>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>주차 라벨</label>
              <input
                value={weekLabel}
                onChange={(e) => setWeekLabel(e.target.value)}
                placeholder="예: 2026-07-17"
                style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '160px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>엑셀 파일 (.xlsx)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                style={{ padding: '6px' }}
              />
            </div>
            <button
              onClick={handleUpload}
              disabled={isUploading || parsedRows.length === 0}
              className="seal-button"
              style={{ padding: '10px 24px' }}
            >
              {isUploading ? '업로드 중...' : `업로드 (${parsedRows.length}명 인식됨)`}
            </button>
          </div>

          {fileName && <p style={{ fontSize: '0.9rem', color: 'var(--ink-text)' }}>선택된 파일: {fileName}</p>}
          {uploadMsg && <p style={{ fontSize: '0.95rem', color: 'var(--jade)', fontWeight: 'bold', marginTop: '8px' }}>{uploadMsg}</p>}
        </div>

        {/* 조회 및 기준치 설정 */}
        <div className="scroll-panel" style={{ padding: '24px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>주간 공헌 기준치</label>
              <input
                type="number"
                value={contribThreshold}
                onChange={(e) => setContribThreshold(Number(e.target.value))}
                style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '140px' }}
              />
            </div>
            <button
              onClick={loadStats}
              disabled={isLoadingStats}
              style={{ padding: '10px 20px', fontWeight: 'bold', border: '1px solid var(--jade)', color: 'var(--jade)', background: 'transparent', cursor: 'pointer' }}
            >
              {isLoadingStats ? '불러오는 중...' : '최신 데이터 불러오기'}
            </button>
          </div>

          {latestWeek && (
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-text)' }}>
              현재 조회 기준 주차: <strong>{latestWeek}</strong> (전체 {currentWeekData.length}명)
            </p>
          )}
        </div>

        {latestWeek && (
          <>
            {/* 요약 통계 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '30px' }}>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>전체 인원</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--ink-text)' }}>{currentWeekData.length}</div>
              </div>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>액티브 인원</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--jade)' }}>{activeCount}</div>
              </div>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>이번주 관리대상</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--seal)' }}>{inactiveThisWeek.length}</div>
              </div>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center', border: '2px solid var(--seal)' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>2주 연속 컷 대상</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--seal-dark)' }}>{cutTargets.length}</div>
              </div>
            </div>

            {/* 컷 대상 목록 */}
            {cutTargets.length > 0 && (
              <div className="scroll-panel" style={{ padding: '24px', marginBottom: '24px', border: '2px solid var(--seal)' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--seal-dark)' }}>
                  ⚠ 2주 연속 비액티브 (컷 대상)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                  {cutTargets.map((r) => (
                    <div key={r.char_id} style={{
                      padding: '12px', border: '2px solid var(--seal)', backgroundColor: 'rgba(166,50,42,0.06)'
                    }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{r.member_name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--ink-text)' }}>
                        {r.job} · {r.position} · {r.group_name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', fontWeight: 'bold', marginTop: '4px' }}>
                        이번주 공헌: {r.weekly_contribution.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 이번주 관리대상(비액티브) 전체 목록 */}
            <div className="scroll-panel" style={{ padding: '24px' }}>
              <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
                이번 주 관리대상 전체 ({inactiveThisWeek.length}명)
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--gold)' }}>
                      <th style={{ textAlign: 'left', padding: '8px' }}>멤버</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>직업</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>직위</th>
                      <th style={{ textAlign: 'left', padding: '8px' }}>조별</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>주간 무훈</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>주간 공헌</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>공성 횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveThisWeek
                      .sort((a, b) => a.weekly_contribution - b.weekly_contribution)
                      .map((r) => (
                        <tr key={r.char_id} style={{ borderBottom: '1px solid rgba(184,147,90,0.2)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{r.member_name}</td>
                          <td style={{ padding: '8px' }}>{r.job}</td>
                          <td style={{ padding: '8px' }}>{r.position}</td>
                          <td style={{ padding: '8px' }}>{r.group_name}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{r.weekly_merit.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--seal-dark)', fontWeight: 'bold' }}>{r.weekly_contribution.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{r.siege_count}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}