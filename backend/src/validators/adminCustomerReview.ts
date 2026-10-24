import { z } from "zod";

const uuid = z.string().uuid();

const pagination = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
};

export const adminCustomerQuerySchema = z.object({
  ...pagination,
  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]).optional(),
  search: z.string().trim().max(120).default(""),
});

export const adminReviewQuerySchema = z.object({
  ...pagination,
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  search: z.string().trim().max(120).default(""),
});

export const adminCustomerParamsSchema = z.object({
  customerId: uuid,
});

export const adminReviewParamsSchema = z.object({
  reviewId: uuid,
});

export const adminCustomerStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]),
}).strict();

export const adminReviewModerationSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
}).strict();

export type AdminCustomerQuery =
  z.infer<typeof adminCustomerQuerySchema>;

export type AdminReviewQuery =
  z.infer<typeof adminReviewQuerySchema>;

export type AdminCustomerStatus =
  z.infer<typeof adminCustomerStatusSchema>["status"];

export type AdminReviewStatus =
  z.infer<typeof adminReviewModerationSchema>["status"];