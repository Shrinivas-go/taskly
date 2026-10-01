import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ThemeProvider } from '../lib/theme-context';
import { AuthProvider } from '../lib/auth-context';

export const metadata: Metadata = {
  title: 'Taskly — Focus on what matters',
  description: 'A calm, focused workspace for organizing your tasks.',
};

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8f9fb' },
    { media: '(prefers-color-scheme: dark)', color: '#17191d' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
