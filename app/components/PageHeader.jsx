'use client';

import Link from 'next/link';
import { IconBook2 } from '@tabler/icons-react';

export default function PageHeader({ title, subtitle }) {
  return (
    <header
      style={{
        padding: '20px var(--pad-page) 14px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div>
        <p className="header-eyebrow" style={{ margin: '0 0 4px' }}>
          SANGUOZHI · DECK OPS
        </p>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 500 }}>{title}</h1>
        {subtitle && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              margin: '6px 0 0',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* 백과사전 진입 아이콘 — 클릭 시 /encyclopedia 로 이동 */}
      <Link
        href="/encyclopedia"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'var(--bg-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
        }}
        aria-label="백과사전"
      >
        <IconBook2 size={18} stroke={1.75} />
      </Link>
    </header>
  );
}
