"use client";

import { useEffect, useRef, useState } from "react";
import { account } from "@/lib/site";

type Turnstile = {
  render(element: HTMLElement, options: Record<string, unknown>): string;
  reset(widget: string): void;
  remove(widget: string): void;
};

declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<Turnstile> | null = null;

/** Cloudflare's script, loaded once however many forms ask. */
function loadTurnstile() {
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile didn't load"));
    script.onerror = () => {
      loading = null;
      script.remove();
      reject(new Error("Turnstile didn't load"));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * The security check inside one form. Cloudflare puts its token in a hidden
 * field the Server Action reads. Auth spends a token on one request, so each
 * new result (`result`, the form's state) asks for a fresh one, and the form
 * can't be sent until it arrives. Without a site key there's nothing to do.
 */
export function useCaptcha(
  siteKey: string | null,
  name: string,
  result: object,
) {
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const latest = useRef(result);
  // The result the current token was issued after; a newer one needs another.
  const [passed, setPassed] = useState<object | null>(null);
  const [failed, setFailed] = useState(false);
  // The result a check has taken over a second on, so the closed button says why.
  const [slow, setSlow] = useState<object | null>(null);
  const waiting = !!siteKey && passed !== result && !failed;

  useEffect(() => {
    if (!siteKey) return;
    let live = true;
    loadTurnstile().then(
      (turnstile) => {
        if (!live || !box.current) return;
        widget.current = turnstile.render(box.current, {
          sitekey: siteKey,
          action: name,
          appearance: "interaction-only",
          size: "flexible",
          callback: () => {
            setFailed(false);
            setPassed(latest.current);
          },
          "expired-callback": () => setPassed(null),
          "error-callback": () => setFailed(true),
        });
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, name]);

  useEffect(() => {
    if (latest.current === result) return;
    latest.current = result;
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [result]);

  useEffect(() => {
    if (!waiting) return;
    const timer = setTimeout(() => setSlow(result), 1000);
    return () => clearTimeout(timer);
  }, [waiting, result]);

  return {
    ready: !siteKey || passed === result,
    widget: siteKey ? (
      <>
        <div ref={box} className="account-captcha" />
        <p className="quote-note account-captcha-note" aria-live="polite">
          {waiting && slow === result ? account.errors.captchaPending : ""}
        </p>
        {failed && (
          <p className="quote-alert" role="alert">
            {account.errors.captchaUnavailable}
          </p>
        )}
        <noscript>
          <p className="quote-note">{account.errors.captchaScript}</p>
        </noscript>
      </>
    ) : null,
  };
}
