import { authenticatedRequest } from "@/lib/session";

export const ORDER_STATUSES = [
  "PENDING_PAYMENT", "PAID", "CONFIRMED", "IN_PRODUCTION", "QUALITY_CHECK",
  "READY_FOR_PACKING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED",
  "CANCELLED", "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const SHIPMENT_STATUSES = [
  "PENDING", "READY_FOR_PICKUP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED",
] as const;

export const NEXT_ORDER_STATUS: Record<string, string | undefined> = {
  PAID: "CONFIRMED", CONFIRMED: "IN_PRODUCTION", IN_PRODUCTION: "QUALITY_CHECK",
  QUALITY_CHECK: "READY_FOR_PACKING", READY_FOR_PACKING: "PACKED",
  PACKED: "OUT_FOR_DELIVERY", OUT_FOR_DELIVERY: "DELIVERED",
};

export type Shipment = {
  id?: string;
  status: string;
  courier: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  estimatedDeliveryAt: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
};
export type MoneyAmounts = {
  subtotal: number; discountAmount: number; storeCreditAmount: number;
  giftWrapAmount: number; deliveryFee: number; taxAmount: number; totalAmount: number;
};
export type AdminOrderRow = {
  id: string; orderNumber: string; status: string; currency: string;
  customer: { name: string; email: string; phone: string };
  destination: { emirate: string; city: string };
  amounts: MoneyAmounts; itemCount: number; giftWrapSelected: boolean;
  placedAt: string; paidAt: string | null; estimatedDeliveryAt: string | null;
  cancelledAt: string | null; deliveredAt: string | null; shipment: Shipment | null;
};
export type AdminOrdersPage = {
  orders: AdminOrderRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};
export type AdminOrderDetail = {
  id: string; orderNumber: string; status: string; currency: string;
  customer: { account?: { id: string; email: string } | null; name: string; email: string; phone: string };
  shippingAddress: {
    recipientName: string; phone: string; emirate: string; city: string;
    area: string; street: string; building: string | null;
    apartmentOrVilla: string | null; landmark: string | null;
    deliveryInstructions: string | null;
  };
  amounts: MoneyAmounts; couponCode: string | null;
  gift: { selected: boolean; message: string | null };
  placedAt: string; paidAt: string | null; estimatedDeliveryAt: string | null;
  cancelledAt: string | null; deliveredAt: string | null;
  items: Array<{
    id: string; itemType: string; productName: string; variantName: string | null;
    sku: string | null; unitPrice: number; quantity: number; subtotal: number;
    fulfillmentType: string; productionMinDays: number | null;
    productionMaxDays: number | null; customization: unknown;
  }>;
  statusHistory: Array<{ id: string; status: string; note: string | null; createdAt: string;
    updatedBy?: { firstName: string | null; lastName: string | null; email: string } | null;
  }>;
  media: Array<{ id: string; type: string; url: string; caption: string | null; createdAt: string }>;
  shipment: Shipment | null;
  payments: Array<{ id: string; status: string; method: string; amount: number | string; currency?: string }>;
};

export const statusLabel = (text: string) =>
  text.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, character => character.toUpperCase());
export const aed = (amount: number | string | undefined | null) =>
  new Intl.NumberFormat("en-AE", { style: "currency", currency: "AED" }).format(Number(amount ?? 0));
export const uaeDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai",
  }).format(date);
};

export function listOrders(filters: { page: number; status: string; search: string }) {
  const params = new URLSearchParams({ page: String(filters.page), limit: "12" });
  if (filters.status) params.set("status", filters.status);
  if (filters.search.trim()) params.set("search", filters.search.trim());
  return authenticatedRequest<AdminOrdersPage>(`/api/admin/orders?${params}`);
}
export async function getOrder(orderId: string): Promise<AdminOrderDetail> {
  const response = await authenticatedRequest<{ order: AdminOrderDetail }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}`,
  );
  return response.order;
}
export function updateOrderStatus(orderId: string, status: string, note: string) {
  return authenticatedRequest<{ message: string; order: AdminOrderDetail }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
    { method: "PATCH", body: JSON.stringify({ status, ...(note.trim() ? { note: note.trim() } : {}) }) },
  );
}
export function updateShipment(orderId: string, data: {
  courier?: string | null; trackingNumber?: string | null;
  trackingUrl?: string | null; estimatedDeliveryAt?: string | null;
}) {
  return authenticatedRequest<{ message: string; order: AdminOrderDetail }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/shipment`,
    { method: "PUT", body: JSON.stringify(data) },
  );
}
export function addQcPhoto(orderId: string, url: string, caption: string) {
  return authenticatedRequest<{ message: string; photos: unknown[] }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/qc-photos`,
    { method: "POST", body: JSON.stringify({ photos: [{ url, ...(caption.trim() ? { caption: caption.trim() } : {}) }] }) },
  );
}
export function removeQcPhoto(orderId: string, mediaId: string) {
  return authenticatedRequest<{ message: string }>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/qc-photos/${encodeURIComponent(mediaId)}`,
    { method: "DELETE" },
  );
}
