import { siteConfig } from "@/lib/site";
import { Placeholder } from "@/components/ui/Placeholder";

export function SiteFooter() {
  return (
    <footer className="site-footer pad">
      <div>
        <span className="wordmark">{siteConfig.shortName}</span>
        <p className="micro" style={{ marginTop: 8 }}>
          Home and workplace cleaning, based in Texas.
        </p>
      </div>
      <div>
        <h2>Services</h2>
        <ul>
          {siteConfig.footer.services.map((item) => (
            <li key={item.label}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>{siteConfig.shortName}</h2>
        <ul>
          {siteConfig.footer.company.map((item) => (
            <li key={item.label}>
              <a href={item.href}>{item.label}</a>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2>Talk to us</h2>
        <ul>
          <li>
            <Placeholder>phone</Placeholder>
          </li>
          <li>
            <Placeholder>email</Placeholder>
          </li>
          <li>
            &copy; {new Date().getFullYear()} {siteConfig.name}
          </li>
        </ul>
      </div>
    </footer>
  );
}
