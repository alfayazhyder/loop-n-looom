import type { Metadata } from 'next';
import CustomRequestDetail from '@/components/custom/CustomRequestDetail';

export const metadata: Metadata = {
  title: 'Custom Request Details',
};

export default async function CustomRequestDetailPage({ params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return <CustomRequestDetail requestId={requestId} />;
}
