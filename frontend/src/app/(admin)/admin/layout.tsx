import type { ReactNode } from "react";

// Separate layout from (store) intentionally keeps customer navigation,
// wishlist state, and mobile storefront components out of the admin area.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#FCF9F5] text-[#4A3B32]">{children}</div>;
}
