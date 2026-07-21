'use client';
import PageLayout from '../components/PageLayout';
import GeneralCard from '../components/GeneralCard';
import { useDeckAssets } from '../../hooks/useDeckAssets';

export default function GeneralsPage() {
  const { generals, isLoading, selectedGenerals, toggleGeneral } = useDeckAssets();

  if (isLoading) {
    return (
      <PageLayout>
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--ink-text)' }}>
          장수 도감을 불러오는 중입니다...
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <h1 className="classic-heading text-3xl font-bold mb-4">장수 도감</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {generals.map(general => (
            <GeneralCard
              key={general.id}
              general={general}
              isSelected={selectedGenerals.includes(general.id)}
              onToggle={() => toggleGeneral(general.id)}
            />
          ))}
        </div>
      </div>
    </PageLayout>
  );
}