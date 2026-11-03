import type { Metadata } from "next";
import Link from "next/link";
import { account } from "@/lib/site";
import { accountsEnabled } from "@/lib/account/config";
import {
  destinationOr,
  signInReason,
  withNext,
} from "@/lib/account/destination";
import { ForgotForm } from "@/components/account/AuthForms";
import { captchaSiteKey } from "@/lib/account/captcha";
import { AccountsOff } from "@/components/account/AccountNotes";

export const metadata: Metadata = { title: account.forgot.title };

type Props = { searchParams: Promise<Record<string, string | string[]>> };

/** Asks for a reset link. Never says whether an account exists. */
export default async function ForgotPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = destinationOr(params.next);
  if (!accountsEnabled()) return <AccountsOff title={account.forgot.title} />;
  return (
    <section className="account-section">
      <ForgotForm
        next={next}
        captcha={captchaSiteKey()}
        expired={signInReason(params.reason) === "link_expired"}
      />
      <p className="account-links">
        <Link href={withNext("/account/login", next)}>
          {account.forgot.back}
        </Link>
      </p>
    </section>
  );
}
