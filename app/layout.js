import './globals.css';
import AuthGuard from './components/AuthGuard';
import { ProfileProvider } from './components/ProfileContext';
import InstallBanner from './components/InstallBanner';

export const metadata = {
  title: '천하결전 덱 빌더',
  description: '삼국지 천하결전 덱 빌딩 웹앱',
  manifest: '/manifest.json',
<<<<<<< HEAD
  themeColor: '#8b1a1a',
=======
>>>>>>> d4eb085 (전체 수정)
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '덱빌더',
  },
};

<<<<<<< HEAD
=======
// Next.js 최신 규격에 맞춰 viewport 관련 설정 분리
export const viewport = {
  themeColor: '#8b1a1a',
};

>>>>>>> d4eb085 (전체 수정)
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