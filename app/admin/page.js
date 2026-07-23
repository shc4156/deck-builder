'use client';
import Link from 'next/link';
import PageLayout from '../components/PageLayout';

export default function AdminPage() {
  return (
    <PageLayout>
      <div style={{ padding: '25px', minHeight: '100vh' }}>
        <Link href="/" style={{
          display: 'inline-block', marginBottom: '16px', padding: '6px 14px',
          border: '1px solid var(--gold)', color: 'var(--seal-dark)', fontWeight: 'bold',
          fontSize: '0.9rem', textDecoration: 'none'
        }}>
          ← 홈으로
        </Link>

        {/* ============================================================
            📜 지휘부 도구 — 문서형 헤더 (세로 제목 장식)
        ============================================================ */}
        <div
          style={{
            position: 'relative',
            background: 'linear-gradient(180deg, var(--paper-soft) 0%, var(--paper) 45%, var(--paper-soft) 100%)',
            border: '3px double var(--gold)',
            borderRadius: '6px',
            padding: '30px 36px',
            marginBottom: '30px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.16), inset 0 0 60px rgba(139,94,52,0.08)',
            overflow: 'hidden'
          }}
        >
          <div style={{
            position: 'absolute', inset: '8px', border: '1px solid rgba(139,94,52,0.3)',
            borderRadius: '3px', pointerEvents: 'none'
          }} />

          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div style={{
              writingMode: 'vertical-rl', textOrientation: 'upright',
              fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.2em',
              color: 'var(--seal-dark)', flexShrink: 0, lineHeight: 1.3
            }}>
              軍令閣
            </div>

            <div>
              <h1 className="classic-heading text-3xl font-bold mb-2" style={{ margin: 0 }}>
                지휘부 도구
              </h1>
              <p style={{ color: 'var(--ink-text)', opacity: 0.8, marginTop: '10px', fontSize: '1.05rem', fontWeight: 500 }}>
                맹 운영에 필요한 관리 기능 모음입니다.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          <Link href="/admin/letters" className="scroll-panel" style={{
            padding: '28px 24px', textDecoration: 'none', display: 'block',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📜</div>
            <h3 className="classic-heading" style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>자동 서신 작성</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-text)', margin: 0, opacity: 0.75 }}>
              공성 일정, 전쟁 지령, 자유 형식 서신을 규칙에 맞춰 자동으로 완성합니다.
            </p>
          </Link>

          <Link href="/admin/members" className="scroll-panel" style={{
            padding: '28px 24px', textDecoration: 'none', display: 'block',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👥</div>
            <h3 className="classic-heading" style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>인원 관리</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-text)', margin: 0, opacity: 0.75 }}>
              주간 맹원 데이터를 업로드해 액티브 현황과 관리·컷 대상을 파악합니다.
            </p>
          </Link>

          <Link href="/admin/report" className="scroll-panel" style={{
            padding: '28px 24px', textDecoration: 'none', display: 'block',
            transition: 'all 0.2s ease'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📊</div>
            <h3 className="classic-heading" style={{ fontSize: '1.2rem', margin: '0 0 8px 0' }}>주간 리포트</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--ink-text)', margin: 0, opacity: 0.75 }}>
              액티브율·신규 유입·공성쟁 참여율 추이를 한 장의 보고서로 확인합니다.
            </p>
          </Link>
        </div>
      </div>
    </PageLayout>
  );
}