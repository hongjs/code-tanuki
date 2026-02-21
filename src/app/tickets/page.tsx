import { MainLayout } from '@/components/layout/MainLayout';
import { TicketsManager } from '@/components/tickets/TicketsManager';

export default function TicketsPage() {
  return (
    <MainLayout>
      <TicketsManager />
    </MainLayout>
  );
}
