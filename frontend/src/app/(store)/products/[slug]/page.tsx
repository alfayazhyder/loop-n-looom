import ProductDetail from "@/components/shop/ProductDetail";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <ProductDetail slug={slug} />;
}