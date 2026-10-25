export const reminderBase = '/api/customer/reminders';
export const notificationBase = '/api/customer/notifications';

export interface OccasionReminder {
  id: string;
  title: string;
  recipientName?: string | null;
  occasionLabel?: string | null;
  eventDate: string;
  reminderDaysBefore: number;
  recursYearly: boolean;
  isActive: boolean;
  createdAt?: string;
}
export interface ReminderFormPayload {
  title: string;
  recipientName?: string;
  occasionLabel?: string;
  eventDate: string;
  reminderDaysBefore: number;
  recursYearly: boolean;
  isActive: boolean;
}
export interface CustomerNotification {
  id: string;
  channel?: 'EMAIL' | 'WHATSAPP' | string;
  subject?: string | null;
  body?: string | null;
  templateKey?: string | null;
  status?: string | null;
  readAt?: string | null;
  createdAt: string;
  sentAt?: string | null;
  orderId?: string | null;
}
export interface Pagination {
  page?: number;
  limit?: number;
  pageSize?: number;
  total?: number;
  totalItems?: number;
  totalPages?: number;
}
export function readReminderList(data: OccasionReminder[] | { reminders: OccasionReminder[]; pagination?: Pagination }): { reminders: OccasionReminder[]; pagination?: Pagination } {
  if (Array.isArray(data)) return { reminders: data };
  if (data && Array.isArray(data.reminders)) return data;
  throw new Error('Unexpected reminder list response.');
}
export function readNotifications(data: CustomerNotification[] | { notifications: CustomerNotification[]; pagination?: Pagination }): { notifications: CustomerNotification[]; pagination?: Pagination } {
  if (Array.isArray(data)) return { notifications: data };
  if (data && Array.isArray(data.notifications)) return data;
  throw new Error('Unexpected notification list response.');
}
export function eventLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dubai' });
}
export function formattedStatus(value: string | null | undefined): string {
  return value ? value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase()) : 'Pending';
}

export function dateInputValue(value: string): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(time));
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
