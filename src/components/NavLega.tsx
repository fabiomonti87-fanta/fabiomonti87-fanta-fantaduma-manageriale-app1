import Link from 'next/link';

/** Barra di navigazione comune alle pagine gestionali (Sprint 4). */
export default function NavLega({ ruolo, attiva }: { ruolo: 'super_admin' | 'president' | 'viewer'; attiva: string }) {
  const voci = [
    { href: '/', label: 'Dashboard', chiave: 'dashboard', min: 'viewer' },
    { href: '/operazioni', label: 'Operazioni', chiave: 'operazioni', min: 'viewer' },
    { href: '/operazioni/nuova', label: 'Nuova operazione', chiave: 'nuova', min: 'president' },
    { href: '/approvazioni', label: 'Approvazioni', chiave: 'approvazioni', min: 'super_admin' },
    { href: '/mercato', label: 'Mercato e multe', chiave: 'mercato', min: 'super_admin' },
    { href: '/import-fvm', label: 'Import FVM', chiave: 'import', min: 'super_admin' },
    { href: '/manuale', label: 'Manuale', chiave: 'manuale', min: 'viewer' },
  ] as const;
  const visibile = (min: string) =>
    min === 'viewer' ||
    (min === 'president' && ruolo !== 'viewer') ||
    (min === 'super_admin' && ruolo === 'super_admin');
  return (
    <nav className="tabs" style={{ flexWrap: 'wrap' }}>
      {voci.filter((v) => visibile(v.min)).map((v) => (
        <Link key={v.chiave} href={v.href} className={attiva === v.chiave ? 'nav-link active' : 'nav-link'}>
          {v.label}
        </Link>
      ))}
    </nav>
  );
}
