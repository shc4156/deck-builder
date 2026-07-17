'use client';
import { useState } from 'react';

function parseNames(rawText) {
  return rawText
    .split(',')
    .map((s) => s.replace(/\s+/g, '').trim())
    .filter((s) => s.length > 0);
}

function useTextMatcher(items, selectedIds, toggleItem, label) {
  const [inputValue, setInputValue] = useState('');
  const [resultMsg, setResultMsg] = useState('');

  const handleApply = () => {
    const names = parseNames(inputValue);
    if (names.length === 0) {
      setResultMsg('입력된 이름이 없습니다.');
      return;
    }

    let matchedCount = 0;
    let alreadyCount = 0;
    const notFound = [];

    names.forEach((name) => {
      const item = items.find((it) => it.name.replace(/\s+/g, '') === name);
      if (!item) {
        notFound.push(name);
        return;
      }
      if (selectedIds.includes(item.id)) {
        alreadyCount++;
        return;
      }
      toggleItem(item.id);
      matchedCount++;
    });

    let msg = `${label} ${matchedCount}건 체크 완료`;
    if (alreadyCount > 0) msg += ` (이미 체크된 항목 ${alreadyCount}건 제외)`;
    if (notFound.length > 0) msg += ` / 일치하는 항목 없음: ${notFound.join(', ')}`;
    setResultMsg(msg);
  };

  const handleClear = () => {
    setInputValue('');
    setResultMsg('');
  };

  return { inputValue, setInputValue, handleApply, handleClear, resultMsg };
}

export default function ScreenshotChecker({
  generals,
  tactics,
  selectedGenerals,
  selectedTactics,
  toggleGeneral,
  toggleTactic,
}) {
  const genMatcher = useTextMatcher(generals, selectedGenerals, toggleGeneral, '장수');
  const tacMatcher = useTextMatcher(tactics, selectedTactics, toggleTactic, '전법');

  return (
    <div className="scroll-panel" style={{ padding: '18px', marginBottom: '20px' }}>
      <h3 className="classic-heading" style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
        📋 텍스트로 한 번에 체크
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--ink-text)', opacity: 0.75, marginBottom: '14px' }}>
        보유하신 장수/전법 이름을 쉼표(,)로 구분해서 입력하면 한 번에 체크됩니다. (예: 유비,관우,장비)
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        <div style={{ flex: '1 1 260px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>
            장수 목록 (쉼표 구분)
          </label>
          <textarea
            value={genMatcher.inputValue}
            onChange={(e) => genMatcher.setInputValue(e.target.value)}
            placeholder="유비, 관우, 장비, 제갈량 ..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '0.9rem',
              borderRadius: '4px',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={genMatcher.handleApply}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                background: 'var(--jade)',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              적용
            </button>
            <button
              onClick={genMatcher.handleClear}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                background: 'transparent',
                border: '1px solid var(--seal-dark)',
                color: 'var(--seal-dark)',
                cursor: 'pointer',
              }}
            >
              지우기
            </button>
          </div>
          {genMatcher.resultMsg && (
            <p style={{ fontSize: '0.85rem', color: 'var(--jade)', fontWeight: 'bold', marginTop: '8px' }}>
              {genMatcher.resultMsg}
            </p>
          )}
        </div>

        <div style={{ flex: '1 1 260px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px', color: 'var(--seal-dark)' }}>
            전법 목록 (쉼표 구분)
          </label>
          <textarea
            value={tacMatcher.inputValue}
            onChange={(e) => tacMatcher.setInputValue(e.target.value)}
            placeholder="문무겸비, 일인천군, 철기병 ..."
            rows={3}
            style={{
              width: '100%',
              padding: '8px',
              fontSize: '0.9rem',
              borderRadius: '4px',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={tacMatcher.handleApply}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                background: 'var(--jade)',
                color: '#fff',
                fontWeight: 'bold',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              적용
            </button>
            <button
              onClick={tacMatcher.handleClear}
              style={{
                padding: '6px 14px',
                borderRadius: '4px',
                background: 'transparent',
                border: '1px solid var(--seal-dark)',
                color: 'var(--seal-dark)',
                cursor: 'pointer',
              }}
            >
              지우기
            </button>
          </div>
          {tacMatcher.resultMsg && (
            <p style={{ fontSize: '0.85rem', color: 'var(--jade)', fontWeight: 'bold', marginTop: '8px' }}>
              {tacMatcher.resultMsg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}