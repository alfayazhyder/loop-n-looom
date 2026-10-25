import type { Metadata } from "next";

import CatalogGrid from "@/components/shop/CatalogGrid";

export const metadata: Metadata = {
  title: "Shop Handmade Gifts",
  description:
    "Shop crochet bouquets, personalised gifts and handmade creations across the UAE.",
};

export default function ShopPage() {
  return <CatalogGrid />;
}