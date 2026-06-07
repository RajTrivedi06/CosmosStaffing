import { Hero } from "@/components/sections/Hero";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { ServicesBento } from "@/components/sections/ServicesBento";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { WhyCosmos } from "@/components/sections/WhyCosmos";
import { Stats } from "@/components/sections/Stats";
import { Industries } from "@/components/sections/Industries";
import { CandidateBand } from "@/components/sections/CandidateBand";
import { FinalCTA } from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      <Hero />
      <ProblemSection />
      <ServicesBento />
      <HowItWorks />
      <WhyCosmos />
      <Stats />
      <Industries />
      <CandidateBand />
      <FinalCTA />
    </>
  );
}
