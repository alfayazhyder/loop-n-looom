import type { Metadata } from "next";
import MyReviews from "@/components/reviews/MyReviews";

export const metadata: Metadata = { title: "My Product Reviews" };

export default function ReviewsPage() {
  return <MyReviews />;
}
