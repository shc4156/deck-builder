'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';
import FormationGridVisual from '../components/FormationGridVisual';
import GlossaryModal from '../components/GlossaryModal';
import { matchFormationInfo } from '../../data/synergies';
import { useDeckAssets } from '../../hooks/useDeckAssets';
import { supabase } from '../lib/supabaseClient';

export default function MatchesPage() {
  const { generals, tactics, tierDecks, isLoading } = useDeckAssets();
  const [glossaryTerm, setGlossaryTerm] = useState(null);

  if (isLoading) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--ink-text)' }}>
          티어덱 매칭 정보를 계산 중입니다...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <nav className="classic-tabbar" style={{ marginBottom: '35px' }}>
          <Link href="/?tab=my-assets" className="classic-tab">나의 보유 현황</Link>
          <Link href="/?tab=dictionary" className="classic-tab">통합 도감</Link>
          <span className="classic-tab active">티어덱 매칭</span>
          <Link href="/squads" className="classic-tab">1-5군 추천 편성</Link>
        </nav>

        <h1 className="classic-heading text-3xl font-bold mb-4">티어덱 매칭</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {tierDecks.map(deck => (
            <div key={deck.id} className="scroll-panel" style={{ padding: '20px' }}>
              <h3 className="classic-heading" style={{ fontSize: '1.4rem' }}>{deck.tier_name}</h3>
            </div>
          ))}
        </div>
      </div>
      <GlossaryModal term={glossaryTerm} onClose={() => setGlossaryTerm(null)} />
    </PageLayout>
  );
}