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

// ── 리셋 감지 델타 계산 (필드 공용) ──────────────────────
// 인게임 "주간" 수치는 일요일마다 0으로 리셋된다.
// 어제보다 오늘 값이 작으면 리셋이 일어난 것으로 보고,
// 그 경우 오늘 값 자체를 "오늘 하루 순수 증가분"으로 취급한다.
function computeFieldDelta(current, prev) {
  if (prev === null || prev === undefined) {
    return { delta: current, reset: false, noPrevData: true };
  }
  if (current < prev) {
    return { delta: current, reset: true, noPrevData: false };
  }
  return { delta: current - prev, reset: false, noPrevData: false };
}

function computeDailyDelta(currentRow, prevRow) {
  if (!currentRow) return null;
  const merit = computeFieldDelta(currentRow.weekly_merit, prevRow?.weekly_merit);
  const contrib = computeFieldDelta(currentRow.weekly_contribution, prevRow?.weekly_contribution);
  const siege = computeFieldDelta(currentRow.siege_count, prevRow?.siege_count);
  return {
    meritDelta: merit.delta,
    contribDelta: contrib.delta,
    siegeDelta: siege.delta,
    resetHappened: merit.reset || contrib.reset || siege.reset,
    noPrevData: merit.noPrevData,
  };
}

// ── 사람별 히스토리를 날짜순으로 정렬하고, 리셋과 무관하게
//    계속 쌓이는 누적치를 계산 ─────────────────────────────
function buildMemberHistory(weeklyStats) {
  const byChar = {};
  weeklyStats.forEach((r) => {
    if (!byChar[r.char_id]) byChar[r.char_id] = [];
    byChar[r.char_id].push(r);
  });

  const historyByChar = {};

  Object.entries(byChar).forEach(([charId, rows]) => {
    const sorted = [...rows].sort((a, b) => a.week_label.localeCompare(b.week_label));
    let cumMerit = 0;
    let cumContrib = 0;
    let cumSiege = 0;

    const entries = sorted.map((row, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const delta = computeDailyDelta(row, prev);

      cumMerit += delta.meritDelta;
      cumContrib += delta.contribDelta;
      cumSiege += delta.siegeDelta;

      return {
        ...row,
        dailyMeritDelta: delta.meritDelta,
        dailyContribDelta: delta.contribDelta,
        dailySiegeDelta: delta.siegeDelta,
        resetHappened: delta.resetHappened,
        noPrevData: delta.noPrevData,
        cumulativeMerit: cumMerit,
        cumulativeContribution: cumContrib,
        cumulativeSiege: cumSiege,
      };
    });

    historyByChar[charId] = entries;
  });

  return historyByChar;
}

// 특정 날짜 기준으로 최근 N일간의 순수 증가분 합계 (리셋 시점과 무관한 "최근 활동량")
function sumRecentWindow(entries, latestDateStr, windowDays) {
  const latestDate = new Date(latestDateStr);
  const cutoff = new Date(latestDate);
  cutoff.setDate(cutoff.getDate() - (windowDays - 1));

  let meritSum = 0;
  let contribSum = 0;
  let siegeSum = 0;
  let daysCounted = 0;

  entries.forEach((e) => {
    const d = new Date(e.week_label);
    if (d >= cutoff && d <= latestDate) {
      meritSum += e.dailyMeritDelta;
      contribSum += e.dailyContribDelta;
      siegeSum += e.dailySiegeDelta;
      daysCounted += 1;
    }
  });

  return { meritSum, contribSum, siegeSum, daysCounted };
}

