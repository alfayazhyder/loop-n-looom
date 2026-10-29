import type { Metadata } from "next";

import OccasionsExplorer from "@/components/occasions/OccasionsExplorer";

export const metadata: Metadata = {
  title: "Shop by Occasion | LOOP_N_LOOOM",
  description:
    "Discover meaningful handmade crochet gifts for birthdays, anniversaries, celebrations and every memorable moment.",
};

export default function OccasionsPage() {
  return <OccasionsExplorer />;
}
