import type { Metadata } from 'next';
import { FestiveMotionLayer } from '@/components/motion/festive-motion-layer';
import { Footer } from '@/components/site/footer';
import { TopNav } from '@/components/site/top-nav';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Maison des Pyjamas',
  description: 'Site officiel et back-office de La Maison des Pyjamas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <FestiveMotionLayer />
        <TopNav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
