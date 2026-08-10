// lib/jeongcheolCalc.js
//
// 정철계산기 순수 계산 로직 (UI/Supabase와 분리)
//
// levelRows: Supabase의 jeongcheol_levels 테이블에서 가져온 배열
//   [{ level: 4, base_cost: 500, penalty_cost: 500 }, ...]
//
// route: 유저가 입력한 루트(순서 배열)
//   [{
//     id,                 // 리스트 렌더링용 키
//     name,                // 성 이름
//     level,                // 숫자
//     connected,            // true/false — '관로로 이미 연결됨'
//     enemyStart,           // true/false — 타 진영 시작지역
//     manualBaseCost,       // 레벨이 테이블에 없을 때 직접 입력한 기본비용 (숫자 | null)
//     manualPenaltyCost,    // 레벨이 테이블에 없을 때 직접 입력한 미연결 페널티 (숫자 | null)
//   }, ...]

// 레벨 배열을 Map(level -> {base_cost, penalty_cost})으로 변환
export function buildLevelMap(levelRows) {
  const map = new Map();
  for (const row of levelRows || []) {
    map.set(Number(row.level), {
      baseCost: Number(row.base_cost),
      penaltyCost: Number(row.penalty_cost),
    });
  }
  return map;
}

// 특정 성 하나의 비용을 계산. 테이블에 없는 레벨이면 unknownLevel:true를 반환하고,
// manualBaseCost/manualPenaltyCost가 입력돼 있으면 그걸로 계산한다.
export function computeCastleCost(levelMap, castle) {
  const known = levelMap.get(Number(castle.level));

  let baseCost = known?.baseCost;
  let penaltyCost = known?.penaltyCost;
  const unknownLevel = !known;

  if (unknownLevel) {
    baseCost = castle.manualBaseCost != null ? Number(castle.manualBaseCost) : null;
    penaltyCost = castle.manualPenaltyCost != null ? Number(castle.manualPenaltyCost) : null;
  }

  const missingManualInput = unknownLevel && (baseCost == null || penaltyCost == null);

  if (missingManualInput) {
    return { unknownLevel, missingManualInput, total: null, breakdown: null };
  }

  const connectPenalty = castle.connected ? 0 : penaltyCost;
  const subtotal = baseCost + connectPenalty;
  const enemyBonus = castle.enemyStart ? Math.round(subtotal * 0.5) : 0;
  const total = subtotal + enemyBonus;

  return {
    unknownLevel,
    missingManualInput: false,
    total,
    breakdown: { baseCost, connectPenalty, enemyBonus },
  };
}

// 루트 전체 계산: 성별 비용 + 누적합 + 총합
export function computeRoute(levelMap, route) {
  let running = 0;
  const steps = route.map((castle) => {
    const result = computeCastleCost(levelMap, castle);
    if (result.total != null) running += result.total;
    return { ...castle, ...result, cumulative: result.total != null ? running : null };
  });

  const hasBlockingInput = steps.some((s) => s.missingManualInput);
  const total = hasBlockingInput ? null : running;

  return { steps, total, hasBlockingInput };
}

// 누적 소요량 기준으로 각 성 공성을 '언제부터' 시작할 수 있는지 계산
// currentStock: 동맹 현재 정철 보유량
// hourlyProduction: 시간당 정철 생산량
// 반환: steps 배열에 hoursFromNow, etaDate(Date | null)를 덧붙인 새 배열
export function computeSchedule(steps, currentStock, hourlyProduction, now = new Date()) {
  return steps.map((step) => {
    if (step.cumulative == null) {
      return { ...step, hoursFromNow: null, etaDate: null };
    }
    const shortfall = step.cumulative - Number(currentStock || 0);
    if (shortfall <= 0 || !hourlyProduction) {
      const hoursFromNow = shortfall <= 0 ? 0 : null; // 생산량 0인데 부족하면 계산 불가
      const etaDate = hoursFromNow === 0 ? now : null;
      return { ...step, hoursFromNow, etaDate };
    }
    const hoursFromNow = shortfall / Number(hourlyProduction);
    const etaDate = new Date(now.getTime() + hoursFromNow * 3600 * 1000);
    return { ...step, hoursFromNow, etaDate };
  });
}