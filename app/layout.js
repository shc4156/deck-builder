import './globals.css';
import AuthGuard from './components/AuthGuard';
import { ProfileProvider } from './components/ProfileContext';
import InstallBanner from './components/InstallBanner';

export const metadata = {
  title: '천하결전 덱 빌더',
  description: '삼국지 천하결전 덱 빌딩 웹앱',
  manifest: '/manifest.json',
  themeColor: '#8b1a1a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '덱빌더',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <AuthGuard>
          <ProfileProvider>{children}</ProfileProvider>
          <InstallBanner />
        </AuthGuard>
      </body>
    </html>
  );
}