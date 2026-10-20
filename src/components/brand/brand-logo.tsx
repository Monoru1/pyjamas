interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    // The logo is a local SVG; an image-transform client adds no benefit here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-maison-pyjamas.svg"
      alt="La Maison des Pyjamas"
      width={420}
      height={120}
      className={compact ? 'h-9 w-auto' : 'h-10 w-auto sm:h-12 md:h-14'}
      loading="eager"
      decoding="async"
    />
  );
}
