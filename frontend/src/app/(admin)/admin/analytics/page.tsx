import type { Metadata } from "next";
import MarketingCenter from "@/components/admin/MarketingCenter";
export const metadata: Metadata = { title: "Sales Analytics | Studio Admin", robots: { index: false, follow: false } };
export default function AdminAnalyticsPage() { return <MarketingCenter section="analytics" />; }
