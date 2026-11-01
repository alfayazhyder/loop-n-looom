import type { Metadata } from "next";
import AdminReviews from "@/components/admin/AdminReviews";

export const metadata: Metadata = { title: "Review Details | Admin", description: "Customer review details", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  return <AdminReviews reviewId={reviewId} />;
}
