"use client";

import { signOut } from "@/app/account/actions";
import { forgetOnSignOut } from "@/lib/quote-store";

/**
 * Signs out on this device. Also forgets quote answers in this browser, which
 * hold contact details (lib/quote-store.ts: an unconfirmed send attempt keeps
 * only its ID, so signing back in can't create a duplicate).
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
