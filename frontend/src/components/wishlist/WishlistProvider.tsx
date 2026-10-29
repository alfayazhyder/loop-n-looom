"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

import { ApiError } from "@/lib/api";
import { isAuthenticationError } from "@/lib/session";
import {
  addWishlistItem,
  fetchWishlist,
  removeWishlistItem,
  updateWishlistAlerts,
  type WishlistItem,
} from "@/lib/customerWishlist";

type WishlistContextValue = {
  items: WishlistItem[];
  loading: boolean;
  guest: boolean;
  error: string;
  busyIds: string[];
  reload: () => Promise<void>;
  toggle: (productId: string) => Promise<boolean>;
  remove: (productId: string) => Promise<void>;
  setAlerts: (
    productId: string,
    changes: { notifyOnRestock?: boolean; notifyOnPriceDrop?: boolean },
  ) => Promise<void>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [guest, setGuest] = useState(false);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const loadVersion = useRef(0);

  const reload = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    setError("");
    try {
      const next = await fetchWishlist();
      if (version !== loadVersion.current) return;
      setItems(next);
      setGuest(false);
    } catch (caught) {
      if (version !== loadVersion.current) return;
      if (isAuthenticationError(caught)) {
        setItems([]);
        setGuest(true);
      } else {
        // Never present potentially stale previous-account items after a failed refresh.
        setItems([]);
        setGuest(false);
        setError(errorMessage(caught));
      }
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [pathname, reload]);

  useEffect(() => {
    const onFocus = () => { void reload(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  // Ignore responses from requests started before this provider was unmounted.
  useEffect(() => () => { loadVersion.current += 1; }, []);

  const toggle = async (productId: string): Promise<boolean> => {
    if (guest) throw new Error("Please sign in to save your favourites.");
    if (loading || busyIds.includes(productId)) throw new Error("Wishlist is updating. Please try again.");
    const wasSaved = items.some((item) => item.productId === productId);
    setBusyIds((current) => [...current, productId]);
    try {
      if (wasSaved) {
        await removeWishlistItem(productId);
        setItems((current) => current.filter((item) => item.productId !== productId));
      } else {
        const response = await addWishlistItem(productId);
        setItems((current) => [response.item, ...current.filter((item) => item.productId !== productId)]);
      }
      await reload();
      return !wasSaved;
    } catch (caught) {
      if (caught instanceof ApiError && ((wasSaved && caught.status === 404) || (!wasSaved && caught.status === 409))) {
        await reload();
        return !wasSaved;
      }
      if (isAuthenticationError(caught)) {
        setItems([]);
        setGuest(true);
      }
      throw caught;
    } finally {
      setBusyIds((current) => current.filter((id) => id !== productId));
    }
  };

  const remove = async (productId: string) => {
    if (busyIds.includes(productId)) return;
    setBusyIds((current) => [...current, productId]);
    try {
      await removeWishlistItem(productId);
      setItems((current) => current.filter((item) => item.productId !== productId));
      await reload();
    } catch (caught) {
      if (isAuthenticationError(caught)) {
        setItems([]);
        setGuest(true);
      }
      throw caught;
    } finally {
      setBusyIds((current) => current.filter((id) => id !== productId));
    }
  };

  const setAlerts = async (
    productId: string,
    changes: { notifyOnRestock?: boolean; notifyOnPriceDrop?: boolean },
  ) => {
    if (busyIds.includes(productId)) return;
    setBusyIds((current) => [...current, productId]);
    try {
      const response = await updateWishlistAlerts(productId, changes);
      setItems((current) => current.map((item) => item.productId === productId ? response.item : item));
    } catch (caught) {
      if (isAuthenticationError(caught)) {
        setItems([]);
        setGuest(true);
      }
      throw caught;
    } finally {
      setBusyIds((current) => current.filter((id) => id !== productId));
    }
  };

  return (
    <WishlistContext.Provider value={{ items, loading, guest, error, busyIds, reload, toggle, remove, setAlerts }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("Wishlist components must be inside WishlistProvider.");
  return context;
}
