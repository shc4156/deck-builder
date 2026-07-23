'use client';
import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import FormationGridVisual from '../components/FormationGridVisual';
import { useDeckAssets } from '../../hooks/useDeckAssets';
import { matchFormationInfo } from '../../data/synergies';
import { evaluateTacticFit } from '../../utils/squadEngine';
import { supabase } from '../lib/supabaseClient';

/* ============================================================
   🎨 칙서(양피지) 테마 색상 팔레트
   - 로직에는 영향 없음, 이 페이지 전용 색상 상수만 정의
============================================================ */
const SCROLL = {
  paperLight: '#f6ecd2',
  paperMid: '#eddfb8',
  paperDark: '#e4d2a1',
  paperTexture: 'rgba(139,94,52,0.06)',
  ink: '#3a2a1a',
  inkSoft: '#5a4630',
  inkFaint: '#7a6448',
  border: '#8b5e34',
  borderSoft: 'rgba(139,94,52,0.35)',
  seal: '#a8291f',
  sealDark: '#7c1d16',
  gold: '#a3782e',
};

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

  const frontSlots = [0, 1, 2].filter(i => patternGrid[i] === 1);
  const backSlots = [3, 4, 5].filter(i => patternGrid[i] === 1);

  const remaining = [...setupHeroes];

  [...remaining].forEach(hero => {
    const heroName = typeof hero === 'string' ? hero : hero?.general_name;
    if (!heroName) return;
    const genObj = generalsList.find(g => g.name === heroName);
    const pos = genObj?.position || '균형';

    if (pos === '전열' && frontSlots.length) {
      grid[frontSlots.shift()] = heroName;
      remaining.splice(remaining.indexOf(hero), 1);
    } else if (pos === '후열' && backSlots.length) {
      grid[backSlots.shift()] = heroName;
      remaining.splice(remaining.indexOf(hero), 1);
    }
  });

  remaining.forEach(hero => {
    const heroName = typeof hero === 'string' ? hero : hero?.general_name;
    if (!heroName) return;
    if (frontSlots.length) grid[frontSlots.shift()] = heroName;
    else if (backSlots.length) grid[backSlots.shift()] = heroName;
  });

  return grid;
};

