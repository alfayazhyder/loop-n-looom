"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ArrowRight, ShoppingBag, BellRing, RefreshCw, Trash2 } from "lucide-react";

import { apiJson } from "@/lib/api";
import { normalizeProduct, safeImageUrl, type CatalogProduct } from "@/lib/catalog";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import type { WishlistItem } from "@/lib/customerWishlist";

const PAGE_SIZE = 12;

function SavedProduct({ item }: { item: WishlistItem }) {
  const router = useRouter();
  const { remove, setAlerts, busyIds } = useWishlist();
  const [cartBusy, setCartBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const product: CatalogProduct | null = normalizeProduct(item.product);
  const busy = busyIds.includes(item.productId) || cartBusy;

  // Out-of-stock ready-stock variants cannot be purchased until replenished.
  const variant = product?.fulfillmentType === "READY_STOCK"
    ? product.variants.find((option) => option.stockQuantity > 0)
    : product?.variants[0];
  const unavailable = product?.fulfillmentType === "READY_STOCK" &&
    (!variant || item.wishlistMeta.availableStock < 1);
  const image = safeImageUrl(product?.media[0]?.url ?? "");
  const productName = product?.name ?? "Handmade creation";
  const productUrl = product ? `/products/${encodeURIComponent(product.slug)}` : "/shop";

  async function addToCart() {
    if (!product || unavailable || busy) return;
    setCartBusy(true);
    setNotice("");
    try {
      await apiJson("/api/cart/items", "POST", {
        productId: item.productId,
        ...(variant ? { variantId: variant.id } : {}),
        quantity: 1,
      });
      router.push("/cart");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Unable to add this item to your cart.");
    } finally {
      setCartBusy(false);
    }
  }

  async function handleRemove() {
    setNotice("");
    try { await remove(item.productId); }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : "Unable to remove item."); }
  }

  async function handleAlerts(changes: { notifyOnRestock?: boolean; notifyOnPriceDrop?: boolean }) {
    setNotice("");
    try { await setAlerts(item.productId, changes); }
    catch (caught) { setNotice(caught instanceof Error ? caught.message : "Unable to save preferences."); }
  }

  return (
    <article className="overflow-hidden rounded-[2rem] border border-[#EADFD8] bg-white shadow-sm">
      <Link href={productUrl} className="block aspect-[4/3] overflow-hidden bg-[#F8F2EC]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={productName} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center px-8 text-center font-serif text-2xl text-[#8A7B72]">{productName}</div>
        )}
      </Link>
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8A7B72]">{product?.categoryName || "Handmade gift"}</p>
            <Link href={productUrl} className="mt-2 block font-serif text-2xl hover:underline">{productName}</Link>
          </div>
          <button type="button" onClick={() => void handleRemove()} disabled={busy}
            aria-label={`Remove ${productName} from wishlist`}
            className="rounded-full border border-[#EADFD8] p-3 text-brand-cocoa hover:bg-brand-blush disabled:opacity-50">
            <Trash2 size={17} />
          </button>
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-lg font-semibold text-brand-cocoa">AED {item.wishlistMeta.currentPrice.toFixed(2)}</span>
          {item.wishlistMeta.priceChanged && item.wishlistMeta.priceWhenAdded !== null && (
            <span className="text-xs text-[#8A7B72] line-through">Saved at AED {item.wishlistMeta.priceWhenAdded.toFixed(2)}</span>
          )}
          {item.wishlistMeta.priceDropped && (
            <span className="rounded-full bg-brand-blush px-3 py-1 text-xs font-semibold text-brand-cocoa">Price dropped</span>
          )}
        </div>
        <p className="text-xs text-[#6B5A50]">
          {unavailable ? "Currently out of stock" : product?.availability || "Handmade to order"}
        </p>
        <div className="space-y-3 rounded-2xl bg-brand-cream p-4 text-xs text-brand-cocoa">
          <p className="flex items-center gap-2 font-semibold"><BellRing size={15} /> Wishlist alert preferences</p>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={item.notifyOnRestock} disabled={busy}
              onChange={(event) => void handleAlerts({ notifyOnRestock: event.target.checked })}
              className="accent-[#4A3B32]" />
            Save my restock alert preference
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input type="checkbox" checked={item.notifyOnPriceDrop} disabled={busy}
              onChange={(event) => void handleAlerts({ notifyOnPriceDrop: event.target.checked })}
              className="accent-[#4A3B32]" />
            Save my price-drop alert preference
          </label>
        </div>
        <button type="button" disabled={busy || unavailable || !product}
          onClick={() => void addToCart()}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-cocoa px-5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          <ShoppingBag size={17} /> {cartBusy ? "Adding..." : unavailable ? "Currently unavailable" : "Add to cart"}
        </button>
        {notice && <p role="alert" className="text-sm text-[#A95757]">{notice}</p>}
      </div>
    </article>
  );
}

