import Link from "next/link";
import { account } from "@/lib/site";
import type { AccountItem, AccountOverview } from "@/lib/account/records";
import { SignOutButton } from "./SignOutButton";

/**
 * The account's records, as the Studio reports them. Quotes to review come
 * first; upcoming and completed cleanings only appear when there are some.
 * When the records can't be shown, an honest note replaces empty lists that
 * would read as "you have nothing".
 */
export function AccountOverviewView({
  overview,
  paged = false,
}: {
  overview: AccountOverview;
  /** Showing an older page of requests. */
  paged?: boolean;
}) {
  if (overview.status === "signin") return <SessionRejected />;
  if (overview.status !== "ready") {
    const note =
      overview.status === "unverified"
        ? account.home.unverified
        : overview.status === "not_connected"
          ? account.home.notConnected
          : account.home.unavailable;
    return (
      <div
        className="account-empty"
        role={overview.status === "not_connected" ? "status" : "alert"}
      >
        <h2 className="account-subtitle">{note.title}</h2>
        <p>{note.body}</p>
      </div>
    );
  }
  const { sections } = account.home;
  const none =
    !paged &&
    !overview.quotes.length &&
    !overview.requests.length &&
    !overview.upcoming.length &&
    !overview.completed.length;
  if (none)
    return (
      <div className="account-empty" role="status">
        <p>{account.home.noRequests}</p>
      </div>
    );
  return (
    <div className="account-records">
      {(overview.quotes.length > 0 || overview.quotesIncomplete) && (
        <Section id="quotes" title={sections.quotes} items={overview.quotes}>
          {overview.quotesIncomplete && (
            <p className="quote-note">{account.home.quotesIncomplete}</p>
          )}
        </Section>
      )}
      {overview.upcoming.length > 0 && (
        <Section
          id="upcoming"
          title={sections.upcoming}
          items={overview.upcoming}
        />
      )}
      <Section
        id="requests"
        title={sections.requests}
        items={overview.requests}
        empty={account.home.empty.requests}
      />
      {overview.completed.length > 0 && (
        <Section
          id="completed"
          title={sections.completed}
          items={overview.completed}
        />
      )}
      {(paged || overview.nextCursor) && (
        <nav className="account-links" aria-label="Requests pages">
          {paged ? (
            <Link href="/account">{account.home.newest}</Link>
          ) : (
            <span />
          )}
          {overview.nextCursor && (
            <Link
              href={`/account?cursor=${encodeURIComponent(overview.nextCursor)}`}
            >
              {account.home.older}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

/**
 * The Studio didn't accept a session this site still thinks is valid (it can
 * have been revoked). Redirecting to sign-in would bounce straight back, so
 * this says so and ends the local session.
 */
export function SessionRejected({ next }: { next?: string }) {
  const { rejected } = account.home;
  return (
    <div className="account-empty" role="alert">
      <h2 className="account-subtitle">{rejected.title}</h2>
      <p>{rejected.body}</p>
      <SignOutButton
        next={next}
        label={rejected.action}
        className="btn btn-primary"
      />
    </div>
  );
}

function Section({
  id,
  title,
  items,
  empty,
  children,
}: {
  id: string;
  title: string;
  items: AccountItem[];
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`account-${id}`}>
      <h2 id={`account-${id}`} className="account-subtitle">
        {title}
      </h2>
      {items.length === 0 && empty ? (
        <p className="quote-note">{empty}</p>
      ) : (
        <ItemList items={items} />
      )}
      {children}
    </section>
  );
}

export function ItemList({ items }: { items: AccountItem[] }) {
  return (
    <ul className="account-list">
      {items.map((item) => (
        <li key={item.id}>
          <div>
            <p className="account-item-title">{item.title}</p>
            {item.facts.length > 0 && (
              <p className="quote-note">{item.facts.join(" · ")}</p>
            )}
          </div>
          {item.href &&
            // Studio recipient pages need a full page load; ours can use Link.
            (item.href.startsWith("/account/") ? (
              <Link className="btn btn-glass" href={item.href}>
                {item.action ?? "Open"}
              </Link>
            ) : (
              <a className="btn btn-glass" href={item.href}>
                {item.action ?? "Open"}
              </a>
            ))}
        </li>
      ))}
    </ul>
  );
}
