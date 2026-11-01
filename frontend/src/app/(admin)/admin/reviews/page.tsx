import type { Metadata } from "next";
import AdminReviews from "@/components/admin/AdminReviews";

export const metadata: Metadata = { title: "Review Moderation | Admin", description: "Review moderation workspace", robots: { index: false, follow: false } };
export default function Page() { return <AdminReviews />; }
