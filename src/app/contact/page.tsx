import type { Metadata } from "next";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { Placeholder } from "@/components/ui/Placeholder";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { RequestTalentForm } from "@/components/forms/RequestTalentForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Request talent or find a job. Tell us what you need and you'll hear back within one business day.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Tell us what you need. We'll get to work."
        sub={
          <>
            Two paths below: request talent for your business, or head to jobs if
            you&apos;re looking for work. Either way, you&apos;ll hear back within{" "}
            <Placeholder>one business day</Placeholder>.
          </>
        }
      />

      <Section tight>
        <Container className="grid items-start gap-[clamp(32px,6vw,72px)] lg:grid-cols-[1.6fr_1fr]">
          <div id="request-talent" className="scroll-mt-28">
            <Reveal>
              <Eyebrow className="mb-4">For businesses</Eyebrow>
              <h2 className="mb-8 text-h3 font-[540] tracking-[-0.02em]">
                Request talent
              </h2>
            </Reveal>
            <Reveal>
              <RequestTalentForm />
            </Reveal>
          </div>

          <aside
            id="candidates"
            className="flex scroll-mt-28 flex-col gap-6"
            aria-label="Other ways to reach us"
          >
            <Reveal>
              <Card>
                <Eyebrow className="mb-4">For job seekers</Eyebrow>
                <h3 className="text-h3 font-[540] tracking-[-0.02em]">
                  Looking for work?
                </h3>
                <p className="mt-3 text-sm text-muted">
                  Skip the form — browse what&apos;s open or send your resume, and
                  a recruiter will get back to you.
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href="/jobs"
                    className={buttonVariants({ size: "default" })}
                  >
                    See Open Jobs
                  </Link>
                  <Link
                    href="/jobs"
                    className={buttonVariants({
                      variant: "ghost",
                      size: "default",
                    })}
                  >
                    Submit Your Resume
                  </Link>
                </div>
              </Card>
            </Reveal>

            <Reveal>
              <Card>
                <h4 className="mb-4 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase">
                  Reach us
                </h4>
                <ul className="flex flex-col gap-3 text-sm">
                  <li className="text-muted">
                    <Placeholder>address</Placeholder>
                  </li>
                  <li>
                    <a className="link-slide" href="tel:000">
                      <Placeholder>phone</Placeholder>
                    </a>
                  </li>
                  <li>
                    <a className="link-slide" href="mailto:hello@example.com">
                      <Placeholder>email</Placeholder>
                    </a>
                  </li>
                  <li className="pt-1 text-muted">Serving Austin &amp; Central Texas</li>
                </ul>
              </Card>
            </Reveal>
          </aside>
        </Container>
      </Section>
    </>
  );
}
