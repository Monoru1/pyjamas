import Link from 'next/link';

export function TopNav() {
  return (
    <nav className="border-b border-brand-primary/10 bg-background px-5 py-4 md:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="font-semibold text-brand-primary">La Maison des Pyjamas</Link>
        <div className="flex items-center gap-5 text-sm text-foreground/70">
          <Link href="/catalogue">Catalogue</Link>
          <Link href="/panier">Panier</Link>
        </div>
      </div>
    </nav>
  );
}
