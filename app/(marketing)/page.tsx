import { Hero } from "@/components/marketing/Hero";
import { ProblemSection } from "@/components/marketing/ProblemSection";
import { WorkflowSection } from "@/components/marketing/WorkflowSection";
import { PreviewSection } from "@/components/marketing/PreviewSection";
import { BoundarySection } from "@/components/marketing/BoundarySection";
import { BenefitsSection } from "@/components/marketing/BenefitsSection";
import { HowItWorksSection } from "@/components/marketing/HowItWorksSection";
import { AudienceSection } from "@/components/marketing/AudienceSection";
import { FinalCta } from "@/components/marketing/FinalCta";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <WorkflowSection />
      <PreviewSection />
      <BoundarySection />
      <BenefitsSection />
      <HowItWorksSection />
      <AudienceSection />
      <FinalCta />
    </>
  );
}
