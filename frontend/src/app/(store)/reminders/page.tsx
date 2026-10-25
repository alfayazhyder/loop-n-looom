import type { Metadata } from 'next';
import RemindersView from '@/components/engagement/RemindersView';

export const metadata: Metadata = {
  title: 'Occasion Reminders',
  description: 'Save and manage the celebrations that matter to you at LOOP_N_LOOOM.',
};

export default function RemindersPage() { return <RemindersView />; }
