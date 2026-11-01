import type { Metadata } from "next";
import { AdminCustomRequestList } from "@/components/admin/CustomRequestManager";

export const metadata: Metadata = {
  title: "Custom Requests | Studio Admin",
  robots: { index: false, follow: false },
};

export default function AdminCustomRequestsPage() {
  return <AdminCustomRequestList />;
}
