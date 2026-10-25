import type { Metadata } from 'next';
import SupportConversation from '@/components/support/SupportConversation';

export const metadata: Metadata = {
  title: 'Support Conversation',
  description: 'View and reply to your private LOOP_N_LOOOM support conversation.',
  robots: { index: false, follow: false },
};

export default async function SupportConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  return <SupportConversation conversationId={conversationId} />;
}
