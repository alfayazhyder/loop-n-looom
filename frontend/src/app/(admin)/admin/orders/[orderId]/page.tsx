import type { Metadata } from "next";
import AdminOrderManager from "@/components/admin/AdminOrderManager";

export const metadata: Metadata = {
  title: "Order Fulfillment | Admin",
  robots: { index: false, follow: false },
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <AdminOrderManager orderId={orderId} />;
}
