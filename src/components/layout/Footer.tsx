import Link from "next/link";
import { siteConfig } from "@/lib/site";
import { Container } from "@/components/ui/Container";
import { Placeholder } from "@/components/ui/Placeholder";

function FooterCol({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-4 font-mono text-eyebrow font-medium tracking-[0.14em] text-muted uppercase">
        {title}
      </h4>
      <ul className="flex flex-col gap-3">{children}</ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative z-[1] border-t border-hairline bg-bg pt-[clamp(56px,7vw,88px)] pb-12">
      <Container>
        <div className="grid grid-cols-[1.6fr_1fr_1fr_1.4fr] gap-x-8 gap-y-12 max-[900px]:grid-cols-2 max-[560px]:grid-cols-1">
          <div className="flex max-w-[30ch] flex-col gap-4">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-display text-[1.18rem] font-[580] tracking-[-0.03em]"
            >
              <span className="brand-mark size-[26px]" aria-hidden="true" />
              Cosmos
            </Link>
            <p className="text-sm text-muted">
              Staffing and workforce solutions, Austin-based. Vetted people and
              the back office behind them.
            </p>
          </div>

          <FooterCol title="Services">
            {siteConfig.services.map((s) => (
              <li key={s.href}>
                <Link className="link-slide text-sm" href={s.href}>
                  {s.title}
                </Link>
              </li>
            ))}
          </FooterCol>

          <FooterCol title="Company">
            {siteConfig.companyNav.map((c) => (
              <li key={c.href}>
                <Link className="link-slide text-sm" href={c.href}>
                  {c.label}
                </Link>
              </li>
            ))}
          </FooterCol>

          <FooterCol title="Contact">
            <li className="text-sm text-muted">
              <Placeholder>address</Placeholder>
            </li>
            <li>
              <Link className="link-slide text-sm" href="/contact">
                <Placeholder>phone</Placeholder>
              </Link>
            </li>
            <li>
              <Link className="link-slide text-sm" href="/contact">
                <Placeholder>email</Placeholder>
              </Link>
            </li>
            <li className="mt-2">
              <a className="link-slide text-sm" href={siteConfig.social.linkedin}>
                LinkedIn
              </a>
            </li>
          </FooterCol>
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-6 text-sm text-muted">
          <span>
            &copy; {year} {siteConfig.legalName}.
          </span>
          <span>Serving Austin &amp; Central Texas</span>
        </div>
      </Container>
    </footer>
  );
}