const getAssignedTacticsMap = (squads) => {
  const map = new Map();
  if (!squads || !Array.isArray(squads)) return map;

  squads.forEach(squad => {
    if (!squad.setup) return;
    squad.setup.forEach(hero => {
      if (!hero.tactics) return;
      hero.tactics.forEach(t => {
        const tacName = typeof t === 'string' ? t.trim() : t?.name?.trim();
        if (tacName) {
          map.set(tacName, {
            squadNum: squad.squadNum,
            generalName: hero.general_name
          });
        }
      });
    });
  });

  return map;
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

const evaluateFormationFit = (squadSetup, formation, generalsList) => {
  if (!squadSetup || !formation || !generalsList) return 50;

  let score = 50;
  const formName = formation.name || '';
  const formEffect = formation.effect || '';

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

  squadSetup.forEach((hero) => {
    const gen = generalsList.find(g => g.name === hero.general_name);
    if (!gen) return;

    const pos = gen.position || '균형';
    const mainStat = gen.main_stat || gen.stat_focus || '';
    const role = gen.preferred_tactic_type || gen.primary_role || '';

    if (pos === '전열' && frontCount >= 1) score += 10;
    if (pos === '후열' && backCount >= 1) score += 10;

    if (formName.includes('추형') || formEffect.includes('방어') || formEffect.includes('피해 감소') || formEffect.includes('통솔')) {
      if (pos === '전열' && (mainStat.includes('통솔') || role.includes('방어') || role.includes('탱'))) {
        score += 15;
      }
    }

    if (formName.includes('안형') || formEffect.includes('피해 증가') || formEffect.includes('책략')) {
      if (pos === '후열' && (mainStat.includes('지력') || mainStat.includes('무력') || role.includes('딜') || role.includes('공격') || role.includes('책략'))) {
        score += 15;
      }
    }

    if (formName.includes('극형') || formEffect.includes('발동률') || formEffect.includes('회심') || formEffect.includes('연타')) {
      if (role.includes('액티브') || role.includes('추격') || role.includes('회심') || role.includes('공격') || mainStat.includes('무력')) {
        score += 12;
      }
    }

    if (formName.includes('방형') || formEffect.includes('회복') || formEffect.includes('지원')) {
      if (role.includes('힐') || role.includes('버프') || role.includes('지원')) {
        score += 10;
      }
    }
  });

  return Math.min(100, Math.max(30, score));
};

// 숫자를 한자 조(條) 번호로
const HANJA_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export default function SquadsPage() {
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

  const [userNickname, setUserNickname] = useState('백정');

  useEffect(() => {
    const fetchUserNickname = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('프로필 조회 실패:', error.message);
          return;
        }

        if (profile && profile.nickname) {
          setUserNickname(profile.nickname);
        }
      } catch (err) {
        console.error('닉네임 로드 중 예외 발생:', err);
      }
    };

    fetchUserNickname();
  }, []);

  const [formations, setFormations] = useState([]);
  const {
    generals = [],
    tactics = [],
    tierDecks = [],
    isLoading,
    selectedGenerals = [],
    selectedTactics = []
  } = useDeckAssets();

  const [synergies, setSynergies] = useState([]);
  const [recommendedSquads, setRecommendedSquads] = useState([]);
  const [editingTacticTarget, setEditingTacticTarget] = useState(null);
  const [connections, setConnections] = useState([]);
  const [needMoreGenerals, setNeedMoreGenerals] = useState(false);

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
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        alert('로그인이 필요합니다.');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ squads: recommendedSquads })
        .eq('id', user.id);

      if (error) {
        console.error('스쿼드 저장 실패:', error);
        alert('저장 중 오류가 발생했습니다: ' + error.message);
      } else {
        alert('1~5군 부대 편성이 성공적으로 저장되었습니다!');
      }
    } catch (err) {
      console.error('저장 예외 발생:', err);
      alert('저장 처리 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: synData } = await supabase.from('synergies').select('*');
        if (synData) setSynergies(synData);

        const { data: connData, error: connErr } = await supabase
          .from('general_connections')
          .select('*');

        if (connErr) {
          console.error('Connections 불러오기 실패:', connErr);
        } else if (connData) {
          setConnections(connData);
        }

        const { data: formationData, error: formErr } = await supabase
          .from('formations')
          .select('*');

        if (formErr) {
          console.error('Formations 불러오기 실패:', formErr);
        } else if (formationData) {
          setFormations(formationData);
        }

      } catch (error) {
        console.error('데이터 페칭 중 예외 발생:', error);
      }
    }

    fetchData();
  }, []);

  useEffect(() => {
    async function loadSavedSquads() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('profiles')
        .select('squads')
        .eq('id', user.id)
        .single();

      if (data && data.squads && data.squads.length > 0) {
        setRecommendedSquads(data.squads);
      }
    }

    loadSavedSquads();
  }, []);

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

  const getActiveTroopFactionBonuses = (heroNames, generalsList) => {
    if (!heroNames || !generalsList) return [];

    const genObjs = heroNames
      .map(name => generalsList.find(g => g.name === name?.trim()))
      .filter(Boolean);

    const bonuses = [];

    const troopCounts = {};
    genObjs.forEach(g => { if (g.troop_type) troopCounts[g.troop_type] = (troopCounts[g.troop_type] || 0) + 1; });
    Object.entries(troopCounts).forEach(([troop, count]) => {
      if (count >= 2 && TROOP_BONUS_RULES[troop]) {
        const tier = count >= 3 ? 3 : 2;
        bonuses.push({ type: 'troop', label: `${troop} ${tier}명`, effect: TROOP_BONUS_RULES[troop][tier] });
      }
    });

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

    return matched || { name: '추형진', effect: '전열 주는 피해 증가, 후열 받는 피해 감소' };
  };

  const handleGeneralChange = (squadId, heroIndex, newGeneralName) => {
    const newGenObj = generals.find(g => g.name === newGeneralName);

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
    const targetTacticObj = tactics.find(t => t.name?.trim() === newTacticName);

    if (!targetTacticObj || !selectedTactics.includes(targetTacticObj.id)) {
      alert('보유하지 않은 전법은 장착할 수 없습니다.');
      return;
    }

    setRecommendedSquads(prevSquads => prevSquads.map(squad => {
      if (squad.id !== squadId) return squad;

      const newSetup = [...squad.setup];
      const targetHero = { ...newSetup[heroIndex] };
      const assignedGenObj = generals.find(g => g.name === targetHero.general_name);

      const newScore = targetTacticObj && evaluateTacticFit 
        ? evaluateTacticFit(assignedGenObj, targetTacticObj) 
        : 50;

      const newTactics = [...targetHero.tactics];
      newTactics[tacticIndex] = {
        name: newTacticName,
        isOwned: selectedTactics.includes(targetTacticObj?.id),
        isAlternative: true,
        score: newScore,
        isManual: true
      };

      targetHero.tactics = newTactics;
      newSetup[heroIndex] = targetHero;

      return { ...squad, setup: newSetup };
    }));

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
        main_tactics: mainTactics,
        db_sub_tactics: dbSubTactics,
      });
    }
    return heroes;
  };

  useEffect(() => {
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

    for (let i = 0; i < tierDecks.length && squads.length < 5; i++) {
      const deck = tierDecks[i];
      const parsedHeroes = parseDeckSetup(deck);
      if (parsedHeroes.length === 0) continue;

      const squadSetup = parsedHeroes.map(hero => {
        const targetName = hero.general_name;
        const isOwned = myGenNames.includes(targetName) && !usedGenerals.has(targetName);

        let assignedGen = isOwned 
          ? myGenerals.find(g => g.name?.trim() === targetName)
          : myGenerals.find(g => !usedGenerals.has(g.name?.trim()));

        if (!assignedGen) hasEmptySlot = true;

        if (assignedGen) usedGenerals.add(assignedGen.name?.trim());

        const processedTactics = hero.main_tactics.map(tName => {
          const isTactOwned = myTactNames.includes(tName) && !usedTacticsInSquads.has(tName);

          if (isTactOwned) {
            usedTacticsInSquads.add(tName);
            const tacticObj = myTactics.find(t => t.name?.trim() === tName);
            const score = evaluateTacticFit ? evaluateTacticFit(assignedGen, tacticObj) : 85;
            
            return {
              name: tName,
              isOwned: true,
              isAlternative: false,
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
                score: maxScore
              };
            }

            return {
              name: tName,
              isOwned: false,
              isAlternative: false,
              score: 0
            };
          }
        });

        return {
          general_name: assignedGen?.name || targetName,
          image_url: assignedGen?.image_url || '/images/generals/default.jpg',
          isSubstituted: !isOwned,
          stat_focus: hero.stat_focus,
          tactics: processedTactics
        };
      });

      const rawFormationNumGrid = deck.formation ? deck.formation.split(',').map(Number) : [0, 1, 0, 0, 1, 1];
      const formationInfo = matchFormationInfo(rawFormationNumGrid);
      const initialNamedGrid = calculateAutoFormationGrid(squadSetup, generals);

      squads.push({
        id: deck.id || i,
        squadNum: squads.length + 1,
        deck_name: deck.deck_name || `${squads.length + 1}군 추천 부대`,
        formationGrid: initialNamedGrid, 
        formationInfo: formationInfo,
        setup: squadSetup
      });
    }

    setRecommendedSquads(squads);
    setNeedMoreGenerals(hasEmptySlot || squads.length < 5);
  }, [isLoading, tierDecks, generals, tactics, selectedGenerals, selectedTactics]);

  const assignedTacticsMap = getAssignedTacticsMap(recommendedSquads);

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

      let score = evaluateTacticFit ? evaluateTacticFit(targetHeroObj, tac) : 50;
      const similarityBonus = getTacticSimilarityScore(originalTacticObj, tac);
      score += similarityBonus;

      const isRec = recommendedList.some(r => r?.trim() === tac.name?.trim());
      const isAlternative = !isRec && similarityBonus > 0;

      return {
        ...tac,
        isOwned,
        isOccupied,
        assignedInfo,
        score,
        isRec,
        isAlternative
      };
    }).sort((a, b) => {
      if (a.isRec && !b.isRec) return -1;
      if (!a.isRec && b.isRec) return 1;
      return b.score - a.score;
    });
  })();

  if (isLoading) {
    return (
      <PageLayout>
        <div style={{ padding: '40px', textAlign: 'center', marginTop: '60px' }}>
          <h2>1-5군 최적의 출진 배치를 계산하고 있습니다...</h2>
        </div>
      </PageLayout>
    );
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        
        <nav className="classic-tabbar" style={{ marginBottom: '35px' }}>
          <Link href="/?tab=my-assets" className="classic-tab">
            나의 보유 현황
          </Link>
          <Link href="/?tab=dictionary" className="classic-tab">
            통합 도감
          </Link>
          <Link href="/matches" className="classic-tab">
            티어덱 매칭
          </Link>
          <span className="classic-tab active">
            1-5군 추천 편성
          </span>
          <Link href="/vs" className="classic-tab">⚔️ 모의 대결</Link>
        </nav>

        {needMoreGenerals && (
          <div style={{ color: '#a81c1c', fontWeight: 'bold', marginBottom: '10px' }}>
            ⚠️ 5군덱까지 완성하려면 장수가 더 필요합니다.
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 className="classic-heading text-3xl font-bold">⚔️ 1-5군 최적 추천 & 수동 편성</h1>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleSaveSquads}
              className="px-3 py-1.5 bg-[#3f0f0f] hover:bg-[#591616] text-amber-100 font-semibold rounded border border-[#7f1d1d] shadow-md transition-colors flex items-center gap-1.5"
              style={{ fontSize: '0.85rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M7.707 10.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586l-1.293-1.293z" />
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2a1 1 0 11-2 0V4H7v2a1 1 0 11-2 0V4z" />
                <path d="M3 9a2 2 0 012-2h1a1 1 0 110 2H5v7h10V9h-1a1 1 0 110-2h1a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
              편성 저장
            </button>

            <button
              onClick={handleDownloadImage}
              style={{
                backgroundColor: SCROLL.seal,
                color: '#fdf6e3',
                padding: '6px 12px',
                border: `2px solid ${SCROLL.gold}`,
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              📜 칙서 발행 (이미지 저장)
            </button>
          </div>
        </div>

        {/* ============================================================
            📜 [캡처 영역] 출정칙서 — 양피지 한 장 전체
        ============================================================ */}
        <div
          ref={exportRef}
          style={{
            position: 'relative',
            background: `linear-gradient(180deg, ${SCROLL.paperLight} 0%, ${SCROLL.paperMid} 45%, ${SCROLL.paperLight} 100%)`,
            border: `3px double ${SCROLL.border}`,
            borderRadius: '6px',
            padding: '44px 48px',
            boxShadow: '0 10px 34px rgba(58,42,26,0.35), inset 0 0 90px rgba(139,94,52,0.12)',
            color: SCROLL.ink,
            fontFamily: '"Noto Serif KR", ui-serif, Georgia, serif',
            overflow: 'hidden'
          }}
        >
          {/* 종이결 텍스처 (은은한 얼룩) */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `radial-gradient(circle at 15% 20%, ${SCROLL.paperTexture} 0, transparent 35%),
                               radial-gradient(circle at 85% 15%, ${SCROLL.paperTexture} 0, transparent 30%),
                               radial-gradient(circle at 75% 85%, ${SCROLL.paperTexture} 0, transparent 35%),
                               radial-gradient(circle at 25% 90%, ${SCROLL.paperTexture} 0, transparent 30%)`
          }} />
          {/* 얇은 이중 테두리 (족자 느낌) */}
          <div style={{
            position: 'absolute', inset: '10px', border: `1px solid ${SCROLL.borderSoft}`,
            borderRadius: '3px', pointerEvents: 'none'
          }} />

          {/* ---------------- 머리말: 세로 제목 + 직인 ---------------- */}
          <div style={{
            position: 'relative', zIndex: 1,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            borderBottom: `2px solid ${SCROLL.border}`, paddingBottom: '22px', marginBottom: '30px'
          }}>
            {/* 세로 제목 */}
            <div style={{
              writingMode: 'vertical-rl', textOrientation: 'upright',
              fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.2em',
              color: SCROLL.sealDark, flexShrink: 0, marginRight: '20px', lineHeight: 1.3
            }}>
              出征勅書
            </div>

            {/* 중앙 제목 & 설명 */}
            <div style={{ flex: 1, textAlign: 'center', paddingTop: '6px' }}>
              <h2 style={{ fontSize: '1.55rem', fontWeight: 900, letterSpacing: '0.08em', margin: 0 }}>
                천하평정 출정칙서
              </h2>
              <p style={{ fontSize: '0.85rem', color: SCROLL.inkSoft, marginTop: '10px', lineHeight: 1.6 }}>
                {userNickname} 님의 보유 장수와 전법을 헤아려 아래와 같이 一軍부터 五軍까지의<br />
                출진을 명하니, 각 군은 정한 진형과 배치를 따라 천하를 평정하라.
              </p>
              <p style={{ fontSize: '0.75rem', color: SCROLL.inkFaint, marginTop: '8px' }}>
                반포일 · {dateStr}
              </p>
            </div>

            {/* 낙관형 직인 */}
            <div style={{ flexShrink: 0, marginLeft: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '76px', height: '76px',
                border: `3px solid ${SCROLL.seal}`,
                borderRadius: '4px',
                backgroundColor: 'rgba(168,41,31,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'rotate(-3deg)',
                boxShadow: '0 2px 6px rgba(124,29,22,0.25)'
              }}>
                <span style={{
                  writingMode: 'vertical-rl', textOrientation: 'upright',
                  fontSize: '1rem', fontWeight: 900, color: SCROLL.seal, letterSpacing: '0.1em'
                }}>
                  {userNickname || '맹원'}印
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: SCROLL.inkFaint, marginTop: '6px' }}>발행인 직인</span>
            </div>
          </div>

          {/* ---------------- 조항 (1~5군) ---------------- */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            {recommendedSquads.map((squad, index) => {
              const currentHeroNames = squad.setup.map(h => h.general_name);
              const activeSynergies = getActiveSynergies(currentHeroNames);
              const activeConnections = getActiveConnections(currentHeroNames);
              const formationInfo = squad.formationInfo || getMatchedFormation(squad.formationGrid?.join(','), formations);
              const activeTroopFactionBonuses = getActiveTroopFactionBonuses(currentHeroNames, generals);

              return (
                <section
                  key={squad.id || index}
                  style={{
                    marginBottom: '30px',
                    paddingBottom: '28px',
                    borderBottom: index < recommendedSquads.length - 1 ? `1px dashed ${SCROLL.borderSoft}` : 'none'
                  }}
                >
                  {/* 조항 제목 */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '14px' }}>
                    <span style={{
                      fontSize: '1.1rem', fontWeight: 900, color: SCROLL.seal,
                      fontFamily: 'ui-serif, Georgia, serif'
                    }}>
                      第{HANJA_NUM[index] || index + 1}條
                    </span>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: SCROLL.ink }}>
                      {squad.id || index + 1}군 — {squad.deck_name || `${index + 1}군 추천 부대`}
                    </h3>
                  </div>

                  {/* 진형 정보 */}
                  <div style={{
                    marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: 'rgba(139,94,52,0.08)', padding: '12px 16px',
                    border: `1px solid ${SCROLL.borderSoft}`, borderRadius: '4px'
                  }}>
                    <div style={{ flex: 1, marginRight: '15px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          backgroundColor: SCROLL.seal, padding: '4px 10px', color: '#fdf6e3',
                          fontWeight: 'bold', fontSize: '0.85rem', borderRadius: '3px'
                        }}>
                          진형
                        </span>

                        <select
                          value={formationInfo.id || ''}
                          onChange={(e) => handleFormationChange(squad.id, e.target.value)}
                          style={{
                            padding: '4px 8px', fontWeight: 'bold', border: `1px solid ${SCROLL.border}`,
                            borderRadius: '4px', backgroundColor: SCROLL.paperLight, color: SCROLL.ink
                          }}
                        >
                          {formations.map(f => {
                            const fitScore = evaluateFormationFit(squad.setup, f, generals);
                            return (
                              <option key={f.id} value={f.id} style={{ backgroundColor: SCROLL.paperLight, color: SCROLL.ink }}>
                                {f.name} (적합도: {fitScore}점)
                              </option>
                            );
                          })}
                        </select>

                        <span style={{
                          backgroundColor: 'rgba(163,120,46,0.18)', color: SCROLL.gold,
                          border: `1px solid ${SCROLL.gold}`, padding: '4px 10px', borderRadius: '4px',
                          fontWeight: '900', fontSize: '0.85rem'
                        }}>
                          적합도 {evaluateFormationFit(squad.setup, formationInfo, generals)}점
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: SCROLL.inkSoft, marginTop: '4px' }}>
                        <strong style={{ color: SCROLL.seal }}>효과:</strong> {formationInfo.effect}
                      </div>
                    </div>

                    <FormationGridVisual
                      gridData={squad.formationGrid || calculateAutoFormationGrid(squad.setup, generals)}
                      onCellClick={(clickedIdx) => handleGridCellClick(squad.id, clickedIdx)}
                    />
                  </div>

                  {/* 인연/연의/조합 효과 */}
                  {(activeSynergies.length > 0 || activeConnections.length > 0 || activeTroopFactionBonuses.length > 0) && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px',
                      backgroundColor: 'rgba(139,94,52,0.05)', border: `1px solid ${SCROLL.borderSoft}`, borderRadius: '4px'
                    }}>
                      <div style={{
                        fontSize: '0.75rem', color: SCROLL.inkFaint, borderBottom: `1px dashed ${SCROLL.borderSoft}`,
                        paddingBottom: '6px', marginBottom: '2px'
                      }}>
                        ℹ️ 연의 효과는 인게임 공식 데이터가 아니며, 천하결전 카페 패밀리맨74님이 제안하신 커뮤니티 해석 자료를 반영한 것입니다.
                      </div>

                      {activeSynergies.map((syn, synIdx) => (
                        <div key={`syn-${synIdx}`} style={{ fontSize: '0.88rem', color: SCROLL.sealDark }}>
                          🔗 [인연] <strong>{syn.name}</strong> ({syn.req_count}인): {syn.effect}
                        </div>
                      ))}

                      {activeConnections.map((conn, connIdx) => (
                        <div key={`conn-${connIdx}`} style={{
                          fontSize: '0.88rem', color: '#2f5c2f', backgroundColor: 'rgba(47,92,47,0.08)',
                          padding: '6px 10px', borderRadius: '4px', border: '1px solid rgba(47,92,47,0.25)'
                        }}>
                          ⚡ [연의 관계] <strong>{conn.leader_name} → {conn.follower_name}</strong> |
                          제공: <em>{conn.provides}</em> |
                          효과: <strong>{conn.follower_effect}</strong>
                        </div>
                      ))}

                      {activeTroopFactionBonuses.map((bonus, bIdx) => (
                        <div key={`troop-${bIdx}`} style={{
                          fontSize: '0.88rem', color: SCROLL.gold, backgroundColor: 'rgba(163,120,46,0.1)',
                          border: `1px solid ${SCROLL.gold}`, padding: '6px 10px', borderRadius: '4px', fontWeight: 'bold'
                        }}>
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

                      // 진영 배경/테두리 — 양피지 톤에 맞춘 은은한 색
                      const FACTION_COLORS = {
                        '위': 'rgba(51,73,110,0.08)',
                        '촉': 'rgba(45,90,55,0.08)',
                        '오': 'rgba(139,41,31,0.08)',
                        '군': 'rgba(163,120,46,0.1)',
                      };

                      const FACTION_BORDER_COLORS = {
                        '위': '#33496e',
                        '촉': '#2d5a37',
                        '오': SCROLL.seal,
                        '군': SCROLL.gold,
                      };

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

                      const currentGen = generals.find(g => g.name === hero.general_name);

                      return (
                        <div key={hIdx} style={{
                          padding: '16px',
                          border: `1.5px solid ${FACTION_BORDER_COLORS[currentGen?.faction] || SCROLL.border}`,
                          backgroundColor: FACTION_COLORS[currentGen?.faction] || 'rgba(139,94,52,0.05)',
                          borderRadius: '6px'
                        }}>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ width: '52px', height: '52px', border: `2px solid ${SCROLL.gold}`, borderRadius: '4px', flexShrink: 0, overflow: 'hidden' }}>
                              <img
                                src={hero.image_url || '/images/generals/default.jpg'}
                                alt={hero.general_name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                onError={(e) => { e.target.src = '/images/generals/default.jpg'; }}
                              />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <select
                                value={hero.general_name}
                                onChange={(e) => handleGeneralChange(squad.id, hIdx, e.target.value)}
                                style={{
                                  width: '100%', padding: '6px 8px', fontWeight: 'bold', fontSize: '0.95rem',
                                  border: `1px solid ${SCROLL.border}`, borderRadius: '4px',
                                  backgroundColor: SCROLL.paperLight, color: SCROLL.ink, cursor: 'pointer'
                                }}
                              >
                                {generals
                                  .filter(g => selectedGenerals.includes(g.id))
                                  .filter(g => !otherHeroNamesInSquad.includes(g.name))
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
                                          backgroundColor: SCROLL.paperLight,
                                          fontWeight: (isSynergyTarget || isFactionMatch) ? 'bold' : 'normal',
                                          color: isSynergyTarget
                                            ? SCROLL.seal
                                            : isFactionMatch
                                            ? SCROLL.sealDark
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
                                  <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: SCROLL.seal, fontWeight: 'bold' }}>🚩 추천 위치:</span>
                                    <span style={{
                                      backgroundColor: currentGen.position === '전열' ? 'rgba(139,41,31,0.12)' : 'rgba(51,73,110,0.12)',
                                      color: currentGen.position === '전열' ? SCROLL.seal : '#33496e',
                                      border: `1px solid ${currentGen.position === '전열' ? SCROLL.seal : '#33496e'}`,
                                      padding: '1px 7px', borderRadius: '4px', fontWeight: '800'
                                    }}>
                                      {currentGen.position}
                                    </span>
                                  </div>
                                )}

                                {currentGen?.main_stat && (
                                  <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: SCROLL.gold, fontWeight: 'bold' }}>✨ 추천 속성:</span>
                                    <span style={{ backgroundColor: 'rgba(163,120,46,0.12)', color: SCROLL.gold, border: `1px solid ${SCROLL.gold}`, padding: '1px 7px', borderRadius: '4px', fontWeight: '800' }}>
                                      {currentGen.main_stat}
                                    </span>
                                  </div>
                                )}

                                {currentGen?.troop_type && (
                                  <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: '#a05a1e', fontWeight: 'bold' }}>⚔️ 병종:</span>
                                    <span style={{ backgroundColor: 'rgba(160,90,30,0.12)', color: '#a05a1e', border: '1px solid rgba(160,90,30,0.4)', padding: '1px 7px', borderRadius: '4px', fontWeight: '800' }}>
                                      {currentGen.troop_type}
                                    </span>
                                  </div>
                                )}

                                {currentGen?.recommended_equip_stats && (
                                  <div style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: '#2d5a37', fontWeight: 'bold' }}>🛡️ 장비 가이드:</span>
                                    <span style={{ backgroundColor: 'rgba(45,90,55,0.1)', color: '#2d5a37', border: '1px solid rgba(45,90,55,0.4)', padding: '1px 7px', borderRadius: '4px', fontWeight: '800' }}>
                                      {currentGen.recommended_equip_stats}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div style={{ borderTop: `1px solid ${SCROLL.borderSoft}`, paddingTop: '10px', marginTop: '6px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: '800', marginBottom: '8px', color: SCROLL.seal, letterSpacing: '0.05em' }}>
                              ⚔️ 장착 전법 (클릭 교체)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {hero.tactics.map((t, tIdx) => (
                                <div
                                  key={tIdx}
                                  onClick={() => setEditingTacticTarget({
                                    squadId: squad.id,
                                    heroIndex: hIdx,
                                    tacticIndex: tIdx,
                                    currentHeroName: hero.general_name
                                  })}
                                  style={{
                                    cursor: 'pointer', padding: '7px 10px', borderRadius: '4px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    border: t.isManual ? `1px solid ${SCROLL.gold}` : `1px solid ${SCROLL.borderSoft}`,
                                    backgroundColor: t.isManual ? 'rgba(163,120,46,0.12)' : 'rgba(139,94,52,0.04)',
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                                  }}
                                  title="클릭 시 적합도 점수순 선택창 표시"
                                >
                                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: SCROLL.ink }}>
                                    {t.name} {t.isManual && <span style={{ fontSize: '0.7rem', color: SCROLL.gold }}>(수동)</span>}
                                  </span>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: SCROLL.seal, backgroundColor: 'rgba(168,41,31,0.1)', padding: '2px 6px', borderRadius: '4px', border: `1px solid rgba(168,41,31,0.3)` }}>
                                    {t.score}점 ✏️
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* ---------------- 하단 낙관 (반포 확인) ---------------- */}
          <div style={{
            position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'flex-end',
            alignItems: 'center', gap: '14px', marginTop: '10px', paddingTop: '18px',
            borderTop: `1px solid ${SCROLL.borderSoft}`
          }}>
            <span style={{ fontSize: '0.8rem', color: SCROLL.inkFaint }}>
              본 칙서는 {userNickname} 님의 명의로 반포됨
            </span>
            <div style={{
              width: '44px', height: '44px', border: `2px solid ${SCROLL.seal}`, borderRadius: '4px',
              backgroundColor: 'rgba(168,41,31,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: 'rotate(4deg)'
            }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: SCROLL.seal }}>畢</span>
            </div>
          </div>

          {/* 💡 전법 선택 모달 */}
          {editingTacticTarget && (
            <div onClick={() => setEditingTacticTarget(null)}
              style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(58,42,26,0.55)', display: 'flex',
                justifyContent: 'center', alignItems: 'center', zIndex: 1000,
                backdropFilter: 'blur(4px)'
              }}>
              <div onClick={(e) => e.stopPropagation()} style={{
                backgroundColor: SCROLL.paperLight, padding: '24px', maxWidth: '560px',
                width: '90%', maxHeight: '80vh', overflowY: 'auto',
                border: `2px solid ${SCROLL.border}`, borderRadius: '10px', boxShadow: '0 0 25px rgba(58,42,26,0.5)',
                color: SCROLL.ink, fontFamily: '"Noto Serif KR", ui-serif, Georgia, serif'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '4px', color: SCROLL.seal }}>
                  ⚔️ [{editingTacticTarget.currentHeroName}] 전법 선택 및 대체 추천
                </h3>
                <p style={{ fontSize: '0.8rem', color: SCROLL.inkFaint, marginBottom: '16px' }}>
                  * 다른 군단 장수가 이미 장착한 전법은 선택이 제한될 수 있습니다.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sortedTacticsForModal.map(tac => (
                    <button
                      key={tac.id}
                      disabled={!tac.isOwned || tac.isOccupied}
                      onClick={() => handleTacticChange(tac.name)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '5px',
                        border: tac.isOccupied ? `1px solid ${SCROLL.borderSoft}` : tac.isRec ? `2px solid ${SCROLL.gold}` : `1px solid ${SCROLL.border}`,
                        backgroundColor: tac.isOccupied ? 'rgba(139,94,52,0.08)' : tac.isRec ? 'rgba(163,120,46,0.15)' : tac.isAlternative ? 'rgba(45,90,55,0.1)' : SCROLL.paperMid,
                        opacity: (!tac.isOwned || tac.isOccupied) ? 0.5 : 1,
                        cursor: (!tac.isOwned || tac.isOccupied) ? 'not-allowed' : 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: tac.isOccupied ? SCROLL.inkFaint : SCROLL.ink }}>
                          {tac.isRec && '⭐ '}
                          {tac.isAlternative && '🔄 '}
                          {tac.name}
                        </span>

                        <span style={{ fontSize: '0.75rem', marginLeft: '8px' }}>
                          {tac.isOccupied ? (
                            <strong style={{ color: SCROLL.seal }}>[{tac.assignedInfo.squadNum}군 {tac.assignedInfo.generalName} 착용 중]</strong>
                          ) : tac.isRec ? (
                            <span style={{ color: SCROLL.gold }}>[공식 추천]</span>
                          ) : tac.isAlternative ? (
                            <span style={{ color: '#2d5a37' }}>[대체 메커니즘 전법]</span>
                          ) : (
                            <span style={{ color: SCROLL.inkFaint }}>{tac.isOwned ? '[보유]' : '[미보유]'}</span>
                          )}
                        </span>
                      </div>

                      <span style={{ fontWeight: '900', color: tac.isOccupied ? SCROLL.inkFaint : SCROLL.seal, fontSize: '0.9rem' }}>
                        {tac.score}점
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setEditingTacticTarget(null)}
                  style={{
                    marginTop: '18px', width: '100%', padding: '10px',
                    backgroundColor: SCROLL.seal, color: '#fdf6e3', border: 'none',
                    borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
