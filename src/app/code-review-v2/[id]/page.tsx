import { MainLayout } from '@/components/layout/MainLayout';
import { CodeReviewV2Detail } from '@/components/review-v2/CodeReviewV2Detail';

export default async function CodeReviewV2DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <MainLayout>
      <CodeReviewV2Detail id={id} />
    </MainLayout>
  );
}
