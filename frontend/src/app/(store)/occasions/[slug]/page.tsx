import Link from "next/link";
import { notFound } from "next/navigation";

import CatalogGrid from "@/components/shop/CatalogGrid";

export default async function OccasionProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    notFound();
  }

  return (
    <>
      <div className="bg-brand-cream pt-8">
        <div className="page-container">
          <Link
            href="/occasions"
            className="text-sm font-medium text-[#6B5A50] transition-colors hover:text-brand-cocoa"
          >
            &larr; Browse all occasions
          </Link>
        </div>
      </div>
      <CatalogGrid occasion={slug} />
    </>
  );
}
