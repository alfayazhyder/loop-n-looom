import { createHash } from "node:crypto";
import { prisma } from "../lib/prisma";

const PHOTO_LIMIT = 8 * 1024 * 1024;
const MAX_PHOTOS = 24;
const cloudFolder = (productId: string) => `loop-n-looom/products/${productId}`;

export class ProductExtrasError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

function credentials() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const key = process.env.CLOUDINARY_API_KEY?.trim();
  const secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud || !key || !secret || !/^[A-Za-z0-9_-]+$/.test(cloud)) return null;
  return { cloud, key, secret };
}

export function photoUploadEnabled() {
  return credentials() !== null;
}

export async function requireProduct(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!product) throw new ProductExtrasError("Product not found.", 404);
}

function sign(params: Record<string, string>, secret: string) {
  const canonical = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("&");
  return createHash("sha1").update(canonical + secret).digest("hex");
}

async function cloudinary(action: "upload" | "destroy", params: Record<string, string>, file?: Buffer, mime?: string) {
  const config = credentials();
  if (!config) throw new ProductExtrasError("Photo uploads require Cloudinary configuration. Contact the store administrator.", 503);
  const form = new FormData();
  for (const [key, value] of Object.entries(params)) form.set(key, value);
  form.set("api_key", config.key);
  form.set("signature", sign(params, config.secret));
  if (file && mime) form.set("file", new Blob([new Uint8Array(file)], { type: mime }), "product-image");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloud}/image/${action}`, {
      method: "POST", body: form, signal: controller.signal,
    });
    const result: unknown = await response.json();
    if (!response.ok || !result || typeof result !== "object") {
      throw new ProductExtrasError("Image service rejected the request.", 502);
    }
    return result as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ProductExtrasError) throw error;
    throw new ProductExtrasError("Image service is unavailable. Please try again.", 502);
  } finally { clearTimeout(timeout); }
}

function imageValid(bytes: Buffer, mime: string) {
  if (bytes.length === 0 || bytes.length > PHOTO_LIMIT) return false;
  if (mime === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/webp") return bytes.length > 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function addProductPhoto(productId: string, bytes: Buffer, mime: string) {
  await requireProduct(productId);
  if (!imageValid(bytes, mime)) throw new ProductExtrasError("Use a PNG, JPEG, or WebP image smaller than 8 MB.", 400);
  const count = await prisma.productMedia.count({ where: { productId } });
  if (count >= MAX_PHOTOS) throw new ProductExtrasError("Maximum of 24 images per product.", 409);
  const params = { folder: cloudFolder(productId), timestamp: String(Math.floor(Date.now() / 1000)) };
  const asset = await cloudinary("upload", params, bytes, mime);
  const url = asset.secure_url;
  const publicId = asset.public_id;
  const config = credentials();
  if (typeof url !== "string" || typeof publicId !== "string" || !config ||
      !url.startsWith(`https://res.cloudinary.com/${config.cloud}/`) ||
      !publicId.startsWith(`${cloudFolder(productId)}/`)) {
    throw new ProductExtrasError("Image service returned unexpected asset details.", 502);
  }
  try {
    return await prisma.productMedia.create({ data: {
      productId, type: "IMAGE", url, publicId, sortOrder: count,
      isPrimary: count === 0,
    } });
  } catch (error) {
    try { await destroyCloudImage(publicId); } catch { /* Report original database failure. */ }
    throw error;
  }
}

async function destroyCloudImage(publicId: string) {
  const params = { public_id: publicId, timestamp: String(Math.floor(Date.now() / 1000)) };
  const result = await cloudinary("destroy", params);
  if (result.result !== "ok" && result.result !== "not found") {
    throw new ProductExtrasError("Could not remove image from cloud storage.", 502);
  }
}

export async function removeProductPhoto(productId: string, mediaId: string) {
  const entry = await prisma.productMedia.findFirst({ where: { id: mediaId, productId } });
  if (!entry) throw new ProductExtrasError("Product photo not found.", 404);
  // Never destroy arbitrary Cloudinary assets from imported/legacy media records.
  if (entry.publicId?.startsWith(`${cloudFolder(productId)}/`)) await destroyCloudImage(entry.publicId);
  return prisma.$transaction(async tx => {
    await tx.productMedia.delete({ where: { id: mediaId } });
    if (entry.isPrimary) {
      const first = await tx.productMedia.findFirst({ where: { productId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
      if (first) await tx.productMedia.update({ where: { id: first.id }, data: { isPrimary: true } });
    }
    return { id: mediaId };
  });
}

export async function updateProductPhoto(productId: string, mediaId: string, altTextEn: string, altTextAr: string) {
  const found = await prisma.productMedia.findFirst({ where: { productId, id: mediaId } });
  if (!found) throw new ProductExtrasError("Product photo not found.", 404);
  return prisma.productMedia.update({ where: { id: mediaId }, data: { altTextEn, altTextAr } });
}

export async function reorderProductPhotos(productId: string, photoIds: string[], primaryId: string) {
  await requireProduct(productId);
  const photos = await prisma.productMedia.findMany({ where: { productId }, select: { id: true } });
  if (photos.length !== photoIds.length || !photoIds.includes(primaryId) ||
    new Set(photoIds).size !== photoIds.length || photos.some(photo => !photoIds.includes(photo.id))) {
    throw new ProductExtrasError("Photo ordering must include every current product photo exactly once.", 409);
  }
  await prisma.$transaction(async tx => {
    for (let i = 0; i < photoIds.length; i++) {
      await tx.productMedia.update({ where: { id: photoIds[i] }, data: { sortOrder: i, isPrimary: photoIds[i] === primaryId } });
    }
  });
  return prisma.productMedia.findMany({ where: { productId }, orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] });
}

export async function setProductOccasions(productId: string, occasionIds: string[]) {
  await requireProduct(productId);
  const count = await prisma.occasion.count({ where: { id: { in: occasionIds }, isActive: true } });
  if (count !== occasionIds.length) throw new ProductExtrasError("Select only active, existing occasions.", 400);
  await prisma.$transaction(async tx => {
    await tx.productOccasion.deleteMany({ where: { productId } });
    if (occasionIds.length) await tx.productOccasion.createMany({ data: occasionIds.map(occasionId => ({ productId, occasionId })) });
  });
  return prisma.productOccasion.findMany({ where: { productId }, include: { occasion: true } });
}
