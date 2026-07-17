// app/admin/letters/page.js
'use client';
import { useState, useRef, useMemo } from 'react';
import PageLayout from '../../components/PageLayout';
import CastleLocationInput from '../../components/CastleLocationInput';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────
// 서신 템플릿 레지스트리
// 새 서신 종류를 추가하려면: 아래 목록에 항목 하나 추가 + 폼 컴포넌트 하나 만들고
// renderTemplateForm()의 switch에 연결하면 됩니다.
// '자유 형식 서신(섹션형)'은 소제목+색상+본문 구조를 가진 대부분의 공지
// (법령, 격려 메시지 등)를 커버하고, '전쟁 일정·전선·전략'은 좌표가 필요한
// 작전 일정 + 자유 섹션을 함께 다루는 전용 템플릿입니다.
// ─────────────────────────────────────────────────────────
const LETTER_TEMPLATES = [
  { id: 'siege_schedule', label: '공성 일정 변경', status: 'ready' },
  { id: 'war_operations', label: '전쟁 일정 · 전선 · 전략', status: 'ready' },
  { id: 'custom_sections', label: '자유 형식 서신 (섹션형)', status: 'ready' },
];

const TITLE_LIMIT = 11;
const BODY_LIMIT = 600;

const HIGHLIGHT_TAGS = [
  { tag: 'y', label: '노랑', color: '#c9a227' },
  { tag: 'r', label: '빨강', color: '#c0392b' },
  { tag: 'b', label: '파랑', color: '#2b5fc0' },
  { tag: 'g', label: '초록', color: '#2e7d32' },
];

function CharCounter({ current, limit }) {
  const over = current > limit;
  return (
    <span style={{ fontWeight: 'bold', color: over ? '#c0392b' : 'var(--gold-soft)' }}>
      {current} / {limit}자{over ? ' (초과!)' : ''}
    </span>
  );
}

// 선택된 텍스트를 {tag}...{tag} 로 감싸는 공통 로직 (여러 textarea에서 재사용)
function wrapTextSelection(el, value, setValue, tag) {
  if (!el) return;
  const start = el.selectionStart;
  const end = el.selectionEnd;
  if (start === end) {
    alert('먼저 강조할 텍스트를 드래그로 선택해주세요.');
    return;
  }
  const before = value.slice(0, start);
  const selected = value.slice(start, end);
  const after = value.slice(end);
  const inserted = `{${tag}}${selected}{${tag}}`;
  setValue(before + inserted + after);
  const newCursor = before.length + inserted.length;
  setTimeout(() => {
    el.focus();
    el.setSelectionRange(newCursor, newCursor);
  }, 0);
}

