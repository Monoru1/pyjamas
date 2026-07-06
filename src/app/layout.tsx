import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'La Maison des Pyjamas',
  description: 'Site officiel et back-office de La Maison des Pyjamas.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
