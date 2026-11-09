import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { RootProvider } from '@/components/providers/root-provider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'MatabAI (ShifaDesk)',
    template: '%s | MatabAI',
  },
  description:
    'Multilingual AI-Powered Clinic Operations SaaS Platform for Healthcare Practices',
  applicationName: 'MatabAI (ShifaDesk)',
  authors: [{ name: 'Muhammad Talha' }],
  keywords: ['clinic management', 'healthcare SaaS', 'medical AI', 'multilingual clinic'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#090d16' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
