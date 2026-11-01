import { z } from "zod";

export const customerQcReviewParamsSchema = z.object({
  orderId: z.string().uuid(),
}).strict();

export const customerQcReviewBodySchema = z.object({
  decision: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  note: z.string().trim().max(1000).optional(),
}).strict().superRefine((data, ctx) => {
  if (data.decision === "CHANGES_REQUESTED" && (!data.note || data.note.length < 10)) {
    ctx.addIssue({
      code: "custom",
      path: ["note"],
      message: "Please describe the requested changes in at least 10 characters.",
    });
  }
  if (data.decision === "APPROVED" && data.note) {
    ctx.addIssue({
      code: "custom",
      path: ["note"],
      message: "Approval does not accept a changes-request note.",
    });
  }
});

export type CustomerQcReviewInput = z.infer<typeof customerQcReviewBodySchema>;
