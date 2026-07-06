interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="h-11 w-11 shrink-0 drop-shadow-sm"
        fill="none"
      >
        <rect x="7" y="7" width="50" height="50" rx="18" fill="#8F1428" />
        <path d="M20 38c6-10 18-10 24 0" stroke="#C99A2E" strokeWidth="4" strokeLinecap="round" />
        <path d="M21 28c2-7 8-11 11-11s9 4 11 11" stroke="#FFFAF3" strokeWidth="4" strokeLinecap="round" />
        <path d="M25 36h14c3 0 5 2 5 5v2H20v-2c0-3 2-5 5-5Z" fill="#FFFAF3" />
        <path d="M32 14v36" stroke="#F7DFD1" strokeWidth="2" strokeLinecap="round" opacity="0.65" />
        <circle cx="47" cy="18" r="3" fill="#C99A2E" />
      </svg>
      {!compact ? (
        <span className="leading-tight">
          <span className="block text-sm font-semibold uppercase tracking-[0.22em] text-brand-primary">
            La Maison
          </span>
          <span className="block text-sm text-foreground/65">des Pyjamas</span>
        </span>
      ) : null}
    </div>
  );
}
