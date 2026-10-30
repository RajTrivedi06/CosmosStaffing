import Link from "next/link";
import { account, siteConfig } from "@/lib/site";
import type { SignInReason } from "@/lib/account/destination";

/** Why the client is on this page, in plain words. Never another client's details. */
export function ReasonNote({ reason }: { reason: SignInReason }) {
  const calm = !["session_expired", "wrong_account", "link_expired"].includes(
    reason,
  );
  return (
    <p
      className={calm ? "account-notice" : "quote-alert"}
      role={calm ? "status" : "alert"}
    >
      {account.reasons[reason]}
    </p>
  );
}

/** Accounts aren't configured on this deployment. */
export function AccountsOff({ title }: { title: string }) {
  return (
    <section className="account-section">
      <h1>{title}</h1>
      <p className="quote-help">{account.errors.off}</p>
      <div className="account-actions">
        <Link className="btn btn-primary" href={siteConfig.contactCta.href}>
          {siteConfig.contactCta.label}
        </Link>
      </div>
    </section>
  );
}
