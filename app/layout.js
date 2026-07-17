import './globals.css';
import AuthGuard from './components/AuthGuard';
import { ProfileProvider } from './components/ProfileContext';

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <AuthGuard>
          <ProfileProvider>{children}</ProfileProvider>
        </AuthGuard>
      </body>
    </html>
  );
}