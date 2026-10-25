/** Existing REST support contract; authentication uses HttpOnly cookies. */
export const customerSupportBase = '/api/customer/support';

export type SupportConversationStatus = 'OPEN' | 'CLOSED';

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderUserId: string | null;
  senderType: string;
  body: string;
  attachmentUrl: string | null;
  createdAt: string;
  senderUser?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
  } | null;
}

export interface SupportConversation {
  id: string;
  userId: string | null;
  subject: string | null;
  status: SupportConversationStatus;
  orderId: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: SupportMessage[];
  assignedAdmin?: { id: string; firstName: string | null; lastName: string | null } | null;
  order?: { id: string; orderNumber: string; status: string } | null;
}

export interface SupportPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SupportListResponse {
  conversations: SupportConversation[];
  pagination: SupportPagination;
}

export interface SupportDetailResponse {
  conversation: SupportConversation;
  messages: SupportMessage[];
  messagePagination: SupportPagination;
}

export interface CreateSupportResponse {
  conversation: SupportConversation;
  initialMessage: SupportMessage;
  message: string;
}

export function formatSupportDate(value: string | null | undefined) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-AE', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** Never let a stored attachment turn into a javascript: or file: link. */
export function safeSupportAttachment(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}
