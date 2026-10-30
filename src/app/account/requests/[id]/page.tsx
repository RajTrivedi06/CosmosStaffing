import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { account } from "@/lib/site";
import { clientSession } from "@/lib/account/server";
import { requestPage } from "@/lib/account/records";
import { formatWhen, requestFacts } from "@/lib/account/labels";
import { ACCOUNT_HOME, signInHref } from "@/lib/account/destination";
import { EMPTY_ANSWERS, summarize, type QuoteAnswers } from "@/lib/quote";
import { AccountsOff } from "@/components/account/AccountNotes";
import {
  ItemList,
  SessionRejected,
} from "@/components/account/AccountOverview";

export const metadata: Metadata = { title: "Your request" };

type Props = { params: Promise<{ id: string }> };

/**
 * One request, its sent quotes and payment requests, from the Studio's
 * customer API. Quote and payment pages stay the Studio's own (/q/…, /pay/…);
 * this page only links to them. Another client's request reads as not found.
 */
export default async function RequestPage({ params }: Props) {
  const session = await clientSession();
  if (session.state === "off")
    return <AccountsOff title={account.home.title} />;
  if (session.state !== "signed_in")
    redirect(
      signInHref(
        ACCOUNT_HOME,
        session.state === "expired" ? "session_expired" : "signin_required",
      ),
    );

  const page = await requestPage((await params).id);
  const back = (
    <p className="account-links">
      <Link href={ACCOUNT_HOME}>{account.request.back}</Link>
    </p>
  );
  // The Studio refused this session. Sign-in can't help while the local
  // session still looks valid, so this ends it rather than redirecting.
  if (page.status === "signin")
    return (
      <section className="account-section">
        <SessionRejected />
        {back}
      </section>
    );
  if (page.status !== "ready") {
    const note =
      page.status === "not_found"
        ? account.request.notFound
        : page.status === "unverified"
          ? account.home.unverified
          : page.status === "not_connected"
            ? account.home.notConnected
            : account.home.unavailable;
    return (
      <section className="account-section">
        <h1>{note.title}</h1>
        <p className="quote-help">{note.body}</p>
        {back}
      </section>
    );
  }

  const { request, quotes, payments } = page;
  const answers = request.answers
    ? summarize({
        ...EMPTY_ANSWERS,
        ...request.answers,
        extras: request.answers.extras,
      } as QuoteAnswers)
    : [];

  return (
    <section className="account-section account-home">
      {back}
      <header className="account-head">
        <h1>Request #{request.job_number}</h1>
        <p className="quote-help">
          Sent {formatWhen(request.submitted_at)}
          {requestFacts(request).length > 0 &&
            ` · ${requestFacts(request).join(" · ")}`}
        </p>
      </header>

      <section aria-labelledby="request-quotes">
        <h2 id="request-quotes" className="account-subtitle">
          {account.request.quotes}
        </h2>
        {quotes.length ? (
          <ItemList items={quotes} />
        ) : (
          <p className="quote-note">{account.request.noQuotes}</p>
        )}
        {request.quotes_has_more && (
          <p className="quote-note">{account.request.moreQuotes}</p>
        )}
      </section>

      <section aria-labelledby="request-payments">
        <h2 id="request-payments" className="account-subtitle">
          {account.request.payments}
        </h2>
        {payments.length ? (
          <ItemList items={payments} />
        ) : (
          <p className="quote-note">{account.request.noPayments}</p>
        )}
        {request.payment_requests_has_more && (
          <p className="quote-note">{account.request.morePayments}</p>
        )}
      </section>

      {answers.length > 0 && (
        <section aria-labelledby="request-answers">
          <h2 id="request-answers" className="account-subtitle">
            {account.request.answers}
          </h2>
          <dl className="quote-review">
            {answers.map((row) => (
              <div key={row.step}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </section>
  );
}
