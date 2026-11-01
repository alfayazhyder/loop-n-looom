import type { Metadata } from "next";
import AdminOrderManager from "@/components/admin/AdminOrderManager";

export const metadata: Metadata = {
  title: "Orders & Fulfillment | Admin",
  robots: { index: false, follow: false },
};

export default function AdminOrdersPage() {
  return <AdminOrderManager />;
}
