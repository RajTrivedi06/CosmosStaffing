"use client";

import { signOut } from "@/app/account/actions";
import { quoteHandoff } from "@/lib/quote-handoff";

/**
 * Signs out on this device. Also forgets a quote waiting here for sign-in,
 * since it holds the client's contact details.
 */
export function SignOutButton({
  next,
  label = "Sign out",
  className = "btn btn-glass",
}: {
  next?: string;
  label?: string;
  className?: string;
}) {
  return (
    <form action={signOut} onSubmit={() => quoteHandoff.clear()}>
      {next && <input type="hidden" name="next" value={next} />}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
