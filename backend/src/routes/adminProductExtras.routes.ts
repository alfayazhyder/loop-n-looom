import { Router, raw } from "express";
import { z } from "zod";
import {
  ProductExtrasError, addProductPhoto, photoUploadEnabled, removeProductPhoto,
  reorderProductPhotos, setProductOccasions, updateProductPhoto,
} from "../services/adminProductExtras.service";

// Mounted beneath the existing /api/admin router, which enforces requireAuth,
// requireAdmin, rate limiting, and no-store on every route here.
const router = Router();
const product = z.string().uuid();
const media = z.string().uuid();
const occasions = z.object({ occasionIds: z.array(z.string().uuid()).max(30).refine(ids => new Set(ids).size === ids.length) });
const photoOrder = z.object({ photoIds: z.array(media).min(1).max(24), primaryId: media });
const photoAlt = z.object({ altTextEn: z.string().trim().max(250), altTextAr: z.string().trim().max(250) });

function report(error: unknown, res: import("express").Response) {
  if (error instanceof ProductExtrasError) return res.status(error.status).json({ message: error.message });
  throw error;
}

router.get("/media-status", (_req, res) => res.json({ uploadEnabled: photoUploadEnabled(), maxBytes: 8 * 1024 * 1024 }));

router.put("/products/:productId/occasions", async (req, res) => {
  const id = product.safeParse(req.params.productId);
  const body = occasions.safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ message: "Invalid product or occasions." }); return; }
  try { res.json({ occasionLinks: await setProductOccasions(id.data, body.data.occasionIds) }); }
  catch (error) { report(error, res); }
});

router.post("/products/:productId/media", raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "8mb" }), async (req, res) => {
  const id = product.safeParse(req.params.productId);
  if (!id.success) { res.status(400).json({ message: "Invalid product ID." }); return; }
  if (!Buffer.isBuffer(req.body)) { res.status(415).json({ message: "Upload a JPEG, PNG or WebP image." }); return; }
  try { res.status(201).json({ photo: await addProductPhoto(id.data, req.body, req.headers["content-type"]?.split(";")[0]?.toLowerCase() ?? "") }); }
  catch (error) { report(error, res); }
});

router.patch("/products/:productId/media/order", async (req, res) => {
  const id = product.safeParse(req.params.productId);
  const body = photoOrder.safeParse(req.body);
  if (!id.success || !body.success) { res.status(400).json({ message: "Invalid photo order." }); return; }
  try { res.json({ media: await reorderProductPhotos(id.data, body.data.photoIds, body.data.primaryId) }); }
  catch (error) { report(error, res); }
});

router.patch("/products/:productId/media/:mediaId", async (req, res) => {
  const id = product.safeParse(req.params.productId);
  const mid = media.safeParse(req.params.mediaId);
  const body = photoAlt.safeParse(req.body);
  if (!id.success || !mid.success || !body.success) { res.status(400).json({ message: "Invalid image details." }); return; }
  try { res.json({ photo: await updateProductPhoto(id.data, mid.data, body.data.altTextEn, body.data.altTextAr) }); }
  catch (error) { report(error, res); }
});

router.delete("/products/:productId/media/:mediaId", async (req, res) => {
  const id = product.safeParse(req.params.productId);
  const mid = media.safeParse(req.params.mediaId);
  if (!id.success || !mid.success) { res.status(400).json({ message: "Invalid product or photo ID." }); return; }
  try { res.json({ removed: await removeProductPhoto(id.data, mid.data) }); }
  catch (error) { report(error, res); }
});

export default router;
