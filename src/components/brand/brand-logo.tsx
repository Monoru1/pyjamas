interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <span className="flex items-center">
      <img
        src="/brand/logo-maison-pyjamas.svg"
        alt="La Maison des Pyjamas"
        width={compact ? 190 : 230}
        height={compact ? 80 : 97}
        className={compact ? 'h-14 w-auto object-contain' : 'h-14 w-auto object-contain md:h-16'}
        loading="eager"
        decoding="async"
      />
    </span>
  );
}
