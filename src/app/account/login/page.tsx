import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { account } from "@/lib/site";
import { clientSession } from "@/lib/account/server";
import {
  destinationOr,
  isStudioDestination,
  signInReason,
  withNext,
} from "@/lib/account/destination";
import { SignInForm } from "@/components/account/AuthForms";
import { SignOutButton } from "@/components/account/SignOutButton";
import { ContinueTo } from "@/components/account/ContinueTo";
import { AccountsOff, ReasonNote } from "@/components/account/AccountNotes";

export const metadata: Metadata = { title: account.signIn.title };

type Props = { searchParams: Promise<Record<string, string | string[]>> };

/**
 * Client sign-in. The Studio sends a client here from a quote or payment link
 * that needs an account (`?next=/q/<token>`); they return to that exact link.
 */
export default async function SignInPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = destinationOr(params.next);
  const session = await clientSession();
  const reason =
    signInReason(params.reason) ??
    (session.state === "expired" ? "session_expired" : null);

  if (session.state === "off")
    return <AccountsOff title={account.signIn.title} />;

  if (session.state === "signed_in") {
    // Signed in, but the link needs someone else. Say only that: this site
    // never learns, and never shows, whose link it is.
    if (reason === "wrong_account")
      return (
        <section className="account-section">
          <h1>{account.signIn.title}</h1>
          <ReasonNote reason="wrong_account" />
          <p>
            {account.home.signedInAs} <strong>{session.client.email}</strong>.
          </p>
          <div className="account-actions">
            <SignOutButton
              next={next}
              label="Sign out and switch account"
              className="btn btn-primary"
            />
            <Link className="btn btn-glass" href={account.path}>
              {account.label}
            </Link>
          </div>
        </section>
      );
    if (!isStudioDestination(next)) redirect(next);
    return (
      <section className="account-section">
        <h1>You&apos;re signed in</h1>
        <p>
          {account.home.signedInAs} <strong>{session.client.email}</strong>.
        </p>
        <div className="account-actions">
          {/* A forwarded Studio page: a full page load, never next/link. */}
          <ContinueTo href={next} />
        </div>
      </section>
    );
  }

  return (
    <section className="account-section">
      <h1>{account.signIn.title}</h1>
      {reason ? (
        <ReasonNote reason={reason} />
      ) : (
        <p className="quote-help">{account.signIn.lede}</p>
      )}
      <SignInForm next={next} />
      <p className="account-links">
        <Link href={withNext("/account/forgot", next)}>
          {account.signIn.forgot}
        </Link>
        <span>
          {account.signIn.noAccount}{" "}
          <Link href={withNext("/account/signup", next)}>
            {account.signIn.create}
          </Link>
        </span>
      </p>
    </section>
  );
}
