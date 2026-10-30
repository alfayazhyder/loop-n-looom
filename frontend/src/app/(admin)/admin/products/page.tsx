import type { Metadata } from "next";
import ProductManager from "@/components/admin/ProductManager";

export const metadata: Metadata = {
  title: "Manage Products",
  description: "Private product catalogue and image management.",
  robots: { index: false, follow: false },
};

export default function AdminProductsPage() {
  return <ProductManager />;
}
