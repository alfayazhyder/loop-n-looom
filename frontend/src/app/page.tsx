import BestSellersSection from "@/components/home/BestSellersSection";
import BouquetBuilderPromo from "@/components/home/BouquetBuilderPromo";
import BrandStorySection from "@/components/home/BrandStorySection";
import CategorySection from "@/components/home/CategorySection";
import CustomerLoveSection from "@/components/home/CustomerLoveSection";
import CustomCrochetPromo from "@/components/home/CustomCrochetPromo";
import HeroSection from "@/components/home/HeroSection";
import NewArrivalsSection from "@/components/home/NewArrivalsSection";
import NewsletterSection from "@/components/home/NewsletterSection";
import OccasionSection from "@/components/home/OccasionSection";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import CustomerHeader from "@/components/layout/CustomerHeader";
import Footer from "@/components/layout/Footer";
import MobileNavigation from "@/components/layout/MobileNavigation";

export default function Home() {
  return (
    <>
      <AnnouncementBar />
      <CustomerHeader />

      <main className="pb-24 lg:pb-0">
        <HeroSection />
        <CategorySection />
        <BestSellersSection />
        <OccasionSection />
        <BouquetBuilderPromo />
        <CustomCrochetPromo />
        <NewArrivalsSection />
        <BrandStorySection />
        <CustomerLoveSection />
        <NewsletterSection />
      </main>

      <Footer />
      <MobileNavigation />
    </>
  );
}