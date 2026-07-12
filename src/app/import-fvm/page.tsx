import { redirect } from 'next/navigation';
import { utenteCorrente } from '../../lib/auth';
import NavLega from '../../components/NavLega';
import ImportFvm from '../../components/ImportFvm';

export const dynamic = 'force-dynamic';

export default async function PaginaImportFvm() {
  const utente = await utenteCorrente();
  if (!utente) redirect('/login');
  if (utente.ruolo !== 'super_admin') redirect('/');

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SUPER ADMIN</p>
          <h1>Import snapshot FVM / listone</h1>
        </div>
      </header>
      <NavLega ruolo={utente.ruolo} attiva="import" />
      <ImportFvm />
    </main>
  );
}
