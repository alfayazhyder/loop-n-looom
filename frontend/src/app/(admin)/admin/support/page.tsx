import type { Metadata } from "next";
import AdminSupport from "@/components/admin/AdminSupport";

export const metadata: Metadata = { title: "Customer Support | Admin", description: "Private support inbox", robots: { index: false, follow: false } };
export default function Page() { return <AdminSupport />; }
