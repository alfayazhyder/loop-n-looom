import type { Metadata } from "next";
import AdminCustomers from "@/components/admin/AdminCustomers";

export const metadata: Metadata = { title: "Customers | Admin", description: "Private customer directory", robots: { index: false, follow: false } };
export default function Page() { return <AdminCustomers />; }
