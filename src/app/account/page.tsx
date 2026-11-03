import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { account } from "@/lib/site";
import { clientSession } from "@/lib/account/server";
import { accountOverview } from "@/lib/account/records";
import { safeCursor } from "@/lib/customer-api";
import { ACCOUNT_HOME, signInHref } from "@/lib/account/destination";
import { AccountOverviewView } from "@/components/account/AccountOverview";
import { SignOutButton } from "@/components/account/SignOutButton";
import { AccountsOff } from "@/components/account/AccountNotes";

export const metadata: Metadata = { title: account.home.title };

type Props = { searchParams: Promise<Record<string, string | string[]>> };

/** The signed-in client's home: their requests, quotes, visits and payments. */
export default async function AccountPage({ searchParams }: Props) {
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

  const params = await searchParams;
  const updated = params.updated === "1";
  const cursor = safeCursor(params.cursor);
  const overview = await accountOverview(cursor);
  // A session the Studio refused has one way on, its own "Sign in again".
  const refused = overview.status === "signin";
  return (
    <section className="account-section account-home">
      <header className="account-head">
        <h1>{account.home.title}</h1>
      </header>
      {updated && (
        <p className="account-notice" role="status">
          {account.reasons.password_updated}
        </p>
      )}
      {!refused && (
        <div className="account-actions">
          <Link className="btn btn-primary" href="/quote">
            {account.home.newRequest}
          </Link>
        </div>
      )}
      <AccountOverviewView overview={overview} paged={!!cursor} />
      {!refused && (
        <footer className="account-foot">
          <p>
            {account.home.signedInAs}{" "}
            <strong className="account-address">{session.client.email}</strong>
          </p>
          <SignOutButton
            label={account.home.signOut}
            className="account-signout"
          />
        </footer>
      )}
    </section>
  );
}
