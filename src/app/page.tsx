import ConsultationDashboard from '../components/ConsultationDashboard';
import { loadConsultationData } from '../lib/consultation-data';
import { utenteCorrente } from '../lib/auth';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [data, utente] = await Promise.all([loadConsultationData(), utenteCorrente()]);
  return <ConsultationDashboard data={data} ruolo={utente?.ruolo ?? 'viewer'} />;
}
