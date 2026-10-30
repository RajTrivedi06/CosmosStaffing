import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { account } from "@/lib/site";
import { clientSession } from "@/lib/account/server";
import {
  destinationOr,
  isStudioDestination,
  signInHref,
  withNext,
} from "@/lib/account/destination";
import { SignUpForm } from "@/components/account/AuthForms";
import { AccountsOff } from "@/components/account/AccountNotes";

export const metadata: Metadata = { title: account.signUp.title };

type Props = { searchParams: Promise<Record<string, string | string[]>> };

/** New client accounts. The email is confirmed once, by link. */
export default async function SignUpPage({ searchParams }: Props) {
  const next = destinationOr((await searchParams).next);
  const session = await clientSession();
  if (session.state === "off")
    return <AccountsOff title={account.signUp.title} />;
  // Already signed in: no second account, no second verification.
  if (session.state === "signed_in")
    redirect(isStudioDestination(next) ? signInHref(next) : next);

  return (
    <section className="account-section">
      <h1>{account.signUp.title}</h1>
      <p className="quote-help">{account.signUp.lede}</p>
      <SignUpForm next={next} />
      <p className="account-links">
        <span>
          {account.signUp.haveAccount}{" "}
          <Link href={withNext("/account/login", next)}>
            {account.signIn.submit}
          </Link>
        </span>
      </p>
    </section>
  );
}
