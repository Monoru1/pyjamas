interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <img
      src="/brand/logo-maison-pyjamas.svg"
      alt="La Maison des Pyjamas"
      width={420}
      height={120}
      className={compact ? 'h-9 w-auto' : 'h-12 w-auto md:h-14'}
      loading="eager"
      decoding="async"
    />
  );
}
