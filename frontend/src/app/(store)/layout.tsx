import type { ReactNode } from "react";

import AnnouncementBar from "@/components/layout/AnnouncementBar";
import CustomerHeader from "@/components/layout/CustomerHeader";
import Footer from "@/components/layout/Footer";
import MobileNavigation from "@/components/layout/MobileNavigation";

export default function StoreLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <AnnouncementBar />
      <CustomerHeader />

      <main className="min-h-[65vh] pb-24 lg:pb-0">
        {children}
      </main>

      <Footer />
      <MobileNavigation />
    </>
  );
}