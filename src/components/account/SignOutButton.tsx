"use client";

import { signOut } from "@/app/account/actions";
import { forgetOnSignOut } from "@/lib/quote-store";

/**
 * Signs out on this device. Also forgets quote drafts in this browser, which
 * hold contact details (lib/quote-store.ts: an unconfirmed send attempt stays
 * filed under its owner, for an identical retry after signing back in).
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
    <form action={signOut} onSubmit={() => forgetOnSignOut()}>
      {next && <input type="hidden" name="next" value={next} />}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
