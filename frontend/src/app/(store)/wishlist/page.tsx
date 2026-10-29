import type { Metadata } from "next";
import WishlistView from "@/components/wishlist/WishlistView";

export const metadata: Metadata = {
  title: "My Wishlist | LOOP_N_LOOOM",
  description: "Your favourite handmade crochet creations, saved for a special occasion.",
};

export default function WishlistPage() {
  return <WishlistView />;
}
