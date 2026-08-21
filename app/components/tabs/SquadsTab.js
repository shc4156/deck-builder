'use client';
import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import FormationGridVisual from '../FormationGridVisual';
import DetailPopup from '../DetailPopup';
import { useDeckAssets } from '../../../hooks/useDeckAssets';
import { evaluateTacticFit, evaluateGeneralFit, buildGeneralRoleIndex, suggestTroopConversion } from '../../../utils/squadEngine';
import { useProfile, useProfileActions } from '../ProfileContext';

/* ============================================================
   🎨 다크 오퍼레이션 테마 색상 팔레트 (mockup_dark_formation.html 기준)
   - 로직에는 영향 없음, 이 페이지 전용 색상 상수만 정의
============================================================ */
const SCROLL = {
  bg: '#0B0D11',
  paperLight: '#14171D',
  paperMid: '#1C2027',
  paperDark: '#1C2027',
  paperTexture: 'rgba(184,135,58,0.04)',
  ink: '#EDEDED',
  inkSoft: '#B4B8C0',
  inkFaint: '#8A8F98',
  border: '#3A3F4A',
  borderSoft: 'rgba(58,63,74,0.6)',
  headerBorder: '#2A2E36',
  seal: '#B8873A',
  sealDark: '#C0453D',
  gold: '#B8873A',
  green: '#4E9A63',
  greenBg: '#1F2A22',
  greenSoft: '#8FBF9D',
  blue: '#3A7BC8',
  mono: 'var(--font-mono, ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace)',
};

// 점수 구간별 등급 배지 (S/A/B/C) — mockup의 하후돈(S)/황월영(B) 톤 체계
const getTierBadge = (score) => {
  const s = Number(score) || 0;
  if (s >= 90) return { label: 'S', color: SCROLL.sealDark };
  if (s >= 75) return { label: 'A', color: SCROLL.gold };
  if (s >= 60) return { label: 'B', color: SCROLL.blue };
  return { label: 'C', color: SCROLL.inkFaint };
};

// 🆕 전법 등급(보라/황금) 배지 — tactics.grade 값을 기준으로 이모지 배지 반환
const getTacticGradeBadge = (grade) => {
  if (!grade) return '';
  const g = String(grade).trim();
  if (g.includes('보라')) return '🟣';
  if (g.includes('황금')) return '🟡';
  return '';
};

