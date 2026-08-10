// app/admin/jeongcheol/page.js
'use client';
import { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import PageLayout from '../../components/PageLayout';
import CastleLocationInput from '../../components/CastleLocationInput';
import JeongcheolResultCard from '../../components/JeongcheolResultCard';
import { useProfile } from '../../components/ProfileContext';
import { supabase } from '../../lib/supabaseClient';
import { buildLevelMap, computeRoute, computeSchedule } from '../../lib/jeongcheolCalc';

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `castle_${idCounter}`;
}

function emptyCastle() {
  return {
    id: nextId(),
    name: '',
    coord: null,
    level: '',
    connected: null, // null = 자동판단 결과를 그대로 씀 / true|false = 수동 오버라이드
    enemyStart: false,
    manualBaseCost: '',
    manualPenaltyCost: '',
  };
}

// 자동 연결 판단: 첫 성만 유저가 수동 체크, 그 뒤로는 앞 성을 먹었다고 보고 기본 '연결됨'.
// castle.connected가 null이 아니면(유저가 토글로 덮어썼으면) 그 값을 그대로 우선한다.
function resolveConnected(route, index) {
  const castle = route[index];
  if (castle.connected !== null) return castle.connected;
  if (index === 0) return false; // 첫 성은 기본값 '미연결' — 유저가 직접 체크해야 함
  return true;
}

