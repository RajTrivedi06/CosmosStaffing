import { account } from "@/lib/site";
import type { AccountItem, AccountOverview } from "@/lib/account/records";

type Key = keyof typeof account.home.sections;

/**
 * The account's records, as the Studio reports them. Quotes needing action
 * come first. Until the Studio's records are connected, an honest note shows
 * instead of empty lists that would read as "you have nothing".
 */
export function AccountOverviewView({
  overview,
}: {
  overview: AccountOverview;
}) {
  if (overview.status !== "ready") {
    const note =
      overview.status === "unavailable"
        ? account.home.unavailable
        : account.home.notConnected;
    return (
      <div
        className="account-empty"
        role={overview.status === "unavailable" ? "alert" : "status"}
      >
        <h2 className="account-subtitle">{note.title}</h2>
        <p>{note.body}</p>
      </div>
    );
  }
  const sections: [Key, AccountItem[] | null][] = [
    ["quotes", overview.quotes],
    ["requests", overview.requests],
    ["upcoming", overview.upcoming],
    ["completed", overview.completed],
    ["payments", overview.payments],
  ];
  return (
    <div className="account-records">
      {sections.map(([key, items]) =>
        items === null ? null : (
          <section key={key} aria-labelledby={`account-${key}`}>
            <h2 id={`account-${key}`} className="account-subtitle">
              {account.home.sections[key]}
            </h2>
            {items.length === 0 ? (
              <p className="quote-note">{account.home.empty[key]}</p>
            ) : (
              <ul className="account-list">
                {items.map((item) => (
                  <li key={item.id}>
                    <div>
                      <p className="account-item-title">{item.title}</p>
                      <p className="quote-note">
                        {item.status}
                        {item.when ? ` · ${item.when}` : ""}
                      </p>
                    </div>
                    {item.href && (
                      // Studio recipient pages: a full page load, never next/link.
                      <a className="btn btn-glass" href={item.href}>
                        {item.action ?? "Open"}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ),
      )}
    </div>
  );
}
