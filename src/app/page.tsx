import ConsultationDashboard from '../components/ConsultationDashboard';
import { loadConsultationData } from '../lib/consultation-data';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <ConsultationDashboard data={loadConsultationData()} />;
}
