import type { Metadata } from "next";
import AdminNotifications from "@/components/admin/AdminNotifications";
export const metadata: Metadata = { title: "Notifications | Admin", robots: { index: false, follow: false } };
export default function Page() { return <AdminNotifications />; }
