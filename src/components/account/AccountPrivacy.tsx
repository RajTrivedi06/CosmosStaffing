"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import { account } from "@/lib/site";
import {
  ACCOUNT_OWNER_SIGNAL,
  SIGNED_OUT_SIGNAL,
  announceOwner,
  forgetTabDrafts,
} from "@/lib/quote-store";

type View = "open" | "checking" | "unconfirmed";

/** Sign-out signals as it starts and can take over 3 s; give it about 6 s. */
const SIGN_OUT_CHECKS = 12;
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
 * a signed-in client's page: hidden whenever the tab leaves or returns, and
 * shown again only once the session is confirmed to still be theirs. A
 * different session drops the page and reloads, so the server decides what this
 * browser may see. An unknown one proves nothing either way: the page stays
 * hidden, and is never reloaded on the strength of it.
 *
 * Pages still authorize for themselves; this only governs what's already here.
 * A dropped /quote leaves storage as settleQuoteStorage does on any load: its
 * answers go, and an unresolved attempt keeps its ID under its own account.
 */
export function AccountPrivacy({
  owner,
  children,
}: {
  owner: string | null;
  children: React.ReactNode;
}) {
  const [view, setView] = useState<View>("open");
  const [cleared, setCleared] = useState(false);
  /** Asks again for the "Try again" button; set while a client is signed in. */
  const retryRef = useRef(() => {});

  useEffect(() => {
    if (!owner) return;
    let concealed = false;
    /** The page is on its way out, and nothing brings it back. */
    let leaving = false;
    /** Only the newest check counts; hiding the page cancels any in flight. */
    let latest = 0;
    let running = 0;
    let focused: HTMLElement | null = null;

    const conceal = () => {
      latest += 1;
      running = 0;
      if (concealed) return;
      concealed = true;
      if (document.activeElement instanceof HTMLElement)
        focused = document.activeElement;
      // The browser may freeze this page next, so it can't wait for a render.
      flushSync(() => setView("checking"));
    };
    const clear = () => {
      leaving = true;
      conceal();
      flushSync(() => setCleared(true));
    };
    const leaveFor = (seen: string | null) => {
      clear();
      forgetTabDrafts(seen ?? undefined);
      // Without the query, which on /quote carries the old client's choices.
      window.location.replace(window.location.pathname);
    };
    const check = async () => {
      const id = ++latest;
      running = id;
      let seen = await liveOwner();
      // A session that has really ended reads as unknown once, as its cookie
      // goes, and as nobody after that. An outage reads as unknown both times.
      if (seen === undefined && id === latest) seen = await liveOwner();
      if (running === id) running = 0;
      if (id !== latest) return;
      if (seen === undefined) {
        setView("unconfirmed");
      } else if (seen !== owner) {
        leaveFor(seen);
      } else {
        concealed = false;
        flushSync(() => setView("open"));
        focused?.focus({ preventScroll: true });
        focused = null;
      }
    };
    const revalidate = () => {
      if (leaving) return;
      conceal();
      void check();
    };
    /** Only another session proves sign-out has landed; then it's safe to load. */
    const awaitSignOut = async () => {
      const id = ++latest;
      for (let i = 0; i < SIGN_OUT_CHECKS; i += 1) {
        const seen = await liveOwner();
        if (id !== latest) return;
        if (seen !== undefined && seen !== owner) return leaveFor(seen);
        await new Promise((done) => setTimeout(done, SIGN_OUT_CHECK_MS));
        if (id !== latest) return;
      }
      setView("unconfirmed");
    };

    const onHide = () => {
      if (!leaving) conceal();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") revalidate();
      else onHide();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) revalidate();
    };
    // Coming back to this window fires this too, after a check has started.
    const onFocus = () => {
      if (!running) revalidate();
    };
    const onStorage = (event: StorageEvent) => {
      if (leaving) return;
      if (event.key === SIGNED_OUT_SIGNAL) {
        clear();
        forgetTabDrafts();
        void awaitSignOut();
      } else if (
        event.key === ACCOUNT_OWNER_SIGNAL &&
        event.newValue &&
        event.newValue !== owner
      ) {
        revalidate();
      }
    };
    retryRef.current = () => {
      setView("checking");
      void (leaving ? awaitSignOut() : check());
    };

    announceOwner(owner);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      latest += 1;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [owner]);

  const concealed = view !== "open";
  return (
    <>
      <div className="account-private" data-concealed={concealed || undefined}>
        {!cleared && children}
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
                  className="btn btn-primary"
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
