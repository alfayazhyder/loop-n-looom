import type { Metadata } from "next";

import SearchExperience from "@/components/search/SearchExperience";
import { parseProductSearch, productSearchKey, type SearchParamsInput } from "@/lib/productSearch";

export const metadata: Metadata = {
  title: "Search Handmade Gifts | LOOP_N_LOOOM",
  description:
    "Find handcrafted crochet bouquets and thoughtful handmade gifts. Filter by occasion, category, colour, price and availability.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsInput>;
}) {
  const filters = parseProductSearch(await searchParams);
  return <SearchExperience key={productSearchKey(filters)} filters={filters} />;
}
