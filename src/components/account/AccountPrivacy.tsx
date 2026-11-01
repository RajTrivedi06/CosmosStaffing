"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { account } from "@/lib/site";
import { SIGNED_OUT_SIGNAL } from "@/lib/quote-store";

type View = "open" | "checking" | "unconfirmed" | "cleared";

/** Sign-out signals as it starts and can take over 3 s; wait a little longer. */
const SIGN_OUT_CHECKS = 8;
const SIGN_OUT_CHECK_MS = 500;

/** The session's owner tag, null for nobody, undefined if it can't be told. */
async function liveOwner(): Promise<string | null | undefined> {
  try {
    const response = await fetch("/account/session", { cache: "no-store" });
    if (!response.ok) return undefined;
    const { owner } = (await response.json()) as { owner?: unknown };
    return typeof owner === "string" || owner === null ? owner : undefined;
  } catch {
    return undefined;
  }
}

/**
 * A page stays on screen after its session ends, so a tab left open would keep
 * one client's details in front of the next person at this browser. This holds
 * a signed-in client's page: hidden as soon as the tab leaves, and shown again
 * only once the session is confirmed to still be theirs. If it isn't, the page
 * is dropped and reloaded, and the server decides what this browser may see.
 * Pages still authorize for themselves; this only governs what's already here.
 */
export function AccountPrivacy({
  owner,
  children,
}: {
  owner: string | null;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<View>("open");
  /** Runs a check for the "Try again" button; set while a client is signed in. */
  const retryRef = useRef(() => {});

  useEffect(() => {
    if (!owner) return;
    let concealed = false;
    let leaving = false;
    /** Only the newest check counts; hiding the page cancels any in flight. */
    let latest = 0;
    let focused: HTMLElement | null = null;

    const conceal = () => {
      latest += 1;
      if (concealed || leaving) return;
      concealed = true;
      if (document.activeElement instanceof HTMLElement)
        focused = document.activeElement;
      // The browser may freeze this page next, so it can't wait for a render.
      flushSync(() => setView("checking"));
    };
    const clear = () => {
      leaving = true;
      latest += 1;
      flushSync(() => setView("cleared"));
    };
    const reload = () => window.location.replace(window.location.href);
    const check = async () => {
      if (leaving) return;
      const id = ++latest;
      const seen = await liveOwner();
      if (id !== latest) return;
      if (seen === undefined) {
        if (concealed) setView("unconfirmed");
      } else if (seen !== owner) {
        clear();
        reload();
      } else if (concealed) {
        concealed = false;
        flushSync(() => setView("open"));
        focused?.focus({ preventScroll: true });
        focused = null;
      }
    };

    const onVisibility = () => {
      conceal();
      if (document.visibilityState === "visible") void check();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      conceal();
      void check();
    };
    // A switch can happen with no sign-out and no tab change, such as a
    // confirmation link in a window beside this one.
    const onFocus = () => {
      if (!concealed) void check();
    };
    const onStorage = async (event: StorageEvent) => {
      if (event.key !== SIGNED_OUT_SIGNAL || leaving) return;
      clear();
      for (let i = 0; i < SIGN_OUT_CHECKS; i += 1) {
        if ((await liveOwner()) !== owner) break;
        await new Promise((done) => setTimeout(done, SIGN_OUT_CHECK_MS));
      }
      reload();
    };
    retryRef.current = () => {
      setView("checking");
      void check();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", conceal);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      latest += 1;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", conceal);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [owner]);

  const concealed = view !== "open";
  return (
    <>
      <div className="account-private" data-concealed={concealed || undefined}>
        {view !== "cleared" && children}
      </div>
      {concealed &&
        // On the body: the card would otherwise place it, off-screen on a long page.
        createPortal(
          <div className="account-check" data-view={view} role="status">
            {view === "unconfirmed" ? (
              <>
                <p>{account.privacy.unconfirmed}</p>
                <button
                  type="button"
                  className="btn btn-glass"
                  onClick={() => retryRef.current()}
                >
                  {account.privacy.retry}
                </button>
              </>
            ) : (
              <p>{account.privacy.checking}</p>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
