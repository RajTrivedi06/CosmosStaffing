"use client";

import { useEffect } from "react";

/**
 * Opens a forwarded Studio page (a quote or payment link) with a full page
 * load as soon as the client is signed in. The link stays as a fallback.
 */
export function ContinueTo({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);
  return (
    <a className="btn btn-primary" href={href}>
      Continue
    </a>
  );
}
