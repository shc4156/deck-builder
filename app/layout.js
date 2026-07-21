import './globals.css';

export const metadata = {
  title: '천하결전 덱 빌더',
  description: '삼국지 천하결전 덱 빌딩 웹앱',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
};

// Next.js 최신 규격에 맞춰 viewport 관련 설정 분리
export const viewport = {
  themeColor: '#8b1a1a',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}