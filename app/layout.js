import './globals.css';
import AuthGuard from './components/AuthGuard';
import { ProfileProvider } from './components/ProfileContext';
import InstallBanner from './components/InstallBanner';
import 'pretendard/dist/web/static/pretendard.css';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';

// 1. viewport 객체에 모바일 환경 옵션 보완
export const viewport = {
  themeColor: '#0B0D11',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // 모바일에서 터치 조작 시 원치 않는 화면 확대 방지
};

// 2. metadata 메타 설정
export const metadata = {
  title: '천하결전 덱 빌더',
  description: '삼국지 천하결전 덱 빌딩 웹앱',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-32.png',
    apple: '/favicon-180.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '덱빌더',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8800882593980842"
     crossorigin="anonymous"></script>
      <body>
        <AuthGuard>
          <ProfileProvider>{children}</ProfileProvider>
          <InstallBanner />
        </AuthGuard>
      </body>
    </html>
    
  );
}