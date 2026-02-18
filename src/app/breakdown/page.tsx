import { MainLayout } from '@/components/layout/MainLayout';
import { BreakdownForm } from '@/components/breakdown/BreakdownForm';
import { Box } from '@mui/material';

export default function BreakdownPage() {
  return (
    <MainLayout>
      <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
        <BreakdownForm />
      </Box>
    </MainLayout>
  );
}
