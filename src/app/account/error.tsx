"use client";

import { account } from "@/lib/site";

/**
 * When a form gets no usable answer, as when the edge's rate limit replies or
 * the connection drops, a Server Action has no result to show and lands here.
 * That doesn't say whether the request took effect, so neither does this page,
 * and nothing is resent by itself: the client chooses what to do next.
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
