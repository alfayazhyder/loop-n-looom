import type { Metadata } from "next";
import TrackOrderView from "@/components/orders/TrackOrderView";

export const metadata: Metadata = { title: "Track an Order" };

export default function TrackOrderPage() {
  return <TrackOrderView />;
}
