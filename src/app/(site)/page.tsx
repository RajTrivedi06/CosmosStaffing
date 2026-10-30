import type { Metadata } from "next";
import { baseOpenGraph } from "@/lib/metadata";
import { DayScroll } from "@/components/home/DayScroll";
import { Hero } from "@/components/home/Hero";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Services } from "@/components/home/Services";
import { Workplaces } from "@/components/home/Workplaces";
import { Standard } from "@/components/home/Standard";
import { Care } from "@/components/home/Care";
import { Reviews } from "@/components/home/Reviews";
import { Pricing } from "@/components/home/Pricing";
import { Evening } from "@/components/home/Evening";
import { Faq } from "@/components/home/Faq";
import { CloseCta } from "@/components/home/CloseCta";
import { CleanTeaser } from "@/components/home/CleanTeaser";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...baseOpenGraph, url: "/" },
};

export default function Home() {
  return (
    <DayScroll>
      <Hero />
      <HowItWorks />
      <Services />
      <Workplaces />
      <Standard />
      <Care />
      <Reviews />
      <Pricing />
      <Evening />
      <Faq />
      <CloseCta />
      <CleanTeaser />
    </DayScroll>
  );
}