export default function JeongcheolCalculatorPage() {
  const profile = useProfile();
  const isCommand = profile?.role === 'admin' || profile?.approval_code === '0000';

  const [levelRows, setLevelRows] = useState([]);
  const [loadingLevels, setLoadingLevels] = useState(true);
  const [routeName, setRouteName] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [hourlyProduction, setHourlyProduction] = useState('');
  const [route, setRoute] = useState([emptyCastle()]);
  const [generating, setGenerating] = useState(false);
  const captureRef = useRef(null);

  useEffect(() => {
    async function loadLevels() {
      const { data, error } = await supabase
        .from('jeongcheol_levels')
        .select('level, base_cost, penalty_cost')
        .order('level', { ascending: true });
      if (!error && data) setLevelRows(data);
      setLoadingLevels(false);
    }
    loadLevels();
  }, []);

  const levelMap = useMemo(() => buildLevelMap(levelRows), [levelRows]);

  // route에 자동판단된 connected 값을 반영한 계산용 배열
  const resolvedRoute = useMemo(
    () => route.map((c, i) => ({ ...c, connected: resolveConnected(route, i), level: c.level === '' ? NaN : Number(c.level) })),
    [route]
  );

  const { steps, total, hasBlockingInput } = useMemo(
    () => computeRoute(levelMap, resolvedRoute),
    [levelMap, resolvedRoute]
  );

  const scheduledSteps = useMemo(
    () => computeSchedule(steps, currentStock === '' ? 0 : Number(currentStock), hourlyProduction === '' ? 0 : Number(hourlyProduction)),
    [steps, currentStock, hourlyProduction]
  );

  const updateCastle = (id, patch) => {
    setRoute((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const addCastle = () => setRoute((prev) => [...prev, emptyCastle()]);
  const removeCastle = (id) => setRoute((prev) => (prev.length > 1 ? prev.filter((c) => c.id !== id) : prev));

  const handleDownloadImage = async () => {
    setGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.download = `${(routeName || '정철계산').trim()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert('이미지 생성에 실패했습니다: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!profile) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>불러오는 중...</div>
      </PageLayout>
    );
  }

  if (!isCommand) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, marginBottom: '10px' }}>지휘부 전용 기능입니다.</p>
          <Link href="/" style={{ color: 'var(--accent)' }}>← 홈으로</Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ padding: '20px', maxWidth: '760px', margin: '0 auto' }}>
        <Link href="/admin" style={{ display: 'inline-block', marginBottom: '16px', color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none' }}>
          ← 지휘부 도구
        </Link>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>정철 계산기</h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          오늘 진행할 공성 루트를 순서대로 입력하면, 성별 소요 정철과 시작 가능 시점을 계산합니다.
        </p>

        {/* 동맹 자원 현황 */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>루트 이름</label>
            <input
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="예: 오늘 루트 A"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>동맹 현재 정철</label>
            <input value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} placeholder="예: 3748" style={inputStyle} inputMode="numeric" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>시간당 생산량</label>
            <input value={hourlyProduction} onChange={(e) => setHourlyProduction(e.target.value)} placeholder="예: 160" style={inputStyle} inputMode="numeric" />
          </div>
        </div>

        {/* 루트 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
          {route.map((castle, i) => {
            const step = steps[i];
            const connectedResolved = resolveConnected(route, i);
            return (
              <div
                key={castle.id}
                style={{
                  border: '1px solid var(--border-strong)',
                  borderRadius: 8,
                  padding: '14px',
                  background: 'var(--bg-surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent)' }}>{i + 1}번째 성</span>
                  <button onClick={() => removeCastle(castle.id)} style={{ background: 'none', border: 'none', color: '#c0453d', fontSize: '0.8rem', cursor: 'pointer' }}>
                    삭제
                  </button>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <CastleLocationInput
                    name={castle.name}
                    onNameChange={(name) => updateCastle(castle.id, { name })}
                    coord={castle.coord}
                    onCoordChange={(coord) => updateCastle(castle.id, { coord })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    value={castle.level}
                    onChange={(e) => updateCastle(castle.id, { level: e.target.value })}
                    placeholder="레벨"
                    style={{ ...inputStyle, width: '80px' }}
                    inputMode="numeric"
                  />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={connectedResolved}
                      onChange={(e) => updateCastle(castle.id, { connected: e.target.checked })}
                    />
                    관로 연결됨
                    {castle.connected === null && i > 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>(자동)</span>
                    )}
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={castle.enemyStart}
                      onChange={(e) => updateCastle(castle.id, { enemyStart: e.target.checked })}
                    />
                    타 진영 시작지역
                  </label>
                </div>

                {step?.unknownLevel && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'var(--bg-surface-alt)', borderRadius: 6 }}>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      등록되지 않은 레벨입니다. 기본비용/미연결 페널티를 직접 입력해주세요.
                    </p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        value={castle.manualBaseCost}
                        onChange={(e) => updateCastle(castle.id, { manualBaseCost: e.target.value })}
                        placeholder="기본비용"
                        style={{ ...inputStyle, width: '110px' }}
                        inputMode="numeric"
                      />
                      <input
                        value={castle.manualPenaltyCost}
                        onChange={(e) => updateCastle(castle.id, { manualPenaltyCost: e.target.value })}
                        placeholder="미연결 페널티"
                        style={{ ...inputStyle, width: '110px' }}
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                )}

                {step?.total != null && (
                  <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    소요 정철: <b>{step.total.toLocaleString('ko-KR')}</b>
                    {scheduledSteps[i]?.hoursFromNow != null && (
                      <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>
                        {scheduledSteps[i].hoursFromNow <= 0
                          ? '지금 바로 시작 가능'
                          : `${Math.floor(scheduledSteps[i].hoursFromNow)}시간 ${Math.round((scheduledSteps[i].hoursFromNow % 1) * 60)}분 후 시작 가능`}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={addCastle} style={{ ...inputStyle, cursor: 'pointer', marginBottom: '20px', fontWeight: 700 }}>
          + 성 추가
        </button>

        {/* 결과 요약 */}
        <div style={{ border: '1px solid var(--border-strong)', borderRadius: 8, padding: '16px', background: 'var(--bg-surface)', marginBottom: '20px' }}>
          {loadingLevels ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>레벨 테이블 불러오는 중...</p>
          ) : hasBlockingInput ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>미등록 레벨의 비용을 모두 입력하면 총 소요량이 표시됩니다.</p>
          ) : (
            <p style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              루트 총 소요 정철: {total?.toLocaleString('ko-KR')}
            </p>
          )}
        </div>

        <button
          onClick={handleDownloadImage}
          disabled={generating || hasBlockingInput || !total}
          style={{
            padding: '10px 18px',
            border: '1px solid var(--accent)',
            background: 'transparent',
            color: 'var(--accent)',
            fontWeight: 700,
            borderRadius: 6,
            cursor: generating ? 'default' : 'pointer',
            opacity: generating || hasBlockingInput || !total ? 0.5 : 1,
          }}
        >
          {generating ? '이미지 생성 중...' : '결과 이미지로 저장'}
        </button>
      </div>

      {/* 캡처 전용 숨김 영역 */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
        <JeongcheolResultCard
          ref={captureRef}
          routeName={routeName}
          steps={scheduledSteps}
          total={total}
          currentStock={currentStock === '' ? 0 : Number(currentStock)}
          hourlyProduction={hourlyProduction === '' ? 0 : Number(hourlyProduction)}
        />
      </div>
    </PageLayout>
  );
}

const inputStyle = {
  padding: '8px 10px',
  border: '1px solid var(--border-strong)',
  borderRadius: 6,
  background: 'var(--bg-page)',
  color: 'var(--text-primary)',
  fontSize: '0.9rem',
};