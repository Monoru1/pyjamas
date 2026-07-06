interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <span className="flex items-center gap-3">
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        className="h-11 w-11 shrink-0 drop-shadow-sm"
      >
        <rect x="4" y="4" width="56" height="56" rx="20" fill="#8F1428" />
        <rect
          x="5"
          y="5"
          width="54"
          height="54"
          rx="19"
          fill="none"
          stroke="#C99A2E"
          strokeWidth="1.5"
          opacity="0.85"
        />
        <circle cx="32" cy="34" r="14" fill="#FFFAF3" />
        <circle cx="38" cy="30" r="12.5" fill="#8F1428" />
        <path
          d="M45 19l1.3 3.1 3.1 1.3-3.1 1.3-1.3 3.1-1.3-3.1-3.1-1.3 3.1-1.3z"
          fill="#C99A2E"
        />
      </svg>
      {!compact ? (
        <span className="leading-tight">
          <span className="block font-serif text-lg font-semibold text-brand-primary">
            La Maison
          </span>
          <span className="block text-[0.62rem] font-medium uppercase tracking-[0.34em] text-foreground/55">
            des Pyjamas
          </span>
        </span>
      ) : null}
    </span>
  );
}