// 🆕 세부병종 추천 배지 — confidence(high/low/none)에 따라 확정/참고용/둘다무방 구분해서 표시
function SubtypeBadge({ hero }) {
  if (!hero) return null;
  const confidence = hero.subtype_confidence;
  // 티어덱 데이터로 확정된 값이면 '세부 진급(추측)'이 아니라 '고급 병종'으로 표기
  const isTierdeck = hero.troop_source === 'tierdeck';
  const label = isTierdeck ? '고급 병종' : '세부 진급';
  const badgeText = isTierdeck && hero.mastery ? `${hero.subtype} · ${hero.mastery}` : hero.subtype;

  // confidence: 'high' → 확정 추천 (실선, 골드)
  if (confidence === 'high' && hero.subtype) {
    return (
      <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>{label}</span>
        <span style={{
          backgroundColor: 'rgba(184,135,58,0.14)', color: SCROLL.gold,
          border: `1px solid ${SCROLL.gold}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700
        }}>
          {badgeText}
        </span>
        {!isTierdeck && hero.subtype_reason && (
          <span style={{ fontSize: '10px', color: SCROLL.inkFaint }}>· {hero.subtype_reason}</span>
        )}
      </div>
    );
  }

  // confidence: 'low' → 참고용 (점선, 흐린 톤)
  if (confidence === 'low' && hero.subtype) {
    return (
      <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>세부 진급(참고)</span>
        <span style={{
          backgroundColor: 'transparent', color: SCROLL.inkSoft,
          border: `1px dashed ${SCROLL.border}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700
        }}>
          {hero.subtype}
        </span>
        {hero.subtype_reason && (
          <span style={{ fontSize: '10px', color: SCROLL.inkFaint }}>· {hero.subtype_reason}</span>
        )}
      </div>
    );
  }

  // confidence: 'low' + subtype 없음(동점 후보만 있음) 또는 'none' → 둘 다 무방, 회색으로 후보만 나열
  if (hero.subtype_candidates && hero.subtype_candidates.length > 0) {
    return (
      <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>세부 진급</span>
        {hero.subtype_candidates.map((c, i) => (
          <span key={i} style={{
            backgroundColor: 'transparent', color: SCROLL.inkFaint,
            border: `0.5px solid ${SCROLL.border}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 500
          }}>
            {c}
          </span>
        ))}
        <span style={{ fontSize: '10px', color: SCROLL.inkFaint }}>· 둘 다 무방</span>
      </div>
    );
  }

  return null;
}

// 수동 편성이 특정 티어덱을 얼마나 충족하는지 가로 막대로 표시
function ComparisonBar({ label, score, color, highlighted }) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '3px' }}>
        <span style={{
          fontSize: '0.78rem', color: highlighted ? SCROLL.ink : SCROLL.inkSoft,
          fontWeight: highlighted ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis',
          whiteSpace: 'nowrap', maxWidth: '70%',
        }}>
          {highlighted && '👑 '}{label}
        </span>
        <span style={{ fontSize: '0.75rem', fontFamily: SCROLL.mono, fontWeight: 700, color }}>
          {pct}%
        </span>
      </div>
      <div style={{ height: '6px', background: SCROLL.border, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.2s ease' }} />
      </div>
    </div>
  );
}

const calculateAutoFormationGrid = (setupHeroes, generalsList = []) => {
  const grid = ['', '', '', '', '', ''];

  if (!setupHeroes || !Array.isArray(setupHeroes)) return grid;

  setupHeroes.forEach((hero, index) => {
    const heroName = typeof hero === 'string' ? hero : hero?.general_name;
    if (!heroName) return;

    const col = index % 3;
    const frontIdx = col;
    const backIdx = col + 3;

    const genObj = Array.isArray(generalsList) ? generalsList.find(g => g.name === heroName) : null;
    const pos = genObj?.position || '균형';

    if (pos === '전열') {
      if (!grid[frontIdx]) grid[frontIdx] = heroName;
      else if (!grid[backIdx]) grid[backIdx] = heroName;
    } else if (pos === '후열') {
      if (!grid[backIdx]) grid[backIdx] = heroName;
      else if (!grid[frontIdx]) grid[frontIdx] = heroName;
    } else {
      if (!grid[frontIdx]) grid[frontIdx] = heroName;
      else if (!grid[backIdx]) grid[backIdx] = heroName;
    }
  });

  return grid;
};

const buildFormationNamedGrid = (setupHeroes, formation, generalsList) => {
  const grid = ['', '', '', '', '', ''];
  if (!setupHeroes || !formation) return grid;

  let patternGrid = [];
  try {
    patternGrid = (Array.isArray(formation.grid) ? formation.grid : JSON.parse(formation.grid)).map(Number);
  } catch {
    patternGrid = [0, 1, 0, 0, 1, 1];
  }

  const isSlotOpen = (i) => patternGrid[i] === 1;
  const takenSlots = new Set();
  const leftover = [];

  setupHeroes.forEach((hero, index) => {
    const heroName = typeof hero === 'string' ? hero : hero?.general_name;
    if (!heroName) return;

    const genObj = generalsList.find(g => g.name === heroName);
    const pos = genObj?.position || '균형';
    const col = index % 3;
    const frontIdx = col;
    const backIdx = col + 3;

    if (pos === '전열' && isSlotOpen(frontIdx) && !takenSlots.has(frontIdx)) {
      grid[frontIdx] = heroName; takenSlots.add(frontIdx);
    } else if (pos === '후열' && isSlotOpen(backIdx) && !takenSlots.has(backIdx)) {
      grid[backIdx] = heroName; takenSlots.add(backIdx);
    } else if (isSlotOpen(frontIdx) && !takenSlots.has(frontIdx)) {
      grid[frontIdx] = heroName; takenSlots.add(frontIdx);
    } else if (isSlotOpen(backIdx) && !takenSlots.has(backIdx)) {
      grid[backIdx] = heroName; takenSlots.add(backIdx);
    } else {
      leftover.push(heroName);
    }
  });

  leftover.forEach(heroName => {
    const openSlot = [0, 1, 2, 3, 4, 5].find(i => isSlotOpen(i) && !takenSlots.has(i));
    if (openSlot !== undefined) { grid[openSlot] = heroName; takenSlots.add(openSlot); }
  });

  return grid;
};

const getAssignedTacticsMap = (squads) => {
  const map = new Map();
  if (!squads || !Array.isArray(squads)) return map;

  squads.forEach(squad => {
    if (!squad.setup) return;
    squad.setup.forEach((hero, heroIndex) => {
      if (!hero.tactics) return;
      hero.tactics.forEach((t, tacticIndex) => {
        const tacName = typeof t === 'string' ? t.trim() : t?.name?.trim();
        if (tacName) {
          map.set(tacName, {
            squadId: squad.id,
            squadNum: squad.squadNum,
            generalName: hero.general_name,
            heroIndex,
            tacticIndex
          });
        }
      });
    });
  });

  return map;
};

// 장수 preferred_tactic_type → 표시용 역할 라벨 / 역할 그룹(탱·딜·힐·버프·디버프)
// 자동편성·수동편성 드롭다운에서 공통으로 사용
const ROLE_LABEL_MAP = {
  '방어_자신': '탱커', '방어_아군': '탱커',
  '딜_병기': '딜러', '딜_책략': '딜러', '딜_혼합': '딜러',
  '추격': '딜러(추격)', '액티브': '딜러(액티브)', '회심': '딜러(회심)',
  '힐': '힐러',
  '버프_자신': '버퍼', '버프_아군': '버퍼', '지원_복합': '버퍼',
  '디버프': '디버퍼',
};

const ROLE_GROUP_MAP = {
  '방어_자신': '탱', '방어_아군': '탱',
  '딜_병기': '딜', '딜_책략': '딜', '딜_혼합': '딜', '추격': '딜', '액티브': '딜', '회심': '딜',
  '힐': '힐',
  '버프_자신': '버프', '버프_아군': '버프', '지원_복합': '버프',
  '디버프': '디버프',
};

const checkHasConnectionWithSquad = (candidateName, squadHeroNames, connections) => {
  if (!connections || !squadHeroNames || squadHeroNames.length === 0) return false;
  const cand = candidateName?.trim();

  return connections.some(conn => {
    const leader = conn.leader_name?.trim();
    const follower = conn.follower_name?.trim();

    return squadHeroNames.some(heroName => {
      const currentHero = heroName?.trim();
      if (!currentHero || currentHero === cand) return false;

      return (leader === currentHero && follower === cand) ||
             (leader === cand && follower === currentHero);
    });
  });
};

const getTacticSimilarityScore = (originalTactic, candidateTactic) => {
  if (!originalTactic || !candidateTactic) return 0;
  if (originalTactic.id === candidateTactic.id) return 0;

  let similarityBonus = 0;

  if (originalTactic.category && originalTactic.category === candidateTactic.category) {
    similarityBonus += 25;
  }

  const keywords = ['책략 피해', '병기 피해', '회복', '방어', '공포', '요술', '무장 해제', '능력 소진', '간파', '관통'];
  const origEffect = originalTactic.effect || '';
  const candEffect = candidateTactic.effect || '';

  keywords.forEach(kw => {
    if (origEffect.includes(kw) && candEffect.includes(kw)) {
      similarityBonus += 15;
    }
  });

  return similarityBonus;
};

const generateSquadName = (setup, defaultName) => {
  if (!setup || setup.length === 0) return defaultName;

  const initials = setup
    .map(h => h.general_name?.trim()?.[0] || '')
    .filter(Boolean)
    .join('');

  return initials ? `${initials}덱` : defaultName;
};

// 진형의 전열/후열 효과 텍스트(front_effect / back_effect)를 보고,
// 그 자리에 배치된 장수의 주스탯/역할과 얼마나 궁합이 맞는지 점수화
const getPositionEffectBonus = (effectText, gen) => {
  if (!effectText || !gen) return 0;
  const mainStat = gen.main_stat || gen.stat_focus || '';
  const role = gen.preferred_tactic_type || gen.primary_role || '';
  let bonus = 0;

  if (effectText.includes('받는 피해') && effectText.includes('감소')) {
    if (role.includes('방어') || role.includes('탱') || mainStat.includes('통솔')) bonus += 15;
  }
  if (effectText.includes('주는 피해') && effectText.includes('증가')) {
    if (role.includes('딜') || role.includes('공격') || role.includes('책략') || mainStat.includes('무력') || mainStat.includes('지력')) bonus += 15;
  }
  if (effectText.includes('통솔') && effectText.includes('증가')) {
    if (role.includes('방어') || role.includes('탱') || mainStat.includes('통솔')) bonus += 12;
  }
  if (effectText.includes('연타') && effectText.includes('증가')) {
    if (mainStat.includes('무력') || role.includes('병기') || role.includes('딜') || role.includes('공격')) bonus += 12;
  }
  if ((effectText.includes('회심') || effectText.includes('모책') || effectText.includes('묘책')) && effectText.includes('증가')) {
    if (role.includes('딜') || role.includes('공격') || role.includes('책략') || role.includes('병기') || mainStat.includes('무력') || mainStat.includes('지력')) bonus += 12;
  }
  if (effectText.includes('피신') && effectText.includes('증가')) {
    if (role.includes('방어') || role.includes('보조') || role.includes('탱')) bonus += 10;
  }

  return bonus;
};

// 진형의 전열/후열 슬롯 중 사용 중인 슬롯들의 평균 피격률을 구한다.
// hitRates가 없는(구 DB row 등) 경우 null을 반환해 가점 로직을 건너뛰게 한다.
const getAvgHitRateByPosition = (formation, gridArr) => {
  let hitRatesArr = null;
  try {
    if (Array.isArray(formation.hitRates)) {
      hitRatesArr = formation.hitRates;
    } else if (Array.isArray(formation.hit_rates)) {
      hitRatesArr = formation.hit_rates;
    } else if (typeof formation.hit_rates === 'string') {
      hitRatesArr = formation.hit_rates.includes('[')
        ? JSON.parse(formation.hit_rates)
        : formation.hit_rates.split(',').map(Number);
    }
  } catch {
    hitRatesArr = null;
  }
  if (!hitRatesArr || hitRatesArr.length !== 6) return { front: null, back: null };

  const frontVals = [0, 1, 2].filter(i => Number(gridArr[i]) === 1).map(i => Number(hitRatesArr[i]));
  const backVals = [3, 4, 5].filter(i => Number(gridArr[i]) === 1).map(i => Number(hitRatesArr[i]));

  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return { front: avg(frontVals), back: avg(backVals) };
};

// 탱커/방어형은 많이 맞을수록(고피격 슬롯) 이득 — 반격/피격 스택형 정통·전법이 몰려있음.
// 딜러·힐러·버퍼·디버퍼는 적게 맞을수록(저피격 슬롯) 이득 — 생존해야 역할을 계속 수행 가능.
// 역할 그룹은 화면 상단에 이미 있는 ROLE_GROUP_MAP(탱/딜/힐/버프/디버프)을 그대로 재사용한다.
const getHitRatePreferenceBonus = (avgHitRate, gen) => {
  if (avgHitRate === null || avgHitRate === undefined || !gen) return 0;

  const roleGroup = ROLE_GROUP_MAP[gen.preferred_tactic_type] || '';
  // 평균 피격률(대략 0~60%대) 기준, 40% 이상이면 "고피격 슬롯"으로 간주
  const isHighAggroSlot = avgHitRate >= 40;

  if (roleGroup === '탱') {
    return isHighAggroSlot ? 12 : -6;
  }
  if (roleGroup === '딜' || roleGroup === '힐' || roleGroup === '버프' || roleGroup === '디버프') {
    return isHighAggroSlot ? -8 : 8;
  }
  return 0;
};

const evaluateFormationFit = (squadSetup, formation, generalsList) => {
  if (!squadSetup || !formation || !generalsList) return 50;

  let score = 50;

  let gridArr = [];
  try {
    if (Array.isArray(formation.grid)) {
      gridArr = formation.grid;
    } else if (typeof formation.grid === 'string') {
      gridArr = formation.grid.includes('[')
        ? JSON.parse(formation.grid)
        : formation.grid.split(',').map(Number);
    }
  } catch {
    gridArr = [0, 1, 0, 1, 0, 1];
  }

  const frontCount = gridArr.slice(0, 3).filter(v => Number(v) === 1).length;
  const backCount = gridArr.slice(3, 6).filter(v => Number(v) === 1).length;
  const { front: avgFrontHitRate, back: avgBackHitRate } = getAvgHitRateByPosition(formation, gridArr);

  squadSetup.forEach((hero) => {
    const gen = generalsList.find(g => g.name === hero.general_name);
    if (!gen) return;

    const pos = gen.position || '균형';

    if (pos === '전열' && frontCount >= 1) {
      score += 10;
      score += getPositionEffectBonus(formation.front_effect, gen);
      score += getHitRatePreferenceBonus(avgFrontHitRate, gen);
    }
    if (pos === '후열' && backCount >= 1) {
      score += 10;
      score += getPositionEffectBonus(formation.back_effect, gen);
      score += getHitRatePreferenceBonus(avgBackHitRate, gen);
    }
  });

  return Math.min(100, Math.max(30, score));
};

export default function SquadsTab({ onNavigate }) {
  const exportRef = useRef(null);

  const handleDownloadImage = async () => {
    if (!exportRef.current) return;

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: SCROLL.paperLight,
        scale: 2,
        useCORS: true,
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `출정칙서_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (err) {
      console.error('출정칙서 이미지 저장 실패:', err);
    }
  };

  const {
    generals = [],
    tactics = [],
    tierDecks = [],
    isLoading,
    selectedGenerals = [],
    selectedTactics = [],
    pinnedTierDeckIds = [],
    synergies = [],
    connections = [],
    formations = [],
    generalRoles = []
  } = useDeckAssets();

  const profile = useProfile();
  const { userId, updateProfile } = useProfileActions();   // userId 추가로 받아옴
  const userNickname = profile?.nickname || '백정';

  const [recommendedSquads, setRecommendedSquads] = useState([]);
  const [editingTacticTarget, setEditingTacticTarget] = useState(null);
  const [needMoreGenerals, setNeedMoreGenerals] = useState(false);
  const [desiredSquadCount, setDesiredSquadCount] = useState(5);

  const [squadDeckOverrides, setSquadDeckOverrides] = useState({});

  const [detailTarget, setDetailTarget] = useState(null);

  const [autoSquadCount, setAutoSquadCount] = useState(3);
  const [manualSquads, setManualSquads] = useState({});

  const [collapsedSquads, setCollapsedSquads] = useState({});
  const toggleSquadCollapse = (squadNum) => {
    setCollapsedSquads(prev => ({ ...prev, [squadNum]: !prev[squadNum] }));
  };

  const [lockedGenerals, setLockedGenerals] = useState({});
  const [lockedTactics, setLockedTactics] = useState({});

  // 저장된 편성 설정(티어덱 오버라이드/장수·전법 잠금/자동편성 부대수)을 profile에서 복원했는지 여부.
  // 이게 true가 되기 전에는 자동편성 로직을 돌리지 않아서, 저장된 값을 불러오기도 전에
  // 기본값(빈 오버라이드/잠금)으로 새로 자동생성해버려 저장 내용을 덮어쓰는 걸 막는다.
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isGeneralLocked = (squadNum, heroIndex) => Boolean(lockedGenerals[`${squadNum}-${heroIndex}`]);
  const isTacticLocked = (squadNum, heroIndex, tacticIndex) => Boolean(lockedTactics[`${squadNum}-${heroIndex}-${tacticIndex}`]);

  const getLockedGeneralNamesExcept = (exceptSquadNum, exceptHeroIndex) => {
    const set = new Set();
    Object.entries(lockedGenerals).forEach(([key, name]) => {
      if (!name) return;
      const [sNum, hIdx] = key.split('-');
      if (Number(sNum) === exceptSquadNum && Number(hIdx) === exceptHeroIndex) return;
      set.add(name.trim());
    });
    return set;
  };

  const getLockedTacticNamesExcept = (exceptSquadNum, exceptHeroIndex, exceptTacticIndex) => {
    const set = new Set();
    Object.entries(lockedTactics).forEach(([key, name]) => {
      if (!name) return;
      const [sNum, hIdx, tIdx] = key.split('-');
      if (Number(sNum) === exceptSquadNum && Number(hIdx) === exceptHeroIndex && Number(tIdx) === exceptTacticIndex) return;
      set.add(name.trim());
    });
    return set;
  };

  const toggleGeneralLock = (squadNum, heroIndex, currentGeneralName) => {
    setLockedGenerals(prev => {
      const key = `${squadNum}-${heroIndex}`;
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else if (currentGeneralName) {
        next[key] = currentGeneralName;
      }
      return next;
    });
  };

  const toggleTacticLock = (squadNum, heroIndex, tacticIndex, currentTacticName) => {
    setLockedTactics(prev => {
      const key = `${squadNum}-${heroIndex}-${tacticIndex}`;
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else if (currentTacticName) {
        next[key] = currentTacticName;
      }
      return next;
    });
  };

  const handleSquadDeckOverride = (slotIndex, deckId) => {
    setSquadDeckOverrides(prev => {
      const next = { ...prev };
      if (!deckId) {
        delete next[slotIndex];
      } else {
        next[slotIndex] = deckId;
      }
      return next;
    });
  };

  const handleGridCellClick = (squadId, clickedIdx) => {
    setRecommendedSquads(prev => prev.map(squad => {
      if (squad.id !== squadId) return squad;

      const currentGrid = Array.isArray(squad.formationGrid)
        ? [...squad.formationGrid]
        : ['', '', '', '', '', ''];

      const targetIdx = clickedIdx < 3 ? clickedIdx + 3 : clickedIdx - 3;

      const temp = currentGrid[clickedIdx];
      currentGrid[clickedIdx] = currentGrid[targetIdx];
      currentGrid[targetIdx] = temp;

      return {
        ...squad,
        formationGrid: currentGrid
      };
    }));
  };

  const handleSaveSquads = async () => {
    const { error } = await updateProfile({
      squads: recommendedSquads,
      squad_settings: {
        squadDeckOverrides,
        lockedGenerals,
        lockedTactics,
        autoSquadCount,
        desiredSquadCount,
        manualSquads // 장수를 하나하나 직접 골라 짜는 수동 편성 슬롯(autoSquadCount 이후) — 이게 저장 목록에서 빠져있어서 새로고침하면 사라졌었음
      }
    });
    if (error) {
      console.error('스쿼드 저장 실패:', error);
      alert('저장 중 오류가 발생했습니다: ' + error.message);
    } else {
      alert('1~5군 부대 편성이 성공적으로 저장되었습니다!');
    }
  };

  const syncedSquadsUserIdRef = useRef(undefined);
  // 새로고침 직후, 자동편성 useEffect가 저장된 편성을 재계산으로 덮어쓰지 않도록 막는 플래그.
  // true인 동안은 "저장된 편성을 그대로 보여주는 중"이라는 뜻 — 사용자가 오버라이드/잠금/부대수를
  // 실제로 건드리기 전까지는 자동편성을 다시 돌리지 않는다. (재계산 결과가 저장 당시와 100%
  // 똑같다는 보장이 없어서 — 티어덱 필터 변경 등 로직이 조금만 바뀌어도 다른 편성이 나올 수 있음 —
  // "복원 후 재계산"이 아니라 "복원했으면 그걸로 끝"이 되어야 저장한 편성이 유지된다.)
  const skipAutoRecalcRef = useRef(false);
useEffect(() => {
  if (!profile) return;
  if (syncedSquadsUserIdRef.current === userId) {
    return;
  }

  // 새로고침 직후엔 자동편성 로직이 빈(기본) 오버라이드/잠금 상태로 먼저 돌면서
  // 저장된 편성을 곧바로 덮어써버리는 문제가 있었다. 저장된 설정을 여기서 먼저 복원한 뒤에
  // settingsLoaded를 true로 바꿔서, 그 다음부터 돌아가는 자동편성이 저장 당시와 동일한
  // 입력값(오버라이드/잠금/부대수)으로 계산되어 저장했던 편성과 같은 결과를 재현하도록 한다.
  const savedSettings = profile?.squad_settings;
  if (savedSettings) {
    if (savedSettings.squadDeckOverrides) setSquadDeckOverrides(savedSettings.squadDeckOverrides);
    if (savedSettings.lockedGenerals) setLockedGenerals(savedSettings.lockedGenerals);
    if (savedSettings.lockedTactics) setLockedTactics(savedSettings.lockedTactics);
    if (typeof savedSettings.autoSquadCount === 'number') setAutoSquadCount(savedSettings.autoSquadCount);
    if (typeof savedSettings.desiredSquadCount === 'number') setDesiredSquadCount(savedSettings.desiredSquadCount);
    if (savedSettings.manualSquads) setManualSquads(savedSettings.manualSquads);
  }

  if (profile?.squads && profile.squads.length > 0) {
    setRecommendedSquads(profile.squads);
    skipAutoRecalcRef.current = true; // 저장된 편성을 복원했으니, 아래 자동편성 effect는 한 번 건너뛴다
  }

  syncedSquadsUserIdRef.current = userId;
  setSettingsLoaded(true);
}, [profile, userId]);

  useEffect(() => {
    if (isLoading || !generals.length || !tactics.length || recommendedSquads.length === 0) return;

    let changed = false;
    const recalculated = recommendedSquads.map(squad => ({
      ...squad,
      setup: squad.setup.map(hero => {
        const genObj = generals.find(g => g.name === hero.general_name);
        return {
          ...hero,
          tactics: (hero.tactics || []).map(t => {
            const tacObj = tactics.find(tc => tc.name?.trim() === t.name?.trim());
            if (!genObj || !tacObj || !evaluateTacticFit) return t;
            const freshScore = evaluateTacticFit(genObj, tacObj);
            if (freshScore === t.score) return t;
            changed = true;
            return { ...t, score: freshScore };
          })
        };
      })
    }));

    if (changed) setRecommendedSquads(recalculated);
  }, [isLoading, generals, tactics, recommendedSquads]);

  const getActiveSynergies = (heroNames) => {
    if (!synergies || synergies.length === 0) return [];
    const cleanedDeckGens = heroNames.map(name => name?.trim()).filter(Boolean);

    return synergies.filter(syn => {
      let members = [];
      try {
        members = typeof syn.members === 'string' ? JSON.parse(syn.members) : syn.members;
      } catch {
        members = [];
      }
      if (!Array.isArray(members)) return false;

      const matchedCount = members.filter(m => cleanedDeckGens.includes(m.trim())).length;
      return matchedCount >= (syn.req_count || members.length);
    });
  };

  const getActiveConnections = (heroNames) => {
    if (!connections || connections.length === 0) return [];
    const cleanedDeckGens = heroNames.map(name => name?.trim()).filter(Boolean);

    return connections.filter(conn => {
      const leader = conn.leader_name?.trim();
      const follower = conn.follower_name?.trim();
      if (!leader || !follower) return false;

      return cleanedDeckGens.includes(leader) && cleanedDeckGens.includes(follower);
    });
  };

  const TROOP_BONUS_RULES = {
    '방패병': { 2: '받는 피해 3.5% 감소', 3: '받는 피해 5.0% 감소' },
    '궁병': { 2: '주는 피해 3.5% 증가', 3: '주는 피해 5.0% 증가' },
    '창병': { 2: '주는 피해 2.1% 증가, 받는 피해 1.4% 감소', 3: '주는 피해 3.0% 증가, 받는 피해 2.0% 감소' },
    '기병': { 2: '주는 피해 1.4% 증가, 받는 피해 2.1% 감소', 3: '주는 피해 2.0% 증가, 받는 피해 3.0% 감소' },
  };
  const FACTION_BONUS_RULE = { 2: '모든 속성 +5%', 3: '모든 속성 +10%' };

  const getActiveTroopFactionBonuses = (heroSetups, generalsList) => {
    if (!heroSetups || !generalsList) return [];

    const genObjs = heroSetups
      .map(h => {
        const g = generalsList.find(g => g.name === h.general_name?.trim());
        if (!g) return null;
        // 티어덱이 병부 전환을 전제로 짜여 있으면 권장 병종을 실질 병종으로 간주
        return { ...g, effectiveTroop: h.recommended_troop || g.troop_type };
      })
      .filter(Boolean);

    const bonuses = [];

    const troopCounts = {};
    genObjs.forEach(g => { if (g.effectiveTroop) troopCounts[g.effectiveTroop] = (troopCounts[g.effectiveTroop] || 0) + 1; });

    const factionCounts = {};
    genObjs.forEach(g => { if (g.faction) factionCounts[g.faction] = (factionCounts[g.faction] || 0) + 1; });
    Object.entries(factionCounts).forEach(([faction, count]) => {
      if (count >= 2) {
        const tier = count >= 3 ? 3 : 2;
        bonuses.push({ type: 'faction', label: `${faction} 진영 ${tier}명`, effect: FACTION_BONUS_RULE[tier] });
      }
    });

    return bonuses;
  };

  const getGeneralConnectionBadge = (heroName, connectionsList) => {
    if (!connectionsList || connectionsList.length === 0 || !heroName) return '';
    const trimmedName = heroName.trim();
    const hasConnection = connectionsList.some(conn =>
      conn.leader_name?.trim() === trimmedName || conn.follower_name?.trim() === trimmedName
    );
    return hasConnection ? '🔗' : '';
  };

  const getMatchedFormation = (formationStr, formationsList) => {
    if (!formationsList || formationsList.length === 0) return { name: '기본 진형', effect: '효과 없음' };

    const matched = formationsList.find(f => {
      let gridStr = f.grid;
      if (Array.isArray(gridStr)) gridStr = gridStr.join(',');
      return gridStr === formationStr;
    });

    return matched || { id: '', name: '미확인 진형', effect: '이 그리드 패턴과 일치하는 진형을 찾지 못했습니다', front_effect: '', back_effect: '' };
  };

  const handleGeneralChange = (squadId, heroIndex, newGeneralName) => {
    const newGenObj = generals.find(g => g.name === newGeneralName);

    const targetSquadNum = recommendedSquads.find(sq => sq.id === squadId)?.squadNum;
    const lockedElsewhere = getLockedGeneralNamesExcept(targetSquadNum, heroIndex);
    if (newGeneralName && lockedElsewhere.has(newGeneralName.trim())) {
      alert('이 장수는 다른 부대에 확정(잠금)되어 있어 가져올 수 없습니다.');
      return;
    }

    setRecommendedSquads(prev => prev.map(squad => {
      if (squad.id !== squadId) return squad;

      const newSetup = [...squad.setup];
      newSetup[heroIndex] = {
        ...newSetup[heroIndex],
        general_name: newGeneralName,
        image_url: newGenObj?.image_url || '/images/generals/default.jpg',
        stat_focus: newGenObj?.stat_focus || '속성 미정',
        isCustom: true
      };

      const newFormationGrid = buildFormationNamedGrid(newSetup, squad.formationInfo, generals);
      const updatedDeckName = generateSquadName(newSetup, squad.deck_name);

      return {
        ...squad,
        setup: newSetup,
        deck_name: updatedDeckName,
        formationGrid: newFormationGrid
      };
    }));
  };

  const handleFormationChange = (squadId, targetFormationId) => {
    const selectedForm = formations.find(f => String(f.id) === String(targetFormationId));
    if (!selectedForm) return;

    setRecommendedSquads(prev => prev.map(squad => {
      if (squad.id !== squadId) return squad;

      const newFormationGrid = buildFormationNamedGrid(squad.setup, selectedForm, generals);

      return {
        ...squad,
        formationGrid: newFormationGrid,
        formationInfo: selectedForm
      };
    }));
  };

  const handleTacticChange = (newTacticName) => {
    if (!editingTacticTarget) return;

    const { squadId, heroIndex, tacticIndex } = editingTacticTarget;
    const targetTacticObj = tactics.find(t => t.name?.trim() === newTacticName?.trim());

    if (!targetTacticObj || !selectedTactics.includes(targetTacticObj.id)) {
      alert('보유하지 않은 전법은 장착할 수 없습니다.');
      return;
    }

    const occupiedInfo = assignedTacticsMap.get(newTacticName?.trim());
    const isOccupiedByOther = !!occupiedInfo && !(
      occupiedInfo.squadId === squadId &&
      occupiedInfo.heroIndex === heroIndex &&
      occupiedInfo.tacticIndex === tacticIndex
    );

    if (isOccupiedByOther && isTacticLocked(occupiedInfo.squadNum, occupiedInfo.heroIndex, occupiedInfo.tacticIndex)) {
      alert('이 전법은 다른 장수에게 확정(잠금)되어 있어 가져올 수 없습니다.');
      return;
    }

    setRecommendedSquads(prevSquads => {
      const usedTacticNames = new Set();
      prevSquads.forEach(sq => {
        sq.setup.forEach((hero, hIdx) => {
          (hero.tactics || []).forEach((t, tIdx) => {
            const isTargetSlot = sq.id === squadId && hIdx === heroIndex && tIdx === tacticIndex;
            const isOccupiedSlot = isOccupiedByOther && sq.id === occupiedInfo.squadId && hIdx === occupiedInfo.heroIndex && tIdx === occupiedInfo.tacticIndex;
            if (!isTargetSlot && !isOccupiedSlot && t?.name) {
              usedTacticNames.add(t.name.trim());
            }
          });
        });
      });
      usedTacticNames.add(newTacticName.trim());

      return prevSquads.map(squad => {
        let workingSetup = squad.setup;
        let touched = false;

        if (squad.id === squadId) {
          workingSetup = [...workingSetup];
          const targetHero = { ...workingSetup[heroIndex] };
          const assignedGenObj = generals.find(g => g.name === targetHero.general_name);
          const newScore = evaluateTacticFit ? evaluateTacticFit(assignedGenObj, targetTacticObj) : 50;

          const prevTierTacticName = targetHero.tactics[tacticIndex]?.tierTacticName;

          const newTactics = [...targetHero.tactics];
          newTactics[tacticIndex] = {
            name: newTacticName,
            isOwned: true,
            isAlternative: true,
            isTierPick: prevTierTacticName ? newTacticName.trim() === prevTierTacticName.trim() : false,
            tierTacticName: prevTierTacticName,
            score: newScore,
            isManual: true
          };
          targetHero.tactics = newTactics;
          workingSetup[heroIndex] = targetHero;
          touched = true;
        }

        if (isOccupiedByOther && squad.id === occupiedInfo.squadId) {
          if (!touched) workingSetup = [...workingSetup];
          const bHero = { ...workingSetup[occupiedInfo.heroIndex] };
          const bGenObj = generals.find(g => g.name === bHero.general_name);

          let bestAlt = null;
          let bestScore = -1;
          tactics.forEach(t => {
            const tName = t.name?.trim();
            if (!tName || !selectedTactics.includes(t.id) || usedTacticNames.has(tName)) return;
            const s = evaluateTacticFit ? evaluateTacticFit(bGenObj, t) : 0;
            if (s > bestScore) { bestScore = s; bestAlt = t; }
          });

          const bTactics = [...bHero.tactics];
          const bPrevTierTacticName = bTactics[occupiedInfo.tacticIndex]?.tierTacticName;

          if (bestAlt) {
            usedTacticNames.add(bestAlt.name.trim());
            bTactics[occupiedInfo.tacticIndex] = {
              name: bestAlt.name,
              isOwned: true,
              isAlternative: true,
              isTierPick: bPrevTierTacticName ? bestAlt.name.trim() === bPrevTierTacticName.trim() : false,
              tierTacticName: bPrevTierTacticName,
              score: bestScore,
              isManual: true
            };
          } else {
            bTactics[occupiedInfo.tacticIndex] = {
              name: bTactics[occupiedInfo.tacticIndex]?.name || '미배정',
              isOwned: false,
              isAlternative: false,
              isTierPick: false,
              tierTacticName: bPrevTierTacticName,
              score: 0
            };
          }

          bHero.tactics = bTactics;
          workingSetup[occupiedInfo.heroIndex] = bHero;
          touched = true;
        }

        return touched ? { ...squad, setup: workingSetup } : squad;
      });
    });

    setEditingTacticTarget(null);
  };

  const parseDeckSetup = (deck) => {
    const heroes = [];
    const parseJson = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      try { return JSON.parse(val); } catch { return []; }
    };

    for (let i = 1; i <= 3; i++) {
      const name = deck[`hero${i}_name`]?.trim();
      if (!name) continue;

      const t1Main = deck[`hero${i}_tactic1_main`]?.trim();
      const t1Sub = parseJson(deck[`hero${i}_tactic1_sub`]);
      const t2Main = deck[`hero${i}_tactic2_main`]?.trim();
      const t2Sub = parseJson(deck[`hero${i}_tactic2_sub`]);

      const mainTactics = [t1Main, t2Main].filter(Boolean);
      const dbSubTactics = [...t1Sub, ...t2Sub].filter(Boolean);

      heroes.push({
        general_name: name,
        stat_focus: deck[`hero${i}_stat`] || '속성 미정',
        troop: deck[`hero${i}_troop`] || null, // 시즌2부터 생긴 병종 추천값
        main_tactics: mainTactics,
        db_sub_tactics: dbSubTactics,
      });
    }
    return heroes;
  };

  const computeDeckFitScore = (deck, myGenNamesList, myTactNamesList) => {
    let genMatch = 0, tactMatch = 0, totalHeroes = 0, totalTactics = 0;

    for (let i = 1; i <= 3; i++) {
      const name = deck[`hero${i}_name`]?.trim();
      if (!name) continue;
      totalHeroes += 1;
      if (myGenNamesList.includes(name)) genMatch += 1;

      const t1 = deck[`hero${i}_tactic1_main`]?.trim();
      const t2 = deck[`hero${i}_tactic2_main`]?.trim();
      [t1, t2].filter(Boolean).forEach(tName => {
        totalTactics += 1;
        if (myTactNamesList.includes(tName)) tactMatch += 1;
      });
    }

    if (totalHeroes === 0) return 0;
    const genRatio = genMatch / totalHeroes;
    const tactRatio = totalTactics ? tactMatch / totalTactics : 0;
    return genRatio * 70 + tactRatio * 30;
  };

  useEffect(() => {
    if (!settingsLoaded) return; // 저장된 오버라이드/잠금/부대수를 먼저 복원한 뒤에만 계산 시작

    // 방금 저장된 편성(profile.squads)을 그대로 복원해온 직후라면, 여기서 다시 자동계산해서
    // 덮어쓰지 않고 한 번만 건너뛴다. 이후 사용자가 오버라이드/잠금/부대수 등을 실제로 바꾸면
    // 이 effect가 그 변화에 반응해 정상적으로 재계산한다.
    if (skipAutoRecalcRef.current) {
      skipAutoRecalcRef.current = false;
      return;
    }

    if (isLoading || !tierDecks.length) return;

    if (selectedGenerals.length === 0) {
      setRecommendedSquads([]);
      return;
    }

    const myGenerals = generals.filter(g => selectedGenerals.includes(g.id));
    const myGenNames = myGenerals.map(g => g.name?.trim());

    const myTactics = tactics.filter(t => selectedTactics.includes(t.id));
    const myTactNames = myTactics.map(t => t.name?.trim());

    const usedGenerals = new Set();
    const usedTacticsInSquads = new Set();
    const squads = [];
    let hasEmptySlot = false;

    Object.values(lockedGenerals).forEach(name => { if (name) usedGenerals.add(name.trim()); });
    Object.values(lockedTactics).forEach(name => { if (name) usedTacticsInSquads.add(name.trim()); });

    const generalRoleIndex = buildGeneralRoleIndex(generalRoles);

    const pinnedSet = new Set((pinnedTierDeckIds || []).map(String));
    const pinnedDecks = (pinnedTierDeckIds || [])
      .map(id => tierDecks.find(d => String(d.id) === String(id)))
      .filter(Boolean);

    const usedDeckIds = new Set();
    const finalDeckList = [];

    // 보유 장수/전법 중 시즌2가 하나라도 있으면, 자동편성 3단계(적합도 계산)에서
    // 시즌2 티어덱을 시즌1보다 우선적으로 제시한다. (적합도 점수보다 시즌 여부를 먼저 따짐)
    const hasSeason2Selection =
      myGenerals.some(g => g.season === 'S2') ||
      myTactics.some(t => t.season === 'S2');

    // 슬롯을 채울 때마다 이미 배정된 덱이 데려간 장수를 빼서,
    // 뒤 슬롯의 자동 추천은 "이미 다른 부대가 쓴 장수"를 뺀 나머지 보유 장수 기준으로 매번 다시 계산한다.
    // 이렇게 하면 장수가 겹치는 티어덱보다, 겹치지 않는(남은 장수로 채울 수 있는) 티어덱이 자연히 우선 추천된다.
    let poolGenNames = [...myGenNames];
    const takeGeneralsFromPool = (deck) => {
      const names = [1, 2, 3]
        .map(i => deck[`hero${i}_name`]?.trim())
        .filter(Boolean);
      poolGenNames = poolGenNames.filter(n => !names.includes(n));
    };

    // 1) 유저가 슬롯별로 직접 지정한 오버라이드 덱은 겹침 여부와 무관하게 최우선으로 배치
    for (let slot = 0; slot < autoSquadCount; slot++) {
      const overrideId = squadDeckOverrides[slot];
      const overrideDeck = overrideId ? tierDecks.find(d => String(d.id) === String(overrideId)) : null;
      if (overrideDeck && !usedDeckIds.has(String(overrideDeck.id))) {
        finalDeckList[slot] = overrideDeck;
        usedDeckIds.add(String(overrideDeck.id));
        takeGeneralsFromPool(overrideDeck);
      }
    }

    // 2) 핀 고정 덱도 유저가 직접 지정한 것이므로 겹침 여부와 무관하게 남은 빈 슬롯에 우선 배치
    pinnedDecks.forEach(d => {
      if (usedDeckIds.has(String(d.id))) return;
      const emptySlot = Array.from({ length: autoSquadCount }, (_, i) => i).find(i => !finalDeckList[i]);
      if (emptySlot === undefined) return;
      finalDeckList[emptySlot] = d;
      usedDeckIds.add(String(d.id));
      takeGeneralsFromPool(d);
    });

    // 3) 나머지 빈 슬롯은 "남은(겹치지 않는) 보유 장수" 기준으로 매 슬롯마다 다시 적합도를 계산해서
    //    가장 잘 맞는 티어덱을 순차적으로 채워나간다.
    for (let slot = 0; slot < autoSquadCount; slot++) {
      if (finalDeckList[slot]) continue;

      let bestDeck = null;
      let bestFit = -1;
      let bestIsS2 = false;
      tierDecks.forEach(d => {
        if (usedDeckIds.has(String(d.id))) return;
        if (d.deck_category === '개척덱') return; // 개척덱은 개척 시에만 쓰는 덱이라 자동 편성 추천에서 제외
        const fit = computeDeckFitScore(d, poolGenNames, myTactNames);
        const isS2 = (d.season || 'S1') === 'S2';

        if (!bestDeck) {
          bestFit = fit;
          bestDeck = d;
          bestIsS2 = isS2;
          return;
        }

        // 시즌2 보유 장수/전법이 하나라도 있으면 시즌2 덱을 우선 채택.
        // 후보끼리 시즌이 같을 때만 적합도(fit) 점수로 비교한다.
        if (hasSeason2Selection && isS2 !== bestIsS2) {
          if (isS2) {
            bestFit = fit;
            bestDeck = d;
            bestIsS2 = isS2;
          }
          return;
        }

        if (fit > bestFit) {
          bestFit = fit;
          bestDeck = d;
          bestIsS2 = isS2;
        }
      });

      if (bestDeck) {
        finalDeckList[slot] = bestDeck;
        usedDeckIds.add(String(bestDeck.id));
        takeGeneralsFromPool(bestDeck);
      }
    }

    const orderedFinalDeckList = finalDeckList.filter(Boolean);

    for (let i = 0; i < orderedFinalDeckList.length && squads.length < autoSquadCount; i++) {
      const deck = orderedFinalDeckList[i];
      const parsedHeroes = parseDeckSetup(deck);
      if (parsedHeroes.length === 0) continue;

      const currentSquadGenNames = [];
      const currentSquadEffectiveTroops = [];
      const squadNum = squads.length + 1;

      const squadSetup = parsedHeroes.map((hero, heroIndex) => {
        const targetName = hero.general_name;
        const lockedGeneralName = lockedGenerals[`${squadNum}-${heroIndex}`];
        const isOwned = lockedGeneralName
          ? true
          : myGenNames.includes(targetName) && !usedGenerals.has(targetName);

        let assignedGen;
        if (lockedGeneralName) {
          assignedGen = generals.find(g => g.name?.trim() === lockedGeneralName);
        } else if (isOwned) {
          assignedGen = myGenerals.find(g => g.name?.trim() === targetName);
        } else {
          const candidates = myGenerals.filter(g => !usedGenerals.has(g.name?.trim()));
          let bestCandidate = null;
          let bestScore = -1;
          candidates.forEach(g => {
            const score = evaluateGeneralFit({
              candidate: g,
              targetSetup: { stat_focus: hero.stat_focus },
              currentSquadGenNames,
              generals,
              generalRoleIndex,
              connections,
              synergies
            });
            if (score > bestScore) {
              bestScore = score;
              bestCandidate = g;
            }
          });
          assignedGen = bestCandidate;
        }

        if (!assignedGen) hasEmptySlot = true;

        if (assignedGen) {
          usedGenerals.add(assignedGen.name?.trim());
          currentSquadGenNames.push(assignedGen.name?.trim());
        }

        if (assignedGen) {
          usedGenerals.add(assignedGen.name?.trim());
          currentSquadGenNames.push(assignedGen.name?.trim());
        }

        const troopSuggestion = assignedGen
          ? suggestTroopConversion({
              generalObj: assignedGen,
              squadEffectiveTroops: currentSquadEffectiveTroops,
              explicitTroop: hero.troop || null
            })
          : null;
        const effectiveTroop = troopSuggestion?.troop || assignedGen?.troop_type || null;
        if (effectiveTroop) currentSquadEffectiveTroops.push(effectiveTroop);

        const processedTactics = hero.main_tactics.map((tName, tacticIndex) => {
          const lockedTacticName = lockedTactics[`${squadNum}-${heroIndex}-${tacticIndex}`];

          if (lockedTacticName) {
            const tacticObj = tactics.find(t => t.name?.trim() === lockedTacticName);
            const score = evaluateTacticFit ? evaluateTacticFit(assignedGen, tacticObj) : 85;
            return {
              name: lockedTacticName,
              isOwned: true,
              isAlternative: lockedTacticName.trim() !== tName?.trim(),
              isTierPick: lockedTacticName.trim() === tName?.trim(),
              tierTacticName: tName,
              score
            };
          }

          const isTactOwned = myTactNames.includes(tName) && !usedTacticsInSquads.has(tName);

          if (isTactOwned) {
            usedTacticsInSquads.add(tName);
            const tacticObj = myTactics.find(t => t.name?.trim() === tName);
            const score = evaluateTacticFit ? evaluateTacticFit(assignedGen, tacticObj) : 85;

            return {
              name: tName,
              isOwned: true,
              isAlternative: false,
              isTierPick: true,
              tierTacticName: tName,
              score: score
            };
          } else {
            const availableTactics = myTactics.filter(t => !usedTacticsInSquads.has(t.name?.trim()));

            let bestAlt = null;
            let maxScore = -1;

            availableTactics.forEach(tacticObj => {
              const score = evaluateTacticFit ? evaluateTacticFit(assignedGen, tacticObj) : 60;
              if (score > maxScore) {
                maxScore = score;
                bestAlt = tacticObj;
              }
            });

            if (bestAlt) {
              usedTacticsInSquads.add(bestAlt.name?.trim());
              return {
                originalName: tName,
                name: bestAlt.name,
                isOwned: true,
                isAlternative: true,
                isTierPick: false,
                tierTacticName: tName,
                score: maxScore
              };
            }

            return {
              name: tName,
              isOwned: false,
              isAlternative: false,
              isTierPick: false,
              tierTacticName: tName,
              score: 0
            };
          }
        });

        return {
          general_name: assignedGen?.name || targetName,
          image_url: assignedGen?.image_url || '/images/generals/default.jpg',
          isSubstituted: !isOwned,
          stat_focus: hero.stat_focus,
          recommended_troop: troopSuggestion?.troop || null,
          troop_mismatch: Boolean(troopSuggestion && assignedGen?.troop_type && troopSuggestion.troop !== assignedGen.troop_type),
          troop_source: troopSuggestion?.source || null,
          troop_reason: troopSuggestion?.reason || null,
          subtype: troopSuggestion?.subtype || null,
          // 티어덱(source: 'tierdeck')이 세부 병종을 명시한 경우는 추측이 아니라 데이터 그대로이므로 'high'.
          // 역할 기반 추론(suggestTroopSubtype)이 아직 여기 연결돼 있지 않아 그 외엔 값이 없음.
          subtype_confidence: troopSuggestion?.subtype && troopSuggestion.source === 'tierdeck' ? 'high' : null,
          subtype_reason: troopSuggestion?.mastery ? `전용/추천 정통: ${troopSuggestion.mastery}` : (troopSuggestion?.reason || null),
          subtype_candidates: troopSuggestion?.subtypeCandidates || null,
          mastery: troopSuggestion?.mastery || null,
          tactics: processedTactics
        };
      });

      const rawFormationNumGrid = deck.formation ? deck.formation.split(',').map(Number) : [0, 1, 0, 0, 1, 1];
      const formationInfo = getMatchedFormation(rawFormationNumGrid.join(','), formations);
      const initialNamedGrid = buildFormationNamedGrid(squadSetup, formationInfo, generals);

      squads.push({
        id: deck.id || i,
        sourceDeckId: deck.id != null ? String(deck.id) : '',
        squadNum: squads.length + 1,
        deck_name: deck.deck_name || `${squads.length + 1}군 추천 부대`,
        formationGrid: initialNamedGrid,
        formationInfo: formationInfo,
        isPinned: pinnedSet.has(String(deck.id)),
        setup: squadSetup
      });
    }

    setRecommendedSquads(squads);
    setNeedMoreGenerals(hasEmptySlot || squads.length < autoSquadCount);
  }, [settingsLoaded, isLoading, tierDecks, generals, tactics, selectedGenerals, selectedTactics, generalRoles, connections, synergies, pinnedTierDeckIds, autoSquadCount, squadDeckOverrides, lockedGenerals, lockedTactics]);

  const assignedTacticsMap = getAssignedTacticsMap(recommendedSquads);

  useEffect(() => {
    if (autoSquadCount > desiredSquadCount) {
      setAutoSquadCount(desiredSquadCount);
    }
  }, [desiredSquadCount, autoSquadCount]);

  const manualSlotCount = Math.max(0, desiredSquadCount - autoSquadCount);

  const getManualSquad = (slotIndex) => manualSquads[slotIndex] || { setup: [null, null, null], formationGrid: null, formationInfo: null };

  const globallyUsedGeneralNames = new Set([
    ...recommendedSquads.flatMap(s => s.setup.map(h => h.general_name)),
    ...Object.values(manualSquads).flatMap(s => s.setup.filter(Boolean).map(h => h.general_name)),
  ]);
  const globallyUsedTacticNames = new Set([
    ...recommendedSquads.flatMap(s => s.setup.flatMap(h => h.tactics.map(t => t.name))),
    ...Object.values(manualSquads).flatMap(s => s.setup.filter(Boolean).flatMap(h => (h.tactics || []).map(t => t?.name).filter(Boolean))),
  ]);

  const handleManualGeneralSelect = (slotIndex, heroIndex, generalName) => {
    const squadNum = autoSquadCount + slotIndex + 1;
    if (generalName && getLockedGeneralNamesExcept(squadNum, heroIndex).has(generalName.trim())) {
      alert('이 장수는 다른 부대에 확정(잠금)되어 있어 가져올 수 없습니다.');
      return;
    }

    setManualSquads(prev => {
      const current = prev[slotIndex] || { setup: [null, null, null], formationGrid: null, formationInfo: null };
      const nextSetup = [...current.setup];
      nextSetup[heroIndex] = generalName
        ? { general_name: generalName, tactics: [null, null] }
        : null;
      const validHeroes = nextSetup.filter(Boolean);
      const newFormationGrid = current.formationInfo
        ? buildFormationNamedGrid(validHeroes, current.formationInfo, generals)
        : calculateAutoFormationGrid(validHeroes, generals);
      return { ...prev, [slotIndex]: { ...current, setup: nextSetup, formationGrid: newFormationGrid } };
    });
  };

  const handleManualFormationChange = (slotIndex, targetFormationId) => {
    setManualSquads(prev => {
      const current = prev[slotIndex] || { setup: [null, null, null], formationGrid: null, formationInfo: null };
      const selectedForm = formations.find(f => String(f.id) === String(targetFormationId)) || null;
      const validHeroes = current.setup.filter(Boolean);
      const newFormationGrid = selectedForm
        ? buildFormationNamedGrid(validHeroes, selectedForm, generals)
        : calculateAutoFormationGrid(validHeroes, generals);
      return { ...prev, [slotIndex]: { ...current, formationInfo: selectedForm, formationGrid: newFormationGrid } };
    });
  };

  const handleManualGridCellClick = (slotIndex, clickedIdx) => {
    setManualSquads(prev => {
      const current = prev[slotIndex] || { setup: [null, null, null], formationGrid: null, formationInfo: null };
      const currentGrid = Array.isArray(current.formationGrid) ? [...current.formationGrid] : ['', '', '', '', '', ''];
      const targetIdx = clickedIdx < 3 ? clickedIdx + 3 : clickedIdx - 3;
      const temp = currentGrid[clickedIdx];
      currentGrid[clickedIdx] = currentGrid[targetIdx];
      currentGrid[targetIdx] = temp;
      return { ...prev, [slotIndex]: { ...current, formationGrid: currentGrid } };
    });
  };

  const handleManualTacticSelect = (slotIndex, heroIndex, tacticSlot, tacticName) => {
    const squadNum = autoSquadCount + slotIndex + 1;
    if (tacticName && getLockedTacticNamesExcept(squadNum, heroIndex, tacticSlot).has(tacticName.trim())) {
      alert('이 전법은 다른 장수에게 확정(잠금)되어 있어 가져올 수 없습니다.');
      return;
    }

    setManualSquads(prev => {
      const current = prev[slotIndex] || { setup: [null, null, null] };
      const nextSetup = [...current.setup];
      const hero = nextSetup[heroIndex];
      if (!hero) return prev;

      const genObj = generals.find(g => g.name === hero.general_name);
      const tacticObj = tactics.find(t => t.name === tacticName);
      const score = tacticName && genObj && tacticObj ? evaluateTacticFit(genObj, tacticObj) : 0;

      const nextTactics = [...(hero.tactics || [null, null])];
      nextTactics[tacticSlot] = tacticName ? { name: tacticName, score } : null;

      nextSetup[heroIndex] = { ...hero, tactics: nextTactics };
      return { ...prev, [slotIndex]: { ...current, setup: nextSetup } };
    });
  };

  const getManualGeneralCandidates = (slotIndex, heroIndex) => {
    const current = getManualSquad(slotIndex);
    const otherNamesInSlot = current.setup.filter((h, i) => i !== heroIndex && h).map(h => h.general_name);
    const squadNum = autoSquadCount + slotIndex + 1;
    const lockedElsewhere = getLockedGeneralNamesExcept(squadNum, heroIndex);

    return generals
      .filter(g => selectedGenerals.includes(g.id))
      .filter(g => !otherNamesInSlot.includes(g.name))
      .filter(g => !lockedElsewhere.has(g.name?.trim()))
      .sort((a, b) => {
        const aUsed = globallyUsedGeneralNames.has(a.name) ? 1 : 0;
        const bUsed = globallyUsedGeneralNames.has(b.name) ? 1 : 0;
        if (aUsed !== bUsed) return aUsed - bUsed;
        return a.name.localeCompare(b.name, 'ko');
      });
  };

  const getManualTacticCandidates = (slotIndex, heroIndex, tacticSlot) => {
    const current = getManualSquad(slotIndex);
    const hero = current.setup[heroIndex];
    if (!hero) return [];
    const genObj = generals.find(g => g.name === hero.general_name);

    const otherTacticNamesInHero = (hero.tactics || [])
      .filter((t, i) => i !== tacticSlot && t)
      .map(t => t.name);
    const squadNum = autoSquadCount + slotIndex + 1;
    const lockedElsewhere = getLockedTacticNamesExcept(squadNum, heroIndex, tacticSlot);

    return tactics
      .filter(t => selectedTactics.includes(t.id))
      .filter(t => !otherTacticNamesInHero.includes(t.name))
      .filter(t => !lockedElsewhere.has(t.name?.trim()))
      .map(t => ({ ...t, __fitScore: genObj ? evaluateTacticFit(genObj, t) : 0 }))
      .sort((a, b) => b.__fitScore - a.__fitScore);
  };

  const sortedTacticsForModal = (() => {
    if (!editingTacticTarget || !tactics) return [];

    const { squadId, heroIndex, tacticIndex, currentHeroName } = editingTacticTarget;
    const targetHeroObj = generals.find(g => g.name === currentHeroName);

    const currentSquad = recommendedSquads.find(s => s.id === squadId);
    const currentSlotTactic = currentSquad?.setup[heroIndex]?.tactics[tacticIndex];
    const originalTacticObj = tactics.find(t => t.name?.trim() === currentSlotTactic?.name?.trim());

    let recommendedList = [];
    if (targetHeroObj?.recommended_tactics) {
      try {
        recommendedList = typeof targetHeroObj.recommended_tactics === 'string'
          ? JSON.parse(targetHeroObj.recommended_tactics)
          : targetHeroObj.recommended_tactics;
      } catch {
        recommendedList = (targetHeroObj.recommended_tactics || '').split(',').map(s => s.trim());
      }
    }

    return tactics.map(tac => {
      const isOwned = selectedTactics.includes(tac.id);
      const assignedInfo = assignedTacticsMap.get(tac.name?.trim());
      const isOccupied = !!assignedInfo;
      const isLockedElsewhere = isOccupied && isTacticLocked(assignedInfo.squadNum, assignedInfo.heroIndex, assignedInfo.tacticIndex);

      let score = evaluateTacticFit ? evaluateTacticFit(targetHeroObj, tac) : 50;
      const similarityBonus = getTacticSimilarityScore(originalTacticObj, tac);
      score += similarityBonus;

      const isRec = recommendedList.some(r => r?.trim() === tac.name?.trim());
      const isAlternative = !isRec && similarityBonus > 0;

      const isSlotTierPick = !!currentSlotTactic?.tierTacticName &&
        tac.name?.trim() === currentSlotTactic.tierTacticName?.trim();

      return {
        ...tac,
        isOwned,
        isOccupied,
        isLockedElsewhere,
        assignedInfo,
        score,
        isRec,
        isAlternative,
        isSlotTierPick
      };
    }).sort((a, b) => {
      if (a.isSlotTierPick && !b.isSlotTierPick) return -1;
      if (!a.isSlotTierPick && b.isSlotTierPick) return 1;
      if (a.isRec && !b.isRec) return -1;
      if (!a.isRec && b.isRec) return 1;
      return b.score - a.score;
    });
  })();

  if (isLoading) {
    return (
      <>
        <div style={{
          padding: '60px 40px', textAlign: 'center', marginTop: '40px',
          background: SCROLL.bg, minHeight: '100vh', color: SCROLL.ink,
          maxWidth: '480px', margin: '40px auto 0'
        }}>
          <p style={{ fontSize: '11px', color: SCROLL.gold, letterSpacing: '0.05em', fontFamily: SCROLL.mono, marginBottom: '10px' }}>
            SANGUOZHI · DECK OPS
          </p>
          <h2 style={{ fontWeight: 600, color: SCROLL.ink }}>1~5군 최적 출진 배치를 계산하고 있습니다...</h2>
        </div>
      </>
    );
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <>
      <div style={{ padding: '25px', paddingBottom: '100px', minHeight: '100vh', background: SCROLL.bg, maxWidth: '480px', margin: '0 auto' }}>

        {needMoreGenerals && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: SCROLL.sealDark, fontWeight: 600, fontSize: '0.85rem',
            marginBottom: '14px', padding: '10px 14px', borderRadius: '8px',
            backgroundColor: 'rgba(192,69,61,0.1)', border: `1px solid rgba(192,69,61,0.35)`
          }}>
            ⚠️ {desiredSquadCount}군덱까지 완성하려면 장수가 더 필요합니다.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: '10px', color: SCROLL.gold, letterSpacing: '0.05em', margin: '0 0 4px', fontFamily: SCROLL.mono }}>
              SANGUOZHI · DECK OPS
            </p>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: SCROLL.ink }}>
              1~{desiredSquadCount}군 최적 추천 &amp; 수동 편성
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveSquads}
              style={{
                display: 'flex', alignItems: 'center', gap: '5px',
                fontSize: '0.75rem', fontWeight: 600, padding: '7px 11px',
                backgroundColor: SCROLL.paperMid, color: SCROLL.ink,
                border: `0.5px solid ${SCROLL.border}`, borderRadius: '8px',
                cursor: 'pointer', transition: 'background-color 0.15s ease'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path d="M7.707 10.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586l-1.293-1.293z" />
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2a1 1 0 11-2 0V4H7v2a1 1 0 11-2 0V4z" />
                <path d="M3 9a2 2 0 012-2h1a1 1 0 110 2H5v7h10V9h-1a1 1 0 110-2h1a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              편성 저장
            </button>

            <button
              onClick={handleDownloadImage}
              style={{
                backgroundColor: SCROLL.gold,
                color: '#14171D',
                padding: '7px 11px',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              📥 이미지로 저장
            </button>
          </div>
        </div>

        {/* ---------------- 편성 개수 슬라이더 ---------------- */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px',
          padding: '12px 16px', background: SCROLL.paperLight,
          border: `0.5px solid ${SCROLL.border}`, borderRadius: '14px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: SCROLL.ink, whiteSpace: 'nowrap' }}>
            편성 개수
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={1}
            value={desiredSquadCount}
            onChange={(e) => setDesiredSquadCount(Number(e.target.value))}
            style={{ flex: 1, accentColor: SCROLL.gold, cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: SCROLL.mono, fontSize: '0.78rem', fontWeight: 700, color: SCROLL.gold,
            minWidth: '56px', textAlign: 'right'
          }}>
            {desiredSquadCount}개 부대
          </span>
        </div>

        {/* ---------------- 자동추천 / 직접편성 비율 슬라이더 ---------------- */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px',
          padding: '12px 16px', background: SCROLL.paperLight,
          border: `0.5px solid ${SCROLL.border}`, borderRadius: '14px'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: SCROLL.ink, whiteSpace: 'nowrap' }}>
            자동 추천 개수
          </span>
          <input
            type="range"
            min={0}
            max={desiredSquadCount}
            step={1}
            value={autoSquadCount}
            onChange={(e) => setAutoSquadCount(Number(e.target.value))}
            style={{ flex: 1, accentColor: SCROLL.gold, cursor: 'pointer' }}
          />
          <span style={{
            fontFamily: SCROLL.mono, fontSize: '0.78rem', fontWeight: 700, color: SCROLL.gold,
            minWidth: '110px', textAlign: 'right'
          }}>
            자동 {autoSquadCount} · 직접 {manualSlotCount}
          </span>
        </div>

        {/* ============================================================
            [캡처 영역] 다크 오퍼레이션 카드 — 1~5군 편성표
        ============================================================ */}
        <div
          ref={exportRef}
          style={{
            position: 'relative',
            background: SCROLL.paperLight,
            border: `0.5px solid ${SCROLL.border}`,
            borderRadius: '16px',
            padding: '24px 18px',
            color: SCROLL.ink,
            fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflow: 'hidden'
          }}
        >
          {/* ---------------- 머리말 ---------------- */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            borderBottom: `0.5px solid ${SCROLL.headerBorder}`, paddingBottom: '20px', marginBottom: '26px'
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', color: SCROLL.gold, letterSpacing: '0.05em', margin: '0 0 6px', fontFamily: SCROLL.mono }}>
                SANGUOZHI · DECK OPS
              </p>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: SCROLL.ink }}>
                부대 편성 — 1군 ~ {recommendedSquads.length}군
              </h2>
              <p style={{ fontSize: '0.85rem', color: SCROLL.inkSoft, marginTop: '8px', lineHeight: 1.6 }}>
                {userNickname} 님의 보유 장수·전법 기준으로 자동 편성된 부대입니다. 각 군의 진형과 배치는 직접 수정할 수 있습니다.
              </p>
            </div>

            <div style={{ flexShrink: 0, marginLeft: '20px', textAlign: 'right' }}>
              <div style={{
                fontSize: '11px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono, marginBottom: '6px'
              }}>
                {dateStr}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '999px',
                backgroundColor: SCROLL.paperMid, border: `0.5px solid ${SCROLL.border}`
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: SCROLL.gold }}>
                  {userNickname || '맹원'}
                </span>
              </div>
            </div>
          </div>

          {/* ---------------- 부대 목록 (1~5군) ---------------- */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {recommendedSquads.map((squad, index) => {
              const squadNum = squad.squadNum || index + 1;
              const isCollapsed = Boolean(collapsedSquads[squadNum]);
              const currentHeroNames = squad.setup.map(h => h.general_name);
              const activeSynergies = getActiveSynergies(currentHeroNames);
              const activeConnections = getActiveConnections(currentHeroNames);
              const formationInfo = squad.formationInfo || getMatchedFormation(squad.formationGrid?.join(','), formations);
              const activeTroopFactionBonuses = getActiveTroopFactionBonuses(squad.setup, generals);

              const squadFitScore = evaluateFormationFit(squad.setup, formationInfo, generals);
              const squadFitTier = getTierBadge(squadFitScore);

              return (
                <section
                  key={squad.id || index}
                  style={{
                    marginBottom: '18px',
                    padding: '20px',
                    background: SCROLL.paperMid,
                    border: `0.5px solid ${SCROLL.border}`,
                    borderRadius: '14px'
                  }}
                >
                  {/* 부대 제목 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: '#14171D',
                      backgroundColor: SCROLL.gold, padding: '4px 10px', borderRadius: '999px',
                      fontFamily: SCROLL.mono
                    }}>
                      {squad.squadNum || index + 1}군
                    </span>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: SCROLL.ink }}>
                      {squad.deck_name || `${index + 1}군 추천 부대`}
                    </h3>
                    {squad.isPinned && (
                      <span style={{
                        fontSize: '11px', fontWeight: 700, color: SCROLL.gold,
                        border: `0.5px solid ${SCROLL.gold}`, borderRadius: '6px',
                        padding: '2px 7px', fontFamily: SCROLL.mono
                      }}>
                        📌 고정
                      </span>
                    )}
                    <span style={{
                      marginLeft: isCollapsed ? 0 : 'auto', fontSize: '11px', fontWeight: 700, fontFamily: SCROLL.mono,
                      color: squadFitTier.color
                    }}>
                      종합 적합도 {squadFitScore} · {squadFitTier.label}
                    </span>
                    <button
                      onClick={() => toggleSquadCollapse(squadNum)}
                      style={{
                        marginLeft: isCollapsed ? 'auto' : 0,
                        fontSize: '11px', fontWeight: 700, color: SCROLL.inkFaint,
                        background: 'transparent', border: `0.5px solid ${SCROLL.border}`,
                        borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: SCROLL.mono
                      }}
                    >
                      {isCollapsed ? '펼치기 ▾' : '접기 ▴'}
                    </button>
                  </div>

                  {isCollapsed ? null : (
                  <>
                  {/* 이 군(슬롯)에 사용할 티어덱을 유저가 직접 지정(오버라이드) — 비우면 자동 추천으로 복귀 */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px'
                  }}>
                    <span style={{ fontSize: '10px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono, letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {squad.squadNum || index + 1}군 티어덱
                    </span>
                    <select
                      value={squadDeckOverrides[(squad.squadNum || index + 1) - 1] || ''}
                      onChange={(e) => handleSquadDeckOverride((squad.squadNum || index + 1) - 1, e.target.value)}
                      style={{
                        flex: 1, padding: '5px 8px', fontSize: '0.8rem', fontWeight: 600,
                        border: `0.5px solid ${SCROLL.border}`, borderRadius: '6px',
                        backgroundColor: SCROLL.bg, color: SCROLL.ink, cursor: 'pointer'
                      }}
                    >
                      <option value="" style={{ backgroundColor: SCROLL.bg, color: SCROLL.ink }}>
                        자동 추천 (적합도 순){squad.sourceDeckId ? ` · 현재: ${squad.deck_name}` : ''}
                      </option>
                      {tierDecks.map(d => (
                        <option key={d.id} value={String(d.id)} style={{ backgroundColor: SCROLL.bg, color: SCROLL.ink }}>
                          {d.deck_name || `티어덱 #${d.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 진형 정보 */}
                  <div style={{
                    marginBottom: '14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    backgroundColor: SCROLL.bg, padding: '12px 16px',
                    border: `0.5px solid ${SCROLL.headerBorder}`, borderRadius: '10px'
                  }}>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '10px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono,
                          letterSpacing: '0.05em'
                        }}>
                          진형
                        </span>

                        <select
                          value={formationInfo.id || ''}
                          onChange={(e) => handleFormationChange(squad.id, e.target.value)}
                          style={{
                            padding: '5px 8px', fontWeight: 600, fontSize: '0.85rem',
                            border: `0.5px solid ${SCROLL.border}`,
                            borderRadius: '6px', backgroundColor: SCROLL.paperMid, color: SCROLL.ink,
                            maxWidth: '100%'
                          }}
                        >
                          {formations.map(f => {
                            const fitScore = evaluateFormationFit(squad.setup, f, generals);
                            return (
                              <option key={f.id} value={f.id} style={{ backgroundColor: SCROLL.paperMid, color: SCROLL.ink }}>
                                {f.name} (적합도: {fitScore}점)
                              </option>
                            );
                          })}
                        </select>

                        <span style={{
                          backgroundColor: 'rgba(184,135,58,0.12)', color: SCROLL.gold,
                          border: `0.5px solid ${SCROLL.gold}`, padding: '4px 10px', borderRadius: '6px',
                          fontWeight: 700, fontSize: '0.8rem', fontFamily: SCROLL.mono
                        }}>
                          적합도 {squadFitScore}점
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: SCROLL.inkSoft, marginTop: '4px' }}>
                        <strong style={{ color: SCROLL.gold }}>효과</strong> · {formationInfo.effect}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, maxWidth: '100%', overflowX: 'auto' }}>
                      <FormationGridVisual
                        gridData={squad.formationGrid || calculateAutoFormationGrid(squad.setup, generals)}
                        onCellClick={(clickedIdx) => handleGridCellClick(squad.id, clickedIdx)}
                      />
                    </div>
                  </div>

                  {/* 인연/연의/조합 효과 */}
                  {(activeSynergies.length > 0 || activeConnections.length > 0 || activeTroopFactionBonuses.length > 0) && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', padding: '12px',
                      backgroundColor: SCROLL.greenBg, borderLeft: `2px solid ${SCROLL.green}`, borderRadius: '8px'
                    }}>
                      <div style={{
                        fontSize: '0.7rem', color: SCROLL.inkFaint,
                        paddingBottom: '4px', marginBottom: '2px'
                      }}>
                        ℹ️ 연의 효과는 인게임 공식 데이터가 아니며, 천하결전 카페 패밀리맨74님이 제안하신 커뮤니티 해석 자료를 반영한 것입니다.
                      </div>

                      {activeSynergies.map((syn, synIdx) => (
                        <div key={`syn-${synIdx}`} style={{ fontSize: '0.85rem', color: SCROLL.greenSoft }}>
                          🔗 [인연] <strong>{syn.name}</strong> ({syn.req_count}인): {syn.effect}
                        </div>
                      ))}

                      {activeConnections.map((conn, connIdx) => (
                        <div key={`conn-${connIdx}`} style={{ fontSize: '0.85rem', color: SCROLL.greenSoft }}>
                          ⚡ [연의 관계] <strong>{conn.leader_name} → {conn.follower_name}</strong> |
                          제공: <em>{conn.provides}</em> |
                          효과: <strong>{conn.follower_effect}</strong>
                        </div>
                      ))}

                      {activeTroopFactionBonuses.map((bonus, bIdx) => (
                        <div key={`troop-${bIdx}`} style={{ fontSize: '0.85rem', color: SCROLL.greenSoft, fontWeight: 600 }}>
                          🛡️ [조합] <strong>{bonus.label}</strong>: {bonus.effect}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 장수 슬롯 */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                    {squad.setup.map((hero, hIdx) => {
                      const otherHeroNamesInSquad = squad.setup
                        .filter((_, idx) => idx !== hIdx)
                        .map(h => h.general_name);

                      const otherHeroGenObjs = otherHeroNamesInSquad
                        .map(name => generals.find(g => g.name === name))
                        .filter(Boolean);

                      const FACTION_COLORS = {
                        '위': 'rgba(58,123,200,0.08)',
                        '촉': 'rgba(78,154,99,0.08)',
                        '오': 'rgba(192,69,61,0.08)',
                        '군': 'rgba(184,135,58,0.08)',
                      };

                      const FACTION_BORDER_COLORS = {
                        '위': '#3A7BC8',
                        '촉': SCROLL.green,
                        '오': SCROLL.sealDark,
                        '군': SCROLL.gold,
                      };

                      const currentGen = generals.find(g => g.name === hero.general_name);

                      return (
                        <div key={hIdx} style={{
                          padding: '16px',
                          border: `0.5px solid ${FACTION_BORDER_COLORS[currentGen?.faction] || SCROLL.border}`,
                          backgroundColor: FACTION_COLORS[currentGen?.faction] || SCROLL.bg,
                          borderRadius: '10px'
                        }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <div
                              onClick={() => setDetailTarget({ type: 'general', name: hero.general_name })}
                              title="클릭 시 장수 상세 보기"
                              style={{ width: '52px', height: '52px', border: `1.5px solid ${SCROLL.gold}`, borderRadius: '8px', flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}
                            >
                              <img
                                src={hero.image_url || '/images/generals/default.jpg'}
                                alt={hero.general_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/generals/default.jpg'; }}
                              />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '3px' }}>
                                <div
                                  onClick={() => setDetailTarget({ type: 'general', name: hero.general_name })}
                                  style={{ fontSize: '11px', color: SCROLL.gold, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                                >
                                  ℹ️ {hero.general_name} 상세보기
                                </div>
                                <button
                                  onClick={() => toggleGeneralLock(squadNum, hIdx, hero.general_name)}
                                  title={isGeneralLocked(squadNum, hIdx) ? '장수 잠금 해제' : '이 장수로 확정(잠금)'}
                                  style={{
                                    fontSize: '10px', flexShrink: 0, cursor: 'pointer',
                                    background: isGeneralLocked(squadNum, hIdx) ? 'rgba(184,135,58,0.18)' : 'transparent',
                                    border: `0.5px solid ${isGeneralLocked(squadNum, hIdx) ? SCROLL.gold : SCROLL.border}`,
                                    color: isGeneralLocked(squadNum, hIdx) ? SCROLL.gold : SCROLL.inkFaint,
                                    borderRadius: '5px', padding: '2px 6px'
                                  }}
                                >
                                  {isGeneralLocked(squadNum, hIdx) ? '🔒 확정됨' : '🔓 확정'}
                                </button>
                              </div>
                              <select
                                value={hero.general_name}
                                disabled={isGeneralLocked(squadNum, hIdx)}
                                onChange={(e) => handleGeneralChange(squad.id, hIdx, e.target.value)}
                                style={{
                                  width: '100%', padding: '6px 8px', fontWeight: 700, fontSize: '0.95rem',
                                  border: `0.5px solid ${SCROLL.border}`, borderRadius: '6px',
                                  backgroundColor: SCROLL.bg, color: SCROLL.ink,
                                  cursor: isGeneralLocked(squadNum, hIdx) ? 'not-allowed' : 'pointer',
                                  opacity: isGeneralLocked(squadNum, hIdx) ? 0.6 : 1
                                }}
                              >
                                {generals
                                  .filter(g => selectedGenerals.includes(g.id))
                                  .filter(g => !otherHeroNamesInSquad.includes(g.name))
                                  .filter(g => !getLockedGeneralNamesExcept(squadNum, hIdx).has(g.name?.trim()))
                                  .sort((a, b) => {
                                    const scoreOf = (g) => {
                                      let s = 0;
                                      if (otherHeroGenObjs.some(o => o.faction === g.faction)) s += 2;
                                      if (otherHeroGenObjs.some(o => o.troop_type === g.troop_type)) s += 1;

                                      const candidateRole = ROLE_GROUP_MAP[g.preferred_tactic_type];
                                      const existingRoles = otherHeroGenObjs.map(o => ROLE_GROUP_MAP[o.preferred_tactic_type]).filter(Boolean);

                                      if (existingRoles.includes('탱') && ['딜', '힐', '디버프'].includes(candidateRole)) s += 3;
                                      if (candidateRole && !existingRoles.includes(candidateRole)) s += 1;

                                      return s;
                                    };

                                    return scoreOf(b) - scoreOf(a);
                                  })
                                  .map(g => {
                                    const connBadge = getGeneralConnectionBadge(g.name, connections);
                                    const roleBadge = g.preferred_tactic_type
                                      ? ` [${ROLE_LABEL_MAP[g.preferred_tactic_type] || g.preferred_tactic_type}]`
                                      : '';
                                    const posBadge = g.position ? ` [${g.position}]` : '';
                                    const troopBadge = g.troop_type ? ` [${g.troop_type}]` : '';
                                    const isSynergyTarget = checkHasConnectionWithSquad(g.name, otherHeroNamesInSquad, connections);
                                    const isFactionMatch = otherHeroGenObjs.some(o => o.faction === g.faction);

                                    return (
                                      <option
                                        key={g.id}
                                        value={g.name}
                                        style={{
                                          backgroundColor: SCROLL.bg,
                                          fontWeight: (isSynergyTarget || isFactionMatch) ? 'bold' : 'normal',
                                          color: isSynergyTarget
                                            ? SCROLL.gold
                                            : isFactionMatch
                                            ? SCROLL.blue
                                            : SCROLL.ink
                                        }}
                                      >
                                        {g.name}{roleBadge}{posBadge}{troopBadge} {g.kingdom ? `(${g.kingdom})` : ''} {connBadge} {isSynergyTarget ? '⚡' : ''}
                                      </option>
                                    );
                                  })}
                              </select>

                              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {currentGen?.position && (
                                  <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>추천 위치</span>
                                    <span style={{
                                      backgroundColor: currentGen.position === '전열' ? 'rgba(192,69,61,0.12)' : 'rgba(58,123,200,0.12)',
                                      color: currentGen.position === '전열' ? SCROLL.sealDark : SCROLL.blue,
                                      border: `0.5px solid ${currentGen.position === '전열' ? SCROLL.sealDark : SCROLL.blue}`,
                                      padding: '1px 7px', borderRadius: '4px', fontWeight: 700
                                    }}>
                                      {currentGen.position}
                                    </span>
                                  </div>
                                )}

                                {currentGen?.main_stat && (
                                  <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>추천 속성</span>
                                    <span style={{ backgroundColor: 'rgba(184,135,58,0.12)', color: SCROLL.gold, border: `0.5px solid ${SCROLL.gold}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                      {currentGen.main_stat}
                                    </span>
                                  </div>
                                )}

                                {currentGen?.troop_type && (
                                  <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>병종</span>
                                    <span style={{ backgroundColor: 'rgba(138,143,152,0.12)', color: SCROLL.inkSoft, border: `0.5px solid ${SCROLL.border}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                      {currentGen.troop_type}
                                    </span>
                                  </div>
                                )}

                                {hero.recommended_troop && (
                                  <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>
                                      권장 병종({hero.troop_source === 'tierdeck' ? '덱 데이터' : 'AI 추천'})
                                    </span>
                                    <span style={{
                                      backgroundColor: hero.troop_mismatch ? 'rgba(192,69,61,0.12)' : 'rgba(58,123,200,0.12)',
                                      color: hero.troop_mismatch ? SCROLL.sealDark : SCROLL.blue,
                                      border: `0.5px solid ${hero.troop_mismatch ? SCROLL.sealDark : SCROLL.blue}`,
                                      padding: '1px 7px', borderRadius: '4px', fontWeight: 700
                                    }}>
                                      {hero.recommended_troop}{hero.troop_mismatch ? ' (병부 전환 필요)' : ' (일치)'}
                                    </span>
                                    {hero.troop_reason && (
                                      <span style={{ fontSize: '10px', color: SCROLL.inkFaint }}>· {hero.troop_reason}</span>
                                    )}
                                  </div>
                                )}

                                <SubtypeBadge hero={hero} />

                                {currentGen?.recommended_equip_stats && (
                                  <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>장비 가이드</span>
                                    <span style={{ backgroundColor: SCROLL.greenBg, color: SCROLL.greenSoft, border: `0.5px solid ${SCROLL.green}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                      {currentGen.recommended_equip_stats}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ borderTop: `0.5px solid ${SCROLL.headerBorder}`, paddingTop: '10px', marginTop: '6px' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px', color: SCROLL.gold, letterSpacing: '0.05em', fontFamily: SCROLL.mono }}>
                              ⚔️ 장착 전법 (클릭 교체)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {hero.tactics.map((t, tIdx) => {
                                const tTier = getTierBadge(t.score);
                                const tacticLocked = isTacticLocked(squadNum, hIdx, tIdx);
                                // 🆕 이 전법의 보라/황금 등급 배지 — tactics 원본 데이터에서 이름으로 조회
                                const gradeBadge = getTacticGradeBadge(
                                  tactics.find(tc => tc.name?.trim() === t.name?.trim())?.grade
                                );
                                return (
                                  <div
                                    key={tIdx}
                                    onClick={() => {
                                      if (tacticLocked) return;
                                      setEditingTacticTarget({
                                        squadId: squad.id,
                                        heroIndex: hIdx,
                                        tacticIndex: tIdx,
                                        currentHeroName: hero.general_name
                                      });
                                    }}
                                    style={{
                                      cursor: tacticLocked ? 'default' : 'pointer', padding: '8px 10px', borderRadius: '8px',
                                      display: 'flex', flexDirection: 'column', gap: '3px',
                                      border: tacticLocked ? `0.5px solid ${SCROLL.gold}` : t.isTierPick ? `0.5px solid ${SCROLL.green}` : t.isManual ? `0.5px solid ${SCROLL.gold}` : `0.5px solid ${SCROLL.headerBorder}`,
                                      backgroundColor: tacticLocked ? 'rgba(184,135,58,0.14)' : t.isTierPick ? SCROLL.greenBg : t.isManual ? 'rgba(184,135,58,0.1)' : SCROLL.bg,
                                      transition: 'all 0.15s ease'
                                    }}
                                    title={tacticLocked ? '확정(잠금)된 전법입니다' : '클릭 시 적합도 점수순 선택창 표시'}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: SCROLL.ink, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                        {gradeBadge && `${gradeBadge} `}
                                        {t.name} {t.isManual && <span style={{ fontSize: '0.7rem', color: SCROLL.gold }}>(수동)</span>}
                                        <span
                                          onClick={(e) => { e.stopPropagation(); setDetailTarget({ type: 'tactic', name: t.name }); }}
                                          title="전법 상세 보기"
                                          style={{ fontSize: '0.75rem', color: SCROLL.inkFaint, cursor: 'pointer' }}
                                        >
                                          ℹ️
                                        </span>
                                      </span>
                                      <span style={{
                                        fontSize: '0.75rem', fontWeight: 700, color: tTier.color, fontFamily: SCROLL.mono,
                                        display: 'flex', alignItems: 'center', gap: '5px'
                                      }}>
                                        {t.score}점
                                        <span style={{
                                          fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
                                          border: `0.5px solid ${tTier.color}`, color: tTier.color
                                        }}>
                                          {tTier.label}
                                        </span>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); toggleTacticLock(squadNum, hIdx, tIdx, t.name); }}
                                          title={tacticLocked ? '전법 잠금 해제' : '이 전법으로 확정(잠금)'}
                                          style={{
                                            fontSize: '10px', cursor: 'pointer',
                                            background: tacticLocked ? 'rgba(184,135,58,0.22)' : 'transparent',
                                            border: `0.5px solid ${tacticLocked ? SCROLL.gold : SCROLL.border}`,
                                            color: tacticLocked ? SCROLL.gold : SCROLL.inkFaint,
                                            borderRadius: '5px', padding: '1px 5px'
                                          }}
                                        >
                                          {tacticLocked ? '🔒' : '🔓'}
                                        </button>
                                        {!tacticLocked && '✏️'}
                                      </span>
                                    </div>

                                    {t.isTierPick && (
                                      <span style={{ fontSize: '10px', color: SCROLL.greenSoft }}>
                                        🏆 티어덱 지정 전법 (점수와 무관하게 이 덱의 정석 선택)
                                      </span>
                                    )}
                                    {!t.isTierPick && t.tierTacticName && t.tierTacticName !== t.name && (
                                      <span style={{ fontSize: '10px', color: SCROLL.inkFaint }}>
                                        ⤷ 원래 티어덱 지정: {t.tierTacticName} (겹치거나 미보유하여 대체됨)
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </>
                  )}
                </section>
              );
            })}

            {/* ---------------- 수동 편성 슬롯 (autoSquadCount 이후) ---------------- */}
            {Array.from({ length: manualSlotCount }, (_, mIdx) => {
              const slotIndex = mIdx;
              const squadNum = autoSquadCount + mIdx + 1;
              const manual = getManualSquad(slotIndex);
              const isCollapsed = Boolean(collapsedSquads[squadNum]);

              const manualHeroNames = manual.setup.filter(Boolean).map(h => h.general_name);
              const manualGenObjs = manual.setup
                .filter(Boolean)
                .map(h => generals.find(g => g.name === h.general_name))
                .filter(Boolean);

              const manualHeroSetups = manual.setup.filter(Boolean).map(h => {
                const genObj = generals.find(g => g.name === h.general_name);
                const othersNativeTroops = manualGenObjs
                  .filter(g => g.name !== genObj?.name)
                  .map(g => g.troop_type)
                  .filter(Boolean);
                const suggestion = genObj
                  ? suggestTroopConversion({ generalObj: genObj, squadEffectiveTroops: othersNativeTroops, explicitTroop: null })
                  : null;
                return {
                  general_name: h.general_name,
                  recommended_troop: suggestion?.troop || null,
                  troop_mismatch: Boolean(suggestion && genObj?.troop_type && suggestion.troop !== genObj.troop_type),
                  troop_source: suggestion?.source || null,
                  troop_reason: suggestion?.reason || null,
                  subtype: suggestion?.subtype || null,
                  subtype_confidence: suggestion?.subtype && suggestion.source === 'tierdeck' ? 'high' : null,
                  subtype_reason: suggestion?.mastery ? `전용/추천 정통: ${suggestion.mastery}` : (suggestion?.reason || null),
                  subtype_candidates: suggestion?.subtypeCandidates || null,
                  mastery: suggestion?.mastery || null,
                };
              });

              const validHeroesForFit = manual.setup.filter(Boolean);
              const manualFormationInfo = manual.formationInfo || getMatchedFormation((manual.formationGrid || []).join(','), formations);
              const manualActiveSynergies = getActiveSynergies(manualHeroNames);
              const manualActiveConnections = getActiveConnections(manualHeroNames);
              const manualActiveTroopFactionBonuses = getActiveTroopFactionBonuses(manualHeroSetups, generals);
              const manualFitScore = evaluateFormationFit(validHeroesForFit, manualFormationInfo, generals);
              const manualFitTier = getTierBadge(manualFitScore);

              const squadHeroNames = validHeroesForFit.map(h => h.general_name).filter(Boolean);
              const squadTacticNames = validHeroesForFit
                .flatMap(h => (h.tactics || []).map(t => (typeof t === 'string' ? t : t?.name)))
                .filter(Boolean);

              let bestTierMatch = null;
              const tierComparisonList = [];
              tierDecks.forEach(deck => {
                const score = computeDeckFitScore(deck, squadHeroNames, squadTacticNames);
                tierComparisonList.push({ name: deck.deck_name || '이름 없는 덱', score });
                if (!bestTierMatch || score > bestTierMatch.score) {
                  bestTierMatch = { deck, score };
                }
              });
              const topTierComparisons = [...tierComparisonList].sort((a, b) => b.score - a.score).slice(0, 5);

              return (
                <section key={`manual-${slotIndex}`} style={{
                  marginBottom: '18px', padding: '20px',
                  background: SCROLL.paperMid, border: `0.5px solid ${SCROLL.border}`, borderRadius: '14px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.8rem', fontWeight: 700, color: SCROLL.gold,
                      padding: '3px 10px', borderRadius: '999px',
                      border: `0.5px solid ${SCROLL.gold}`, fontFamily: SCROLL.mono
                    }}>
                      {squadNum}군 · 직접 편성
                    </span>
                    <span style={{ fontSize: '0.72rem', color: SCROLL.inkFaint }}>
                      장수를 고르면 전법 선택 시 적합점수가 표시됩니다.
                    </span>
                    <span style={{
                      marginLeft: isCollapsed ? 0 : 'auto', fontSize: '11px', fontWeight: 700, fontFamily: SCROLL.mono,
                      color: manualFitTier.color
                    }}>
                      종합 적합도 {manualFitScore} · {manualFitTier.label}
                      {bestTierMatch && bestTierMatch.deck && (
                        <div style={{ fontSize: '11px', color: SCROLL.inkFaint, marginTop: '2px' }}>
                          최고 유사 티어덱: <strong style={{ color: SCROLL.gold }}>{bestTierMatch.deck.deck_name}</strong> 대비{' '}
                          <strong style={{ color: SCROLL.green }}>{Math.round(bestTierMatch.score)}%</strong> 완성도
                        </div>
                      )}
                    </span>
                    <button
                      onClick={() => toggleSquadCollapse(squadNum)}
                      style={{
                        marginLeft: isCollapsed ? 'auto' : 0,
                        fontSize: '11px', fontWeight: 700, color: SCROLL.inkFaint,
                        background: 'transparent', border: `0.5px solid ${SCROLL.border}`,
                        borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: SCROLL.mono
                      }}
                    >
                      {isCollapsed ? '펼치기 ▾' : '접기 ▴'}
                    </button>
                  </div>

                  {isCollapsed ? null : (
                  <>
                  {/* 진형 정보 */}
                  <div style={{
                    marginBottom: '14px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
                    backgroundColor: SCROLL.bg, padding: '12px 16px',
                    border: `0.5px solid ${SCROLL.headerBorder}`, borderRadius: '10px'
                  }}>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '10px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono, letterSpacing: '0.05em' }}>
                          진형
                        </span>
                        <select
                          value={manualFormationInfo?.id || ''}
                          onChange={(e) => handleManualFormationChange(slotIndex, e.target.value)}
                          style={{
                            padding: '5px 8px', fontWeight: 600, fontSize: '0.85rem',
                            border: `0.5px solid ${SCROLL.border}`,
                            borderRadius: '6px', backgroundColor: SCROLL.paperMid, color: SCROLL.ink,
                            maxWidth: '100%'
                          }}
                        >
                          <option value="" style={{ backgroundColor: SCROLL.paperMid, color: SCROLL.ink }}>진형 미지정 (기본 배치)</option>
                          {formations.map(f => {
                            const fitScore = evaluateFormationFit(validHeroesForFit, f, generals);
                            return (
                              <option key={f.id} value={f.id} style={{ backgroundColor: SCROLL.paperMid, color: SCROLL.ink }}>
                                {f.name} (적합도: {fitScore}점)
                              </option>
                            );
                          })}
                        </select>
                        <span style={{
                          backgroundColor: 'rgba(184,135,58,0.12)', color: SCROLL.gold,
                          border: `0.5px solid ${SCROLL.gold}`, padding: '4px 10px', borderRadius: '6px',
                          fontWeight: 700, fontSize: '0.8rem', fontFamily: SCROLL.mono
                        }}>
                          적합도 {manualFitScore}점
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: SCROLL.inkSoft, marginTop: '4px' }}>
                        <strong style={{ color: SCROLL.gold }}>효과</strong> · {manualFormationInfo.effect}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, maxWidth: '100%', overflowX: 'auto' }}>
                      <FormationGridVisual
                        gridData={manual.formationGrid || calculateAutoFormationGrid(validHeroesForFit, generals)}
                        onCellClick={(clickedIdx) => handleManualGridCellClick(slotIndex, clickedIdx)}
                      />
                    </div>
                  </div>

                  {/* 티어덱 대비 완성도 그래프 */}
                  {validHeroesForFit.length > 0 && (
                    <div style={{
                      marginBottom: '16px', padding: '14px 16px',
                      backgroundColor: SCROLL.bg, border: `0.5px solid ${SCROLL.headerBorder}`, borderRadius: '10px'
                    }}>
                      <div style={{ fontSize: '10px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono, letterSpacing: '0.05em', marginBottom: '10px' }}>
                        내 편성이 각 티어덱을 얼마나 충족하는지 (장수 70% + 전법 30% 가중치, 상위 5개)
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {topTierComparisons.map((t, tIdx) => (
                          <ComparisonBar
                            key={tIdx}
                            label={t.name}
                            score={t.score}
                            color={tIdx === 0 ? SCROLL.gold : SCROLL.blue}
                            highlighted={tIdx === 0}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: '10.5px', color: SCROLL.inkFaint, marginTop: '8px' }}>
                        가장 유사한 티어덱: <strong style={{ color: SCROLL.gold }}>{bestTierMatch?.deck?.deck_name || '-'}</strong> 대비 <strong style={{ color: SCROLL.green }}>{Math.round(bestTierMatch?.score || 0)}%</strong>
                      </div>
                    </div>
                  )}

                  {/* 인연/연의/조합 효과 */}
                  {(manualActiveSynergies.length > 0 || manualActiveConnections.length > 0 || manualActiveTroopFactionBonuses.length > 0) && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px', padding: '12px',
                      backgroundColor: SCROLL.greenBg, borderLeft: `2px solid ${SCROLL.green}`, borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '0.7rem', color: SCROLL.inkFaint, paddingBottom: '4px', marginBottom: '2px' }}>
                        ℹ️ 연의 효과는 인게임 공식 데이터가 아니며, 천하결전 카페 패밀리맨74님이 제안하신 커뮤니티 해석 자료를 반영한 것입니다.
                      </div>

                      {manualActiveSynergies.map((syn, synIdx) => (
                        <div key={`syn-${synIdx}`} style={{ fontSize: '0.85rem', color: SCROLL.greenSoft }}>
                          🔗 [인연] <strong>{syn.name}</strong> ({syn.req_count}인): {syn.effect}
                        </div>
                      ))}

                      {manualActiveConnections.map((conn, connIdx) => (
                        <div key={`conn-${connIdx}`} style={{ fontSize: '0.85rem', color: SCROLL.greenSoft }}>
                          ⚡ [연의 관계] <strong>{conn.leader_name} → {conn.follower_name}</strong> |
                          제공: <em>{conn.provides}</em> |
                          효과: <strong>{conn.follower_effect}</strong>
                        </div>
                      ))}

                      {manualActiveTroopFactionBonuses.map((bonus, bIdx) => (
                        <div key={`troop-${bIdx}`} style={{ fontSize: '0.85rem', color: SCROLL.greenSoft, fontWeight: 600 }}>
                          🛡️ [조합] <strong>{bonus.label}</strong>: {bonus.effect}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {[0, 1, 2].map((heroIndex) => {
                      const hero = manual.setup[heroIndex];
                      const genObj = hero ? generals.find(g => g.name === hero.general_name) : null;
                      const heroTroopSuggestion = hero
                        ? manualHeroSetups.find(hs => hs.general_name === hero.general_name)
                        : null;

                      const generalCandidates = getManualGeneralCandidates(slotIndex, heroIndex);
                      const generalLocked = isGeneralLocked(squadNum, heroIndex);

                      const otherManualHeroNamesInSquad = manual.setup
                        .filter((h, i) => i !== heroIndex && h)
                        .map(h => h.general_name);
                      const otherManualHeroGenObjs = otherManualHeroNamesInSquad
                        .map(name => generals.find(g => g.name === name))
                        .filter(Boolean);

                      return (
                        <div key={heroIndex} style={{
                          padding: '14px', border: `0.5px solid ${SCROLL.border}`,
                          backgroundColor: SCROLL.bg, borderRadius: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                            {hero && (
                              <div
                                onClick={() => setDetailTarget({ type: 'general', name: hero.general_name })}
                                title="클릭 시 장수 상세 보기"
                                style={{ width: '44px', height: '44px', border: `1.5px solid ${SCROLL.gold}`, borderRadius: '8px', flexShrink: 0, overflow: 'hidden', cursor: 'pointer' }}
                              >
                                <img
                                  src={hero.image_url || genObj?.image_url || '/images/generals/default.jpg'}
                                  alt={hero.general_name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  onError={(e) => { e.target.onerror = null; e.target.src = '/images/generals/default.jpg'; }}
                                />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select
                              value={hero?.general_name || ''}
                              disabled={generalLocked}
                              onChange={(e) => handleManualGeneralSelect(slotIndex, heroIndex, e.target.value)}
                              style={{
                                flex: 1, minWidth:0, padding: '6px 8px', fontWeight: 700, fontSize: '0.95rem',
                                border: `0.5px solid ${SCROLL.border}`, borderRadius: '6px',
                                backgroundColor: SCROLL.bg, color: SCROLL.ink,
                                cursor: generalLocked ? 'not-allowed' : 'pointer',
                                opacity: generalLocked ? 0.6 : 1
                              }}
                            >
                              <option value="">장수 선택 ({heroIndex + 1}번)</option>
                              {generalCandidates.map(g => {
                                const usedElsewhere = globallyUsedGeneralNames.has(g.name) && g.name !== hero?.general_name;
                                const connBadge = getGeneralConnectionBadge(g.name, connections);
                                const roleBadge = g.preferred_tactic_type
                                  ? ` [${ROLE_LABEL_MAP[g.preferred_tactic_type] || g.preferred_tactic_type}]`
                                  : '';
                                const posBadge = g.position ? ` [${g.position}]` : '';
                                const troopBadge = g.troop_type ? ` [${g.troop_type}]` : '';
                                const isSynergyTarget = checkHasConnectionWithSquad(g.name, otherManualHeroNamesInSquad, connections);
                                const isFactionMatch = otherManualHeroGenObjs.some(o => o.faction === g.faction);

                                return (
                                  <option
                                    key={g.id}
                                    value={g.name}
                                    style={{
                                      backgroundColor: SCROLL.bg,
                                      fontWeight: (isSynergyTarget || isFactionMatch) ? 'bold' : 'normal',
                                      color: usedElsewhere
                                        ? SCROLL.inkFaint
                                        : isSynergyTarget
                                        ? SCROLL.gold
                                        : isFactionMatch
                                        ? SCROLL.blue
                                        : SCROLL.ink
                                    }}
                                  >
                                    {g.name}{roleBadge}{posBadge}{troopBadge} {g.kingdom ? `(${g.kingdom})` : ''} {connBadge} {isSynergyTarget ? '⚡' : ''}{usedElsewhere ? ' (다른 부대에 배정됨)' : ''}
                                  </option>
                                );
                              })}
                            </select>
                            {hero && (
                              <button
                                onClick={() => toggleGeneralLock(squadNum, heroIndex, hero.general_name)}
                                title={generalLocked ? '장수 잠금 해제' : '이 장수로 확정(잠금)'}
                                style={{
                                  fontSize: '10px', flexShrink: 0, cursor: 'pointer',
                                  background: generalLocked ? 'rgba(184,135,58,0.18)' : 'transparent',
                                  border: `0.5px solid ${generalLocked ? SCROLL.gold : SCROLL.border}`,
                                  color: generalLocked ? SCROLL.gold : SCROLL.inkFaint,
                                  borderRadius: '5px', padding: '5px 8px'
                                }}
                              >
                                {generalLocked ? '🔒 확정됨' : '🔓 확정'}
                              </button>
                            )}
                            </div>
                          </div>

                          {hero && genObj && (
                            <div
                              onClick={() => setDetailTarget({ type: 'general', name: hero.general_name })}
                              style={{ fontSize: '11px', color: SCROLL.gold, cursor: 'pointer', marginBottom: '8px', textDecoration: 'underline', textUnderlineOffset: 2 }}
                            >
                              ℹ️ {hero.general_name} 상세보기 · {genObj.faction} · {genObj.position || '위치 미정'}
                            </div>
                          )}

                          {/* 🆕 티어덱 카드와 동일하게 추천 위치 / 추천 속성 / 병종 / 장비 가이드 배지 표시 */}
                          {hero && genObj && (
                            <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {genObj.position && (
                                <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>추천 위치</span>
                                  <span style={{
                                    backgroundColor: genObj.position === '전열' ? 'rgba(192,69,61,0.12)' : 'rgba(58,123,200,0.12)',
                                    color: genObj.position === '전열' ? SCROLL.sealDark : SCROLL.blue,
                                    border: `0.5px solid ${genObj.position === '전열' ? SCROLL.sealDark : SCROLL.blue}`,
                                    padding: '1px 7px', borderRadius: '4px', fontWeight: 700
                                  }}>
                                    {genObj.position}
                                  </span>
                                </div>
                              )}

                              {genObj.main_stat && (
                                <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>추천 속성</span>
                                  <span style={{ backgroundColor: 'rgba(184,135,58,0.12)', color: SCROLL.gold, border: `0.5px solid ${SCROLL.gold}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                    {genObj.main_stat}
                                  </span>
                                </div>
                              )}

                              {genObj.troop_type && (
                                <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>병종</span>
                                  <span style={{ backgroundColor: 'rgba(138,143,152,0.12)', color: SCROLL.inkSoft, border: `0.5px solid ${SCROLL.border}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                    {genObj.troop_type}
                                  </span>
                                </div>
                              )}

                              {heroTroopSuggestion?.recommended_troop && (
                                <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>
                                    권장 병종(AI 추천)
                                  </span>
                                  <span style={{
                                    backgroundColor: heroTroopSuggestion.troop_mismatch ? 'rgba(192,69,61,0.12)' : 'rgba(58,123,200,0.12)',
                                    color: heroTroopSuggestion.troop_mismatch ? SCROLL.sealDark : SCROLL.blue,
                                    border: `0.5px solid ${heroTroopSuggestion.troop_mismatch ? SCROLL.sealDark : SCROLL.blue}`,
                                    padding: '1px 7px', borderRadius: '4px', fontWeight: 700
                                  }}>
                                    {heroTroopSuggestion.recommended_troop}{heroTroopSuggestion.troop_mismatch ? ' (병부 전환 필요)' : ' (일치)'}
                                  </span>
                                  {heroTroopSuggestion.troop_reason && (
                                    <span style={{ fontSize: '10px', color: SCROLL.inkFaint }}>· {heroTroopSuggestion.troop_reason}</span>
                                  )}
                                </div>
                              )}

                              <SubtypeBadge hero={heroTroopSuggestion} />

                              {genObj.recommended_equip_stats && (
                                <div style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: SCROLL.inkFaint, fontFamily: SCROLL.mono, fontSize: '10px' }}>장비 가이드</span>
                                  <span style={{ backgroundColor: SCROLL.greenBg, color: SCROLL.greenSoft, border: `0.5px solid ${SCROLL.green}`, padding: '1px 7px', borderRadius: '4px', fontWeight: 700 }}>
                                    {genObj.recommended_equip_stats}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {hero && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {[0, 1].map((tacticSlot) => {
                                const currentTactic = hero.tactics?.[tacticSlot];
                                const tTier = currentTactic ? getTierBadge(currentTactic.score) : null;
                                const tacticCandidates = getManualTacticCandidates(slotIndex, heroIndex, tacticSlot);
                                const tacticLocked = isTacticLocked(squadNum, heroIndex, tacticSlot);
                                // 🆕 현재 선택된 전법의 보라/황금 등급 배지
                                const currentTacticGradeBadge = getTacticGradeBadge(
                                  tactics.find(tc => tc.name?.trim() === currentTactic?.name?.trim())?.grade
                                );

                                return (
                                  <div key={tacticSlot} style={{
                                    padding: '8px 10px', borderRadius: '8px',
                                    border: `0.5px solid ${tacticLocked ? SCROLL.gold : SCROLL.headerBorder}`,
                                    backgroundColor: tacticLocked ? 'rgba(184,135,58,0.14)' : SCROLL.paperLight
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <select
                                        value={currentTactic?.name || ''}
                                        disabled={tacticLocked}
                                        onChange={(e) => handleManualTacticSelect(slotIndex, heroIndex, tacticSlot, e.target.value)}
                                        style={{
                                          flex: 1, padding: '4px 6px', fontSize: '0.85rem', fontWeight: 600,
                                          border: `0.5px solid ${SCROLL.border}`, borderRadius: '5px',
                                          backgroundColor: SCROLL.bg, color: SCROLL.ink,
                                          cursor: tacticLocked ? 'not-allowed' : 'pointer',
                                          opacity: tacticLocked ? 0.6 : 1
                                        }}
                                      >
                                        <option value="">전법 {tacticSlot + 1} 선택</option>
                                        {tacticCandidates.map(t => {
                                          const usedElsewhere = globallyUsedTacticNames.has(t.name) && t.name !== currentTactic?.name;
                                          const gradeBadge = getTacticGradeBadge(t.grade);
                                          return (
                                            <option key={t.id} value={t.name} style={{ backgroundColor: SCROLL.bg, color: usedElsewhere ? SCROLL.inkFaint : SCROLL.ink }}>
                                              {gradeBadge ? `${gradeBadge} ` : ''}{t.name} — 적합도 {t.__fitScore}점{usedElsewhere ? ' (사용중)' : ''}
                                            </option>
                                          );
                                        })}
                                      </select>
                                      {currentTactic && (
                                        <button
                                          onClick={() => toggleTacticLock(squadNum, heroIndex, tacticSlot, currentTactic.name)}
                                          title={tacticLocked ? '전법 잠금 해제' : '이 전법으로 확정(잠금)'}
                                          style={{
                                            fontSize: '10px', flexShrink: 0, cursor: 'pointer',
                                            background: tacticLocked ? 'rgba(184,135,58,0.22)' : 'transparent',
                                            border: `0.5px solid ${tacticLocked ? SCROLL.gold : SCROLL.border}`,
                                            color: tacticLocked ? SCROLL.gold : SCROLL.inkFaint,
                                            borderRadius: '5px', padding: '4px 6px'
                                          }}
                                        >
                                          {tacticLocked ? '🔒' : '🔓'}
                                        </button>
                                      )}
                                    </div>

                                    {currentTactic && tTier && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                        <span
                                          onClick={() => setDetailTarget({ type: 'tactic', name: currentTactic.name })}
                                          style={{ fontSize: '10px', color: SCROLL.inkFaint, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                                        >
                                          {currentTacticGradeBadge && `${currentTacticGradeBadge} `}ℹ️ 상세보기
                                        </span>
                                        <span style={{
                                          fontSize: '0.75rem', fontWeight: 700, color: tTier.color, fontFamily: SCROLL.mono,
                                          display: 'flex', alignItems: 'center', gap: '5px'
                                        }}>
                                          {currentTactic.score}점
                                          <span style={{
                                            fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
                                            border: `0.5px solid ${tTier.color}`, color: tTier.color
                                          }}>
                                            {tTier.label}
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  </>
                  )}
                </section>
              );
            })}
          </div>

          {/* ---------------- 하단 메타 정보 ---------------- */}
          <div style={{
            position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end',
            alignItems: 'center', gap: '8px', marginTop: '10px', paddingTop: '16px',
            borderTop: `0.5px solid ${SCROLL.headerBorder}`
          }}>
            <span style={{ fontSize: '11px', color: SCROLL.inkFaint, fontFamily: SCROLL.mono }}>
              {userNickname} · GENERATED {dateStr}
            </span>
          </div>

          {/* 💡 전법 선택 모달 */}
          {editingTacticTarget && (
            <div onClick={() => setEditingTacticTarget(null)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                backdropFilter: 'blur(4px)'
              }}>
              <div onClick={(e) => e.stopPropagation()} style={{
                backgroundColor: SCROLL.paperLight, padding: '24px', maxWidth: '560px',
                width: '90%', maxHeight: '80vh', overflowY: 'auto',
                border: `0.5px solid ${SCROLL.border}`, borderRadius: '16px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                color: SCROLL.ink, fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
              }}>
                <p style={{ fontSize: '11px', color: SCROLL.gold, letterSpacing: '0.05em', margin: '0 0 6px', fontFamily: SCROLL.mono }}>
                  TACTIC SELECT
                </p>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px', color: SCROLL.ink }}>
                  [{editingTacticTarget.currentHeroName}] 전법 선택 및 대체 추천
                </h3>
                <p style={{ fontSize: '0.8rem', color: SCROLL.inkFaint, marginBottom: '16px' }}>
                  * 다른 군단 장수가 이미 착용 중인 전법을 선택하면, 그 장수에게는 보유한 전법 중 가장 점수가 높은 것으로 자동 교체됩니다.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sortedTacticsForModal.map(tac => {
                    const tacTier = getTierBadge(tac.score);
                    // 🆕 보라/황금 등급 배지 — tac은 원본 tactics 객체를 spread한 것이라 grade 필드 그대로 사용 가능
                    const gradeBadge = getTacticGradeBadge(tac.grade);
                    return (
                      <button
                        key={tac.id}
                        disabled={!tac.isOwned || tac.isLockedElsewhere}
                        onClick={() => handleTacticChange(tac.name)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: tac.isSlotTierPick ? `1px solid ${SCROLL.green}` : tac.isLockedElsewhere ? `0.5px solid ${SCROLL.gold}` : tac.isOccupied ? `0.5px dashed ${SCROLL.inkFaint}` : tac.isRec ? `1px solid ${SCROLL.gold}` : `0.5px solid ${SCROLL.border}`,
                          backgroundColor: tac.isSlotTierPick ? SCROLL.greenBg : tac.isLockedElsewhere ? 'rgba(184,135,58,0.14)' : tac.isOccupied ? SCROLL.bg : tac.isRec ? 'rgba(184,135,58,0.12)' : tac.isAlternative ? SCROLL.greenBg : SCROLL.paperMid,
                          opacity: (!tac.isOwned || tac.isLockedElsewhere) ? 0.5 : 1,
                          cursor: (!tac.isOwned || tac.isLockedElsewhere) ? 'not-allowed' : 'pointer',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: tac.isOccupied ? SCROLL.inkSoft : SCROLL.ink }}>
                            {gradeBadge && `${gradeBadge} `}
                            {tac.isSlotTierPick && '🏆 '}
                            {tac.isRec && '⭐ '}
                            {tac.isAlternative && '🔄 '}
                            {tac.name}
                          </span>

                          <span style={{ fontSize: '0.75rem', marginLeft: '8px' }}>
                            {tac.isSlotTierPick && (
                              <strong style={{ color: SCROLL.greenSoft, marginRight: '6px' }}>[티어덱 전법 · 점수와 무관하게 원래 지정]</strong>
                            )}
                            {tac.isLockedElsewhere ? (
                              <strong style={{ color: SCROLL.gold }}>[🔒 {tac.assignedInfo.squadNum}군 {tac.assignedInfo.generalName} 확정(잠금) 중 · 가져올 수 없음]</strong>
                            ) : tac.isOccupied ? (
                              <strong style={{ color: SCROLL.gold }}>[{tac.assignedInfo.squadNum}군 {tac.assignedInfo.generalName} 착용 중 · 클릭 시 교체]</strong>
                            ) : tac.isRec ? (
                              <span style={{ color: SCROLL.gold }}>[공식 추천]</span>
                            ) : tac.isAlternative ? (
                              <span style={{ color: SCROLL.greenSoft }}>[대체 메커니즘 전법]</span>
                            ) : (
                              <span style={{ color: SCROLL.inkFaint }}>{tac.isOwned ? '[보유]' : '[미보유]'}</span>
                            )}
                          </span>
                        </div>

                        <span style={{ fontWeight: 700, color: tacTier.color, fontSize: '0.9rem', fontFamily: SCROLL.mono }}>
                          {tac.score}점
                        </span>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setEditingTacticTarget(null)}
                  style={{
                    marginTop: '18px', width: '100%', padding: '10px',
                    backgroundColor: SCROLL.gold, color: '#14171D', border: 'none',
                    borderRadius: '8px', fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DetailPopup
        target={detailTarget}
        onClose={() => setDetailTarget(null)}
        generals={generals}
        tactics={tactics}
        connections={connections}
      />
    </>
  );
}