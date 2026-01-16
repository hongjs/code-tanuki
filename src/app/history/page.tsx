import { MainLayout } from '@/components/layout/MainLayout';
import { HistoryTable } from '@/components/history/HistoryTable';

export default function HistoryPage() {
  return (
    <MainLayout>
      <HistoryTable />
    </MainLayout>
  );
}