export default function WishlistView() {
  const { items, loading, guest, error, reload } = useWishlist();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const shown = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <section className="min-h-[65vh] bg-brand-cream py-12 text-brand-cocoa sm:py-20">
      <div className="page-container">
        <div className="rounded-[2.5rem] bg-brand-blush px-7 py-10 sm:px-12 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#8A7B72]">Your personal collection</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-5">
            <div>
              <h1 className="flex items-center gap-3 font-serif text-4xl sm:text-5xl"><Heart size={30} /> My Wishlist</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6B5A50]">Keep the handmade creations you love in one lovely place, ready for the perfect moment.</p>
            </div>
            <Link href="/shop" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-cocoa px-6 text-sm font-medium text-white">Explore our shop <ArrowRight size={17} /></Link>
          </div>
        </div>

        {loading ? (
          <div role="status" className="mt-10 rounded-3xl bg-white p-10 text-center">Loading your saved creations...</div>
        ) : guest ? (
          <div className="mt-10 rounded-[2rem] border border-[#EADFD8] bg-white p-10 text-center">
            <Heart className="mx-auto mb-5" size={32} />
            <h2 className="font-serif text-3xl">Sign in to view your wishlist</h2>
            <p className="mt-4 text-sm text-[#6B5A50]">Your saved creations are private to your account.</p>
            <Link href="/login" className="mt-7 inline-flex rounded-full bg-brand-cocoa px-8 py-3 text-white">Sign in</Link>
          </div>
        ) : error ? (
          <div role="alert" className="mt-10 rounded-3xl bg-white p-8 text-center">
            <p className="text-[#A95757]">{error}</p>
            <button type="button" onClick={() => void reload()} className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand-cocoa px-6 py-3 text-sm"><RefreshCw size={16} /> Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-[#EADFD8] bg-white p-10 text-center sm:p-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-blush"><Heart size={34} /></div>
            <h2 className="mt-6 font-serif text-3xl">Your collection starts here</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#6B5A50]">Explore our handmade gifts and tap the heart on any creation to save it for later.</p>
            <Link href="/shop" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-cocoa px-7 text-white">Find something lovely <ArrowRight size={17} /></Link>
          </div>
        ) : (
          <>
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[#6B5A50]">{items.length} saved {items.length === 1 ? "creation" : "creations"}</p>
              <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-2 rounded-full border border-[#EADFD8] bg-white px-5 py-3 text-xs hover:bg-brand-blush"><RefreshCw size={15} /> Refresh wishlist</button>
            </div>
            <p className="mt-4 text-xs leading-6 text-[#8A7B72]">Alert preferences are stored in your account. Notification delivery depends on the availability of notification services.</p>
            <div className="mt-6 grid gap-7 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((item) => <SavedProduct key={item.id} item={item} />)}
            </div>
            {pages > 1 && (
              <nav className="mt-12 flex items-center justify-center gap-5" aria-label="Wishlist pagination">
                <button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} className="rounded-full border border-[#EADFD8] bg-white px-6 py-3 text-sm disabled:opacity-40">Previous</button>
                <span className="text-sm">{currentPage} / {pages}</span>
                <button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} className="rounded-full border border-[#EADFD8] bg-white px-6 py-3 text-sm disabled:opacity-40">Next</button>
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
