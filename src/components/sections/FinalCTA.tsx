import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Magnetic } from "@/components/motion/Magnetic";
import { CTASection } from "./CTASection";

export function FinalCTA() {
  return (
    <CTASection
      title="Tell us what you need. We'll get to work."
      sub={
        <>
          Send us the role, the timeline, and where you&apos;re located.
          You&apos;ll hear back within <Placeholder>one business day</Placeholder>
          .
        </>
      }
    >
      <Magnetic>
        <Link href="/contact" className={buttonVariants({ size: "lg" })}>
          Request Talent
        </Link>
      </Magnetic>
      <a
        href="tel:000"
        className={buttonVariants({ variant: "ghost", size: "lg" })}
      >
        Call <Placeholder>phone</Placeholder>
      </a>
    </CTASection>
  );
}
