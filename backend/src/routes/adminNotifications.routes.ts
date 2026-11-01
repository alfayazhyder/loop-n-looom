import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";

// Mounted only inside adminRouter AFTER requireAuth + requireAdmin, rate limit,
// and Cache-Control: no-store. This is a read-only operational view.
// It never sends messages or exposes message bodies, recipient addresses,
// phone numbers, provider IDs or provider error details.
const router = Router();
const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  status: z.enum(["QUEUED", "SENT", "FAILED"]).optional(),
  channel: z.enum(["EMAIL", "WHATSAPP"]).optional(),
});
router.get("/notifications", async (req, res, next) => {
  const result = querySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ message: "Invalid notification query." });
    return;
  }
  try {
    const { page, status, channel } = result.data;
    const limit = 20;
    const where: Prisma.NotificationWhereInput = {
      ...(status ? { status } : {}),
      ...(channel ? { channel } : {}),
    };
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, channel: true, templateKey: true, subject: true,
          status: true, createdAt: true, sentAt: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);
    res.status(200).json({
      notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      note: "Queue records are not proof of external provider delivery. No send or retry controls are enabled.",
    });
  } catch (error) { next(error); }
});
export default router;
