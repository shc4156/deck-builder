// lib/battleEngine.js
//
// 몬테카를로 방식 8턴 모의전 시뮬레이션 (정교화 버전)
//
// ⚠️ 아래 전투 규칙은 인게임 공식 수치가 아니라, 천하결전 네이버 카페 공략글을
//    바탕으로 한 커뮤니티 해석입니다. 실제 게임 결과와 다를 수 있습니다.
//
// 반영한 규칙:
//   1) 진형/어그로  - 전열 슬롯이 후열보다 더 많이 피격 대상으로 선택됨
//   2) 병력 잔존율 비례 데미지 - 공격자의 남은 병력(HP) 비율이 낮을수록 위력도 함께 낮아짐
//   3) 힐러 딜 페널티 - '힐' 역할군 장수는 직접 데미지 대신 회복 위주로 동작
//   4) 지장 물리회피 - 주스탯이 지력인 장수는 '병기'(물리) 계열 전법을 일정 확률로 회피
//   5) 광역기 페널티 - 다수 대상에게 동시에 맞는 전법은 1인당 피해량이 줄어듦
//   6) 디버프 시너지 증폭 - 이미 디버프가 걸려 있는 대상은 후속 피해가 누적 증폭됨

// generals.preferred_tactic_type → 역할 그룹(탱/딜/힐/버프/디버프)
// SquadsTab.js의 ROLE_GROUP_MAP과 동일한 기준을 그대로 씁니다(출처: 동일 매핑을 복제).
const ROLE_GROUP_MAP = {
  '방어_자신': '탱', '방어_아군': '탱',
  '딜_병기': '딜', '딜_책략': '딜', '딜_혼합': '딜', '추격': '딜', '액티브': '딜', '회심': '딜',
  '힐': '힐',
  '버프_자신': '버프', '버프_아군': '버프', '지원_복합': '버프',
  '디버프': '디버프',
};

function resolveRoleGroup(genObj) {
  return ROLE_GROUP_MAP[genObj?.preferred_tactic_type] || '';
}

function isIntelType(genObj) {
  const mainStat = genObj?.main_stat || genObj?.stat_focus || '';
  return typeof mainStat === 'string' && mainStat.includes('지력');
}

// 전법 텍스트(효과/설명/태그)를 키워드로 훑어 성격을 분류합니다.
// (SquadsTab.js의 getPositionEffectBonus/getTacticSimilarityScore와 같은 방식의
//  키워드 매칭 - 전법 테이블에 별도 boolean 컬럼이 없어 텍스트 기반으로 추정합니다.)
function classifyTactic(tacticObj) {
  const text = [
    tacticObj?.effect,
    tacticObj?.description,
    Array.isArray(tacticObj?.tags) ? tacticObj.tags.join(' ') : '',
  ].filter(Boolean).join(' ');

  return {
    isHeal: /회복|치유/.test(text),
    isAoe: /전체|광역|다수|모든\s*적/.test(text),
    isDebuff: /감소|무장\s*해제|공포|혼란|약화|저하|봉쇄/.test(text),
    isPhysical: /병기/.test(text) && !/책략/.test(text),
  };
}

// 저장된 부대(setup 기반)/추천 부대(heroes 기반)/티어덱(deck_setup 기반) 등
// 서로 다른 데이터 모양을 배틀 엔진이 다룰 수 있는 공통 유닛 배열로 정규화합니다.
function extractRawHeroes(squadLike) {
  return (
    squadLike?.setup ||
    squadLike?.heroes ||
    squadLike?.deck_setup ||
    squadLike?.parsedSetup ||
    squadLike?.generals ||
    []
  );
}

function heroFieldsFromEntry(entry) {
  if (typeof entry === 'string') {
    return { general_name: entry, tactic1_name: null, tactic2_name: null };
  }
  const addedTactics = Array.isArray(entry?.added_tactics) ? entry.added_tactics : [];
  return {
    general_name: entry?.general_name || entry?.name || entry?.heroName || null,
    tactic1_name: entry?.tactic1_name || addedTactics[0] || null,
    tactic2_name: entry?.tactic2_name || addedTactics[1] || null,
  };
}

