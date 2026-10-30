import type { Metadata } from "next";
import Link from "next/link";
import { account } from "@/lib/site";
import { clientSession, mayChangePassword } from "@/lib/account/server";
import { destinationOr, withNext } from "@/lib/account/destination";
import { ResetForm } from "@/components/account/AuthForms";
import { AccountsOff } from "@/components/account/AccountNotes";

export const metadata: Metadata = { title: account.reset.title };

type Props = { searchParams: Promise<Record<string, string | string[]>> };

/**
 * Choose a new password. The reset email's link signs the client in
 * (/account/confirm) and brings them here. There's no other way in: a signed-in
 * client without a recent emailed link is sent to get one, so an open browser
 * can't change the password.
 */
export default async function ResetPage({ searchParams }: Props) {
  const next = destinationOr((await searchParams).next);
  const session = await clientSession();
  if (session.state === "off")
    return <AccountsOff title={account.reset.title} />;
  if (session.state !== "signed_in")
    return (
      <section className="account-section">
        <h1>{account.reset.title}</h1>
        <p className="quote-alert" role="alert">
          {account.reset.expired}
        </p>
        <div className="account-actions">
          <Link
            className="btn btn-primary"
            href={withNext("/account/forgot", next)}
          >
            {account.forgot.submit}
          </Link>
        </div>
      </section>
    );
  if (!(await mayChangePassword()))
    return (
      <section className="account-section">
        <h1>{account.reset.title}</h1>
        <p className="quote-help">{account.reset.linkRequired}</p>
        <div className="account-actions">
          <Link
            className="btn btn-primary"
            href={withNext("/account/forgot", next)}
          >
            {account.forgot.submit}
          </Link>
        </div>
      </section>
    );
  return (
    <section className="account-section">
      <h1>{account.reset.title}</h1>
      <p className="quote-help">
        For <strong>{session.client.email}</strong>.
      </p>
      <ResetForm next={next} />
    </section>
  );
}
