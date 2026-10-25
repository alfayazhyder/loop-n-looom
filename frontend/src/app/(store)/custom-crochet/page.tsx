import type { Metadata } from 'next';
import CustomCrochetStudio from '@/components/custom/CustomCrochetStudio';

export const metadata: Metadata = {
  title: 'Create Your Own Crochet',
  description: 'Commission a personalised handmade crochet creation by sharing your design brief with LOOP_N_LOOOM.',
};

export default function CustomCrochetPage() {
  return <CustomCrochetStudio />;
}
