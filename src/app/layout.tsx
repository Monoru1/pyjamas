import type { Metadata } from 'next';
import { Footer } from '@/components/site/footer';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Maison des Pyjamas',
  description: 'Site officiel et back-office de La Maison des Pyjamas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        {children}
        <Footer />
      </body>
    </html>
  );
}
