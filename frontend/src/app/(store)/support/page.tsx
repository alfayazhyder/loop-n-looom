import type { Metadata } from 'next';
import SupportInbox from '@/components/support/SupportInbox';

export const metadata: Metadata = {
  title: 'Customer Support',
  description: 'Contact LOOP_N_LOOOM and view your private customer support conversations.',
  robots: { index: false, follow: false },
};

export default function SupportPage() {
  return <SupportInbox />;
}
