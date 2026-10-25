import type { Metadata } from 'next';
import CustomRequestList from '@/components/custom/CustomRequestList';

export const metadata: Metadata = {
  title: 'My Custom Requests',
};

export default function CustomRequestsPage() {
  return <CustomRequestList />;
}
