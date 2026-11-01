import type { Metadata } from "next";
import AdminCustomers from "@/components/admin/AdminCustomers";

export const metadata: Metadata = { title: "Customer Profile | Admin", description: "Private customer record", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <AdminCustomers customerId={customerId} />;
}
