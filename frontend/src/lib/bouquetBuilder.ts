import type { CrochetRequestForm } from "@/lib/customRequests";

export const flowerOptions = [
  { id: "rose", name: "Crochet rose", caption: "Soft, romantic petals" },
  { id: "tulip", name: "Crochet tulip", caption: "Simple and graceful" },
  { id: "daisy", name: "Crochet daisy", caption: "Cheerful and delicate" },
  { id: "lavender", name: "Crochet lavender", caption: "A gentle garden touch" },
  { id: "sunflower", name: "Crochet sunflower", caption: "Warm and sunny" },
] as const;

export type FlowerId = (typeof flowerOptions)[number]["id"];
export type FlowerCounts = Record<FlowerId, number>;

export const initialFlowers: FlowerCounts = {
  rose: 2,
  tulip: 1,
  daisy: 1,
  lavender: 0,
  sunflower: 0,
};

export const palettes = [
  { id: "blush", name: "Blush & ivory", colors: ["#E8A5B2", "#F6E8D8", "#D5A2A8"], names: ["blush pink", "ivory", "dusty rose"] },
  { id: "lilac", name: "Lilac garden", colors: ["#AD92C9", "#E6D8EB", "#EAC6D0"], names: ["lilac", "soft purple", "pale pink"] },
  { id: "sunset", name: "Golden hour", colors: ["#DDA559", "#E7B891", "#DB8374"], names: ["golden yellow", "peach", "coral"] },
  { id: "classic", name: "Classic romance", colors: ["#B65162", "#E9B5B7", "#F4E9DB"], names: ["deep rose", "soft pink", "cream"] },
] as const;

export const wraps = [
  { id: "cream", name: "Warm cream", color: "#EEDCC5" },
  { id: "blush", name: "Soft blush", color: "#F0CACD" },
  { id: "cocoa", name: "Cocoa kraft", color: "#B49C88" },
  { id: "sage", name: "Sage green", color: "#C6D1C1" },
] as const;

export const ribbons = [
  { id: "ivory", name: "Ivory", color: "#FBF3E8" },
  { id: "rose", name: "Dusty rose", color: "#B77B83" },
  { id: "cocoa", name: "Cocoa", color: "#695449" },
] as const;

export const occasions = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Thank you",
  "Congratulations",
  "Just because",
  "Other",
] as const;

export type BouquetPalette = (typeof palettes)[number];
export type BouquetWrap = (typeof wraps)[number];
export type BouquetRibbon = (typeof ribbons)[number];

export interface BouquetDesign {
  flowers: FlowerCounts;
  palette: BouquetPalette;
  wrap: BouquetWrap;
  ribbon: BouquetRibbon;
  occasion: string;
  cardMessage: string;
  specialNotes: string;
  targetDate: string;
  budgetMin: string;
  budgetMax: string;
}

export const MAX_STEMS = 12;

export function stemCount(flowers: FlowerCounts): number {
  return flowerOptions.reduce((total, flower) => total + flowers[flower.id], 0);
}

export function describeFlowers(flowers: FlowerCounts): string {
  return flowerOptions
    .filter((flower) => flowers[flower.id] > 0)
    .map((flower) => `${flower.name} x ${flowers[flower.id]}`)
    .join(", ");
}

/**
 * The current backend has a custom-request quotation workflow, but no
 * publicly exposed bouquet-build create/pricing endpoint. Submit a detailed
 * design brief; do not claim that these options represent live inventory.
 */
export function makeBouquetRequest(design: BouquetDesign): CrochetRequestForm {
  const count = stemCount(design.flowers);
  if (count < 1 || count > MAX_STEMS) {
    throw new Error(`Choose between 1 and ${MAX_STEMS} flower stems.`);
  }

  const min = design.budgetMin.trim() === "" ? undefined : Number(design.budgetMin);
  const max = design.budgetMax.trim() === "" ? undefined : Number(design.budgetMax);
  if (
    (min !== undefined && (!Number.isFinite(min) || min < 0 || min > 1000000)) ||
    (max !== undefined && (!Number.isFinite(max) || max < 0 || max > 1000000)) ||
    (min !== undefined && max !== undefined && min > max)
  ) {
    throw new Error("Enter a valid AED budget (minimum cannot exceed maximum). ");
  }

  let targetDate: string | undefined;
  if (design.targetDate) {
    const date = new Date(`${design.targetDate}T12:00:00+04:00`);
    if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) {
      throw new Error("Choose a future preferred delivery date.");
    }
    targetDate = date.toISOString();
  }

  const description = [
    "BOUQUET BUILDER DESIGN BRIEF — request for a maker's quotation, not an order.",
    `Flowers (${count} stems): ${describeFlowers(design.flowers)}.`,
    `Flower colours: ${design.palette.name} (${design.palette.names.join(", ")}).`,
    `Wrapping preference: ${design.wrap.name}.`,
    `Ribbon preference: ${design.ribbon.name}.`,
    `Occasion: ${design.occasion || "Not specified"}.`,
    `Gift card message: ${design.cardMessage.trim() || "None requested"}.`,
    `Additional wishes: ${design.specialNotes.trim() || "None"}.`,
    "Design options and availability must be confirmed by the maker. Pricing is not final until a quotation is issued.",
  ].join("\n");

  if (description.length > 5000) {
    throw new Error("The combined bouquet brief is too long. Shorten your notes.");
  }

  return {
    title: `Handmade crochet bouquet — ${design.occasion || "personalised gift"}`,
    description,
    colors: [...design.palette.names, design.wrap.name, design.ribbon.name],
    size: `${count} flower stems (requested)`,
    ...(design.occasion ? { occasion: design.occasion } : {}),
    ...(targetDate ? { targetDate } : {}),
    ...(min !== undefined ? { budgetMin: min } : {}),
    ...(max !== undefined ? { budgetMax: max } : {}),
  };
}
