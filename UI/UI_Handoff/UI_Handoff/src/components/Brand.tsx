import Link from 'next/link';

type BrandProps = {
  dark?: boolean;
  compact?: boolean;
  className?: string;
};

export function Brand({ dark = false, compact = false, className = '' }: BrandProps) {
  const asset = compact ? 'reloop-infinity' : 'reloop-wordmark';
  const src = `/brand/${asset}-on-${dark ? 'dark' : 'light'}.png`;
  return (
    <Link href="/" className={`brand ${dark ? 'brand-on-dark' : ''} ${compact ? 'brand-compact' : ''} ${className}`.trim()} aria-label="ReLoop home">
      <img src={src} alt="ReLoop" className="brand-image" />
    </Link>
  );
}
