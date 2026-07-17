// app/components/CastleLocationInput.js
'use client';
import { useEffect, useState, useId } from 'react';
import { useCastleDirectory } from '../../hooks/useCastleDirectory';

// 성 이름을 입력하면 저장된 좌표를 자동으로 보여주고,
// 등록되지 않은 성이면 수동으로 좌표를 입력해 저장할 수 있는 입력 컴포넌트.
//
// props:
//  - name: 현재 입력된 성 이름
//  - onNameChange(name)
//  - coord: { x, y, auto } | null  — 상위 컴포넌트가 상태로 들고 있음
//  - onCoordChange(coord | null)
export default function CastleLocationInput({ name, onNameChange, coord, onCoordChange }) {
  const { findCastle, saveCastle, allCastles, loading } = useCastleDirectory();
  const [manualX, setManualX] = useState('');
  const [manualY, setManualY] = useState('');
  const listId = useId();

  // 이름이 바뀔 때마다 등록된 성인지 자동 조회
  useEffect(() => {
    const matched = findCastle(name);
    if (matched) {
      onCoordChange({ x: matched.x, y: matched.y, auto: true });
    } else if (coord?.auto) {
      // 자동으로 채워졌던 좌표였는데 이름이 바뀌어 더 이상 안 맞으면 초기화
      onCoordChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const handleManualSave = async () => {
    if (!name.trim() || manualX === '' || manualY === '') {
      alert('성 이름과 좌표(X, Y)를 모두 입력해주세요.');
      return;
    }
    const { error } = await saveCastle(name, Number(manualX), Number(manualY));
    if (error) {
      alert('좌표 저장에 실패했습니다.');
      return;
    }
    onCoordChange({ x: Number(manualX), y: Number(manualY), auto: false });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <input
          list={listId}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="성 이름 (예: 기춘)"
          style={{ padding: '6px 8px', border: '1px solid rgba(184,147,90,0.4)', flex: 1 }}
        />
        <datalist id={listId}>
          {allCastles.map((c) => (
            <option key={c.name} value={c.name} />
          ))}
        </datalist>
        {coord && (
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 'bold',
              padding: '3px 8px',
              whiteSpace: 'nowrap',
              color: '#fff',
              backgroundColor: coord.auto ? 'var(--jade)' : '#b8935a',
            }}
          >
            📍 {coord.x}.{coord.y}{coord.auto ? '' : ' (수동)'}
          </span>
        )}
      </div>

      {!coord && name.trim() && !loading && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--gold-soft)' }}>등록된 좌표 없음 →</span>
          <input
            value={manualX}
            onChange={(e) => setManualX(e.target.value)}
            placeholder="X"
            style={{ width: '60px', padding: '4px 6px', border: '1px solid rgba(184,147,90,0.4)' }}
          />
          <input
            value={manualY}
            onChange={(e) => setManualY(e.target.value)}
            placeholder="Y"
            style={{ width: '60px', padding: '4px 6px', border: '1px solid rgba(184,147,90,0.4)' }}
          />
          <button
            type="button"
            onClick={handleManualSave}
            style={{ padding: '4px 10px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid var(--jade)', color: 'var(--jade)', background: 'transparent', cursor: 'pointer' }}
          >
            좌표 저장
          </button>
        </div>
      )}
    </div>
  );
}