import SmoothScroll from "@/components/site/SmoothScroll";
import { SiteNav } from "@/components/site/SiteNav";
import HeroMorph from "@/components/site/HeroMorph";
import StandardSection from "@/components/site/StandardSection";
import HowItWorks from "@/components/site/HowItWorks";
import TechSection from "@/components/site/TechSection";
import OnChainProof from "@/components/site/OnChainProof";
import BridgeSection from "@/components/site/BridgeSection";
import FaqSection from "@/components/site/FaqSection";
import AccessSection from "@/components/site/AccessSection";
import { SiteFooter } from "@/components/SiteFooter";

// Mirrors the reference landing architecture, in SILENT's theme:
// Hero morph → stats + dashboard → how-it-works accordion → dark tech section
// → on-chain proof ledger → interlude → FAQ → access CTA → footer.
export default function Home() {
  return (
    <SmoothScroll>
      <SiteNav />
      <main>
        <HeroMorph />
        <StandardSection />
        <HowItWorks />
        <TechSection />
        <OnChainProof />
        <BridgeSection />
        <FaqSection />
        <AccessSection />
      </main>
      <SiteFooter />
    </SmoothScroll>
  );
}
