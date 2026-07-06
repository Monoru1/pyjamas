import Image from 'next/image';

interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center rounded-2xl bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
      <Image
        src="/brand/logo-maison-pyjamas.svg"
        alt="La Maison des Pyjamas"
        width={compact ? 190 : 230}
        height={compact ? 80 : 97}
        className={compact ? 'h-12 w-auto object-contain' : 'h-12 w-auto object-contain md:h-14'}
        priority
        unoptimized
      />
    </span>
  );
}
