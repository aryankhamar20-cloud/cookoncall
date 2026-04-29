import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import WhatsAppFAB from "@/components/layout/WhatsAppFAB";
import ScrollToTop from "@/components/layout/ScrollToTop";
import HeroSection from "@/components/landing/HeroSection";
import StatsBar from "@/components/landing/StatsBar";
import HowItWorks from "@/components/landing/HowItWorks";
import ForChefs from "@/components/landing/ForChefs";
import FounderSection from "@/components/landing/FounderSection";
import CTASection from "@/components/landing/CTASection";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <ForChefs />
        <FounderSection />
        <CTASection />
      </main>
      <Footer />
      <WhatsAppFAB />
      <ScrollToTop />
    </>
  );
}
