import { MainLayout } from '@/components/layout/MainLayout';
import { BreakdownHistoryTable } from '@/components/breakdown/BreakdownHistoryTable';
import { Box } from '@mui/material';

export default function BreakdownHistoryPage() {
  return (
    <MainLayout>
      <Box sx={{ maxWidth: '1200px', mx: 'auto' }}>
        <BreakdownHistoryTable />
      </Box>
    </MainLayout>
  );
}
