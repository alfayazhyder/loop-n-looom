import type { Metadata } from "next";
import OrderDetailView from "@/components/orders/OrderDetailView";

export const metadata: Metadata = { title: "Order Details" };

export default async function OrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderDetailView orderId={orderId} />;
}
