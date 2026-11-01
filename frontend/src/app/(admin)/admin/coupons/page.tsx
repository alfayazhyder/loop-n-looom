import type { Metadata } from "next";
import MarketingCenter from "@/components/admin/MarketingCenter";
export const metadata: Metadata = { title: "Coupon Management | Studio Admin", robots: { index: false, follow: false } };
export default function AdminCouponsPage() { return <MarketingCenter section="coupons" />; }
