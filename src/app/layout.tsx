import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { SiteChrome } from '@/components/site/site-chrome';
import './globals.css';
import './christmas-2026.css';
import './event-2026.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pyjamas25.netlify.app'),
  title: 'La Maison des Pyjamas',
  description: 'La Maison des Pyjamas — édition Noël 2026. Une sélection chaleureuse de pyjamas à partager en famille.',
  icons: {
    icon: '/brand/logo-maison-pyjamas.svg',
    shortcut: '/brand/logo-maison-pyjamas.svg',
    apple: '/brand/logo-maison-pyjamas.svg',
  },
  openGraph: {
    title: 'La Maison des Pyjamas',
    description: 'Pyjamas, accessoires cocooning et cadeaux premium pour la maison.',
    images: ['/christmas-2026/family-celebration.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'La Maison des Pyjamas',
    description: 'Pyjamas, accessoires cocooning et cadeaux premium pour la maison.',
    images: ['/christmas-2026/family-celebration.jpg'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
