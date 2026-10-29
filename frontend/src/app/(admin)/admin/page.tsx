import type { Metadata } from "next";

import AdminDashboard from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Store Administration",
  description: "LOOP_N_LOOOM private operations dashboard.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
