import type { Metadata } from "next";
import MarketingCenter from "@/components/admin/MarketingCenter";
export const metadata: Metadata = { title: "Newsletter Management | Studio Admin", robots: { index: false, follow: false } };
export default function AdminMarketingPage() { return <MarketingCenter section="marketing" />; }
