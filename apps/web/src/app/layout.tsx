import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { THEME_INIT_SCRIPT } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'NEXUS', template: '%s · NEXUS' },
  description: 'Personal Context & Action Engine',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1013' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `data-theme` is set before hydration by the theme script.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh font-sans text-sm antialiased">
        <Script id="nexus-theme" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
