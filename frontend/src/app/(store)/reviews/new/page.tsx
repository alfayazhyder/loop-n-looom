import type { Metadata } from "next";
import WriteReview from "@/components/reviews/WriteReview";

export const metadata: Metadata = { title: "Write a Product Review" };

export default async function NewReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ orderItemId?: string | string[] }>;
}) {
  const { orderItemId } = await searchParams;
  return <WriteReview orderItemId={typeof orderItemId === "string" ? orderItemId : ""} />;
}
