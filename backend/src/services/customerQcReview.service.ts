import { createHash } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import type { CustomerQcReviewInput } from "../validators/customerQcReview";

export class CustomerQcReviewError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "CustomerQcReviewError";
  }
}

// Bind consent to the exact server-held set of QC image identities, URLs and captions.
// A subsequent add/remove invalidates prior consent, including when the count is unchanged.
export async function qcPhotoFingerprint(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<string | null> {
  const photos = await tx.orderMedia.findMany({
    where: { orderId, type: "QUALITY_CHECK_PHOTO" },
    select: { id: true, url: true, caption: true },
    orderBy: { id: "asc" },
  });
  if (photos.length === 0) return null;
  for (const photo of photos) {
    try {
      const parsed = new URL(photo.url);
      if (parsed.protocol !== "https:") throw new Error("HTTPS required");
    } catch {
      return null; // An unseen/insecure image may not be approved for packing.
    }
  }
  return createHash("sha256")
    .update(JSON.stringify(photos.map(({ id, url, caption }) => [id, url, caption])))
    .digest("hex");
}

export async function submitCustomerQcReview(
  userId: string,
  orderId: string,
  input: CustomerQcReviewInput,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true, qcStatus: true },
    });
    // Return 404 for another customer's order, including guest orders.
    if (!order || order.userId !== userId) {
      throw new CustomerQcReviewError("Order not found.", 404);
    }
    if (order.status !== "QUALITY_CHECK") {
      throw new CustomerQcReviewError("This order is not awaiting a quality review.", 409);
    }
    if (order.qcStatus === "APPROVED") {
      throw new CustomerQcReviewError("Quality-check images have already been approved.", 409);
    }
    if (order.qcStatus === "CHANGES_REQUESTED") {
      throw new CustomerQcReviewError("Please wait for updated quality-check images from the studio.", 409);
    }
    const photoFingerprint = await qcPhotoFingerprint(tx, orderId);
    if (!photoFingerprint) {
      throw new CustomerQcReviewError("At least one viewable HTTPS quality-check image is required.", 409);
    }
    const reviewedAt = new Date();
    const updated = await tx.order.updateMany({
      where: { id: orderId, userId, status: "QUALITY_CHECK", qcStatus: "PENDING" },
      data: {
        qcStatus: input.decision,
        qcReviewedAt: reviewedAt,
        qcReviewNote: input.decision === "CHANGES_REQUESTED" ? input.note : null,
        qcPhotoFingerprint: photoFingerprint,
      },
    });
    if (updated.count !== 1) {
      throw new CustomerQcReviewError("The order changed. Refresh and review the latest photos.", 409);
    }
    await tx.orderQcReview.create({
      data: {
        orderId,
        userId,
        decision: input.decision,
        note: input.decision === "CHANGES_REQUESTED" ? input.note : null,
        photoFingerprint,
      },
    });
    return {
      status: input.decision,
      reviewedAt,
      note: input.decision === "CHANGES_REQUESTED" ? input.note : null,
    };
  }, { isolationLevel: "Serializable" });
}
