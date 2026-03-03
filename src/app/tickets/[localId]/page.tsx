import { MainLayout } from '@/components/layout/MainLayout';
import { TicketsManager } from '@/components/tickets/TicketsManager';

export default function TicketDetailPage() {
  return (
    <MainLayout>
      <TicketsManager />
    </MainLayout>
  );
}
