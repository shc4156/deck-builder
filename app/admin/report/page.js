// app/admin/report/page.js
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LabelList, Legend, AreaChart, Area,
} from 'recharts';
import PageLayout from '../../components/PageLayout';
import { supabase } from '../../lib/supabaseClient';

// ── members 페이지와 동일한 리셋 감지/델타 계산 로직 (일관성 유지) ──────
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
    noPrevData: merit.noPrevData,
  };
}

function buildMemberHistory(weeklyStats) {
  const byChar = {};
  weeklyStats.forEach((r) => {
    if (!byChar[r.char_id]) byChar[r.char_id] = [];
    byChar[r.char_id].push(r);
  });

  const historyByChar = {};
  Object.entries(byChar).forEach(([charId, rows]) => {
    const sorted = [...rows].sort((a, b) => a.week_label.localeCompare(b.week_label));
    const entries = sorted.map((row, idx) => {
      const prev = idx > 0 ? sorted[idx - 1] : null;
      const delta = computeDailyDelta(row, prev);
      return { ...row, ...delta };
    });
    historyByChar[charId] = entries;
  });

  return historyByChar;
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// 접기/펼치기 섹션 (members 페이지와 동일 패턴)
function ToggleSection({ title, count, accentColor = 'var(--seal-dark)', defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="scroll-panel" style={{ padding: 0, marginBottom: '14px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span className="classic-heading" style={{ fontSize: '1.05rem', color: accentColor }}>
          {title} {typeof count === 'number' && <span style={{ fontWeight: 700 }}>({count}명)</span>}
        </span>
        <span style={{
          fontSize: '0.85rem', color: 'var(--ink-text)', opacity: 0.7,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease'
        }}>
          ▼
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 18px 20px', borderTop: '1px dashed rgba(184,147,90,0.35)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function WeeklyReportPage() {
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [contribThreshold, setContribThreshold] = useState(15000);
  const [rangeDays, setRangeDays] = useState(7); // 리포트 집계 범위(일)

  useEffect(() => {
    async function loadStats() {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('member_weekly_stats')
        .select('*')
        .order('week_label', { ascending: true })
        .order('member_name', { ascending: true });
      setIsLoading(false);
      if (!error && data) setWeeklyStats(data);
    }
    loadStats();
  }, []);

  const historyByChar = buildMemberHistory(weeklyStats);
  const allDayLabels = [...new Set(weeklyStats.map((r) => r.week_label))].sort();
  const reportDayLabels = allDayLabels.slice(-rangeDays); // 최근 N일
  const latestDay = reportDayLabels[reportDayLabels.length - 1];
  const firstDay = reportDayLabels[0];

  // ── 날짜별 스냅샷: 각 날짜의 전체 인원/액티브 인원/신규 인원/참여 인원 계산 ──
  const dailySnapshots = reportDayLabels.map((day) => {
    const dayRows = weeklyStats.filter((r) => r.week_label === day);
    const total = dayRows.length;

    let activeCount = 0;
    let newCount = 0;
    let siegeParticipants = 0;
    let warParticipants = 0;

    dayRows.forEach((row) => {
      const entries = historyByChar[row.char_id] || [];
      const idx = entries.findIndex((e) => e.week_label === day);
      const entry = entries[idx];
      if (!entry) return;

      // 신규 판정: 이 날짜 기준 그저께 이전에 데이터가 없었으면 신규(2일 미만)
      const twoDaysBefore = (() => {
        const d = new Date(day);
        d.setDate(d.getDate() - 2);
        return d.toISOString().slice(0, 10);
      })();
      const hasPastRecord = weeklyStats.some((r) => r.char_id === row.char_id && r.week_label <= twoDaysBefore);
      const isNew = !hasPastRecord;
      if (isNew) newCount += 1;

      // 액티브 판정: 최근 rangeDays 누적 공헌 증가가 기준치 초과
      const windowStart = new Date(day);
      windowStart.setDate(windowStart.getDate() - (rangeDays - 1));
      let contribSum = 0;
      entries.forEach((e) => {
        const d = new Date(e.week_label);
        if (d >= windowStart && d <= new Date(day)) contribSum += (e.contribDelta || 0);
      });
      if (contribSum > contribThreshold) activeCount += 1;

      if (!isNew) {
        if ((row.siege_count || 0) >= 1) siegeParticipants += 1;
        if ((entry.meritDelta || 0) > 0) warParticipants += 1;
      }
    });

    return {
      day,
      dateLabel: formatShortDate(day),
      total,
      active: activeCount,
      inactive: total - activeCount,
      newMembers: newCount,
      siegeParticipants,
      warParticipants,
    };
  });

  const latestSnapshot = dailySnapshots[dailySnapshots.length - 1] || null;
  const firstSnapshot = dailySnapshots[0] || null;

  // 기간 내 총 신규 유입 (기간 시작 시점엔 없었는데 기간 중 등장한 고유 인원)
  const startCharIds = new Set(
    weeklyStats.filter((r) => firstDay && r.week_label < firstDay).map((r) => r.char_id)
  );
  const newInRangeIds = new Set();
  weeklyStats.forEach((r) => {
    if (reportDayLabels.includes(r.week_label) && !startCharIds.has(r.char_id)) {
      newInRangeIds.add(r.char_id);
    }
  });
  const newInRangeMembers = [...newInRangeIds].map((id) => {
    const rows = weeklyStats.filter((r) => r.char_id === id);
    return rows[rows.length - 1];
  });

  // 최신일 기준 veteran(2일 이상) 참여 명단 (상세 토글용)
  let veteranParticipation = [];
  if (latestDay) {
    const latestRows = weeklyStats.filter((r) => r.week_label === latestDay);
    const twoDaysBefore = (() => {
      const d = new Date(latestDay);
      d.setDate(d.getDate() - 2);
      return d.toISOString().slice(0, 10);
    })();
    veteranParticipation = latestRows
      .map((row) => {
        const hasPastRecord = weeklyStats.some((r) => r.char_id === row.char_id && r.week_label <= twoDaysBefore);
        if (!hasPastRecord) return null;
        const entries = historyByChar[row.char_id] || [];
        const entry = entries.find((e) => e.week_label === latestDay);
        const participated = (row.siege_count || 0) >= 1 || (entry?.meritDelta || 0) > 0;
        return { ...row, meritDelta: entry?.meritDelta || 0, participated };
      })
      .filter(Boolean);
  }
  const nonParticipants = veteranParticipation.filter((r) => !r.participated);

  const pct = (n, total) => (total === 0 ? '0.0' : ((n / total) * 100).toFixed(1));

  const activeRatePct = latestSnapshot ? pct(latestSnapshot.active, latestSnapshot.total) : '0.0';
  const firstActiveRatePct = firstSnapshot ? pct(firstSnapshot.active, firstSnapshot.total) : '0.0';
  const activeRateDelta = latestSnapshot && firstSnapshot
    ? (parseFloat(activeRatePct) - parseFloat(firstActiveRatePct)).toFixed(1)
    : '0.0';

  const siegeRatePct = latestSnapshot
    ? pct(latestSnapshot.siegeParticipants, latestSnapshot.total - latestSnapshot.newMembers)
    : '0.0';
  const warRatePct = latestSnapshot
    ? pct(latestSnapshot.warParticipants, latestSnapshot.total - latestSnapshot.newMembers)
    : '0.0';

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <Link href="/admin" style={{
          display: 'inline-block', marginBottom: '16px', padding: '6px 14px',
          border: '1px solid var(--gold)', color: 'var(--seal-dark)', fontWeight: 'bold',
          fontSize: '0.9rem', textDecoration: 'none'
        }}>
          ← 지휘부 도구로
        </Link>

        {/* ============================================================
            📜 주간 리포트 — 문서형 헤더 (週刊諜報 / 주간첩보)
        ============================================================ */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, var(--paper-soft) 0%, var(--paper) 45%, var(--paper-soft) 100%)',
            border: '3px double var(--gold)',
            borderRadius: '6px',
            padding: '30px 36px',
            marginBottom: '30px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16), inset 0 0 60px rgba(139,94,52,0.08)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute', inset: '8px', border: '1px solid rgba(139,94,52,0.3)',
            borderRadius: '3px', pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{
              writingMode: 'vertical-rl', textOrientation: 'upright',
              fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.2em',
              color: 'var(--seal-dark)', flexShrink: 0, lineHeight: 1.3
            }}>
              週刊諜報
            </div>

            <div style={{ flex: 1, minWidth: '220px' }}>
              <h1 className="classic-heading text-3xl font-bold mb-2" style={{ margin: 0 }}>
                주간 리포트
              </h1>
              <p style={{ color: 'var(--ink-text)', opacity: 0.8, marginTop: '10px', fontSize: '1.05rem', fontWeight: 500 }}>
                최근 {rangeDays}일간의 동맹 정세를 한눈에 정리한 보고서입니다.
                {firstDay && latestDay && (
                  <span style={{ display: 'block', marginTop: '4px', fontSize: '0.9rem', opacity: 0.75 }}>
                    집계 기간: {firstDay} ~ {latestDay}
                  </span>
                )}
              </p>
            </div>

            {/* 도장 스타일 날짜 인장 */}
            {latestDay && (
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                border: '2px solid var(--seal)', color: 'var(--seal)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 900, transform: 'rotate(-8deg)', opacity: 0.85,
                flexShrink: 0
              }}>
                <span style={{ fontSize: '0.6rem' }}>報告</span>
                <span>{formatShortDate(latestDay)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 설정 바 */}
        <div className="scroll-panel" style={{ padding: '20px 24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)', fontSize: '0.9rem' }}>
                집계 기간 (일)
              </label>
              <input
                type="number"
                min={2}
                max={allDayLabels.length || 30}
                value={rangeDays}
                onChange={(e) => setRangeDays(Math.max(2, Number(e.target.value)))}
                style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '100px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)', fontSize: '0.9rem' }}>
                액티브 판정 기준 (공헌)
              </label>
              <input
                type="number"
                value={contribThreshold}
                onChange={(e) => setContribThreshold(Number(e.target.value))}
                style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '140px' }}
              />
            </div>
            {isLoading && <span style={{ color: 'var(--ink-text)', fontSize: '0.9rem' }}>불러오는 중...</span>}
          </div>
        </div>

        {!latestSnapshot && !isLoading && (
          <div className="scroll-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--ink-text)' }}>
            아직 집계할 데이터가 없습니다. 인원 관리 페이지에서 먼저 일간 데이터를 업로드해주세요.
          </div>
        )}

        {latestSnapshot && (
          <>
            {/* ── 핵심 지표 요약 카드 ─────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div className="scroll-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 700 }}>현재 액티브율</div>
                <div style={{ fontSize: '2.1rem', fontWeight: '900', color: 'var(--jade)' }}>{activeRatePct}%</div>
                <div style={{
                  fontSize: '0.85rem', fontWeight: 700, marginTop: '4px',
                  color: parseFloat(activeRateDelta) >= 0 ? 'var(--jade)' : 'var(--seal)'
                }}>
                  {parseFloat(activeRateDelta) >= 0 ? '▲' : '▼'} {Math.abs(activeRateDelta)}%p (기간 대비)
                </div>
              </div>

              <div className="scroll-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 700 }}>액티브 / 전체</div>
                <div style={{ fontSize: '2.1rem', fontWeight: '900', color: 'var(--ink-text)' }}>
                  {latestSnapshot.active}<span style={{ fontSize: '1.1rem', opacity: 0.6 }}> / {latestSnapshot.total}</span>
                </div>
              </div>

              <div className="scroll-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 700 }}>기간 내 신규 유입</div>
                <div style={{ fontSize: '2.1rem', fontWeight: '900', color: 'var(--jade)' }}>{newInRangeMembers.length}</div>
              </div>

              <div className="scroll-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 700 }}>공성 참여율</div>
                <div style={{ fontSize: '2.1rem', fontWeight: '900', color: 'var(--jade)' }}>{siegeRatePct}%</div>
              </div>

              <div className="scroll-panel" style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--seal-dark)', marginBottom: '8px', fontWeight: 700 }}>쟁 참여율</div>
                <div style={{ fontSize: '2.1rem', fontWeight: '900', color: 'var(--jade)' }}>{warRatePct}%</div>
              </div>
            </div>

            {/* ── 추이 그래프: 인원/액티브 변화 ─────────────────────────── */}
            <div className="scroll-panel" style={{ padding: '26px', marginBottom: '24px' }}>
              <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>인원 변화 추이</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--ink-text)', opacity: 0.7, marginBottom: '16px' }}>
                최근 {rangeDays}일간 전체 인원 대비 액티브 인원의 변화입니다.
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailySnapshots}>
                  <defs>
                    <linearGradient id="activeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--jade)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--jade)" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--gold)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,35,24,0.12)" />
                  <XAxis dataKey="dateLabel" tick={{ fill: 'var(--ink-text)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--ink-text)', fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: 'var(--paper-soft)', border: '1px solid var(--gold)', fontSize: '0.85rem' }} />
                  <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                  <Area type="monotone" dataKey="total" name="전체 인원" stroke="var(--gold)" fill="url(#totalFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="active" name="액티브 인원" stroke="var(--jade)" fill="url(#activeFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* ── 추이 그래프: 신규 유입 / 참여율 ─────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div className="scroll-panel" style={{ padding: '24px' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.1rem', marginBottom: '4px' }}>일별 신규 가입</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-text)', opacity: 0.7, marginBottom: '14px' }}>
                  하루 단위로 새로 등장한 인원 수입니다.
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailySnapshots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,35,24,0.12)" />
                    <XAxis dataKey="dateLabel" tick={{ fill: 'var(--ink-text)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--ink-text)', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--paper-soft)', border: '1px solid var(--gold)', fontSize: '0.85rem' }} />
                    <Bar dataKey="newMembers" name="신규 가입" fill="var(--jade)" radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="newMembers" position="top" style={{ fontSize: '11px', fill: 'var(--ink-text)' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="scroll-panel" style={{ padding: '24px' }}>
                <h3 className="classic-heading" style={{ fontSize: '1.1rem', marginBottom: '4px' }}>공성·쟁 참여 인원 추이</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--ink-text)', opacity: 0.7, marginBottom: '14px' }}>
                  2일 이상 가입자 중 참여 인원 수입니다 (신규 제외).
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={dailySnapshots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(43,35,24,0.12)" />
                    <XAxis dataKey="dateLabel" tick={{ fill: 'var(--ink-text)', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'var(--ink-text)', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: 'var(--paper-soft)', border: '1px solid var(--gold)', fontSize: '0.85rem' }} />
                    <Legend wrapperStyle={{ fontSize: '0.85rem' }} />
                    <Line type="monotone" dataKey="siegeParticipants" name="공성 참여" stroke="var(--seal)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="warParticipants" name="쟁 참여" stroke="var(--gold)" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── 상세 명단 (토글) ─────────────────────────── */}
            <ToggleSection title="기간 내 신규 가입 명단" count={newInRangeMembers.length} accentColor="var(--jade)">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', paddingTop: '14px' }}>
                {newInRangeMembers
                  .sort((a, b) => a.week_label.localeCompare(b.week_label))
                  .map((r) => (
                    <div key={r.char_id} style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.3)', fontSize: '0.88rem' }}>
                      <strong>{r.member_name}</strong>
                      <span style={{ color: 'var(--ink-text)', marginLeft: '6px' }}>{r.job} · {r.group_name}</span>
                      <span style={{ color: 'var(--jade)', fontWeight: 'bold', marginLeft: '6px', fontSize: '0.8rem' }}>{r.week_label} 합류</span>
                    </div>
                  ))}
              </div>
            </ToggleSection>

            <ToggleSection
              title={`오늘(${latestDay}) 공성·쟁 모두 미참여 명단`}
              count={nonParticipants.length}
              accentColor="var(--seal)"
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', paddingTop: '14px' }}>
                {nonParticipants
                  .sort((a, b) => a.member_name.localeCompare(b.member_name))
                  .map((r) => (
                    <div key={r.char_id} style={{
                      padding: '8px 10px', border: '1px solid var(--seal)', fontSize: '0.88rem',
                      backgroundColor: 'rgba(166,50,42,0.06)'
                    }}>
                      <strong>{r.member_name}</strong>
                      <span style={{ color: 'var(--ink-text)', marginLeft: '6px' }}>{r.job} · {r.group_name}</span>
                    </div>
                  ))}
              </div>
            </ToggleSection>
          </>
        )}
      </div>
    </PageLayout>
  );
}