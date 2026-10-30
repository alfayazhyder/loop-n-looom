"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowDown, ArrowUp, CheckCircle2, Images, LogOut, PackagePlus, PencilLine,
  RefreshCw, Save, Search, ShieldCheck, Trash2, UploadCloud, XCircle,
} from "lucide-react";
import Logo from "@/components/Logo";
import { ApiError } from "@/lib/api";
import { assertAdminAccess, adminMoney } from "@/lib/adminDashboard";
import { authenticatedRequest, signOut } from "@/lib/session";
import {
  adminJson, blankProduct, blankVariant, getProduct, getTaxonomies, listProducts,
  productPayload, toProductForm, toVariantForm, uploadPhoto, variantPayload,
  type Category, type Occasion, type Product, type ProductForm, type ProductPhoto, type VariantForm,
} from "@/lib/adminProducts";

type Gate = "checking" | "ready" | "sign-in" | "forbidden" | "error";
const panel = "rounded-[1.7rem] border border-[#EADFD8] bg-white p-5 shadow-[0_8px_30px_rgba(74,59,50,0.035)] sm:p-7";
const input = "mt-2 min-h-11 w-full rounded-xl border border-[#E5D9D1] bg-[#FCF9F5] px-3 py-2 text-sm outline-none focus:border-[#4A3B32]";
const smallButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[#EADFD8] bg-white px-4 text-xs font-semibold transition-colors hover:bg-[#F7EBE8] disabled:cursor-not-allowed disabled:opacity-40";
const primaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#4A3B32] px-6 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-xs font-semibold text-[#6B5A50]">{label}{children}</label>;
}
function Toggle({ checked, onChange, text }: { checked: boolean; onChange: (v: boolean) => void; text: string }) {
  return <label className="flex min-h-9 cursor-pointer items-center gap-3 text-sm text-[#6B5A50]">
    <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4 accent-[#4A3B32]" />{text}
  </label>;
}
function describeError(error: unknown) {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

export default function ProductManager() {
  const router = useRouter();
  const [gate, setGate] = useState<Gate>("checking");
  const [gateError, setGateError] = useState("");
  const [role, setRole] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>({ ...blankProduct });
  const [occasionIds, setOccasionIds] = useState<string[]>([]);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState<VariantForm>({ ...blankVariant });
  const [inventoryVariantId, setInventoryVariantId] = useState("");
  const [inventoryType, setInventoryType] = useState<"STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "RETURNED">("STOCK_IN");
  const [inventoryQuantity, setInventoryQuantity] = useState("1");
  const [inventoryReason, setInventoryReason] = useState("");
  const [history, setHistory] = useState<Array<{ id: string; type: string; quantity: number; reason: string | null; createdAt: string }> | null>(null);
  const [photoAlt, setPhotoAlt] = useState<Record<string, { en: string; ar: string }>>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  function selectProduct(product: Product | null) {
    setSelected(product);
    setSelectedId(product?.id ?? null);
    setForm(product ? toProductForm(product) : { ...blankProduct, categoryId: categories[0]?.id ?? "" });
    setOccasionIds(product?.occasionLinks.map(link => link.occasionId) ?? []);
    setVariantId(null);
    setVariantForm({ ...blankVariant });
    setInventoryVariantId(product?.variants[0]?.id ?? "");
    setHistory(null);
    setPhotoAlt(Object.fromEntries((product?.media ?? []).map(p => [p.id, { en: p.altTextEn ?? "", ar: p.altTextAr ?? "" }])));
    setError(""); setNotice("");
  }

  useEffect(() => {
    let live = true;
    async function start() {
      try {
        const access = await assertAdminAccess();
        if (!live) return;
        setRole(access.user.role);
        const [catalogue, taxonomy, config] = await Promise.all([
          listProducts(), getTaxonomies(),
          authenticatedRequest<{ uploadEnabled: boolean }>("/api/admin/media-status"),
        ]);
        if (!live) return;
        setProducts(catalogue); setCategories(taxonomy.categories); setOccasions(taxonomy.occasions);
        setForm({ ...blankProduct, categoryId: taxonomy.categories[0]?.id ?? "" });
        setUploadEnabled(config.uploadEnabled);
        setGate("ready");
      } catch (caught) {
        if (!live) return;
        setGate(caught instanceof ApiError && caught.status === 401 ? "sign-in" :
          caught instanceof ApiError && caught.status === 403 ? "forbidden" : "error");
        setGateError(describeError(caught));
      }
    }
    void start();
    return () => { live = false; };
  }, []);

  async function refresh(id: string | null = selectedId) {
    const [catalogue, details] = await Promise.all([listProducts(), id ? getProduct(id) : Promise.resolve(null)]);
    setProducts(catalogue);
    if (id) selectProduct(details);
  }

  async function execute(action: () => Promise<void>, message: string) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); setNotice(message); }
    catch (caught) {
      if (caught instanceof ApiError && [401, 403].includes(caught.status)) {
        setGate(caught.status === 401 ? "sign-in" : "forbidden");
        setSelected(null); setProducts([]);
      }
      setError(describeError(caught));
    } finally { setBusy(false); }
  }

  function editProduct(id: string) {
    if (busy) return;
    setError(""); setNotice("");
    void execute(async () => { selectProduct(await getProduct(id)); }, "Product loaded for editing.");
  }
  async function saveProduct(event: FormEvent) {
    event.preventDefault();
    await execute(async () => {
      const payload = productPayload(form);
      if (selectedId) {
        await adminJson(`/api/admin/products/${selectedId}`, "PUT", payload);
        await refresh(selectedId);
      } else {
        const response = await adminJson<{ product: Product }>("/api/admin/products", "POST", payload);
        const [list, details] = await Promise.all([listProducts(), getProduct(response.product.id)]);
        setProducts(list); selectProduct(details);
      }
    }, selectedId ? "Product details saved." : "New product created. You can now add photos and variants.");
  }
  async function archive() {
    if (!selectedId || !window.confirm("Archive this product? It will be removed from the public storefront, but order history is preserved.")) return;
    await execute(async () => {
      await adminJson(`/api/admin/products/${selectedId}/archive`, "PATCH");
      await refresh(selectedId);
    }, "Product archived safely. Historical orders remain intact.");
  }
  async function saveOccasions() {
    if (!selectedId) return;
    await execute(async () => {
      await adminJson(`/api/admin/products/${selectedId}/occasions`, "PUT", { occasionIds });
      await refresh(selectedId);
    }, "Occasion associations updated.");
  }
  async function saveVariant(event: FormEvent) {
    event.preventDefault();
    if (!selectedId) return;
    await execute(async () => {
      const payload = variantPayload(variantForm, !variantId);
      await adminJson(`/api/admin/products/${selectedId}/variants${variantId ? `/${variantId}` : ""}`, variantId ? "PUT" : "POST", payload);
      await refresh(selectedId);
    }, variantId ? "Variant updated. Stock must be changed using inventory movements." : "Variant created.");
  }
  async function adjustInventory(event: FormEvent) {
    event.preventDefault();
    if (!selectedId || !inventoryVariantId) return;
    const quantity = Number(inventoryQuantity);
    if (!Number.isInteger(quantity) || quantity === 0 || (inventoryType !== "ADJUSTMENT" && quantity < 1) ||
        (inventoryType === "ADJUSTMENT" && !inventoryReason.trim())) { setError("Enter a valid movement quantity and an adjustment reason if required."); return; }
    await execute(async () => {
      await adminJson(`/api/admin/products/${selectedId}/variants/${inventoryVariantId}/inventory`, "POST", {
        type: inventoryType, quantity, ...(inventoryReason.trim() ? { reason: inventoryReason.trim() } : {}),
      });
      await refresh(selectedId);
    }, "Inventory movement recorded.");
  }
  async function loadHistory() {
    if (!selectedId || !inventoryVariantId) return;
    await execute(async () => {
      const response = await authenticatedRequest<{ movements: NonNullable<typeof history> }>(
        `/api/admin/products/${selectedId}/variants/${inventoryVariantId}/inventory`);
      setHistory(response.movements);
    }, "Inventory history loaded.");
  }
  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedId || !files.length) return;
    if ((selected?.media.length ?? 0) + files.length > 24) { setError("Maximum 24 photos per product."); return; }
    await execute(async () => {
      for (const file of files) await uploadPhoto(selectedId, file);
      await refresh(selectedId);
    }, `${files.length} photo(s) uploaded.`);
  }
  async function changePhotoOrder(ids: string[], primaryId: string) {
    if (!selectedId) return;
    await execute(async () => {
      await adminJson(`/api/admin/products/${selectedId}/media/order`, "PATCH", { photoIds: ids, primaryId });
      await refresh(selectedId);
    }, "Photo order and main image saved.");
  }
  async function removePhoto(photo: ProductPhoto) {
    if (!selectedId || !window.confirm("Remove this product photo? This cannot be undone.")) return;
    await execute(async () => {
      await adminJson(`/api/admin/products/${selectedId}/media/${photo.id}`, "DELETE");
      await refresh(selectedId);
    }, "Photo removed from this product.");
  }
  async function savePhotoAlt(photo: ProductPhoto) {
    if (!selectedId) return;
    await execute(async () => {
      const alt = photoAlt[photo.id] ?? { en: "", ar: "" };
      await adminJson(`/api/admin/products/${selectedId}/media/${photo.id}`, "PATCH", { altTextEn: alt.en, altTextAr: alt.ar });
      await refresh(selectedId);
    }, "Photo description saved.");
  }
  const filteredProducts = useMemo(() => products.filter(product =>
    (statusFilter === "ALL" || product.status === statusFilter) &&
    `${product.nameEn} ${product.slug} ${product.category?.nameEn ?? ""}`.toLowerCase().includes(query.toLowerCase().trim()),
  ), [products, statusFilter, query]);
  const media = useMemo(() => [...(selected?.media ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [selected]);
  const formField = (key: keyof ProductForm, value: ProductForm[keyof ProductForm]) => setForm(old => ({ ...old, [key]: value }));
  const variantField = (key: keyof VariantForm, value: VariantForm[keyof VariantForm]) => setVariantForm(old => ({ ...old, [key]: value }));

  if (gate !== "ready") return (
    <main className="flex min-h-screen items-center justify-center bg-[#FCF9F5] px-5 py-16">
      <div className={`${panel} w-full max-w-lg text-center`}>
        <ShieldCheck size={34} className="mx-auto text-[#6B5A50]" />
        <h1 className="mt-5 font-serif text-3xl">{gate === "checking" ? "Checking administrator permissions" : gate === "sign-in" ? "Administrator sign-in" : gate === "forbidden" ? "Access restricted" : "Catalogue unavailable"}</h1>
        <p role="status" className="mt-4 text-sm leading-7 text-[#6B5A50]">{gate === "checking" ? "Verifying your secure session…" : gate === "sign-in" ? "Please sign in with an authorized admin account." : gate === "forbidden" ? "This account is not permitted to manage products." : gateError}</p>
        <div className="mt-7 flex justify-center gap-3"><Link href="/admin" className={smallButton}>Admin dashboard</Link>{gate === "sign-in" && <Link href="/login" className={primaryButton}>Sign in</Link>}</div>
      </div>
    </main>
  );

  return <div className="min-h-screen bg-[#FCF9F5] text-[#4A3B32]">
    <header className="border-b border-[#EADFD8] bg-white">
      <div className="mx-auto flex max-w-[1540px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3"><Logo size={60} /><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8A7B72]">LOOP_N_LOOOM · Private studio</p><h1 className="font-serif text-xl sm:text-2xl">Product management</h1></div></div>
        <div className="flex flex-wrap items-center gap-2"><span className="hidden text-xs text-[#557A61] sm:block"><ShieldCheck size={14} className="inline" /> {role}</span>
          <Link href="/admin" className={smallButton}><ArrowLeft size={15} /> Dashboard</Link>
          <button type="button" disabled={busy} className={smallButton} onClick={() => void execute(() => refresh(), "Catalogue refreshed.")}><RefreshCw size={15} /> Refresh</button>
          <button type="button" className={smallButton} onClick={() => void execute(async () => { await signOut(); router.replace("/login"); router.refresh(); }, "Signed out.")}><LogOut size={15} /> Sign out</button>
        </div>
      </div>
    </header>
    <main className="mx-auto grid max-w-[1540px] gap-7 px-5 py-8 sm:px-8 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={`${panel} h-fit xl:sticky xl:top-5`}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#8A7B72]">Catalogue</p><h2 className="mt-2 font-serif text-2xl">{products.length} products</h2></div>
          <button type="button" disabled={busy} onClick={() => selectProduct(null)} className={smallButton}><PackagePlus size={17} /> New</button></div>
        <Field label="Search products"><div className="relative mt-2"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-[#8A7B72]" /><input aria-label="Search products" value={query} onChange={e => setQuery(e.target.value)} className={`${input} mt-0 pl-10`} placeholder="Name, category or slug" /></div></Field>
        <Field label="Status"><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={input}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="ACTIVE">Active</option><option value="ARCHIVED">Archived</option></select></Field>
        <div className="mt-5 max-h-[65vh] space-y-2 overflow-y-auto pr-1" role="list" aria-label="Products">
          {filteredProducts.length === 0 && <p className="text-sm text-[#8A7B72]">No matching products.</p>}
          {filteredProducts.map(product => <button key={product.id} type="button" disabled={busy} onClick={() => editProduct(product.id)} className={`w-full rounded-xl border p-3 text-left transition-colors ${selectedId === product.id ? "border-[#B99C8C] bg-[#F7EBE8]" : "border-[#EADFD8] bg-white hover:bg-[#FCF9F5]"}`}>
            <span className="flex items-start justify-between gap-2"><span className="truncate text-sm font-semibold">{product.nameEn}</span><span className="shrink-0 text-[10px] text-[#8A7B72]">{product.status}</span></span>
            <span className="mt-2 block text-xs text-[#6B5A50]">{adminMoney(product.basePrice)} · {product.variants.length} variants · {product.media.length} photos</span>
          </button>)}
        </div>
      </aside>
      <div className="min-w-0 space-y-7" aria-busy={busy}>
        <div className={`${panel} bg-[#F7EBE8]`}><p className="text-xs font-semibold uppercase tracking-[.18em] text-[#947E71]">Studio catalogue</p><h2 className="mt-2 font-serif text-3xl">{selectedId ? `Edit ${selected?.nameEn ?? "product"}` : "Create a beautiful new product"}</h2>
          <p className="mt-3 text-sm leading-7 text-[#6B5A50]">Use drafts until everything is ready. Archive removes products from sale without deleting customer order history.</p>
          {busy && <p role="status" className="mt-3 text-xs font-semibold">Saving changes…</p>}
          {error && <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-[#FFF2F0] p-4 text-sm text-[#9A4949]"><XCircle size={18} className="shrink-0" /> {error}</p>}
          {notice && <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-[#EDF5EB] p-4 text-sm text-[#557A61]"><CheckCircle2 size={18} className="shrink-0" /> {notice}</p>}
        </div>
        <form className={panel} onSubmit={event => void saveProduct(event)}>
          <h3 className="font-serif text-2xl">Product details</h3><p className="mt-2 text-sm text-[#8A7B72]">English details are required where noted. Arabic fields are optional for now.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Product name (English) *"><input className={input} required maxLength={160} value={form.nameEn} onChange={e => formField("nameEn", e.target.value)} /></Field>
            <Field label="Product name (Arabic)"><input className={input} maxLength={160} dir="auto" value={form.nameAr} onChange={e => formField("nameAr", e.target.value)} /></Field>
            <Field label="URL slug *"><input className={input} required maxLength={200} placeholder="handmade-crochet-roses" value={form.slug} onChange={e => formField("slug", e.target.value.toLowerCase().replaceAll(" ", "-"))} /></Field>
            <Field label="Category *"><select className={input} required value={form.categoryId} onChange={e => formField("categoryId", e.target.value)}><option value="">Choose a category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.nameEn}</option>)}</select></Field>
            <Field label="Base price (AED) *"><input className={input} required type="number" min="0.01" step="0.01" value={form.basePrice} onChange={e => formField("basePrice", e.target.value)} /></Field>
            <Field label="Publishing status"><select className={input} value={form.status} onChange={e => formField("status", e.target.value as ProductForm["status"])}><option>DRAFT</option><option>ACTIVE</option><option>ARCHIVED</option></select></Field>
            <Field label="Fulfillment"><select className={input} value={form.fulfillmentType} onChange={e => formField("fulfillmentType", e.target.value as ProductForm["fulfillmentType"])}><option>READY_STOCK</option><option>MADE_TO_ORDER</option></select></Field>
            <Field label="Delivery scope"><select className={input} value={form.deliveryScope} onChange={e => formField("deliveryScope", e.target.value as ProductForm["deliveryScope"])}><option>UAE_WIDE</option><option>ABU_DHABI_ONLY</option></select></Field>
            <Field label="Production min. days"><input className={input} type="number" min="0" max="365" value={form.productionMinDays} onChange={e => formField("productionMinDays", e.target.value)} /></Field>
            <Field label="Production max. days"><input className={input} type="number" min="0" max="365" value={form.productionMaxDays} onChange={e => formField("productionMaxDays", e.target.value)} /></Field>
            <div className="md:col-span-2"><Field label="Description (English)"><textarea className={`${input} min-h-28`} maxLength={5000} value={form.descriptionEn} onChange={e => formField("descriptionEn", e.target.value)} /></Field></div>
            <div className="md:col-span-2"><Field label="Description (Arabic)"><textarea className={`${input} min-h-24`} maxLength={5000} dir="auto" value={form.descriptionAr} onChange={e => formField("descriptionAr", e.target.value)} /></Field></div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3"><Toggle checked={form.isFeatured} onChange={v => formField("isFeatured", v)} text="Featured" /><Toggle checked={form.isNewArrival} onChange={v => formField("isNewArrival", v)} text="New arrival" /><Toggle checked={form.isGiftWrappable} onChange={v => formField("isGiftWrappable", v)} text="Gift wrapping available" /></div>
          <div className="mt-7 flex flex-wrap gap-3"><button type="submit" disabled={busy || !categories.length} className={primaryButton}><Save size={16} /> {selectedId ? "Save changes" : "Create product"}</button>{selectedId && selected?.status !== "ARCHIVED" && <button type="button" disabled={busy} className={smallButton} onClick={() => void archive()}><Trash2 size={16} /> Archive product</button>}</div>
          {!categories.length && <p className="mt-3 text-sm text-[#A95757]">No active categories exist. Configure your catalogue categories before creating a product.</p>}
        </form>
        {selectedId && selected && <>
          <section className={panel}>
            <h3 className="font-serif text-2xl">Occasions & gift discovery</h3><p className="mt-2 text-sm leading-7 text-[#8A7B72]">Select occasions so customers find this creation when shopping for special moments.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{occasions.map(occasion => <Toggle key={occasion.id} text={occasion.nameEn} checked={occasionIds.includes(occasion.id)} onChange={checked => setOccasionIds(old => checked ? [...old, occasion.id] : old.filter(id => id !== occasion.id))} />)}</div>
            {!occasions.length && <p className="mt-3 text-sm text-[#8A7B72]">No active occasions are available.</p>}
            <button type="button" disabled={busy} className={`${primaryButton} mt-5`} onClick={() => void saveOccasions()}><Save size={16} /> Save occasions</button>
          </section>
          <section className={panel}>
            <div className="flex items-center justify-between gap-3"><div><h3 className="font-serif text-2xl">Product photographs</h3><p className="mt-2 text-sm text-[#8A7B72]">Up to 24 JPEG, PNG or WebP photos · 8 MB per photo.</p></div><Images size={24} /></div>
            {!uploadEnabled ? <p role="status" className="mt-5 rounded-xl bg-[#FFF7E9] p-4 text-sm leading-7 text-[#865D47]">Image upload is unavailable until Cloudinary credentials are configured on the backend. Existing photos can still be ordered, described and managed. No photos are uploaded to your computer or an unconfigured service.</p> : <label className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#D9C5B9] bg-[#FCF9F5] text-sm font-medium"><UploadCloud size={25} /> Choose product photos<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={busy} onChange={event => void uploadFiles(event)} /></label>}
            {media.length === 0 ? <p className="mt-6 text-sm text-[#8A7B72]">No photos yet. Published listings look best with several clear product photographs.</p> : <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {media.map((photo, index) => <div key={photo.id} className="min-w-0 overflow-hidden rounded-2xl border border-[#EADFD8]">
                <div className="relative aspect-square bg-[#F6EEE5]"><Image src={photo.url} alt={photo.altTextEn || selected.nameEn} fill unoptimized sizes="(max-width: 640px) 100vw, 300px" className="object-cover" /></div>
                <div className="space-y-3 p-4"><p className="text-xs font-semibold text-[#6B5A50]">{photo.isPrimary ? "★ Main product image" : `Photo ${index + 1}`}</p>
                  <Field label="English image description"><input className={input} maxLength={250} value={photoAlt[photo.id]?.en ?? ""} onChange={e => setPhotoAlt(old => ({ ...old, [photo.id]: { ...(old[photo.id] ?? { en: "", ar: "" }), en: e.target.value } }))} /></Field>
                  <Field label="Arabic image description"><input className={input} dir="auto" maxLength={250} value={photoAlt[photo.id]?.ar ?? ""} onChange={e => setPhotoAlt(old => ({ ...old, [photo.id]: { ...(old[photo.id] ?? { en: "", ar: "" }), ar: e.target.value } }))} /></Field>
                  <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={smallButton} onClick={() => void savePhotoAlt(photo)}>Save alt text</button>{!photo.isPrimary && <button type="button" disabled={busy} className={smallButton} onClick={() => void changePhotoOrder(media.map(p => p.id), photo.id)}>Set main</button>}</div>
                  <div className="flex flex-wrap gap-2"><button type="button" className={smallButton} disabled={busy || index === 0} aria-label={`Move photo ${index + 1} up`} onClick={() => { const ids = media.map(p => p.id); [ids[index-1], ids[index]] = [ids[index], ids[index-1]]; void changePhotoOrder(ids, media.find(p => p.isPrimary)?.id ?? ids[0]); }}><ArrowUp size={15} /></button>
                    <button type="button" className={smallButton} disabled={busy || index === media.length - 1} aria-label={`Move photo ${index + 1} down`} onClick={() => { const ids = media.map(p => p.id); [ids[index], ids[index+1]] = [ids[index+1], ids[index]]; void changePhotoOrder(ids, media.find(p => p.isPrimary)?.id ?? ids[0]); }}><ArrowDown size={15} /></button>
                    <button type="button" className={smallButton} disabled={busy} onClick={() => void removePhoto(photo)}><Trash2 size={15} /> Remove</button></div>
                </div>
              </div>)}</div>}
          </section>
          <section className={panel}><h3 className="font-serif text-2xl">Colours, sizes & variants</h3><p className="mt-2 text-sm text-[#8A7B72]">Create each sellable variant with its own SKU. Stock is tracked through inventory movements.</p>
            <div className="mt-5 space-y-2">{selected.variants.length === 0 ? <p className="text-sm text-[#8A7B72]">No product variants yet.</p> : selected.variants.map(variant => <button type="button" key={variant.id} disabled={busy} onClick={() => { setVariantId(variant.id); setVariantForm(toVariantForm(variant)); }} className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-left text-sm ${variantId === variant.id ? "border-[#B99C8C] bg-[#F7EBE8]" : "border-[#EADFD8]"}`}><span><PencilLine size={14} className="mr-2 inline" />{variant.sku} · {variant.colorEn || variant.nameEn || "Standard"} {variant.size || ""}</span><span className="text-xs text-[#8A7B72]">Stock: {variant.stockQuantity} · {variant.isActive ? "Active" : "Inactive"}</span></button>)}</div>
            <form className="mt-6 border-t border-[#EADFD8] pt-5" onSubmit={event => void saveVariant(event)}>
              <div className="flex flex-wrap items-center justify-between gap-3"><h4 className="font-serif text-xl">{variantId ? "Edit variant" : "Add a variant"}</h4><button className={smallButton} type="button" disabled={busy} onClick={() => { setVariantId(null); setVariantForm({ ...blankVariant }); }}>New variant</button></div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="SKU *"><input className={input} required maxLength={100} value={variantForm.sku} onChange={e => variantField("sku", e.target.value)} /></Field>
                <Field label="Variant name"><input className={input} maxLength={160} value={variantForm.nameEn} onChange={e => variantField("nameEn", e.target.value)} /></Field>
                <Field label="Colour"><input className={input} maxLength={80} value={variantForm.colorEn} onChange={e => variantField("colorEn", e.target.value)} /></Field>
                <Field label="Size"><input className={input} maxLength={80} value={variantForm.size} onChange={e => variantField("size", e.target.value)} /></Field>
                <Field label="Variant price (optional)"><input className={input} type="number" min="0" step="0.01" value={variantForm.price} onChange={e => variantField("price", e.target.value)} /></Field>
                <Field label="Compare-at price (optional)"><input className={input} type="number" min="0" step="0.01" value={variantForm.compareAtPrice} onChange={e => variantField("compareAtPrice", e.target.value)} /></Field>
                {!variantId && <Field label="Initial stock"><input className={input} type="number" min="0" step="1" value={variantForm.stockQuantity} onChange={e => variantField("stockQuantity", e.target.value)} /></Field>}
              </div><div className="mt-5"><Toggle checked={variantForm.isActive} onChange={v => variantField("isActive", v)} text="Variant available to customers" /></div>
              {variantId && <p className="mt-3 text-xs text-[#8A7B72]">To adjust quantity, use the inventory form below—not this variant editor.</p>}
              <button type="submit" disabled={busy} className={`${primaryButton} mt-5`}><Save size={16} /> {variantId ? "Update variant" : "Create variant"}</button>
            </form>
          </section>
          <section className={panel}><h3 className="font-serif text-2xl">Inventory adjustments</h3><p className="mt-2 text-sm text-[#8A7B72]">Every stock change is recorded with an audit trail.</p>
            <form onSubmit={event => void adjustInventory(event)} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Variant"><select required className={input} value={inventoryVariantId} onChange={e => { setInventoryVariantId(e.target.value); setHistory(null); }}><option value="">Choose a variant</option>{selected.variants.map(v => <option key={v.id} value={v.id}>{v.sku} (stock {v.stockQuantity})</option>)}</select></Field>
              <Field label="Movement"><select className={input} value={inventoryType} onChange={e => setInventoryType(e.target.value as typeof inventoryType)}><option value="STOCK_IN">Add stock</option><option value="STOCK_OUT">Remove stock</option><option value="RETURNED">Returned to stock</option><option value="ADJUSTMENT">Manual adjustment (signed)</option></select></Field>
              <Field label="Quantity"><input className={input} required type="number" step="1" value={inventoryQuantity} onChange={e => setInventoryQuantity(e.target.value)} /></Field>
              <Field label="Reason"><input className={input} required={inventoryType === "ADJUSTMENT"} maxLength={500} value={inventoryReason} onChange={e => setInventoryReason(e.target.value)} placeholder="Stock count, restock, damage…" /></Field>
              <div className="flex flex-wrap gap-3 sm:col-span-2"><button className={primaryButton} disabled={busy || !inventoryVariantId} type="submit">Record stock movement</button><button className={smallButton} disabled={busy || !inventoryVariantId} type="button" onClick={() => void loadHistory()}>View inventory history</button></div>
            </form>
            {history && <div className="mt-5 max-h-64 space-y-2 overflow-y-auto border-t border-[#EADFD8] pt-4">{history.length === 0 ? <p className="text-sm text-[#8A7B72]">No inventory movements recorded.</p> : history.map(m => <p key={m.id} className="text-xs leading-6 text-[#6B5A50]">{new Date(m.createdAt).toLocaleDateString("en-AE")} · {m.type} · {m.quantity} · {m.reason || "No note"}</p>)}</div>}
          </section>
        </>}
      </div>
    </main>
    <footer className="border-t border-[#EADFD8] p-6 text-center text-xs text-[#8A7B72]">Secure administrator workspace · Product records are saved to the live backend · Permanent deletion is intentionally disabled</footer>
  </div>;
}
