'use client';
import { useState, useEffect, useRef } from 'react'; // useRef 추가
import html2canvas from 'html2canvas'; // 추가
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import FormationGridVisual from '../components/FormationGridVisual';
import { useDeckAssets } from '../../hooks/useDeckAssets';
import { matchFormationInfo } from '../../data/synergies';
import { evaluateTacticFit } from '../../utils/squadEngine';
import { supabase } from '../lib/supabaseClient';

const calculateAutoFormationGrid = (setupHeroes, generalsList = []) => {
  const grid = ['', '', '', '', '', ''];

  if (!setupHeroes || !Array.isArray(setupHeroes)) return grid;

  setupHeroes.forEach((hero, index) => {
    // 장수 이름 추출 (객체 형태 또는 문자열 형태 모두 대응)
    const heroName = typeof hero === 'string' ? hero : hero?.general_name;
    if (!heroName) return;

    const col = index % 3; 
    const frontIdx = col;     // 전열 (0, 1, 2)
    const backIdx = col + 3;  // 후열 (3, 4, 5)

    const genObj = Array.isArray(generalsList) ? generalsList.find(g => g.name === heroName) : null;
    const pos = genObj?.position || '균형';

    if (pos === '전열') {
      if (!grid[frontIdx]) grid[frontIdx] = heroName;
      else if (!grid[backIdx]) grid[backIdx] = heroName;
    } else if (pos === '후열') {
      if (!grid[backIdx]) grid[backIdx] = heroName;
      else if (!grid[frontIdx]) grid[frontIdx] = heroName;
    } else {
      // 균형 장수인 경우: 슬롯 순서에 맞춰 기본 배치
      if (!grid[frontIdx]) grid[frontIdx] = heroName;
      else if (!grid[backIdx]) grid[backIdx] = heroName;
    }
  });

  return grid;
};

// 1. 부대 내 전법 점유 상태 추적 헬퍼 함수
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

// 2. 현재 부대의 장수들과 연의 관계(Connection)가 존재하는 장수인지 판별
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

// 3. 원본 전법과 후보 전법 간 메커니즘 유사도 가산점 연산 함수
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

// 4. 세 장수 이름의 첫 글자를 따서 덱 이름을 조합하는 함수 (예: 감녕, 노숙, 손책 -> 감노손덱)
const generateSquadName = (setup, defaultName) => {
  if (!setup || setup.length === 0) return defaultName;
  
  const initials = setup
    .map(h => h.general_name?.trim()?.[0] || '')
    .filter(Boolean)
    .join('');

  return initials ? `${initials}덱` : defaultName;
};

