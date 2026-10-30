"use client";

import { account } from "@/lib/site";

/**
 * When a form's request never reaches this site's code, as when the edge's
 * rate limit answers 429, a Server Action has no result to show and lands here.
 * Nothing is resent by itself: the client chooses when to try again.
 */
export default function AccountError({ retry }: { retry: () => void }) {
  const { title, body, action } = account.errors.interrupted;
  return (
    <section className="account-section" role="alert">
      <h1>{title}</h1>
      <p className="quote-help">{body}</p>
      <div className="account-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => retry()}
        >
          {action}
        </button>
      </div>
    </section>
  );
}