export default function MemberManagementPage() {
  const [dayLabel, setDayLabel] = useState(todayDayLabel());
  const [parsedRows, setParsedRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [contribThreshold, setContribThreshold] = useState(15000);
  const [windowDays, setWindowDays] = useState(7); // 액티브 판정에 쓸 롤링 윈도우(일)
  const [weeklyStats, setWeeklyStats] = useState([]); // 전체 일자별 DB 데이터
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

  // 전체 데이터를 불러와서 누적/윈도우 계산에 사용
  const loadStats = async () => {
    setIsLoadingStats(true);
    const { data, error } = await supabase
      .from('member_weekly_stats')
      .select('*')
      .order('week_label', { ascending: true }) // 히스토리 계산을 위해 오름차순으로 받음
      .order('member_name', { ascending: true });

    setIsLoadingStats(false);
    if (!error && data) {
      setWeeklyStats(data);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // ── 히스토리 & 누적치 계산 ───────────────────────────
  const historyByChar = buildMemberHistory(weeklyStats);

  // 일자 목록 (최신순)
  const dayLabels = [...new Set(weeklyStats.map((r) => r.week_label))].sort().reverse();
  const recentDays = dayLabels.slice(0, 2);
  const latestDay = recentDays[0];
  const prevDay = recentDays[1];

  // 오늘 이전에 한 번이라도 존재했는지로 신규멤버 판별
  const pastCharIds = new Set(
    weeklyStats.filter((r) => r.week_label !== latestDay).map((r) => r.char_id)
  );

  // 오늘자 데이터 + 누적치 + 최근 윈도우 활동량을 합친 최종 데이터
  const currentDayData = Object.entries(historyByChar)
    .map(([charId, entries]) => {
      const latestEntry = entries[entries.length - 1];
      if (!latestEntry || latestEntry.week_label !== latestDay) return null;

      const window = sumRecentWindow(entries, latestDay, windowDays);

      return {
        ...latestEntry,
        isNew: !pastCharIds.has(charId),
        recentContribSum: window.contribSum,
        recentMeritSum: window.meritSum,
        recentSiegeSum: window.siegeSum,
        recentDaysCounted: window.daysCounted,
      };
    })
    .filter(Boolean);

  // ── 액티브/비액티브: 인게임 리셋 카운터가 아니라
  //    "최근 N일 순수 증가량" 기준으로 판정 ──────────────
  const activeCount = currentDayData.filter((r) => r.recentContribSum > contribThreshold).length;
  const inactiveToday = currentDayData.filter((r) => r.recentContribSum <= contribThreshold);

  // 2일 연속 "최근 윈도우 활동량"이 기준 이하인 사람 (컷 대상)
  const cutTargets = [];
  if (recentDays.length >= 2) {
    const [d1, d2] = recentDays; // d1=오늘, d2=어제
    Object.entries(historyByChar).forEach(([charId, entries]) => {
      const e1 = entries.find((e) => e.week_label === d1);
      const e2 = entries.find((e) => e.week_label === d2);
      if (!e1 || !e2) return;
      const w1 = sumRecentWindow(entries, d1, windowDays).contribSum;
      const w2 = sumRecentWindow(entries, d2, windowDays).contribSum;
      if (w1 <= contribThreshold && w2 <= contribThreshold) {
        cutTargets.push({ ...e1, isNew: !pastCharIds.has(charId), recentContribSum: w1 });
      }
    });
  }

  // 필터: 오늘 무훈 증가가 0인 사람 (리셋 직후 카운터가 0인 것과 구분하기 위해 '오늘 증가분' 기준)
  const zeroMeritList = currentDayData.filter((r) => r.dailyMeritDelta === 0);
  const lowContribList = currentDayData.filter((r) => r.recentContribSum <= contribThreshold);
  const lowSiegeList = [...currentDayData].sort((a, b) => a.cumulativeSiege - b.cumulativeSiege);

  // ── 차트용 데이터 ──────────────────────────────
  const activeVsInactiveData = [
    { name: '액티브', count: activeCount },
    { name: '비액티브', count: inactiveToday.length },
  ];

  const groupAvgMap = {};
  currentDayData.forEach((r) => {
    const g = r.group_name || '미배정';
    if (!groupAvgMap[g]) groupAvgMap[g] = { sum: 0, count: 0 };
    groupAvgMap[g].sum += r.recentContribSum;
    groupAvgMap[g].count += 1;
  });
  const groupAvgData = Object.entries(groupAvgMap).map(([name, v]) => ({
    name,
    평균공헌: Math.round(v.sum / v.count),
  }));

  const bottomContribData = [...currentDayData]
    .sort((a, b) => a.recentContribSum - b.recentContribSum)
    .slice(0, 10)
    .map((r) => ({ name: r.member_name, [`최근${windowDays}일공헌`]: r.recentContribSum }));

  const bottomSiegeData = [...currentDayData]
    .sort((a, b) => a.cumulativeSiege - b.cumulativeSiege)
    .slice(0, 10)
    .map((r) => ({ name: r.member_name, 누적공성: r.cumulativeSiege }));

  const bottomDeltaData = currentDayData
    .filter((r) => !r.noPrevData)
    .sort((a, b) => a.dailyContribDelta - b.dailyContribDelta)
    .slice(0, 10)
    .map((r) => ({ name: r.member_name, 오늘증가분: r.dailyContribDelta }));

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
          인게임 주간 수치는 매주 리셋되므로, 실제 판정은 리셋과 무관하게 계속 쌓이는 누적/최근 활동량을 기준으로 합니다.
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
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>공헌 기준치 (최근 활동량 기준)</label>
              <input
                type="number"
                value={contribThreshold}
                onChange={(e) => setContribThreshold(Number(e.target.value))}
                style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '140px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>활동량 집계 기간 (일)</label>
              <input
                type="number"
                min={1}
                value={windowDays}
                onChange={(e) => setWindowDays(Math.max(1, Number(e.target.value)))}
                style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '100px' }}
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
              현재 조회 기준 날짜: <strong>{latestDay}</strong> (전체 {currentDayData.length}명) ·
              최근 <strong>{windowDays}일</strong> 순수 증가량 기준으로 액티브를 판정합니다 (인게임 주간 리셋과 무관).
              {!prevDay && <span style={{ marginLeft: '10px', color: 'var(--seal-dark)' }}>* 이전 날짜 데이터가 없어 델타/누적은 오늘 값 그대로 시작됩니다.</span>}
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
                  <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>조별 평균 공헌 (최근 {windowDays}일)</p>
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
                  <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>최근 {windowDays}일 공헌 하위 10명</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bottomContribData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={70} />
                      <Tooltip />
                      <Bar dataKey={`최근${windowDays}일공헌`} fill="var(--seal)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>누적 공성횟수 하위 10명</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bottomSiegeData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={70} />
                      <Tooltip />
                      <Bar dataKey="누적공성" fill="var(--seal-dark)" />
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
                  ⚠ 2일 연속 비액티브 (컷 대상, 최근 {windowDays}일 기준)
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
                        최근 {windowDays}일 공헌: {r.recentContribSum.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 필터 3종 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div className="scroll-panel" style={{ padding: '20px' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
                  오늘 무훈 증가 0 ({zeroMeritList.length}명)
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
                  최근 {windowDays}일 공헌 {contribThreshold.toLocaleString()} 이하 ({lowContribList.length}명)
                </h3>
                {lowContribList.map((r) => (
                  <div key={r.char_id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(184,147,90,0.15)', fontSize: '0.9rem' }}>
                    <strong>{r.member_name}</strong> {r.isNew && <span style={{ color: 'var(--jade)', fontWeight: 'bold', marginLeft: '6px' }}>[신규]</span>}
                    <span style={{ color: 'var(--seal-dark)', marginLeft: '6px' }}>{r.recentContribSum.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="scroll-panel" style={{ padding: '20px' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.05rem', marginBottom: '12px' }}>
                  누적 공성횟수 낮은 순
                </h3>
                {lowSiegeList.slice(0, 15).map((r) => (
                  <div key={r.char_id} style={{ padding: '6px 0', borderBottom: '1px solid rgba(184,147,90,0.15)', fontSize: '0.9rem' }}>
                    <strong>{r.member_name}</strong> {r.isNew && <span style={{ color: 'var(--jade)', fontWeight: 'bold', marginLeft: '6px' }}>[신규]</span>}
                    <span style={{ color: 'var(--ink-text)', marginLeft: '6px' }}>{r.cumulativeSiege}회</span>
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
                      <th style={{ textAlign: 'right', padding: '8px' }}>누적 무훈</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>누적 공헌</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>최근 {windowDays}일 공헌</th>
                      <th style={{ textAlign: 'right', padding: '8px' }}>오늘 증가분</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactiveToday
                      .sort((a, b) => a.recentContribSum - b.recentContribSum)
                      .map((r) => (
                        <tr key={r.char_id} style={{ borderBottom: '1px solid rgba(184,147,90,0.2)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>
                            {r.member_name} {r.isNew && <span style={{ color: 'var(--jade)', fontSize: '0.8rem' }}>[신규]</span>}
                          </td>
                          <td style={{ padding: '8px' }}>{r.job}</td>
                          <td style={{ padding: '8px' }}>{r.position}</td>
                          <td style={{ padding: '8px' }}>{r.group_name}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{r.cumulativeMerit.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{r.cumulativeContribution.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: 'var(--seal-dark)', fontWeight: 'bold' }}>{r.recentContribSum.toLocaleString()}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>
                            {r.noPrevData ? '-' : r.dailyContribDelta.toLocaleString()}
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