function HighlightToolbar({ onWrap }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
      {HIGHLIGHT_TAGS.map(({ tag, label, color }) => (
        <button
          key={tag}
          type="button"
          onMouseDown={(e) => e.preventDefault()} // 버튼 클릭 시 textarea 선택영역이 풀리지 않도록
          onClick={() => onWrap(tag)}
          style={{
            padding: '5px 12px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            color: '#fff',
            backgroundColor: color,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {label} 강조
        </button>
      ))}
      <span style={{ fontSize: '0.8rem', color: 'var(--gold-soft)', alignSelf: 'center' }}>
        (강조할 부분을 드래그로 선택한 뒤 버튼을 눌러주세요)
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 재사용 컴포넌트: 자유 섹션 목록 편집기
// (소제목 + 강조색 + 본문) 형태의 섹션을 추가/삭제/순서변경.
// '자유 형식 서신'과 '전쟁 일정·전선·전략' 템플릿에서 공통으로 사용.
// ─────────────────────────────────────────────────────────
function SectionListEditor({ sections, setSections, numberOffset = 1 }) {
  const bodyRefs = useRef({});
  const nextIdRef = useRef(Math.max(0, ...sections.map((s) => s.id)) + 1);

  const addSection = () => {
    setSections((prev) => [...prev, { id: nextIdRef.current++, colorTag: 'y', heading: '', body: '' }]);
  };

  const removeSection = (id) => {
    setSections((prev) => (prev.length > 1 ? prev.filter((s) => s.id !== id) : prev));
  };

  const updateSection = (id, field, value) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const moveSection = (id, direction) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const swapIdx = idx + direction;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold', color: 'var(--seal-dark)' }}>본문 섹션</label>
        <button type="button" onClick={addSection} style={{ padding: '6px 12px', fontWeight: 'bold', border: '1px solid var(--jade)', color: 'var(--jade)', background: 'transparent', cursor: 'pointer' }}>
          + 섹션 추가
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sections.map((section, idx) => (
          <div key={section.id} style={{ border: '1px solid rgba(184,147,90,0.35)', padding: '12px', backgroundColor: 'var(--paper-soft)' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', color: 'var(--seal-dark)', minWidth: '24px' }}>{idx + numberOffset}.</span>
              <select
                value={section.colorTag}
                onChange={(e) => updateSection(section.id, 'colorTag', e.target.value)}
                style={{ padding: '6px', border: '1px solid rgba(184,147,90,0.4)' }}
              >
                <option value="none">강조 없음</option>
                {HIGHLIGHT_TAGS.map(({ tag, label }) => (
                  <option key={tag} value={tag}>{label} 소제목</option>
                ))}
              </select>
              <input
                value={section.heading}
                onChange={(e) => updateSection(section.id, 'heading', e.target.value)}
                placeholder="소제목 (예: 전선 현황)"
                style={{ padding: '6px 8px', border: '1px solid rgba(184,147,90,0.4)', flex: 1 }}
              />
              <button type="button" onClick={() => moveSection(section.id, -1)} disabled={idx === 0} style={{ padding: '5px 9px', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
              <button type="button" onClick={() => moveSection(section.id, 1)} disabled={idx === sections.length - 1} style={{ padding: '5px 9px', cursor: idx === sections.length - 1 ? 'default' : 'pointer', opacity: idx === sections.length - 1 ? 0.3 : 1 }}>▼</button>
              {sections.length > 1 && (
                <button type="button" onClick={() => removeSection(section.id)} style={{ padding: '5px 10px', border: '1px solid #c0392b', color: '#c0392b', background: 'transparent', cursor: 'pointer' }}>
                  삭제
                </button>
              )}
            </div>
            <HighlightToolbar onWrap={(tag) => wrapTextSelection(bodyRefs.current[section.id], section.body, (v) => updateSection(section.id, 'body', v), tag)} />
            <textarea
              ref={(el) => { bodyRefs.current[section.id] = el; }}
              value={section.body}
              onChange={(e) => updateSection(section.id, 'body', e.target.value)}
              placeholder={'섹션 본문 (필요하면 "* 항목" 형태로 줄바꿈해 목록처럼 써도 됩니다)'}
              rows={3}
              style={{ width: '100%', padding: '10px', border: '1px solid rgba(184,147,90,0.4)', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function buildSectionBlocks(sections, numberOffset = 1) {
  return sections
    .filter((s) => s.heading || s.body)
    .map((s, idx) => {
      const num = idx + numberOffset;
      const headingLine = s.colorTag === 'none'
        ? `${num}. ${s.heading}`
        : `{${s.colorTag}}${num}. ${s.heading}{${s.colorTag}}`;
      return [headingLine, s.body].filter(Boolean).join('\n');
    });
}

// ─────────────────────────────────────────────────────────
// 템플릿 1. 공성 일정 변경
// ─────────────────────────────────────────────────────────
function SiegeScheduleForm() {
  const [dateLabel, setDateLabel] = useState('7/16');
  const [title, setTitle] = useState('7/16공성일정변경');
  const [entries, setEntries] = useState([
    { id: 1, time: '', location: '', castleInfo: '', coord: null, includeCoord: false, hasCatapult: false, hasRam: false },
  ]);
  const [cautionsText, setCautionsText] = useState('');
  const [footerText, setFooterText] = useState(
    '바쁘시더라도 공성 시간 확인을 부탁드리며, 오늘도 힘써주시는 맹원 여러분께 진심으로 감사드립니다!'
  );
  const [copied, setCopied] = useState(false);
  const cautionsRef = useRef(null);
  const nextIdRef = useRef(2);

  const addEntry = () => {
    setEntries((prev) => [
      ...prev,
      { id: nextIdRef.current++, time: '', location: '', castleInfo: '', coord: null, includeCoord: false, hasCatapult: false, hasRam: false },
    ]);
  };

  const removeEntry = (id) => {
    setEntries((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));
  };

  const updateEntry = (id, field, value) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  };

  const applyAutoTitle = () => {
    setTitle(`${dateLabel}공성일정변경`);
  };

  const bodyText = useMemo(() => {
    const scheduleLines = entries
      .filter((e) => e.time || e.location || e.castleInfo)
      .map((e) => {
        const flags = [];
        if (e.hasCatapult) flags.push('충차');
        if (e.hasRam) flags.push('투석차');
        const flagText = flags.length > 0 ? ` (${flags.join('·')} 배치)` : '';
        const locPart = e.castleInfo ? `${e.location}(${e.castleInfo})` : e.location;
        const coordText = e.includeCoord && e.coord ? ` [좌표 ${e.coord.x}.${e.coord.y}]` : '';
        return `▶ ${e.time} - ${locPart}${flagText}${coordText}`;
      })
      .join('\n');

    return [
      `맹원 여러분, ${dateLabel} 공성 일정이 변경되었습니다. 아래 시간과 좌표를 확인하여 착오 없으시기 바랍니다.`,
      `{y}1. 공성 일정{y}`,
      scheduleLines,
      `{r}2. 주의사항{r}`,
      cautionsText,
      footerText,
    ]
      .filter(Boolean)
      .join('\n');
  }, [dateLabel, entries, cautionsText, footerText]);

  const handleCopy = async () => {
    const fullText = `제목: ${title}\n본문:\n${bodyText}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert('복사에 실패했습니다. 아래 미리보기 영역을 직접 드래그해서 복사해주세요.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
      <div className="scroll-panel" style={{ padding: '24px' }}>
        <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>서신 정보 입력</h3>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>날짜 (본문 인사말에 사용)</label>
          <input
            value={dateLabel}
            onChange={(e) => setDateLabel(e.target.value)}
            placeholder="7/16"
            style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '120px' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>
            제목 <CharCounter current={title.length} limit={TITLE_LIMIT} />
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', flex: 1 }}
            />
            <button type="button" onClick={applyAutoTitle} style={{ padding: '8px 14px', fontWeight: 'bold', border: '1px solid var(--gold)', background: 'var(--paper-soft)', cursor: 'pointer' }}>
              자동 채우기
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ fontWeight: 'bold', color: 'var(--seal-dark)' }}>공성 일정 항목</label>
          <button type="button" onClick={addEntry} style={{ padding: '6px 12px', fontWeight: 'bold', border: '1px solid var(--jade)', color: 'var(--jade)', background: 'transparent', cursor: 'pointer' }}>
            + 항목 추가
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {entries.map((entry) => (
            <div key={entry.id} style={{ border: '1px solid rgba(184,147,90,0.35)', padding: '12px', backgroundColor: 'var(--paper-soft)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  value={entry.time}
                  onChange={(e) => updateEntry(entry.id, 'time', e.target.value)}
                  placeholder="시간 (예: 12:00)"
                  style={{ padding: '6px 8px', border: '1px solid rgba(184,147,90,0.4)', width: '110px' }}
                />
                <div style={{ flex: 1 }}>
                  <CastleLocationInput
                    name={entry.location}
                    onNameChange={(v) => updateEntry(entry.id, 'location', v)}
                    coord={entry.coord}
                    onCoordChange={(c) => updateEntry(entry.id, 'coord', c)}
                  />
                </div>
                <input
                  value={entry.castleInfo}
                  onChange={(e) => updateEntry(entry.id, 'castleInfo', e.target.value)}
                  placeholder="성 정보 (예: 6성, 11관문)"
                  style={{ padding: '6px 8px', border: '1px solid rgba(184,147,90,0.4)', width: '140px' }}
                />
                {entries.length > 1 && (
                  <button type="button" onClick={() => removeEntry(entry.id)} style={{ padding: '6px 10px', border: '1px solid #c0392b', color: '#c0392b', background: 'transparent', cursor: 'pointer' }}>
                    삭제
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={entry.hasCatapult} onChange={(e) => updateEntry(entry.id, 'hasCatapult', e.target.checked)} />
                  충차 배치
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={entry.hasRam} onChange={(e) => updateEntry(entry.id, 'hasRam', e.target.checked)} />
                  투석차 배치
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={entry.includeCoord} onChange={(e) => updateEntry(entry.id, 'includeCoord', e.target.checked)} disabled={!entry.coord} />
                  서신 본문에 좌표 표시
                </label>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>주의사항</label>
          <HighlightToolbar onWrap={(tag) => wrapTextSelection(cautionsRef.current, cautionsText, setCautionsText, tag)} />
          <textarea
            ref={cautionsRef}
            value={cautionsText}
            onChange={(e) => setCautionsText(e.target.value)}
            placeholder="예: 13성 무양은 현재 성 연결 작업이 진행 중입니다..."
            rows={4}
            style={{ width: '100%', padding: '10px', border: '1px solid rgba(184,147,90,0.4)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>마무리 인사말</label>
          <textarea
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '10px', border: '1px solid rgba(184,147,90,0.4)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>
      </div>

      <LetterPreview title={title} bodyText={bodyText} copied={copied} onCopy={handleCopy} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 템플릿 2. 전쟁 일정 · 전선 · 전략
// 좌표가 필요한 작전 일정 목록 + 전선 현황/전략 등 자유 섹션을 함께 다룸
// ─────────────────────────────────────────────────────────
function WarOperationsForm() {
  const [title, setTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [scheduleHeading, setScheduleHeading] = useState('작전 일정');
  const [scheduleColorTag, setScheduleColorTag] = useState('b');
  const [operations, setOperations] = useState([
    { id: 1, time: '', location: '', objective: '', coord: null, includeCoord: true },
  ]);
  const [sections, setSections] = useState([
    { id: 1, colorTag: 'y', heading: '전선 현황', body: '' },
    { id: 2, colorTag: 'g', heading: '전략 지침', body: '' },
  ]);
  const [closingText, setClosingText] = useState('');
  const [author, setAuthor] = useState('');
  const [copied, setCopied] = useState(false);

  const closingRef = useRef(null);
  const nextOpIdRef = useRef(2);

  const addOperation = () => {
    setOperations((prev) => [
      ...prev,
      { id: nextOpIdRef.current++, time: '', location: '', objective: '', coord: null, includeCoord: true },
    ]);
  };

  const removeOperation = (id) => {
    setOperations((prev) => (prev.length > 1 ? prev.filter((o) => o.id !== id) : prev));
  };

  const updateOperation = (id, field, value) => {
    setOperations((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
  };

  const bodyText = useMemo(() => {
    const opLines = operations
      .filter((o) => o.time || o.location || o.objective)
      .map((o) => {
        const coordText = o.includeCoord && o.coord ? ` [좌표 ${o.coord.x}.${o.coord.y}]` : '';
        const objText = o.objective ? ` - ${o.objective}` : '';
        return `▶ ${o.time} - ${o.location}${coordText}${objText}`;
      })
      .join('\n');

    const scheduleHeadingLine = scheduleColorTag === 'none'
      ? `1. ${scheduleHeading}`
      : `{${scheduleColorTag}}1. ${scheduleHeading}{${scheduleColorTag}}`;

    const scheduleBlock = [scheduleHeadingLine, opLines].filter(Boolean).join('\n');
    const sectionBlocks = buildSectionBlocks(sections, 2);

    return [introText, scheduleBlock, ...sectionBlocks, closingText, author ? `[작성자: ${author}]` : '']
      .filter(Boolean)
      .join('\n');
  }, [introText, scheduleHeading, scheduleColorTag, operations, sections, closingText, author]);

  const handleCopy = async () => {
    const fullText = `제목: ${title}\n본문:\n${bodyText}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert('복사에 실패했습니다. 아래 미리보기 영역을 직접 드래그해서 복사해주세요.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
      <div className="scroll-panel" style={{ padding: '24px' }}>
        <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>서신 정보 입력</h3>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>
            제목 <CharCounter current={title.length} limit={TITLE_LIMIT} />
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 공성전작전지령공지"
            style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>도입부 (인사말)</label>
          <textarea
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            placeholder="예: 내일 진행될 공성전 작전 지령입니다..."
            rows={2}
            style={{ width: '100%', padding: '10px', border: '1px solid rgba(184,147,90,0.4)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', color: 'var(--seal-dark)', minWidth: '24px' }}>1.</span>
          <select value={scheduleColorTag} onChange={(e) => setScheduleColorTag(e.target.value)} style={{ padding: '6px', border: '1px solid rgba(184,147,90,0.4)' }}>
            <option value="none">강조 없음</option>
            {HIGHLIGHT_TAGS.map(({ tag, label }) => (
              <option key={tag} value={tag}>{label} 소제목</option>
            ))}
          </select>
          <input
            value={scheduleHeading}
            onChange={(e) => setScheduleHeading(e.target.value)}
            style={{ padding: '6px 8px', border: '1px solid rgba(184,147,90,0.4)', flex: 1 }}
          />
          <button type="button" onClick={addOperation} style={{ padding: '6px 12px', fontWeight: 'bold', border: '1px solid var(--jade)', color: 'var(--jade)', background: 'transparent', cursor: 'pointer' }}>
            + 일정 추가
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {operations.map((op) => (
            <div key={op.id} style={{ border: '1px solid rgba(184,147,90,0.35)', padding: '12px', backgroundColor: 'var(--paper-soft)' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                  value={op.time}
                  onChange={(e) => updateOperation(op.id, 'time', e.target.value)}
                  placeholder="시간 (예: 13:00)"
                  style={{ padding: '6px 8px', border: '1px solid rgba(184,147,90,0.4)', width: '110px' }}
                />
                <div style={{ flex: 1 }}>
                  <CastleLocationInput
                    name={op.location}
                    onNameChange={(v) => updateOperation(op.id, 'location', v)}
                    coord={op.coord}
                    onCoordChange={(c) => updateOperation(op.id, 'coord', c)}
                  />
                </div>
                {operations.length > 1 && (
                  <button type="button" onClick={() => removeOperation(op.id)} style={{ padding: '6px 10px', border: '1px solid #c0392b', color: '#c0392b', background: 'transparent', cursor: 'pointer' }}>
                    삭제
                  </button>
                )}
              </div>
              <input
                value={op.objective}
                onChange={(e) => updateOperation(op.id, 'objective', e.target.value)}
                placeholder="목표/내용 (예: 9성 익양현 공략, 11관문 무승관 등)"
                style={{ padding: '6px 8px', border: '1px solid rgba(184,147,90,0.4)', width: '100%', marginBottom: '8px' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '0.9rem' }}>
                <input type="checkbox" checked={op.includeCoord} onChange={(e) => updateOperation(op.id, 'includeCoord', e.target.checked)} disabled={!op.coord} />
                서신 본문에 좌표 표시
              </label>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <SectionListEditor sections={sections} setSections={setSections} numberOffset={2} />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>마무리 문구</label>
          <HighlightToolbar onWrap={(tag) => wrapTextSelection(closingRef.current, closingText, setClosingText, tag)} />
          <textarea
            ref={closingRef}
            value={closingText}
            onChange={(e) => setClosingText(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '10px', border: '1px solid rgba(184,147,90,0.4)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>작성자 (선택)</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="예: 맹주"
            style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '200px' }}
          />
        </div>
      </div>

      <LetterPreview title={title} bodyText={bodyText} copied={copied} onCopy={handleCopy} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 템플릿 3. 자유 형식 서신 (섹션형)
// ─────────────────────────────────────────────────────────
function SectionLetterForm() {
  const [title, setTitle] = useState('');
  const [introText, setIntroText] = useState('');
  const [sections, setSections] = useState([
    { id: 1, colorTag: 'y', heading: '', body: '' },
  ]);
  const [closingText, setClosingText] = useState('');
  const [author, setAuthor] = useState('');
  const [copied, setCopied] = useState(false);

  const introRef = useRef(null);
  const closingRef = useRef(null);

  const bodyText = useMemo(() => {
    const sectionBlocks = buildSectionBlocks(sections, 1);
    return [introText, ...sectionBlocks, closingText, author ? `[작성자: ${author}]` : '']
      .filter(Boolean)
      .join('\n');
  }, [introText, sections, closingText, author]);

  const handleCopy = async () => {
    const fullText = `제목: ${title}\n본문:\n${bodyText}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert('복사에 실패했습니다. 아래 미리보기 영역을 직접 드래그해서 복사해주세요.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' }}>
      <div className="scroll-panel" style={{ padding: '24px' }}>
        <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>서신 정보 입력</h3>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>
            제목 <CharCounter current={title.length} limit={TITLE_LIMIT} />
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 꼬마맹운영기본수칙"
            style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>도입부 (인사말)</label>
          <HighlightToolbar onWrap={(tag) => wrapTextSelection(introRef.current, introText, setIntroText, tag)} />
          <textarea
            ref={introRef}
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
            placeholder="예: 우리 꼬마맹의 질서와 성장을 위한 기본 수칙입니다..."
            rows={2}
            style={{ width: '100%', padding: '10px', border: '1px solid rgba(184,147,90,0.4)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <SectionListEditor sections={sections} setSections={setSections} numberOffset={1} />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>마무리 문구</label>
          <HighlightToolbar onWrap={(tag) => wrapTextSelection(closingRef.current, closingText, setClosingText, tag)} />
          <textarea
            ref={closingRef}
            value={closingText}
            onChange={(e) => setClosingText(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '10px', border: '1px solid rgba(184,147,90,0.4)', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>작성자 (선택)</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="예: 맹주"
            style={{ padding: '8px 10px', border: '1px solid rgba(184,147,90,0.4)', width: '200px' }}
          />
        </div>
      </div>

      <LetterPreview title={title} bodyText={bodyText} copied={copied} onCopy={handleCopy} />
    </div>
  );
}

function LetterPreview({ title, bodyText, copied, onCopy }) {
  return (
    <div className="scroll-panel" style={{ padding: '24px', position: 'sticky', top: '20px' }}>
      <h3 className="classic-heading" style={{ fontSize: '1.2rem', marginBottom: '16px' }}>미리보기</h3>

      <div style={{ marginBottom: '10px' }}>
        <span style={{ fontWeight: 'bold', color: 'var(--seal-dark)' }}>제목: </span>
        <span>{title}</span>
        <span style={{ marginLeft: '10px' }}><CharCounter current={title.length} limit={TITLE_LIMIT} /></span>
      </div>

      <div style={{ marginBottom: '10px', fontWeight: 'bold', color: 'var(--seal-dark)' }}>
        본문: <CharCounter current={bodyText.length} limit={BODY_LIMIT} />
      </div>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          backgroundColor: 'var(--paper-soft)',
          border: '1px solid rgba(184,147,90,0.4)',
          padding: '16px',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          color: 'var(--ink-text)',
          minHeight: '200px',
        }}
      >
        {bodyText || '입력한 내용이 여기에 서신 형식으로 표시됩니다.'}
      </pre>

      <button
        type="button"
        onClick={onCopy}
        style={{
          marginTop: '14px',
          padding: '10px 20px',
          fontWeight: 'bold',
          color: 'var(--paper-soft)',
          backgroundColor: copied ? 'var(--jade)' : 'var(--seal)',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
        }}
      >
        {copied ? '복사됨!' : '제목+본문 복사하기'}
      </button>
    </div>
  );
}

function renderTemplateForm(templateId) {
  switch (templateId) {
    case 'siege_schedule':
      return <SiegeScheduleForm />;
    case 'war_operations':
      return <WarOperationsForm />;
    case 'custom_sections':
      return <SectionLetterForm />;
    default:
      return null;
  }
}

export default function LetterWriterPage() {
  const [templateId, setTemplateId] = useState('siege_schedule');

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            marginBottom: '16px',
            padding: '6px 14px',
            border: '1px solid var(--gold)',
            color: 'var(--seal-dark)',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            textDecoration: 'none'
          }}
        >
          ← 홈으로
        </Link>
        
        <h1 className="classic-heading text-3xl font-bold mb-2">자동 서신 작성</h1>
        <p style={{ color: 'var(--gold-soft)', marginBottom: '24px', fontSize: '1.05rem', fontWeight: 500 }}>
          항목을 입력하면 제목 {TITLE_LIMIT}자 / 본문 {BODY_LIMIT}자 규칙에 맞춰 서신을 자동으로 완성합니다.
        </p>

        <nav className="classic-tabbar" style={{ marginBottom: '30px' }}>
          {LETTER_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => t.status === 'ready' && setTemplateId(t.id)}
              className={`classic-tab${templateId === t.id ? ' active' : ''}`}
              style={{
                border: 'none',
                cursor: t.status === 'ready' ? 'pointer' : 'not-allowed',
                opacity: t.status === 'ready' ? 1 : 0.5,
              }}
            >
              {t.label}{t.status !== 'ready' ? ' (준비중)' : ''}
            </button>
          ))}
        </nav>

        {renderTemplateForm(templateId)}
      </div>
    </PageLayout>
  );
}