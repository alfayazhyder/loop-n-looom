import type { Metadata } from 'next';
import NotificationsView from '@/components/engagement/NotificationsView';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Read updates and notifications for your LOOP_N_LOOOM account.',
};

export default function NotificationsPage() { return <NotificationsView />; }
