import CatalogGrid from "@/components/shop/CatalogGrid";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;

  return <CatalogGrid category={category} />;
}