// squad.formationGrid(자동/수동 편성) 또는 squad.formation_grid(티어덱) 배열([앞1,앞2,앞3,뒤1,뒤2,뒤3])에서
// 이름별 전열/후열 배치를 뽑아냅니다. 그런 데이터가 없으면 장수 역할(탱→전열, 그 외→후열)로 추정하고,
// 그마저 없으면 순서상 앞쪽 절반을 전열로 간주합니다.
function buildGridMap(squadLike, heroNames, generalsList) {
  const grid = squadLike?.formationGrid || squadLike?.formation_grid;
  const map = {};

  if (Array.isArray(grid) && grid.length === 6) {
    grid.forEach((name, idx) => {
      if (name) map[name] = idx < 3 ? 'front' : 'back';
    });
  }

  // formationGrid에 없는(또는 formationGrid 자체가 없는) 이름은 역할/순서 기반으로 보충
  const missing = heroNames.filter(name => !map[name]);
  if (missing.length > 0) {
    missing.forEach((name, idx) => {
      const genObj = generalsList.find(g => g.name === name);
      const roleGroup = resolveRoleGroup(genObj);
      if (roleGroup === '탱') {
        map[name] = 'front';
      } else if (roleGroup) {
        map[name] = 'back';
      } else {
        // 역할 정보조차 없으면 앞쪽 절반을 전열로 취급 (기존 auto formation 기본값과 동일한 발상)
        map[name] = idx < Math.ceil(missing.length / 2) ? 'front' : 'back';
      }
    });
  }

  return map;
}

function buildHeroUnit(entry, gridMap, generalsList, tacticsList, team, defaultSpeed) {
  const { general_name, tactic1_name, tactic2_name } = heroFieldsFromEntry(entry);
  const genObj = generalsList.find(g => g.name === general_name);

  const tacticNames = [tactic1_name, tactic2_name].filter(Boolean);
  let tacticsForHero = tacticNames
    .map(name => tacticsList.find(t => t.name === name))
    .filter(Boolean)
    .map(t => ({ name: t.name, rate: 0.4, ...classifyTactic(t) }));

  if (tacticsForHero.length === 0) {
    // 전법 데이터를 못 찾은 경우 기본 발동률만 가진 미상 전법으로 대체
    tacticsForHero = [{
      name: '고유전법', rate: 0.35,
      isHeal: false, isAoe: false, isDebuff: false, isPhysical: false,
    }];
  }

  const maxHp = 10000;

  return {
    name: general_name || (team === 'my' ? '아군장수' : '적군장수'),
    speed: Number(entry?.speed || genObj?.speed || defaultSpeed),
    hp: maxHp,
    maxHp,
    team,
    roleGroup: resolveRoleGroup(genObj),
    isIntel: isIntelType(genObj),
    slot: gridMap[general_name] || 'back',
    debuffStacks: 0,
    tactics: tacticsForHero,
  };
}

