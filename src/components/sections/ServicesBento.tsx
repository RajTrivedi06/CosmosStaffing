import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Container } from "@/components/ui/Container";
import { Arrow } from "@/components/ui/Arrow";
import { SectionHead } from "./SectionHead";
import { Stagger, RevealItem } from "@/components/motion/Reveal";
import { cn } from "@/lib/utils";

type Tile = {
  index: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  span: string;
};

const TILES: Tile[] = [
  {
    index: "01 / Staffing",
    title: "Staffing & Recruiting",
    body: "Clerical, administrative, and light industrial talent on temporary, temp-to-hire, and direct-hire terms. Screened, reference-checked, ready to work.",
    cta: "Explore staffing",
    href: "/staffing",
    span: "col-span-2 row-span-2 max-[980px]:row-span-1 max-[560px]:col-span-1",
  },
  {
    index: "02 / Search",
    title: "Professional Search",
    body: "Engineering, IT, finance, program management, and other specialized roles, sourced by recruiters who understand the function.",
    cta: "Explore search",
    href: "/professional-search",
    span: "col-span-2 max-[560px]:col-span-1",
  },
  {
    index: "03 / HR",
    title: "HR & Payroll",
    body: "W-2 employment, payroll, and HR administration for the people we place, so the paperwork isn't your problem.",
    cta: "Explore",
    href: "/hr-payroll",
    span: "",
  },
  {
    index: "04 / Books",
    title: "Bookkeeping",
    body: "Back-office bookkeeping for small and mid-sized Austin businesses, kept current and clean.",
    cta: "Explore",
    href: "/bookkeeping",
    span: "",
  },
];

export function ServicesBento() {
  return (
    <Section tight data-screen-label="What we do">
      <Container>
        <SectionHead
          eyebrow="What we do"
          title="One partner for your workforce and the work behind it."
          lead="Most companies juggle a recruiter, a payroll service, and a bookkeeper who never talk to each other. Cosmos does all three, so there's one number to call."
        />

        <Stagger className="mt-[clamp(40px,5vw,64px)] grid auto-rows-[minmax(180px,auto)] grid-cols-4 gap-4 max-[980px]:grid-cols-2 max-[560px]:grid-cols-1">
          {TILES.map((tile) => (
            <RevealItem key={tile.href} className={tile.span}>
              <Link
                href={tile.href}
                className={cn(
                  "group relative isolate flex h-full flex-col justify-between gap-8 overflow-hidden rounded-card border border-hairline bg-surface p-[clamp(22px,3vw,34px)] transition-[transform,box-shadow,border-color] duration-420 ease-expo",
                  "hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--hairline))] hover:shadow-(--shadow-md)",
                )}
              >
                <span
                  aria-hidden="true"
                  className="bento-glow pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-420 ease-expo group-hover:opacity-100"
                />
                <span className="font-mono text-sm text-muted">
                  {tile.index}
                </span>
                <span>
                  <span className="block text-h3 font-[540] tracking-[-0.02em]">
                    {tile.title}
                  </span>
                  <span className="mt-3 block text-sm leading-[1.55] text-muted">
                    {tile.body}
                  </span>
                </span>
                <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-accent">
                  {tile.cta} <Arrow />
                </span>
              </Link>
            </RevealItem>
          ))}
        </Stagger>
      </Container>
    </Section>
  );
}