export default function SquadsPage() {
  
  const exportRef = useRef(null); // 📜 이미지로 저장할 영역 레퍼런스

  // 📸 출정칙서 이미지 저장 핸들러
  const handleDownloadImage = async () => {
    if (!exportRef.current) return;

    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: '#f4efe6', // 한지 느낌 배경색 유지 (var(--paper))
        scale: 2, // 고해상도 (클리어한 텍스트 & 이미지)
        useCORS: true, // 외부에 있는 장수 이미지 교차 출처 허용
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `출정칙서_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (err) {
      console.error('❌ 출정칙서 이미지 저장 실패:', err);
    }
  };

  // 기본값을 '잠호'로 세팅
const [userNickname, setUserNickname] = useState('백정');

useEffect(() => {
  const fetchUserNickname = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Supabase profiles 테이블에서 nickname 컬럼만 안전하게 조회
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
  const [currentFormationGrid, setCurrentFormationGrid] = useState(['', '', '', '', '', '']);
  const {
    generals = [],
    tactics = [],
    tierDecks = [],
    isLoading,
    selectedGenerals = [],
    selectedTactics = []
  } = useDeckAssets();

  const [synergies, setSynergies] = useState([]); // 인연 데이터
  const [recommendedSquads, setRecommendedSquads] = useState([]); // 1-5군 군단
  const [editingTacticTarget, setEditingTacticTarget] = useState(null); // { squadId, heroIndex, tacticIndex, currentHeroName }
  const [connections, setConnections] = useState([]); // Connection 데이터 State

  // 💡 각 부대별 전/후열 위치 수동 교체 핸들러
const handleGridCellClick = (squadId, clickedIdx) => {
  setRecommendedSquads(prev => prev.map(squad => {
    if (squad.id !== squadId) return squad;

    const currentGrid = Array.isArray(squad.formationGrid) 
      ? [...squad.formationGrid] 
      : ['', '', '', '', '', ''];

    const targetIdx = clickedIdx < 3 ? clickedIdx + 3 : clickedIdx - 3; // 전열 ↔ 후열 스와프

    // 위치 맞바꾸기
    const temp = currentGrid[clickedIdx];
    currentGrid[clickedIdx] = currentGrid[targetIdx];
    currentGrid[targetIdx] = temp;

    return {
      ...squad,
      formationGrid: currentGrid
    };
  }));
};

// 스퀘어 페이지 컴포넌트 내부

const handleSaveSquads = async () => {
  try {
    // 1. 현재 로그인한 유저 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      alert('로그인이 필요합니다.');
      return;
    }

    // 2. profiles 테이블의 squads 컬럼에 현재 1~5군 데이터(recommendedSquads) 저장
    const { error } = await supabase
      .from('profiles')
      .update({ squads: recommendedSquads }) // 👈 recommendedSquads 변수명으로 변경
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

  // Supabase 데이터 페칭
  useEffect(() => {
    async function fetchData() {
      try {
        const { data: synData } = await supabase.from('synergies').select('*');
        if (synData) setSynergies(synData);

        const { data: connData, error: connErr } = await supabase
          .from('general_connections')
          .select('*');

        if (connErr) {
          console.error('❌ Connections 불러오기 실패:', connErr);
        } else if (connData) {
          setConnections(connData);
        }

        const { data: formationData, error: formErr } = await supabase
          .from('formations')
          .select('*');

        if (formErr) {
          console.error('❌ Formations 불러오기 실패:', formErr);
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

    const { data, error } = await supabase
      .from('profiles')
      .select('squads')
      .eq('id', user.id)
      .single();

    // DB에 저장된 squads 데이터가 있으면 주에 세팅
    if (data && data.squads && data.squads.length > 0) {
      setRecommendedSquads(data.squads); // 👈 주석 해제 후 setRecommendedSquads 적용
    }
  }

  loadSavedSquads();
}, []);

  // 🔗 인연(Synergies) 감지 함수
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

  // ⚡ 관계(General Connections) 감지 함수
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

  // Connections 데이터 기반 연의 번호 부여 매핑
  const getGeneralConnectionBadge = (heroName, connectionsList) => {
    if (!connectionsList || connectionsList.length === 0 || !heroName) return '';

    const trimmedName = heroName.trim();
    const matchedNumbers = [];

    connectionsList.forEach((conn, index) => {
      const leader = conn.leader_name?.trim();
      const follower = conn.follower_name?.trim();

      if (leader === trimmedName || follower === trimmedName) {
        matchedNumbers.push(index + 1);
      }
    });

    if (matchedNumbers.length === 0) return '';
    return `[연의 ${matchedNumbers.join(', ')}] `;
  };

  // 🛡️ 진형(Formations) 매칭 함수
  const getMatchedFormation = (formationStr, formationsList) => {
    if (!formationsList || formationsList.length === 0) return { name: '기본 진형', effect: '효과 없음' };
    
    const matched = formationsList.find(f => {
      let gridStr = f.grid;
      if (Array.isArray(gridStr)) gridStr = gridStr.join(',');
      return gridStr === formationStr;
    });

    return matched || { name: '추형진', effect: '전열 주는 피해 증가, 후열 받는 피해 감소' };
  };

  // 장수 직접 변경 핸들러
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

    // 💡 1. 장수 구성에 따른 진형 그리드 자동 재배치
    const newFormationGrid = calculateAutoFormationGrid(newSetup, generals);

    // 💡 2. 동적 군 이름 자동 갱신
    const updatedDeckName = generateSquadName(newSetup, squad.deck_name);

    return { 
      ...squad, 
      setup: newSetup,
      deck_name: updatedDeckName,
      formationGrid: newFormationGrid // 👈 자동 변경된 그리드 연동
    };
  }));
};

// 💡 부대 내 3명 장수와 특정 진형 간의 적합도 점수(0~100점) 계산 함수 (개선판)
const evaluateFormationFit = (squadSetup, formation, generalsList) => {
  if (!squadSetup || !formation || !generalsList) return 50;

  let score = 50; // 기본 점수
  let gridArr = [];

  // 🛡️ 안전한 grid 배열 파싱 및 예외 처리
  try {
    if (Array.isArray(formation.grid)) {
      gridArr = formation.grid;
    } else if (typeof formation.grid === 'string') {
      gridArr = JSON.parse(formation.grid);
    }
  } catch {
    gridArr = [0, 1, 0, 1, 0, 1];
  }

  if (!Array.isArray(gridArr) || gridArr.length === 0) {
    gridArr = [0, 1, 0, 1, 0, 1];
  }

  // 진형의 전열/후열 슬롯 개수 파악
  const frontActiveCount = gridArr.slice(0, 3).filter(v => Number(v) === 1).length;
  const backActiveCount = gridArr.slice(3, 6).filter(v => Number(v) === 1).length;

  const effectText = formation.effect || '';
  const formationName = formation.name || '';

  squadSetup.forEach((hero) => {
    const genObj = generalsList.find(g => g.name === hero.general_name);
    if (!genObj) return;

    const pos = genObj.position || '균형';
    const mainStat = genObj.main_stat || '';
    const role = genObj.primary_role || '';

    // 1. 장수 선호 위치와 진형 구조의 부합도 (+10점)
    if (pos === '전열' && frontActiveCount >= 1) score += 10;
    if (pos === '후열' && backActiveCount >= 1) score += 10;

    // 2. 후열 딜러 시너지 연산 (안형진 등 후열 피해 증가 진형 특화)
    if (effectText.includes('후열') || formationName.includes('안형')) {
      if (pos === '후열') {
        score += 10; // 후열 위치 기본 시너지
        // 지력/무력형 딜러일 경우 피해 증가 시너지 파격 가산 (+15점)
        if (mainStat === '지력' || mainStat === '무력' || role.includes('공격') || role.includes('책략')) {
          score += 15;
        }
      }
    }

    // 3. 전열 방어/탱커 시너지 연산
    if (effectText.includes('전열') || formationName.includes('추형')) {
      if (pos === '전열') {
        if (mainStat === '통솔' || role.includes('방어') || role.includes('지원')) {
          score += 15;
        }
      }
    }

    // 4. 기타 특수 시너지 (회심, 연타 등)
    if (effectText.includes('회심') || effectText.includes('연타')) {
      if (mainStat === '무력' || role.includes('공격')) score += 10;
    }
  });

  return Math.min(100, Math.max(0, score)); // 0~100점 제한
};

// 진형 수동 변경 핸들러
const handleFormationChange = (squadId, targetFormationId) => {
  const selectedForm = formations.find(f => String(f.id) === String(targetFormationId));
  if (!selectedForm) return;

  let parsedGrid = [];
  try {
    parsedGrid = typeof selectedForm.grid === 'string' ? JSON.parse(selectedForm.grid) : selectedForm.grid;
    parsedGrid = parsedGrid.map(Number);
  } catch {
    parsedGrid = [0, 1, 0, 1, 0, 1];
  }

  setRecommendedSquads(prev => prev.map(squad => {
    if (squad.id !== squadId) return squad;

    return {
      ...squad,
      formationGrid: parsedGrid,
      formationInfo: selectedForm
    };
  }));
};

  // 전법 수동 변경 핸들러
  const handleTacticChange = (newTacticName) => {
    if (!editingTacticTarget) return;

    const { squadId, heroIndex, tacticIndex } = editingTacticTarget;
    const targetTacticObj = tactics.find(t => t.name?.trim() === newTacticName);

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

  // 덱 파싱 함수
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

  // 보유 장수/전법 기반 군단 자동 생성
  useEffect(() => {
    if (isLoading || !tierDecks.length) return;

    const myGenerals = generals.filter(g => selectedGenerals.includes(g.id));
    const myGenNames = myGenerals.map(g => g.name?.trim());

    const myTactics = tactics.filter(t => selectedTactics.includes(t.id));
    const myTactNames = myTactics.map(t => t.name?.trim());

    const usedGenerals = new Set();
    const usedTacticsInSquads = new Set();
    const squads = [];

    for (let i = 0; i < tierDecks.length && squads.length < 5; i++) {
      const deck = tierDecks[i];
      const parsedHeroes = parseDeckSetup(deck);
      if (parsedHeroes.length === 0) continue;

      const squadSetup = parsedHeroes.map(hero => {
        const targetName = hero.general_name;
        const isOwned = myGenNames.includes(targetName) && !usedGenerals.has(targetName);

        let assignedGen = isOwned 
          ? myGenerals.find(g => g.name?.trim() === targetName)
          : generals.find(g => !usedGenerals.has(g.name?.trim()));

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

      // 💡 장수 조합 기반 전/후열 자동 그리드 연산 적용
// 💡 숫자 형태의 진형 데이터 추출 (적합도 및 정보 매칭용)
const rawFormationNumGrid = deck.formation ? deck.formation.split(',').map(Number) : [0, 1, 0, 0, 1, 1];
const formationInfo = matchFormationInfo(rawFormationNumGrid);

// 💡 장수 이름이 들어가는 그리드 배열 자동 계산 (처음부터 장수 이름 표시!)
const initialNamedGrid = calculateAutoFormationGrid(squadSetup, generals);

squads.push({
  id: deck.id || i,
  squadNum: squads.length + 1,
  deck_name: deck.deck_name || `${squads.length + 1}군 추천 부대`,
  formationGrid: initialNamedGrid, // 👈 장수 이름 배열로 바로 전달
  formationInfo: formationInfo,
  setup: squadSetup
});
    }

    setRecommendedSquads(squads);
  }, [isLoading, tierDecks, generals, tactics, selectedGenerals, selectedTactics]);

  // 💡 전법 모달용 데이터 정렬 연산
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

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        
        {/* 📌 상단 탭 내비게이션 (다른 주요 페이지와 동일한 스킬/탭 적용) */}
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

      {/* 💡 상단 컨트롤바 (이미지 저장 버튼) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="classic-heading text-3xl font-bold">⚔️ 1-5군 최적 추천 & 수동 편성</h1>
        
        <button
          onClick={handleDownloadImage}
          style={{
            backgroundColor: 'var(--seal)',
            color: '#fff',
            padding: '10px 18px',
            border: '2px solid var(--gold)',
            borderRadius: '6px',
            fontWeight: 'bold',
            fontSize: '0.95rem',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📜 출정칙서 이미지 저장
        </button>

        <button
    onClick={handleSaveSquads}
    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition-colors flex items-center gap-2"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M7.707 10.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586l-1.293-1.293z" />
      <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v2a1 1 0 11-2 0V4H7v2a1 1 0 11-2 0V4z" />
      <path d="M3 9a2 2 0 012-2h1a1 1 0 110 2H5v7h10V9h-1a1 1 0 110-2h1a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    </svg>
    부대 편성 저장하기
  </button>

      </div>

      {/* 📜 [캡처 대상 영역] 출정칙서 전체 컨테이너 */}
      <div 
        ref={exportRef} 
        style={{ 
          padding: '30px', 
          backgroundColor: 'var(--paper)', // 한지 질감 배경
          border: '3px double var(--gold)', 
          borderRadius: '8px',
          position: 'relative'
        }}
      >
        {/* 🏮 칙서 헤더 및 붉은 인장(도장) 영역 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--gold)', paddingBottom: '20px', marginBottom: '25px' }}>
          <div>
            <span style={{ fontSize: '0.9rem', color: 'var(--seal-dark)', fontWeight: 'bold', letterSpacing: '2px' }}>
              【 𝟤𝟢𝟤𝟨 𝖲𝖨𝖭𝖦𝖮𝖪𝖴𝖲𝖧𝖨 𝖢𝖮𝖬𝖬𝖠𝖭𝖣 】
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--ink-text)', marginTop: '4px' }}>
              천하평정 5개 군단 출정칙서 (出征勅書)
            </h2>
          </div>

          {/* 💮 꼬마맹 & 유저 닉네임 붉은 도장(낙관) UI */}
<div style={{
  border: '3px solid #a81c1c',
  color: '#a81c1c',
  padding: '8px 14px',
  borderRadius: '6px',
  fontWeight: 'bold',
  textAlign: 'center',
  backgroundColor: 'rgba(168, 28, 28, 0.05)',
  boxShadow: 'inset 0 0 4px rgba(168, 28, 28, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  transform: 'rotate(-3deg)'
}}>
  <div style={{ fontSize: '12px', borderBottom: '1px solid #a81c1c', paddingBottom: '2px', letterSpacing: '1px' }}>
    꼬마맹
  </div>
  <div style={{ fontSize: '18px', fontWeight: 'bold', marginTop: '4px' }}>
    {userNickname} 印
  </div>
</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          {recommendedSquads.map(squad => {
            const currentHeroNames = squad.setup.map(h => h.general_name);
            const activeSynergies = getActiveSynergies(currentHeroNames);
            const activeConnections = getActiveConnections(currentHeroNames);
            const formationInfo = getMatchedFormation(squad.formationGrid?.join(','), formations);

            return (
              <div key={squad.id} className="scroll-panel" style={{ padding: '24px', border: '1px solid var(--gold)', marginBottom: '25px', backgroundColor: 'var(--paper-soft)' }}>
                
                {/* 군단 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid var(--gold)', paddingBottom: '10px', marginBottom: '15px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>
                    [{squad.squadNum}군] {generateSquadName(squad.setup, squad.deck_name)}
                  </h2>
                </div>

                {/* 🛡️ 통합 군진 UI 영역 */}
                <div style={{ 
                  marginBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  backgroundColor: 'var(--paper)', padding: '12px 16px', border: '1px solid rgba(184,147,90,0.3)', borderRadius: '6px' 
                }}>
                  <div style={{ flex: 1, marginRight: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ backgroundColor: 'var(--seal)', padding: '4px 10px', color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', borderRadius: '4px' }}>
                        군진 선택
                      </span>

                      {/* 진형 드롭다운 */}
                      <select
                        value={formationInfo.id || ''}
                        onChange={(e) => handleFormationChange(squad.id, e.target.value)}
                        style={{ padding: '4px 8px', fontWeight: 'bold', border: '1px solid var(--gold)', borderRadius: '4px', backgroundColor: '#fff' }}
                      >
                        {formations.map(f => {
                          const fitScore = evaluateFormationFit(squad.setup, f, generals);
                          return (
                            <option key={f.id} value={f.id}>
                              {f.name} (적합도: {fitScore}점)
                            </option>
                          );
                        })}
                      </select>

                      {/* 적합도 뱃지 */}
                      <span style={{ backgroundColor: 'rgba(63,93,84,0.15)', color: 'var(--jade)', padding: '4px 10px', borderRadius: '4px', fontWeight: '900', fontSize: '0.85rem' }}>
                        추천 적합도: {evaluateFormationFit(squad.setup, formationInfo, generals)}점
                      </span>
                    </div>

                    <div style={{ fontSize: '0.88rem', color: 'var(--ink-text)', marginTop: '4px' }}>
                      <strong>효과:</strong> {formationInfo.effect}
                    </div>
                  </div>

                  {/* 💡 각 부대의 formationGrid와 squad.id를 전달 */}
<FormationGridVisual 
  gridData={squad.formationGrid || calculateAutoFormationGrid(squad.setup, generals)} 
  onCellClick={(clickedIdx) => handleGridCellClick(squad.id, clickedIdx)} 
/>
                </div>

                {/* 🔗 인연 및 ⚡ 관계 뱃지 영역 */}
                {(activeSynergies.length > 0 || activeConnections.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(0,0,0,0.03)', border: '1px solid rgba(184,147,90,0.2)', borderRadius: '6px' }}>
                    {activeSynergies.map((syn, synIdx) => (
                      <div key={`syn-${synIdx}`} style={{ fontSize: '0.88rem', color: 'var(--seal-dark)' }}>
                        🔗 [인연] <strong>{syn.name}</strong> ({syn.req_count}인): {syn.effect}
                      </div>
                    ))}

                    {activeConnections.map((conn, connIdx) => (
                      <div key={`conn-${connIdx}`} style={{ fontSize: '0.88rem', color: 'var(--jade)', backgroundColor: 'rgba(63,93,84,0.08)', padding: '6px 10px', borderRadius: '4px' }}>
                        ⚡ [연의 관계] <strong>{conn.leader_name} → {conn.follower_name}</strong> | 
                        제공: <em>{conn.provides}</em> | 
                        효과: <strong>{conn.follower_effect}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3인 장수 슬롯 및 직접 선택 UI */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                  {squad.setup.map((hero, hIdx) => {
                    const otherHeroNamesInSquad = squad.setup
                      .filter((_, idx) => idx !== hIdx)
                      .map(h => h.general_name);

                    const currentGen = generals.find(g => g.name === hero.general_name);

                    return (
                      <div key={hIdx} style={{ padding: '16px', border: '1px solid var(--gold)', backgroundColor: 'var(--paper-soft)' }}>
                        
                        {/* 🖼️ 장수 초상화 & 드롭다운 셀 */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                          <div style={{ width: '52px', height: '52px', border: '2px solid var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
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
                                width: '100%',
                                padding: '4px 6px',
                                fontWeight: 'bold',
                                fontSize: '0.95rem',
                                border: '1px solid var(--gold)',
                                backgroundColor: 'var(--paper)',
                                color: 'var(--ink-text)'
                              }}
                            >
                              {generals.map(g => {
                                const connBadge = getGeneralConnectionBadge(g.name, connections);
                                const mainStatBadge = g.main_stat ? ` [${g.main_stat}]` : '';
                                const posBadge = g.position ? ` [${g.position}]` : '';
                                const isSynergyTarget = checkHasConnectionWithSquad(g.name, otherHeroNamesInSquad, connections);

                                return (
                                  <option 
                                    key={g.id} 
                                    value={g.name}
                                    style={{
                                      backgroundColor: isSynergyTarget ? 'rgba(184, 147, 90, 0.25)' : undefined,
                                      fontWeight: isSynergyTarget ? 'bold' : 'normal',
                                      color: isSynergyTarget ? 'var(--seal-dark)' : undefined
                                    }}
                                  >
                                    {isSynergyTarget ? '⚡ [연의 추천] ' : ''}
                                    {connBadge}{g.name}{mainStatBadge}{posBadge} {g.kingdom ? `(${g.kingdom})` : ''}
                                  </option>
                                );
                              })}
                            </select>

                            {/* 💡 추천 위치 & 속성 & 장비 가이드 뱃지 */}
                            <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              
                              {/* 🚩 배치 위치 뱃지 (전열/후열) */}
                              {currentGen?.position && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--ink-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: 'var(--seal-dark)', fontWeight: 'bold' }}>🚩 추천 위치:</span>
                                  <span style={{ 
                                    backgroundColor: currentGen.position === '전열' 
                                      ? 'rgba(168, 28, 28, 0.12)' 
                                      : currentGen.position === '후열' 
                                      ? 'rgba(41, 98, 255, 0.12)' 
                                      : 'rgba(100, 100, 100, 0.12)', 
                                    color: currentGen.position === '전열' 
                                      ? '#a81c1c' 
                                      : currentGen.position === '후열' 
                                      ? '#1565c0' 
                                      : '#444',
                                    padding: '1px 6px', 
                                    borderRadius: '3px', 
                                    fontWeight: 'bold' 
                                  }}>
                                    {currentGen.position}
                                  </span>
                                </div>
                              )}

                              {currentGen?.main_stat && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--ink-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: 'var(--seal-dark)', fontWeight: 'bold' }}>✨ 추천 속성:</span>
                                  <span style={{ backgroundColor: 'rgba(184,147,90,0.15)', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
                                    {currentGen.main_stat}
                                  </span>
                                </div>
                              )}

                              {currentGen?.recommended_equip_stats && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--ink-text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: 'var(--jade)', fontWeight: 'bold' }}>🛡️ 장비 가이드:</span>
                                  <span style={{ backgroundColor: 'rgba(63,93,84,0.12)', padding: '1px 5px', borderRadius: '3px', fontWeight: 'bold' }}>
                                    {currentGen.recommended_equip_stats}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ⚔️ 전법 셀 클릭 영역 */}
                        <div style={{ borderTop: '1px dashed rgba(184,147,90,0.4)', paddingTop: '10px' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>
                            장착 전법 (클릭하여 교체)
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
                                  cursor: 'pointer', padding: '6px 10px', borderRadius: '4px',
                                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                  border: t.isManual ? '2px solid var(--gold)' : '1px dashed var(--gold)',
                                  backgroundColor: t.isManual ? 'rgba(184,147,90,0.18)' : 'var(--paper)'
                                }}
                                title="클릭 시 적합도 점수순 선택창 표시"
                              >
                                <span style={{ fontSize: '0.88rem', fontWeight: 'bold' }}>
                                  {t.name} {t.isManual && '(수동선택)'}
                                </span>
                                <span style={{ fontSize: '0.82rem', fontWeight: '900', color: 'var(--jade)' }}>
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

              </div>
            );
          })}
        </div>

        {/* 💡 전법 선택 모달 */}
        {editingTacticTarget && (
          <div style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', 
            justifyContent: 'center', alignItems: 'center', zIndex: 1000 
          }}>
            <div style={{ 
              backgroundColor: 'var(--paper)', padding: '24px', maxWidth: '560px', 
              width: '90%', maxHeight: '80vh', overflowY: 'auto', 
              border: '2px solid var(--gold)', boxShadow: '0 0 20px rgba(0,0,0,0.5)' 
            }}>
              
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '4px', color: 'var(--ink-text)' }}>
                ⚔️ [{editingTacticTarget.currentHeroName}] 전법 선택 및 대체 추천
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'gray', marginBottom: '16px' }}>
                * 다른 군단 장수가 이미 장착한 전법은 선택이 제한될 수 있습니다.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {sortedTacticsForModal.map(tac => (
                  <button
                    key={tac.id}
                    disabled={tac.isOccupied}
                    onClick={() => handleTacticChange(tac.name)}
                    style={{
                      padding: '10px 14px',
                      border: tac.isOccupied ? '1px solid #ddd' : tac.isRec ? '2px solid var(--gold)' : '1px solid #ccc',
                      backgroundColor: tac.isOccupied ? '#f0f0f0' : tac.isRec ? 'rgba(184,147,90,0.15)' : tac.isAlternative ? 'rgba(63,93,84,0.08)' : 'var(--paper-soft)',
                      opacity: tac.isOccupied ? 0.55 : 1,
                      cursor: tac.isOccupied ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '0.95rem', color: tac.isOccupied ? '#777' : 'var(--ink-text)' }}>
                        {tac.isRec && '⭐ '}
                        {tac.isAlternative && '🔄 '}
                        {tac.name}
                      </span>

                      <span style={{ fontSize: '0.75rem', marginLeft: '8px' }}>
                        {tac.isOccupied ? (
                          <strong style={{ color: 'var(--seal)' }}>[{tac.assignedInfo.squadNum}군 {tac.assignedInfo.generalName} 착용 중]</strong>
                        ) : tac.isRec ? (
                          <span style={{ color: 'var(--seal-dark)' }}>[공식 추천]</span>
                        ) : tac.isAlternative ? (
                          <span style={{ color: 'var(--jade)' }}>[대체 메커니즘 전법]</span>
                        ) : (
                          <span style={{ color: 'gray' }}>{tac.isOwned ? '[보유]' : '[미보유]'}</span>
                        )}
                      </span>
                    </div>

                    <span style={{ fontWeight: '900', color: tac.isOccupied ? '#999' : 'var(--seal-dark)', fontSize: '0.95rem' }}>
                      {tac.score}점
                    </span>
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setEditingTacticTarget(null)}
                style={{ 
                  marginTop: '18px', width: '100%', padding: '10px', 
                  backgroundColor: 'var(--seal)', color: '#fff', border: 'none', 
                  fontWeight: 'bold', cursor: 'pointer' 
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