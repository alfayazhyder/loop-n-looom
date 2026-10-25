import type { Metadata } from "next";

import CheckoutPreparation from "@/components/checkout/CheckoutPreparation";

export const metadata: Metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return <CheckoutPreparation />;
}