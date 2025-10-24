'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const item = (href: string, label: string) => {
    const active = pathname === href;
    const base =
      'rounded-md px-3 py-1.5 text-sm font-medium transition';
    const styles = active
        ? 'bg-white/15 text-white ring-1 ring-white/10'
        : 'text-white/80 hover:text-white hover:bg-white/10';

    return (
      <Link key={href} href={href} className={`${base} ${styles}`}>
        {label}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop */}
      <nav className="hidden md:flex items-center gap-1">
        {item('/', 'Accueil')}
        {item('/trade', 'Trade')}
        {item('/tokenize', 'Tokenize')}
        {item('/profil', 'Mon profil')}
      </nav>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex flex-wrap gap-1">
          {item('/', 'Accueil')}
          {item('/trade', 'Trade')}
          {item('/tokenize', 'Tokenize')}
          {item('/profil', 'Mon profil')}
        </div>
      </div>
    </>
  );
}
