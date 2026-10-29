import type { Metadata } from "next";
import BouquetStudio from "@/components/bouquet/BouquetStudio";

export const metadata: Metadata = {
  title: "Build Your Crochet Bouquet",
  description: "Create a personalised crochet bouquet concept and request a handmade quotation from LOOP_N_LOOOM.",
};

export default function BuildBouquetPage() {
  return <BouquetStudio />;
}
