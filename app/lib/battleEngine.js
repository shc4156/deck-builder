// lib/battleEngine.js

/**
 * 몬테카를로 방식을 이용한 8턴 턴제 전투 시뮬레이션
 * @param {Object} mySquad - 사용자의 1-5군 추천 덱 (heroes, tactics 포함)
 * @param {Object} enemyDeck - 상대 티어덱
 * @param {number} iterations - 반복 횟수 (기본 500회)
 */
export function simulateBattle(mySquad, enemyDeck, iterations = 500) {
  if (!mySquad || !enemyDeck) return null;

  let myWins = 0;
  let enemyWins = 0;
  let draws = 0;
  let totalLogs = []; // 대표 1회차 전투 상세 로그 기록

  for (let i = 0; i < iterations; i++) {
    const { winner, logs } = runSingle8TurnBattle(mySquad, enemyDeck, i === 0);
    
    if (i === 0) totalLogs = logs; // 첫 번째 전투의 로그만 기록용으로 추출

    if (winner === 'my') myWins++;
    else if (winner === 'enemy') enemyWins++;
    else draws++;
  }

  const winRate = Math.round((myWins / iterations) * 100);
  const drawRate = Math.round((draws / iterations) * 100);
  const loseRate = Math.round((enemyWins / iterations) * 100);

  return {
    winRate,
    drawRate,
    loseRate,
    sampleLogs: totalLogs
  };
}

// 1회성 8턴 전투 로직
function runSingle8TurnBattle(mySquad, enemyDeck, recordLog = false) {
  const logs = [];
  
  // 아군/적군 장수 전투 단위 변환 (임시 속도 및 전법 확률 세팅)
  const myHeroes = (mySquad.heroes || []).map(h => ({
    name: h.general_name || '아군장수',
    speed: Number(h.speed || 100),
    hp: 10000,
    team: 'my',
    tactics: h.tactics || [{ name: '고유전법', rate: 0.35 }, { name: '추가전법1', rate: 0.4 }, { name: '추가전법2', rate: 0.35 }]
  }));

  const enemyHeroes = (enemyDeck.parsedSetup || []).map(h => ({
    name: h.general_name || '적군장수',
    speed: Number(h.speed || 95),
    hp: 10000,
    team: 'enemy',
    tactics: [{ name: '적고유전법', rate: 0.35 }, { name: '적전법1', rate: 0.4 }, { name: '적전법2', rate: 0.35 }]
  }));

  const allHeroes = [...myHeroes, ...enemyHeroes];

  // 1. 선공 정렬 (속도 높은 순서)
  allHeroes.sort((a, b) => b.speed - a.speed);

  if (recordLog) logs.push('⚔️ [전투 개시] 속도에 따라 선공 순서가 결정되었습니다.');

  // 2. 1턴 ~ 8턴 반복
  for (let turn = 1; turn <= 8; turn++) {
    if (recordLog) logs.push(`--- [제 ${turn} 턴] ---`);

    for (const hero of allHeroes) {
      if (hero.hp <= 0) continue; // 생존 여부 확인

      // 전법 발동 체크 (고유전법 + 추가전법 2개)
      hero.tactics.forEach(tactic => {
        const isTriggered = Math.random() < tactic.rate;
        if (isTriggered) {
          const dmg = Math.floor(Math.random() * 400) + 300;
          // 상대팀 생존자 중 한 명 타격
          const targets = allHeroes.filter(t => t.team !== hero.team && t.hp > 0);
          if (targets.length > 0) {
            const target = targets[Math.floor(Math.random() * targets.length)];
            target.hp = Math.max(0, target.hp - dmg);
            if (recordLog) {
              logs.push(`[${hero.team === 'my' ? '아군' : '적군'}] ${hero.name} - 전법 [${tactic.name}] 발동! ${target.name}에게 ${dmg} 데미지`);
            }
          }
        }
      });
    }

    // 생존 파악
    const myAlive = myHeroes.some(h => h.hp > 0);
    const enemyAlive = enemyHeroes.some(h => h.hp > 0);

    if (!myAlive || !enemyAlive) break;
  }

  // 승패 판정 (남은 전체 HP 비교)
  const myTotalHp = myHeroes.reduce((sum, h) => sum + h.hp, 0);
  const enemyTotalHp = enemyHeroes.reduce((sum, h) => sum + h.hp, 0);

  let winner = 'draw';
  if (myTotalHp > enemyTotalHp) winner = 'my';
  else if (enemyTotalHp > myTotalHp) winner = 'enemy';

  return { winner, logs };
}