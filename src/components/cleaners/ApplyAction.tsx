import { cleaners } from "@/lib/site";

/**
 * The application call to action. Once the Studio's public application path
 * is confirmed and forwarded (`cleaners.apply.available`), this is a plain
 * link into the Studio: next/link cannot cross zones. Until then it is a
 * clear unavailable state with nothing to click, so no one lands on a
 * broken page.
 */
export function ApplyAction() {
  const { apply } = cleaners;
  if (apply.available) {
    return (
      <a className="btn btn-primary" href={apply.href}>
        {apply.label}
      </a>
    );
  }
  return (
    <p className="apply-soon">
      <span>{apply.label}</span>
      <span>{apply.pending}</span>
    </p>
  );
}

/** Cleaners sign in on the Studio's portal; never the staff login. */
export function CleanerSignIn({ withNote = false }: { withNote?: boolean }) {
  const { signIn } = cleaners;
  return (
    <p className="cleaner-sign-in">
      {withNote && <span>{signIn.note} </span>}
      <a href={signIn.href}>{signIn.label}</a>
    </p>
  );
}
