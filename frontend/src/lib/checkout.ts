export type Emirate =
  | "ABU_DHABI"
  | "DUBAI"
  | "SHARJAH"
  | "AJMAN"
  | "UMM_AL_QUWAIN"
  | "RAS_AL_KHAIMAH"
  | "FUJAIRAH";

export type PaymentMethod = "APPLE_PAY" | "VISA" | "MASTERCARD";

export interface ShippingAddress {
  recipientName: string;
  phone: string;
  emirate: Emirate;
  city: string;
  area: string;
  street?: string;
  building?: string;
  apartmentOrVilla?: string;
  landmark?: string;
  deliveryInstructions?: string;
}

export interface SavedAddress extends ShippingAddress {
  id: string;
  isDefault: boolean;
}

export interface CheckoutPayload {
  addressId?: string;
  shippingAddress?: ShippingAddress;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

export interface Amounts {
  subtotal: number;
  discountAmount: number;
  storeCreditAmount: number;
  giftWrapAmount: number;
  deliveryFee: number;
  taxAmount: number;
  total: number;
  currency: string;
}

export interface CheckoutPreview {
  cartId: string;
  customer: { name: string; email: string; phone: string };
  shippingAddress: ShippingAddress;
  couponCode: string | null;
  giftWrapSelected: boolean;
  giftMessage: string | null;
  items: Array<{
    cartItemId: string;
    productName: string;
    variantName: string | null;
    itemType: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  paymentMethods: PaymentMethod[];
  estimatedDeliveryAt: string;
  summary: Amounts;
}

export interface OrderItem {
  id: string;
  productName: string;
  variantName: string | null;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  itemType: string;
}

export interface PaymentSummary {
  id: string;
  method: PaymentMethod;
  status: string;
  amount: number;
  currency: string;
  failureReason: string | null;
}

export interface Shipment {
  status: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDeliveryAt: string | null;
  deliveredAt: string | null;
}

export interface Timeline {
  currentStatus: string;
  isTerminal: boolean;
  completedStatuses: string[];
  events: Array<{ id: string; status: string; createdAt: string }>;
}

export interface OrderMedia {
  id: string;
  url: string | null;
  caption: string | null;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  placedAt: string;
  estimatedDeliveryAt: string | null;
  amounts: Omit<Amounts, "total" | "currency"> & { totalAmount: number };
  items: OrderItem[];
  latestPayment: PaymentSummary | null;
  shipment: Shipment | null;
}

export interface OrderListResponse {
  orders: OrderListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface OrderDetail extends Omit<OrderListItem, "latestPayment"> {
  customer: { name: string; email: string; phone: string };
  shippingAddress: ShippingAddress;
  payments: PaymentSummary[];
  tracking: Timeline;
  media: OrderMedia[];
  couponCode: string | null;
  giftWrapSelected: boolean;
  giftMessage: string | null;
}

export interface TrackingResult {
  orderNumber: string;
  status: string;
  placedAt: string;
  estimatedDeliveryAt: string | null;
  destination: { recipientName: string; emirate: string; city: string; area: string };
  amounts: { totalAmount: number };
  items: OrderItem[];
  payments: PaymentSummary[];
  shipment: Shipment | null;
  tracking: Timeline;
  media: OrderMedia[];
}

export const emirates: Array<{ value: Emirate; label: string }> = [
  { value: "ABU_DHABI", label: "Abu Dhabi" },
  { value: "DUBAI", label: "Dubai" },
  { value: "SHARJAH", label: "Sharjah" },
  { value: "AJMAN", label: "Ajman" },
  { value: "UMM_AL_QUWAIN", label: "Umm Al Quwain" },
  { value: "RAS_AL_KHAIMAH", label: "Ras Al Khaimah" },
  { value: "FUJAIRAH", label: "Fujairah" },
];

export const orderStatuses = [
  "PENDING_PAYMENT", "PAID", "CONFIRMED", "IN_PRODUCTION",
  "QUALITY_CHECK", "READY_FOR_PACKING", "PACKED",
  "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED",
] as const;

export const label = (value: string): string =>
  value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export function money(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  return `AED ${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
}

export function dateLabel(value: string | null | undefined): string {
  if (!value) return "Not available";
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return "Not available";
  return timestamp.toLocaleDateString("en-AE", {
    day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai",
  });
}

export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}