// 어그로: 전열이 후열보다 더 자주 피격 대상으로 뽑힘 (기본 가중치 전열 2 : 후열 1)
function pickTarget(allHeroes, myTeam) {
  const targets = allHeroes.filter(h => h.team !== myTeam && h.hp > 0);
  if (targets.length === 0) return null;

  const weights = targets.map(t => (t.slot === 'front' ? 2 : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < targets.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return targets[i];
  }
  return targets[targets.length - 1];
}

function runSingle8TurnBattle(mySquad, enemyDeck, generalsList, tacticsList, recordLog = false) {
  const logs = [];

  const myRaw = extractRawHeroes(mySquad);
  const enemyRaw = extractRawHeroes(enemyDeck);

  const myNames = myRaw.map(e => heroFieldsFromEntry(e).general_name).filter(Boolean);
  const enemyNames = enemyRaw.map(e => heroFieldsFromEntry(e).general_name).filter(Boolean);

  const myGridMap = buildGridMap(mySquad, myNames, generalsList);
  const enemyGridMap = buildGridMap(enemyDeck, enemyNames, generalsList);

  const myHeroes = myRaw.map(e => buildHeroUnit(e, myGridMap, generalsList, tacticsList, 'my', 100));
  const enemyHeroes = enemyRaw.map(e => buildHeroUnit(e, enemyGridMap, generalsList, tacticsList, 'enemy', 95));

  const allHeroes = [...myHeroes, ...enemyHeroes];
  allHeroes.sort((a, b) => b.speed - a.speed);

  if (recordLog) logs.push('⚔️ [전투 개시] 속도에 따라 선공 순서가 결정되었습니다.');

  for (let turn = 1; turn <= 8; turn++) {
    if (recordLog) logs.push(`--- [제 ${turn} 턴] ---`);

    for (const hero of allHeroes) {
      if (hero.hp <= 0) continue;

      hero.tactics.forEach(tactic => {
        if (Math.random() >= tactic.rate) return;
        const teamLabel = hero.team === 'my' ? '아군' : '적군';

        // 3) 힐러: 데미지 대신 회복
        if (tactic.isHeal) {
          const allies = allHeroes.filter(h => h.team === hero.team && h.hp > 0);
          if (allies.length === 0) return;
          const target = allies.reduce(
            (lowest, h) => (h.hp / h.maxHp < lowest.hp / lowest.maxHp ? h : lowest),
            allies[0]
          );
          const healAmt = Math.floor(hero.maxHp * 0.12);
          target.hp = Math.min(target.maxHp, target.hp + healAmt);
          if (recordLog) {
            logs.push(`[${teamLabel}] ${hero.name} - 전법 [${tactic.name}] 발동! ${target.name} 체력 ${healAmt} 회복`);
          }
          return;
        }

        const potentialTargets = allHeroes.filter(t => t.team !== hero.team && t.hp > 0);
        if (potentialTargets.length === 0) return;

        // 2) 병력 잔존율 비례 데미지: 잔존율이 낮을수록 기본 위력도 함께 낮아짐(최소 50% 보장)
        const hpRatio = hero.hp / hero.maxHp;
        let baseDmg = (Math.floor(Math.random() * 400) + 300) * (0.5 + 0.5 * hpRatio);

        // 힐러가 딜 전법을 같이 들고 있는 경우를 대비한 이중 안전장치
        if (hero.roleGroup === '힐') baseDmg *= 0.4;

        // 5) 광역기 페널티: 광역은 대상 전원을 타격하되 1인당 위력을 낮춤
        const hitTargets = tactic.isAoe ? potentialTargets : [pickTarget(allHeroes, hero.team)].filter(Boolean);
        const perTargetMultiplier = tactic.isAoe
          ? (1 / Math.max(1, hitTargets.length)) * 1.6
          : 1;

        hitTargets.forEach(target => {
          if (!target || target.hp <= 0) return;

          // 4) 지장 물리회피: 지력형 장수는 병기 계열 전법을 일정 확률로 회피
          if (tactic.isPhysical && target.isIntel && Math.random() < 0.2) {
            if (recordLog) {
              logs.push(`[${target.team === 'my' ? '아군' : '적군'}] ${target.name} - 지력으로 물리 공격을 회피!`);
            }
            return;
          }

          let dmg = Math.floor(baseDmg * perTargetMultiplier);

          // 6) 디버프 시너지 증폭: 스택당 10%씩 받는 피해 증가
          if (target.debuffStacks > 0) {
            dmg = Math.floor(dmg * (1 + target.debuffStacks * 0.1));
          }

          target.hp = Math.max(0, target.hp - dmg);
          if (tactic.isDebuff) target.debuffStacks = Math.min(5, target.debuffStacks + 1);

          if (recordLog) {
            const debuffTag = tactic.isDebuff ? ' (디버프 부여)' : '';
            const aoeTag = tactic.isAoe ? ' [광역]' : '';
            logs.push(`[${teamLabel}] ${hero.name} - 전법 [${tactic.name}]${aoeTag} 발동! ${target.name}에게 ${dmg} 피해${debuffTag}`);
          }
        });
      });
    }

    const myAlive = myHeroes.some(h => h.hp > 0);
    const enemyAlive = enemyHeroes.some(h => h.hp > 0);
    if (!myAlive || !enemyAlive) break;
  }

  const myTotalHp = myHeroes.reduce((sum, h) => sum + h.hp, 0);
  const enemyTotalHp = enemyHeroes.reduce((sum, h) => sum + h.hp, 0);

  let winner = 'draw';
  if (myTotalHp > enemyTotalHp) winner = 'my';
  else if (enemyTotalHp > myTotalHp) winner = 'enemy';

  return { winner, logs };
}

/**
 * 몬테카를로 방식을 이용한 8턴 턴제 전투 시뮬레이션
 * @param {Object} mySquad - 사용자의 1-5군 부대 (setup/heroes 형태 모두 지원)
 * @param {Object} enemyDeck - 상대 티어덱 (deck_setup/parsedSetup/generals 형태 모두 지원)
 * @param {number} iterations - 반복 횟수 (기본 500회)
 * @param {{ generals?: Array, tactics?: Array }} context - 장수/전법 원본 데이터
 *        (역할·주스탯·전법 성격 분류에 사용, 없으면 기본값으로 대체됩니다)
 */
export function simulateBattle(mySquad, enemyDeck, iterations = 500, context = {}) {
  if (!mySquad || !enemyDeck) return null;

  const generalsList = Array.isArray(context.generals) ? context.generals : [];
  const tacticsList = Array.isArray(context.tactics) ? context.tactics : [];

  let myWins = 0;
  let enemyWins = 0;
  let draws = 0;
  let totalLogs = [];

  for (let i = 0; i < iterations; i++) {
    const { winner, logs } = runSingle8TurnBattle(mySquad, enemyDeck, generalsList, tacticsList, i === 0);

    if (i === 0) totalLogs = logs;

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
    sampleLogs: totalLogs,
  };
}