import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { ChristmasClickEffects } from '@/components/motion/christmas-click-effects';
import { FestiveMotionLayer } from '@/components/motion/festive-motion-layer';
import { Footer } from '@/components/site/footer';
import { TopNav } from '@/components/site/top-nav';
import './globals.css';

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
  title: 'La Maison des Pyjamas',
  description: 'Site officiel et back-office de La Maison des Pyjamas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <FestiveMotionLayer />
        <ChristmasClickEffects />
        <TopNav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
