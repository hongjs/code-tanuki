import { MainLayout } from '@/components/layout/MainLayout';
import { ReviewForm } from '@/components/review/ReviewForm';
import { Box } from '@mui/material';

export default function ReviewPage() {
  return (
    <MainLayout>
      <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
        <ReviewForm />
      </Box>
    </MainLayout>
  );
}
