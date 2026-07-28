'use client';
import { useEffect, useState } from 'react';

function isIos() {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return; // 이미 설치된 상태면 아무것도 안 띄움

    if (isIos()) {
      const dismissed = localStorage.getItem('ios-install-dismissed');
      if (!dismissed) setShowIosBanner(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const dismissIos = () => {
    localStorage.setItem('ios-install-dismissed', '1');
    setShowIosBanner(false);
  };

  if (!showBanner && !showIosBanner) return null;

  // ---------------- 공통 카드 스타일(다크 지휘실 테마) ----------------
  const wrapperStyle = {
    position: 'fixed',
    left: 0, right: 0,
    bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
    display: 'flex', justifyContent: 'center',
    zIndex: 1000, padding: '0 14px',
    pointerEvents: 'none',
  };

  const cardStyle = {
    pointerEvents: 'auto',
    width: '100%', maxWidth: 420,
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'var(--bg-surface, #1C2027)',
    border: '0.5px solid var(--border-strong, #3A3F4A)',
    borderRadius: 14,
    padding: '12px 14px',
    boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
  };

  const iconStyle = {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    border: '0.5px solid var(--border-strong, #3A3F4A)',
  };

  const textWrapStyle = { flex: 1, minWidth: 0 };

  const titleStyle = {
    margin: 0, fontSize: 13.5, fontWeight: 600,
    color: 'var(--text-primary, #EDEDED)',
  };

  const subStyle = {
    margin: '3px 0 0', fontSize: 11.5,
    color: 'var(--text-secondary, #8A8F98)',
    lineHeight: 1.4,
  };

  const btnRowStyle = { display: 'flex', gap: 6, flexShrink: 0 };

  const btnPrimary = {
    background: 'var(--accent, #B8873A)', color: 'var(--accent-on, #14171D)',
    border: 'none', padding: '8px 14px', borderRadius: 8,
    fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', cursor: 'pointer',
  };

  const btnGhost = {
    background: 'transparent', color: 'var(--text-secondary, #8A8F98)',
    border: '0.5px solid var(--border-strong, #3A3F4A)',
    padding: '8px 12px', borderRadius: 8,
    fontSize: 12.5, whiteSpace: 'nowrap', cursor: 'pointer',
  };

  if (showBanner) {
    return (
      <div style={wrapperStyle}>
        <div style={cardStyle}>
          <img src="/icon-192.png" alt="천하결전 덱 빌더" style={iconStyle} />
          <div style={textWrapStyle}>
            <p style={titleStyle}>천하결전 덱 빌더 앱 설치</p>
            <p style={subStyle}>홈 화면에 추가하고 앱처럼 빠르게 실행해보세요</p>
          </div>
          <div style={btnRowStyle}>
            <button onClick={() => setShowBanner(false)} style={btnGhost}>닫기</button>
            <button onClick={handleInstall} style={btnPrimary}>설치</button>
          </div>
        </div>
      </div>
    );
  }

  if (showIosBanner) {
    return (
      <div style={wrapperStyle}>
        <div style={{ ...cardStyle, alignItems: 'flex-start' }}>
          <img src="/icon-192.png" alt="천하결전 덱 빌더" style={iconStyle} />
          <div style={textWrapStyle}>
            <p style={titleStyle}>천하결전 덱 빌더 앱 설치</p>
            <p style={subStyle}>
              하단 공유 버튼(<span style={{ color: 'var(--accent, #B8873A)', fontWeight: 700 }}>⬆️</span>)을 누른 뒤
              &nbsp;<strong style={{ color: 'var(--text-primary, #EDEDED)' }}>"홈 화면에 추가"</strong>를 선택하세요
            </p>
          </div>
          <button onClick={dismissIos} style={{ ...btnGhost, flexShrink: 0 }}>닫기</button>
        </div>
      </div>
    );
  }

  return null;
}
