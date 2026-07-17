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

  const bannerStyle = {
    position: 'fixed', bottom: 0, left: 0, right: 0,
    background: '#1a1410', color: '#d4af37',
    padding: '12px 16px', display: 'flex',
    justifyContent: 'space-between', alignItems: 'center',
    borderTop: '2px solid #d4af37', zIndex: 1000,
    fontSize: 14,
  };

  const btnPrimary = {
    background: '#8b1a1a', color: '#fff', border: 'none',
    padding: '8px 16px', marginRight: 8, borderRadius: 4,
    whiteSpace: 'nowrap',
  };

  const btnGhost = {
    background: 'transparent', color: '#d4af37', border: '1px solid #d4af37',
    padding: '8px 16px', borderRadius: 4, whiteSpace: 'nowrap',
  };

  if (showBanner) {
    return (
      <div style={bannerStyle}>
        <span>천하결전 덱 빌더를 홈 화면에 추가하시겠어요?</span>
        <div style={{ display: 'flex', flexShrink: 0 }}>
          <button onClick={handleInstall} style={btnPrimary}>설치</button>
          <button onClick={() => setShowBanner(false)} style={btnGhost}>닫기</button>
        </div>
      </div>
    );
  }

  if (showIosBanner) {
    return (
      <div style={{ ...bannerStyle, flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <span>홈 화면에 추가하려면: 하단 공유 버튼(⬆️) → "홈 화면에 추가"</span>
          <button onClick={dismissIos} style={{ ...btnGhost, marginLeft: 12 }}>닫기</button>
        </div>
      </div>
    );
  }

  return null;
}