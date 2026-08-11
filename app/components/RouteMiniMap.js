// app/components/RouteMiniMap.js
'use client';

// steps: JeongcheolResultCard/page.js에서 넘어오는 배열. coord가 있는 항목만 그림.
// 실제 지도 축척이 아니라, 좌표들의 상대 위치만 정규화해서 보여주는 '대략적인' 미니맵입니다.
export default function RouteMiniMap({ steps, width = 560, height = 260 }) {
  const points = (steps || [])
    .map((s, i) => ({ ...s, order: i + 1 }))
    .filter((s) => s.coord && Number.isFinite(Number(s.coord.x)) && Number.isFinite(Number(s.coord.y)));

  if (points.length < 2) {
    return (
      <div
        style={{
          padding: '14px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#8a6a2e',
          opacity: 0.75,
        }}
      >
        좌표가 등록된 성이 2개 이상이면 루트 미니맵이 표시됩니다.
      </div>
    );
  }

  const xs = points.map((p) => Number(p.coord.x));
  const ys = points.map((p) => Number(p.coord.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // 이름/순번 배지가 캔버스 밖으로 튀어나가지 않도록 좌우 여백을 비대칭으로 넉넉히 확보
  // (순번 배지가 점 오른쪽으로 10px 더 나가므로 오른쪽 여백을 더 크게 잡음)
  const padLeft = 42;
  const padRight = 56;
  const padTop = 46;
  const padBottom = 34;
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;

  // 게임 내 좌표는 왼쪽 상단이 (0,0) — Y가 작을수록 위쪽. 화면에서 반대로 보이는 것을 바로잡기 위해 Y를 반전 매핑
  const toSvg = (x, y) => {
    const px = padLeft + ((x - minX) / spanX) * (width - padLeft - padRight);
    const py = padTop + (1 - (y - minY) / spanY) * (height - padTop - padBottom);
    return [px, py];
  };

  const placed = points.map((p, i) => {
    const [px, py] = toSvg(Number(p.coord.x), Number(p.coord.y));
    return { ...p, px, py };
  });

  // 같은 지점 근처(라벨 충돌 우려)에 여러 점이 있으면 이름 라벨을 살짝 좌우로 어긋나게 배치
  placed.forEach((p, i) => {
    const overlapIdx = placed
      .slice(0, i)
      .filter((q) => Math.hypot(q.px - p.px, q.py - p.py) < 34).length;
    p.labelDx = overlapIdx % 2 === 0 ? 0 : (overlapIdx % 4 < 2 ? 26 : -26);
  });

  // 라벨 텍스트가 캔버스 좌우 경계를 넘지 않도록, 이름 길이를 감안해 anchor를 자동 보정
  const estLabelHalfWidth = (name) => Math.max(18, ((name || '').length * 6.5) / 2 + 4);
  placed.forEach((p) => {
    const targetX = p.px + p.labelDx;
    const halfW = estLabelHalfWidth(p.name);
    if (targetX - halfW < 2) {
      p.labelAnchor = 'start';
      p.labelDx = Math.max(p.labelDx, 2 - p.px);
    } else if (targetX + halfW > width - 2) {
      p.labelAnchor = 'end';
      p.labelDx = Math.min(p.labelDx, width - 2 - p.px);
    } else {
      p.labelAnchor = 'middle';
    }
  });

  const pathD = placed
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px.toFixed(1)} ${p.py.toFixed(1)}`)
    .join(' ');

  const castleIcon = (cx, cy, scale = 1) => (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {/* 성벽 몸체 */}
      <rect x={-11} y={-4} width={22} height={13} fill="#d8c08a" stroke="#6b4a1e" strokeWidth="1.4" />
      {/* 성벽 흉벽(톱니) */}
      <path
        d="M -11 -4 L -11 -8 L -7 -8 L -7 -4 L -3 -4 L -3 -8 L 1 -8 L 1 -4 L 5 -4 L 5 -8 L 9 -8 L 9 -4 L 11 -4"
        fill="none"
        stroke="#6b4a1e"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* 문 */}
      <path d="M -3 9 L -3 2 Q -3 -1 0 -1 Q 3 -1 3 2 L 3 9 Z" fill="#6b4a1e" />
      {/* 중앙 탑 */}
      <rect x={-3.5} y={-13} width={7} height={9} fill="#e8d6a4" stroke="#6b4a1e" strokeWidth="1.2" />
      <path d="M -4.5 -13 L 0 -19 L 4.5 -13 Z" fill="#9c2b2b" stroke="#6b4a1e" strokeWidth="1" />
    </g>
  );

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', margin: '0 auto', borderRadius: '6px' }}>
        <defs>
          <linearGradient id="rmm-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfe0ad" />
            <stop offset="55%" stopColor="#bcd699" />
            <stop offset="100%" stopColor="#a9c885" />
          </linearGradient>
          <pattern id="rmm-texture" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="4" cy="6" r="1.1" fill="#8fae6c" opacity="0.5" />
            <circle cx="18" cy="14" r="1.4" fill="#8fae6c" opacity="0.4" />
            <circle cx="11" cy="21" r="1" fill="#a6c17f" opacity="0.5" />
          </pattern>
        </defs>

        {/* 땅 배경 */}
        <rect x="0" y="0" width={width} height={height} fill="url(#rmm-ground)" />
        <rect x="0" y="0" width={width} height={height} fill="url(#rmm-texture)" />
        <rect x="1" y="1" width={width - 2} height={height - 2} fill="none" stroke="#8a9e63" strokeWidth="2" rx="6" />

        {/* 진군 루트 */}
        <path d={pathD} fill="none" stroke="#9c2b2b" strokeWidth="2.5" strokeDasharray="7 5" opacity="0.85" strokeLinecap="round" />

        {placed.map((p, i) => {
          const badgeCx = Math.min(p.px + 10, width - 10);
          return (
            <g key={p.id ?? i}>
              {castleIcon(p.px, p.py)}
              <circle cx={badgeCx} cy={p.py - 12} r="8" fill="#9c2b2b" stroke="#f9f0da" strokeWidth="1.5" />
              <text x={badgeCx} y={p.py - 8.5} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fdf3dd">
                {p.order}
              </text>
              <text
                x={p.px + p.labelDx}
                y={p.py + 22}
                textAnchor={p.labelAnchor}
                fontSize="12"
                fontWeight="700"
                fill="#3a2a12"
                stroke="#f9f0da"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>
      <p style={{ textAlign: 'center', fontSize: '11px', color: '#8a6a2e', opacity: 0.7, margin: '2px 0 0 0' }}>
        * 실제 축척이 아닌, 등록된 좌표 기준 대략적인 상대 위치입니다
      </p>
    </div>
  );
}
