import { Hero } from "@/components/marketing/Hero";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { PreviewSection } from "@/components/marketing/PreviewSection";
import { BenefitsSection } from "@/components/marketing/BenefitsSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { AudienceSection } from "@/components/marketing/AudienceSection";
import { FinalCta } from "@/components/marketing/FinalCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <div className="hazard-seam" aria-hidden="true" />
      <WorkflowSection />
      <PreviewSection />
      <BenefitsSection />
      <HowItWorksSection />
      <AudienceSection />
      <FinalCta />
    </>
  );
}
