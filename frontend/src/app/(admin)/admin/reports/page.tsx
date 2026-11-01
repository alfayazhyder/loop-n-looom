import type { Metadata } from "next";
import MarketingCenter from "@/components/admin/MarketingCenter";
export const metadata: Metadata = { title: "Business Reports | Studio Admin", robots: { index: false, follow: false } };
export default function AdminReportsPage() { return <MarketingCenter section="reports" />; }
