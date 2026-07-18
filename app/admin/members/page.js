// app/admin/members/page.js
'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList,
} from 'recharts';
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

function todayDayLabel() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (업로드한 날짜 기준, 일간)
}

// 주간 리셋을 감지해서 순수 "오늘 증가량(델타)"을 계산
function computeDailyDelta(currentRow, prevRow) {
  if (!currentRow) return null;
  if (!prevRow) return { meritDelta: null, contribDelta: null, resetHappened: false, noPrevData: true };

  const meritDropped = currentRow.weekly_merit < prevRow.weekly_merit;
  const contribDropped = currentRow.weekly_contribution < prevRow.weekly_contribution;

  if (meritDropped || contribDropped) {
    // 주간 리셋 발생 → 오늘 누적치 자체가 이번 주 첫 델타
    return {
      meritDelta: currentRow.weekly_merit,
      contribDelta: currentRow.weekly_contribution,
      resetHappened: true,
      noPrevData: false,
    };
  }
  return {
    meritDelta: currentRow.weekly_merit - prevRow.weekly_merit,
    contribDelta: currentRow.weekly_contribution - prevRow.weekly_contribution,
    resetHappened: false,
    noPrevData: false,
  };
}

export default function MemberManagementPage() {
  const [dayLabel, setDayLabel] = useState(todayDayLabel());
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [contribThreshold, setContribThreshold] = useState(15000);
  const [weeklyStats, setWeeklyStats] = useState([]); // 최근 일자별 DB 데이터
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
      week_label: dayLabel, // 컬럼명은 기존 DB 그대로 두고, 의미만 '일자'로 사용
      ...r,
    }));

    // week_label(=일자) + char_id 기준으로 upsert (같은 날 재업로드 시 덮어쓰기)
    const { error } = await supabase
      .from('member_weekly_stats')
      .upsert(records, { onConflict: 'week_label,char_id' });

    setIsUploading(false);
    if (error) {
      setUploadMsg(`업로드 실패: ${error.message}`);
    } else {
      setUploadMsg(`${records.length}명의 데이터를 ${dayLabel} 날짜로 저장했습니다.`);
      loadStats();
    }
  };

  // 전체 데이터를 불러와서 연속 미활동/델타 계산
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

  // 일자 목록 (최신순)
  const dayLabels = [...new Set(weeklyStats.map((r) => r.week_label))].sort().reverse();
  const recentDays = dayLabels.slice(0, 3);

  // 사람별로 일자 데이터 묶기
  const byPerson = {};
  weeklyStats.forEach((r) => {
    if (!byPerson[r.char_id]) byPerson[r.char_id] = {};
    byPerson[r.char_id][r.week_label] = r;
  });

  const latestDay = recentDays[0];
  const prevDay = recentDays[1]; // 어제
  const currentDayDataRaw = latestDay ? weeklyStats.filter((r) => r.week_label === latestDay) : [];

  // 오늘 이전에 한 번이라도 존재했는지로 신규멤버 판별
  const pastCharIds = new Set(
    weeklyStats.filter((r) => r.week_label !== latestDay).map((r) => r.char_id)
  );

  // 델타 + 신규멤버 플래그를 붙인 오늘자 데이터
  const currentDayData = currentDayDataRaw.map((r) => {
    const prevRow = prevDay ? byPerson[r.char_id]?.[prevDay] : null;
    const delta = computeDailyDelta(r, prevRow);
    return {
      ...r,
      isNew: !pastCharIds.has(r.char_id),
      delta,
    };
  });

  const activeCount = currentDayData.filter((r) => r.weekly_contribution > contribThreshold).length;
  const inactiveToday = currentDayData.filter((r) => r.weekly_contribution <= contribThreshold);

  // 2일 연속 비액티브(컷 대상): 최근 2일 데이터가 모두 존재하고, 둘 다 기준치 이하
  const cutTargets = [];
  if (recentDays.length >= 2) {
    const [d1, d2] = recentDays; // d1=오늘, d2=어제
    Object.entries(byPerson).forEach(([charId, days]) => {
      const r1 = days[d1];
      const r2 = days[d2];
      if (r1 && r2 && r1.weekly_contribution <= contribThreshold && r2.weekly_contribution <= contribThreshold) {
        cutTargets.push(r1);
      }
    });
  }

  // 필터 3종
  const zeroMeritList = currentDayData.filter((r) => r.weekly_merit === 0);
  const lowContribList = currentDayData.filter((r) => r.weekly_contribution <= 15000);
  const lowSiegeList = [...currentDayData].sort((a, b) => a.siege_count - b.siege_count);

  // ── 차트용 데이터 ──────────────────────────────
  // 1) 동맹 전체 요약: 액티브 vs 비액티브
  const activeVsInactiveData = [
    { name: '액티브', count: activeCount },
    { name: '비액티브', count: inactiveToday.length },
  ];

  // 2) 조별 평균 공헌
  const groupAvgMap = {};
  currentDayData.forEach((r) => {
    const g = r.group_name || '미배정';
    if (!groupAvgMap[g]) groupAvgMap[g] = { sum: 0, count: 0 };
    groupAvgMap[g].sum += r.weekly_contribution;
    groupAvgMap[g].count += 1;
  });
  const groupAvgData = Object.entries(groupAvgMap).map(([name, v]) => ({
    name,
    평균공헌: Math.round(v.sum / v.count),
  }));

  // 3) 공헌 하위 10명
  const bottomContribData = [...currentDayData]
    .sort((a, b) => a.weekly_contribution - b.weekly_contribution)
    .slice(0, 10)
    .map((r) => ({ name: r.member_name, 공헌: r.weekly_contribution }));

  // 4) 공성횟수 하위 10명
  const bottomSiegeData = lowSiegeList
    .slice(0, 10)
    .map((r) => ({ name: r.member_name, 공성: r.siege_count }));

  // 5) 오늘 순수 증가량(델타) 하위 10명 — 실제로 오늘 안 한 사람
  const bottomDeltaData = currentDayData
    .filter((r) => r.delta && !r.delta.noPrevData)
    .sort((a, b) => a.delta.contribDelta - b.delta.contribDelta)
    .slice(0, 10)
    .map((r) => ({ name: r.member_name, 오늘증가분: r.delta.contribDelta }));

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
          일간 맹원 데이터 엑셀을 업로드하면 액티브 현황과 관리·컷 대상을 자동으로 파악합니다.
        </p>

        {/* 업로드 영역 */}
        <div className="scroll-panel" style={{ padding: '24px', marginBottom: '30px' }}>
          <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>일간 데이터 업로드</h3>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>날짜 라벨</label>
              <input
                value={dayLabel}
                onChange={(e) => setDayLabel(e.target.value)}
                placeholder="예: 2026-07-18"
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

          {latestDay && (
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-text)' }}>
              현재 조회 기준 날짜: <strong>{latestDay}</strong> (전체 {currentDayData.length}명)
              {!prevDay && <span style={{ marginLeft: '10px', color: 'var(--seal-dark)' }}>* 어제 데이터가 없어 오늘 증가량(델타)은 계산되지 않습니다.</span>}
            </p>
          )}
        </div>

        {latestDay && (
          <>
            {/* 요약 통계 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '30px' }}>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>전체 인원</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--ink-text)' }}>{currentDayData.length}</div>
              </div>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>액티브 인원</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--jade)' }}>{activeCount}</div>
              </div>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>오늘 관리대상</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--seal)' }}>{inactiveToday.length}</div>
              </div>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center', border: '2px solid var(--seal)' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>2일 연속 컷 대상</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--seal-dark)' }}>{cutTargets.length}</div>
              </div>
              <div className="scroll-panel" style={{ padding: '18px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', marginBottom: '6px' }}>신규멤버</div>
                <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--jade)' }}>{currentDayData.filter(r => r.isNew).length}</div>
              </div>
            </div>

            {/* 막대그래프: 동맹 전체 요약 */}
            <div className="scroll-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>동맹 전체 요약</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>액티브 vs 비액티브</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={activeVsInactiveData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--jade)">
                        <LabelList dataKey="count" position="top" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>조별 평균 공헌</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={groupAvgData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="평균공헌" fill="var(--gold)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 막대그래프: 개인별 순위 */}
            <div className="scroll-panel" style={{ padding: '24px', marginBottom: '24px' }}>
              <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>개인별 순위 (하위 10명)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>공헌 하위 10명</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bottomContribData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={70} />
                      <Tooltip />
                      <Bar dataKey="공헌" fill="var(--seal)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>공성횟수 하위 10명</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bottomSiegeData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={70} />
                      <Tooltip />
                      <Bar dataKey="공성" fill="var(--seal-dark)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {bottomDeltaData.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>오늘 순수 증가량 하위 10명 (진짜 오늘 미활동)</p>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={bottomDeltaData} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={70} />
                        <Tooltip />
                        <Bar dataKey="오늘증가분" fill="var(--ink-text)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* 컷 대상 목록 */}
            {cutTargets.length > 0 && (
              <div className="scroll-panel" style={{ padding: '24px', marginBottom: '24px', border: '2px solid var(--seal)' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--seal-dark)' }}>
                  ⚠ 2일 연속 비액티브 (컷 대상)
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
                        오늘 공헌: {r.weekly_contribution.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 필터 3종: 무훈 0 / 공헌 15000 이하 / 공성 하위 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div className="scroll-panel" style={{ padding: '20px' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
                  무훈 0 ({zeroMeritList.length}명)
                </h3>
                {zeroMeritList.map((r) => (
                  <div key={r.char_id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(184,147,90,0.15)', fontSize: '0.9rem' }}>
                    <strong>{r.member_name}</strong> {r.isNew && <span style={{ color: 'var(--jade)', fontWeight: 'bold', marginLeft: '6px' }}>[신규]</span>}
                    <span style={{ color: 'var(--ink-text)', marginLeft: '6px' }}>{r.job} · {r.group_name}</span>
                  </div>
                ))}
              </div>

              <div className="scroll-panel" style={{ padding: '20px' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
                  공헌 15,000 이하 ({lowContribList.length}명)
                </h3>
                {lowContribList.map((r) => (
                  <div key={r.char_id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(184,147,90,0.15)', fontSize: '0.9rem' }}>
                    <strong>{r.member_name}</strong> {r.isNew && <span style={{ color: 'var(--jade)', fontWeight: 'bold', marginLeft: '6px' }}>[신규]</span>}
                    <span style={{ color: 'var(--seal-dark)', marginLeft: '6px' }}>{r.weekly_contribution.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="scroll-panel" style={{ padding: '20px' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
                  공성횟수 낮은 순
                </h3>
                {lowSiegeList.slice(0, 15).map((r) => (
                  <div key={r.char_id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(184,147,90,0.15)', fontSize: '0.9rem' }}>
                    <strong>{r.member_name}</strong> {r.isNew && <span style={{ color: 'var(--jade)', fontWeight: 'bold', marginLeft: '6px' }}>[신규]</span>}
                    <span style={{ color: 'var(--ink-text)', marginLeft: '6px' }}>{r.siege_count}회</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 오늘 관리대상(비액티브) 전체 목록 */}
            <div className="scroll-panel" style={{ padding: '24px' }}>
              <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>
                오늘 관리대상 전체 ({inactiveToday.length}명)
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
                      <th style={{ textAlign: 'right', padding: '8px' }}>오늘 증가분</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveToday
                      .sort((a, b) => a.weekly_contribution - b.weekly_contribution)
                      .map((r) => (
                        <tr key={r.char_id} style={{ borderBottom: '1px solid rgba(184,147,90,0.2)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>
                            {r.member_name} {r.isNew && <span style={{ color: 'var(--jade)', fontSize: '0.8rem' }}>[신규]</span>}
                          </td>
                          <td style={{ padding: '8px' }}>{r.job}</td>
                          <td style={{ padding: '8px' }}>{r.position}</td>
                          <td style={{ padding: '8px' }}>{r.group_name}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{r.weekly_merit.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--seal-dark)', fontWeight: 'bold' }}>{r.weekly_contribution.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{r.siege_count}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {r.delta?.noPrevData ? '-' : r.delta?.contribDelta?.toLocaleString()}
                          </td>
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