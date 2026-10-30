"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { account as accountCopy, coverage, siteConfig } from "@/lib/site";
import { quoteHandoff } from "@/lib/quote-handoff";
import type { QuoteIntakeMode } from "@/lib/quote-intake";
import {
  DRAFT_KEY,
  readQuoteDraft,
  updateQuoteAnswers,
  type QuoteDraft,
} from "@/lib/quote-draft";
import {
  ATTEMPT_KEY,
  createQuoteAttempt,
  readQuoteAttempt,
  confirmedQuote,
  type QuoteAttempt,
} from "@/lib/quote-attempt";
import { localCalendarDate, preferredDateError } from "@/lib/quote-date";
import { PreferredDate } from "./PreferredDate";
import styles from "./QuoteFlow.module.css";
import {
  EMPTY_ANSWERS,
  SERVICE_OPTIONS,
  answersFromParams,
  answersToParams,
  conditionOptions,
  extraOptions,
  firstOpenStep,
  frequencyOptions,
  isTexasZip,
  propertyOptions,
  sizeOptions,
  spaceKind,
  stepError,
  stepsFor,
  summarize,
  timingOptions,
  type QuoteAnswers,
  type StepId,
} from "@/lib/quote";

const EASE = [0.32, 0.72, 0, 1] as const;

type Status =
  | "idle"
  | "sending"
  | "sent"
  | "unavailable"
  | "error"
  | "studio_pending"
  | "conflict"
  | "rate_limited"
  | "invalid"
  /** The facade needs a signed-in client (session missing or ended). */
  | "signin";

function loadDraft(): QuoteDraft | null {
  try {
    return readQuoteDraft(sessionStorage.getItem(DRAFT_KEY));
  } catch {
    return null;
  }
}
function saveDraft(draft: QuoteDraft | null): boolean {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
    return true;
  } catch {
    // Private mode or blocked storage: the flow still works, just unsaved.
    return false;
  }
}

/**
 * The guided quote, one question per screen, in the spirit of a phone's setup
 * assistant. Questions adapt to earlier answers (see stepsFor). Answers are
 * kept when going back and saved for this tab, so a detour to Contact or a
 * refresh loses nothing. The choices so far also live in the address bar
 * (never contact details), so a quote in progress can be shared or
 * bookmarked. Nothing claims success until /api/quote confirms the request
 * was delivered.
 *
 * With client accounts on, sending needs a signed-in client: questions,
 * review, then sign up or sign in, then send. The reviewed answers wait on
 * this device meanwhile (lib/quote-handoff.ts), even if the confirmation email
 * opens in another tab.
 */
export function QuoteFlow({
  intakeMode,
  accountsOn = false,
  account = null,
}: {
  intakeMode: QuoteIntakeMode;
  accountsOn?: boolean;
  account?: { email: string } | null;
}) {
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<QuoteAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState<StepId>("service");
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [ready, setReady] = useState(false);
  const [draftStored, setDraftStored] = useState(true);
  const [keyboardNavigation, setKeyboardNavigation] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const transitioningRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const attemptRef = useRef<QuoteAttempt | null>(null);
  const [hasAttempt, setHasAttempt] = useState(false);
  const [attemptRecoveryFailed, setAttemptRecoveryFailed] = useState(false);

  // Restore this tab's draft. Answers in the link (a shared quote, or a
  // service chosen on the site) win over the draft, and the flow opens on
  // the first question they leave open.
  useEffect(() => {
    // This tab's draft, or a reviewed quote left waiting for sign-in.
    const draft = loadDraft() ?? (accountsOn ? quoteHandoff.load() : null);
    let storedAttempt: string | null = null;
    try {
      storedAttempt = sessionStorage.getItem(ATTEMPT_KEY);
    } catch {
      /* handled before send */
    }
    const attempt = readQuoteAttempt(storedAttempt);
    const linked = answersFromParams(
      new URLSearchParams(window.location.search),
    );
    const base = draft?.answers ?? EMPTY_ANSWERS;
    const differs = Object.entries(linked).some(
      ([key, value]) =>
        String(value) !== String(base[key as keyof QuoteAnswers]),
    );
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from the URL and sessionStorage, which the server cannot read */
    if (storedAttempt && !attempt) setAttemptRecoveryFailed(true);
    if (attempt) {
      attemptRef.current = attempt;
      setHasAttempt(true);
      setAnswers(attempt.answers);
      setStep("review");
    } else if (differs) {
      const merged = updateQuoteAnswers(base, linked);
      setAnswers(merged);
      setStep(firstOpenStep(merged));
    } else if (draft) {
      setAnswers(draft.answers);
      setStep(draft.step);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [accountsOn]);

  useEffect(() => {
    if (!ready || status === "sent") return;
    const saved = saveDraft({ answers, step });
    // Storage availability is external browser state, not derived React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraftStored(saved);
    const query = answersToParams(answers).toString();
    if (query === window.location.search.slice(1)) return;
    history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  }, [answers, step, ready, status]);

  // Keep an edited field in the visible area after a mobile keyboard resizes
  // it. Never lock the page, reposition controls over inputs, or disable zoom.
  useEffect(() => {
    let frame = 0;
    const viewport = window.visualViewport;
    const reveal = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const active = document.activeElement;
        if (
          !shellRef.current?.contains(active) ||
          !(
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement
          )
        )
          return;
        const bounds = active.getBoundingClientRect();
        const top = viewport?.offsetTop ?? 0;
        const bottom = top + (viewport?.height ?? window.innerHeight);
        if (bounds.bottom > bottom - 16 || bounds.top < top + 16) {
          active.scrollIntoView({ block: "center", behavior: "instant" });
        }
      });
    };
    viewport?.addEventListener("resize", reveal);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", reveal);
    };
  }, []);

  useEffect(() => {
    if (status === "sent") headingRef.current?.focus({ preventScroll: true });
  }, [status]);

  const steps = stepsFor(answers);
  const index = Math.max(0, steps.indexOf(step));
  const isReview = step === "review";
  const awaitingStudio =
    intakeMode === "studio_pending" || status === "studio_pending";
  const needsAccount =
    accountsOn && (!account || status === "signin") && !awaitingStudio;

  /** Keep the reviewed answers on this device, then go and sign in. */
  const leaveToSignIn = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (quoteHandoff.save({ answers, step: "review" })) return;
    event.preventDefault();
    setError(
      "Your browser can't save your answers while you sign in. Allow site storage, or contact us instead.",
    );
  };

  const update = (patch: Partial<QuoteAnswers>) => {
    if (attemptRef.current) return;
    setAnswers((a) => updateQuoteAnswers(a, patch));
    setError(null);
    if (status === "unavailable" || status === "error") setStatus("idle");
  };

  const go = (to: StepId, direction: number) => {
    if (sendingRef.current || transitioningRef.current || attemptRef.current)
      return;
    if (to === step) return;
    transitioningRef.current = true;
    setTransitioning(true);
    setDir(direction);
    setError(null);
    setStep(to);
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const validate = (candidate: StepId) =>
    stepError(candidate, answers) ||
    (candidate === "timing" && answers.timing === "date"
      ? preferredDateError(answers.date, localCalendarDate())
      : null);

  const stepReady = () => {
    transitioningRef.current = false;
    setTransitioning(false);
  };

  const next = async () => {
    if (transitioningRef.current) return;
    if (isReview) return send();
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    go(steps[index + 1], 1);
  };

  const back = () => {
    if (index > 0) go(steps[index - 1], -1);
  };

  const send = async () => {
    if (
      sendingRef.current ||
      awaitingStudio ||
      needsAccount ||
      attemptRecoveryFailed
    )
      return;
    // Re-check every applicable question before sending.
    const firstBad = attemptRef.current
      ? undefined
      : steps.find((s) => validate(s));
    if (firstBad) {
      go(firstBad, -1);
      setError(validate(firstBad));
      return;
    }
    // Persist before transport: a reload must never mint a replacement UUID.
    const attempt = attemptRef.current ?? createQuoteAttempt(answers);
    try {
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt));
    } catch {
      setDraftStored(false);
      setError(
        "Your browser could not retain this submission for a safe retry. Enable storage or contact us before sending.",
      );
      return;
    }
    attemptRef.current = attempt;
    setHasAttempt(true);
    sendingRef.current = true;
    saveDraft({ answers, step: "review" });
    setStatus("sending");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...attempt,
          website: honeypotRef.current?.value || undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        code?: string;
      } | null;
      if (confirmedQuote(res.status, body)) {
        setStatus("sent");
        saveDraft(null);
        quoteHandoff.clear();
        try {
          sessionStorage.removeItem(ATTEMPT_KEY);
        } catch {
          /* retained, never silently resubmit */
        }
        attemptRef.current = null;
        return;
      }
      setStatus(
        body?.code === "sign_in_required"
          ? "signin"
          : body?.code === "studio_pending"
            ? "studio_pending"
            : body?.code === "idempotency_conflict"
              ? "conflict"
              : res.status === 429
                ? "rate_limited"
                : [400, 413, 415, 422].includes(res.status)
                  ? "invalid"
                  : body?.code === "not_configured"
                    ? "unavailable"
                    : "error",
      );
    } catch {
      setStatus("error");
    } finally {
      sendingRef.current = false;
    }
  };

  const startSeparateRequest = () => {
    if (sendingRef.current || !attemptRef.current) return;
    if (
      !window.confirm(
        "Your previous request may already be saved. A separate request can create another inquiry. Contact us if you only need to change or resolve the previous request. Start a genuinely separate request?",
      )
    )
      return;
    try {
      const attempt = attemptRef.current;
      sessionStorage.setItem(
        `${ATTEMPT_KEY}-archive-${attempt.submission_id}`,
        JSON.stringify(attempt),
      );
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch {
      setError(
        "Keep this tab open and contact us. The original attempt could not be retained safely.",
      );
      return;
    }
    attemptRef.current = null;
    setHasAttempt(false);
    setStatus("idle");
    setError(null);
    setStep("contact");
  };

  const motionProps = {
    custom: dir,
    initial: "enter",
    animate: "center",
    exit: "exit",
    variants: {
      enter: (d: number) => ({
        opacity: 0,
        x: reduce || keyboardNavigation ? 0 : d * 20,
      }),
      center: { opacity: 1, x: 0 },
      exit: (d: number) => ({
        opacity: 0,
        x: reduce || keyboardNavigation ? 0 : d * -20,
      }),
    },
    transition: {
      duration: reduce || keyboardNavigation ? 0 : 0.18,
      ease: EASE,
    },
  };

  if (status === "sent") {
    return (
      <div
        className={`quote-shell ${styles.shell}`}
        ref={shellRef}
        data-lenis-prevent
      >
        <QuoteTop signedIn={accountsOn && !!account} />
        <main id="main" className="quote-card" aria-live="polite">
          <motion.div {...motionProps} key="sent" className="quote-step">
            <h1 ref={headingRef} tabIndex={-1}>
              Thank you. Your request is in.
            </h1>
            <p className="quote-help">
              We&apos;ll review your answers and reply to{" "}
              <strong>{answers.email}</strong> with your quote.
            </p>
            <div className="quote-actions">
              {accountsOn && account ? (
                <Link className="btn btn-primary" href={accountCopy.path}>
                  Back to my account
                </Link>
              ) : (
                <Link className="btn btn-primary" href="/">
                  Back to home
                </Link>
              )}
            </div>
          </motion.div>
        </main>
        <QuoteFoot />
      </div>
    );
  }

  return (
    <div
      className={`quote-shell ${styles.shell}`}
      ref={shellRef}
      data-lenis-prevent
      data-keyboard-nav={keyboardNavigation || undefined}
    >
      <QuoteTop signedIn={accountsOn && !!account} />
      <div
        className="quote-progress"
        aria-hidden="true"
        style={{ "--p": (index + 1) / steps.length } as React.CSSProperties}
      >
        <span />
      </div>
      <main id="main" className="quote-card">
        <form
          noValidate
          aria-busy={status === "sending" || undefined}
          onKeyDown={() => setKeyboardNavigation(true)}
          onPointerDown={() => setKeyboardNavigation(false)}
          onSubmit={(e) => {
            e.preventDefault();
            void next();
          }}
        >
          <p className="quote-count">
            Step {index + 1} of {steps.length}
          </p>
          <div className="quote-viewport">
            {ready ? (
              <AnimatePresence mode="wait" custom={dir} initial={false}>
                <motion.div {...motionProps} key={step} className="quote-step">
                  <Step
                    step={step}
                    answers={answers}
                    update={update}
                    error={error}
                    headingRef={headingRef}
                    onEdit={(to) => go(to, -1)}
                    locked={hasAttempt}
                    ready={ready}
                    onReady={stepReady}
                  />
                </motion.div>
              </AnimatePresence>
            ) : (
              <p className="quote-note" role="status">
                Loading questions…
              </p>
            )}
          </div>

          {/* Honeypot: hidden from people and assistive tech. */}
          <input
            ref={honeypotRef}
            className="hp"
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          {!draftStored && (
            <p className="quote-note" role="status">
              Your browser can&apos;t save this draft. Your answers are still
              here, but keep this tab open and avoid reloading until you finish.
            </p>
          )}

          {isReview && error && (
            <p className="quote-alert" role="alert">
              {error}
            </p>
          )}
          {isReview && (hasAttempt || attemptRecoveryFailed) && (
            <div className="quote-alert" role="status">
              {attemptRecoveryFailed ? (
                <p>
                  The saved submission could not be recovered safely. Please
                  contact us before sending another request; your draft is still
                  here.
                </p>
              ) : (
                <>
                  <p>
                    These are the original submitted answers. Retrying uses the
                    same request ID and answers. To change or resolve this
                    request,{" "}
                    <Link href={siteConfig.contactCta.href}>contact us</Link>.
                  </p>
                  <button
                    type="button"
                    className="btn btn-glass mt-3"
                    disabled={status === "sending"}
                    onClick={startSeparateRequest}
                  >
                    Start a separate request
                  </button>
                </>
              )}
            </div>
          )}
          {isReview &&
            ["conflict", "rate_limited", "invalid"].includes(status) && (
              <div className="quote-alert" role="alert">
                {status === "conflict"
                  ? "This request ID is already associated with different answers. We kept the original attempt. Contact us to resolve it; retrying will not create a new ID."
                  : status === "rate_limited"
                    ? "Too many attempts were made. Wait ten minutes before retrying the same request. Your answers are still here."
                    : "The request could not be accepted. We kept its original answers and ID. Contact us to correct it before starting a separate request."}
              </div>
            )}
          {isReview && awaitingStudio && (
            <section
              className="quote-alert border-line bg-paper"
              aria-labelledby="client-sign-in-title"
            >
              <h2
                id="client-sign-in-title"
                className="mb-2 text-lg leading-snug font-semibold tracking-tight"
              >
                {accountsOn
                  ? "Sending isn't open yet"
                  : "Sign in before sending"}
              </h2>
              <p>
                {accountsOn
                  ? "Online quote requests aren't switched on yet. "
                  : "Client sign-in and online submission aren't available yet. "}
                {hasAttempt
                  ? "Your earlier attempt is retained; contact us if its status is unclear. "
                  : "Nothing has been sent. "}
                You can keep reviewing your answers in this tab, or{" "}
                <Link href={siteConfig.contactCta.href}>contact us</Link>.
              </p>
            </section>
          )}
          {isReview && status === "unavailable" && (
            <div className="quote-alert" role="alert">
              <strong>We couldn&apos;t send this online yet.</strong> Online
              quote requests aren&apos;t connected, so nothing was sent. Your
              answers are still here in this tab. Please{" "}
              <Link href={siteConfig.contactCta.href}>contact us</Link>{" "}
              directly.
            </div>
          )}
          {isReview && status === "error" && (
            <div className="quote-alert" role="alert">
              <strong>
                We couldn&apos;t confirm that your request was saved.
              </strong>{" "}
              Your answers are still here. Please try again, or{" "}
              <Link href={siteConfig.contactCta.href}>contact us</Link>. If you
              already received a confirmation, contact us before retrying.
            </div>
          )}

          {isReview && needsAccount && (
            <section
              className="quote-alert border-line bg-paper"
              aria-labelledby="account-needed-title"
            >
              <h2
                id="account-needed-title"
                className="mb-2 text-lg leading-snug font-semibold tracking-tight"
              >
                {accountCopy.quote.title}
              </h2>
              <p>
                {status === "signin"
                  ? accountCopy.quote.sessionEnded
                  : accountCopy.quote.body}
              </p>
            </section>
          )}
          {isReview && accountsOn && account && !needsAccount && (
            <p className="quote-note">
              {accountCopy.quote.signedInAs} <strong>{account.email}</strong>
            </p>
          )}

          <div className="quote-actions">
            {index > 0 && (
              <button
                type="button"
                className="btn btn-glass"
                onClick={back}
                disabled={status === "sending" || transitioning || hasAttempt}
              >
                Back
              </button>
            )}
            {isReview && needsAccount ? (
              <div className="quote-account-actions">
                {/* Full page loads: the answers wait in this device's storage. */}
                <a
                  className="btn btn-glass"
                  href="/account/login?next=%2Fquote"
                  onClick={leaveToSignIn}
                >
                  {accountCopy.quote.signIn}
                </a>
                <a
                  className="btn btn-primary"
                  href="/account/signup?next=%2Fquote"
                  onClick={leaveToSignIn}
                >
                  {accountCopy.quote.create}
                </a>
              </div>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={
                  status === "sending" ||
                  transitioning ||
                  !ready ||
                  attemptRecoveryFailed ||
                  (isReview && awaitingStudio)
                }
              >
                {isReview
                  ? awaitingStudio
                    ? "Client sign-in unavailable"
                    : status === "sending"
                      ? "Sending…"
                      : hasAttempt
                        ? "Try again"
                        : "Send my request"
                  : "Continue"}
              </button>
            )}
          </div>
        </form>
      </main>
      <QuoteFoot />
    </div>
  );
}

/** Signed-in clients get their way back to the account; others, home. */
function QuoteTop({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <header className="quote-top">
      <Link href="/" className="wordmark">
        {siteConfig.shortName}
      </Link>
      {signedIn ? (
        <Link href={accountCopy.path} className="quote-exit">
          {accountCopy.quote.backToAccount}
        </Link>
      ) : (
        <Link href="/" className="quote-exit">
          Close
        </Link>
      )}
    </header>
  );
}

function QuoteFoot() {
  return (
    <p className="quote-foot">
      Rather talk it through?{" "}
      <Link href={siteConfig.contactCta.href}>
        {siteConfig.contactCta.label}
      </Link>
    </p>
  );
}

type StepProps = {
  step: StepId;
  answers: QuoteAnswers;
  update: (patch: Partial<QuoteAnswers>) => void;
  error: string | null;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onEdit: (step: StepId) => void;
  locked: boolean;
  ready: boolean;
  onReady: () => void;
};

function Step({
  step,
  answers: a,
  update,
  error,
  headingRef,
  onEdit,
  locked,
  ready,
  onReady,
}: StepProps) {
  const ids = useId();
  // This component mounts with the incoming screen, after AnimatePresence
  // removes the outgoing one. Focusing in the parent's step effect was too early.
  useEffect(() => {
    if (!ready) return;
    headingRef.current?.focus({ preventScroll: true });
    onReady();
    // Only a newly mounted screen or the initial draft restore takes focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorRef.current?.focus({ preventScroll: false });
  }, [error]);
  const head = (title: string, help?: React.ReactNode) => (
    <>
      <h1 ref={headingRef} tabIndex={-1} id={`${ids}-h`}>
        {title}
      </h1>
      {help && <p className="quote-help">{help}</p>}
    </>
  );
  const errorEl = error && (
    <p
      ref={errorRef}
      tabIndex={-1}
      className="field-error"
      role="alert"
      id={`${ids}-err`}
    >
      {error}
    </p>
  );
  const choices = (
    name: keyof QuoteAnswers,
    options: readonly { value: string; label: string; hint?: string }[],
    labelledBy = `${ids}-h`,
  ) => (
    <Choices
      name={name}
      options={options}
      value={a[name] as string | undefined}
      onChange={(value) => update({ [name]: value })}
      labelledBy={labelledBy}
      invalid={!!error}
      errorId={`${ids}-err`}
    />
  );

  switch (step) {
    case "service":
      return (
        <>
          {head(
            "What can we help with?",
            "Choose the closest match. You can add details later.",
          )}
          {choices("service", SERVICE_OPTIONS)}
          {errorEl}
        </>
      );
    case "property":
      return (
        <>
          {head(
            spaceKind(a) === "work" && a.service === "office"
              ? "What kind of workplace?"
              : "What kind of property?",
          )}
          {choices("property", propertyOptions(a))}
          {errorEl}
        </>
      );
    case "size":
      if (spaceKind(a) === "work") {
        return (
          <>
            {head("About how big is the space?", "An estimate is fine.")}
            {choices("area", sizeOptions.areas)}
            {errorEl}
          </>
        );
      }
      return (
        <>
          {head("How big is the home?")}
          <p className="quote-sub" id={`${ids}-bed`}>
            Bedrooms
          </p>
          <Pills
            options={sizeOptions.bedrooms}
            value={a.bedrooms}
            onChange={(bedrooms) => update({ bedrooms })}
            labelledBy={`${ids}-bed`}
            invalid={!!error?.includes("bedrooms")}
            errorId={`${ids}-err`}
          />
          <p className="quote-sub" id={`${ids}-bath`}>
            Bathrooms
          </p>
          <Pills
            options={sizeOptions.bathrooms}
            value={a.bathrooms}
            onChange={(bathrooms) => update({ bathrooms })}
            labelledBy={`${ids}-bath`}
            invalid={!!error?.includes("bathrooms")}
            errorId={`${ids}-err`}
          />
          {errorEl}
        </>
      );
    case "frequency":
      return (
        <>
          {head(
            "How often would you like us?",
            "Not sure yet is fine. We can talk it through.",
          )}
          {choices("frequency", frequencyOptions(a))}
          {errorEl}
        </>
      );
    case "condition":
      return (
        <>
          {a.service === "move"
            ? head("Will the home be empty?")
            : head(
                "How does it look today?",
                "This helps us plan the time the first visit needs.",
              )}
          {choices("condition", conditionOptions(a))}
          {errorEl}
        </>
      );
    case "location": {
      const texas = isTexasZip(a.zip);
      const complete = /^\d{5}$/.test(a.zip ?? "");
      return (
        <>
          {head("Where is the property?")}
          <label className="quote-label" htmlFor={`${ids}-zip`}>
            ZIP code
          </label>
          <input
            id={`${ids}-zip`}
            className="input quote-input"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            enterKeyHint="next"
            required
            spellCheck={false}
            maxLength={5}
            value={a.zip ?? ""}
            onChange={(e) =>
              update({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })
            }
            aria-invalid={!!error || undefined}
            aria-describedby={`${ids}-cov${error ? ` ${ids}-err` : ""}`}
          />
          {errorEl}
          <p className="quote-note" id={`${ids}-cov`} aria-live="polite">
            {complete && texas
              ? `That's in ${coverage.state}, where we do most of our work. We'll confirm availability with your quote.`
              : complete
                ? "Outside Texas? Send your request anyway. We coordinate providers across the US and will confirm availability for your area."
                : coverage.summary}
          </p>
        </>
      );
    }
    case "timing":
      return (
        <>
          {head(
            a.service === "move"
              ? "When is the move?"
              : "When would you like us to start?",
          )}
          {choices("timing", timingOptions)}
          {a.timing === "date" && (
            <PreferredDate
              value={a.date}
              onChange={(date) => update({ date })}
              error={!!error}
              errorId={`${ids}-err`}
            />
          )}
          {errorEl}
        </>
      );
    case "details": {
      const options = extraOptions(a);
      return (
        <>
          {head("Anything we should know?", "Optional. Choose any that apply.")}
          <div
            className="quote-chips"
            role="group"
            aria-labelledby={`${ids}-h`}
          >
            {options.map((o) => {
              const on = a.extras.includes(o.value);
              return (
                <label key={o.value} className="chip" data-on={on || undefined}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      update({
                        extras: on
                          ? a.extras.filter((x) => x !== o.value)
                          : [...a.extras, o.value],
                      })
                    }
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
          <label className="quote-label" htmlFor={`${ids}-notes`}>
            Notes
          </label>
          <textarea
            id={`${ids}-notes`}
            className="input quote-input"
            rows={4}
            maxLength={1000}
            placeholder="Parking, access, rooms to skip, anything else…"
            value={a.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
          {errorEl}
        </>
      );
    }
    case "contact":
      return (
        <>
          {head("Where should we send your quote?")}
          <div
            className="quote-fields"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.nativeEvent.isComposing)
                return;
              const fields = Array.from(
                event.currentTarget.querySelectorAll("input"),
              );
              const index = fields.indexOf(event.target as HTMLInputElement);
              if (index >= 0 && index < fields.length - 1) {
                event.preventDefault();
                fields[index + 1].focus();
              }
            }}
          >
            <Field id={`${ids}-name`} label="Name">
              <input
                id={`${ids}-name`}
                className="input quote-input"
                autoComplete="name"
                required
                enterKeyHint="next"
                aria-invalid={error?.includes("name") || undefined}
                aria-describedby={
                  error?.includes("name") ? `${ids}-err` : undefined
                }
                value={a.name}
                maxLength={100}
                onChange={(e) => update({ name: e.target.value })}
              />
            </Field>
            <Field id={`${ids}-email`} label="Email">
              <input
                id={`${ids}-email`}
                className="input quote-input"
                type="email"
                required
                autoComplete="email"
                enterKeyHint="next"
                autoCapitalize="none"
                aria-invalid={error?.includes("email") || undefined}
                aria-describedby={
                  error?.includes("email") ? `${ids}-err` : undefined
                }
                spellCheck={false}
                value={a.email}
                maxLength={200}
                onChange={(e) => update({ email: e.target.value })}
              />
            </Field>
            <Field id={`${ids}-phone`} label="Phone">
              <input
                id={`${ids}-phone`}
                className="input quote-input"
                type="tel"
                required
                autoComplete="tel"
                enterKeyHint="done"
                aria-invalid={error?.includes("phone") || undefined}
                aria-describedby={
                  error?.includes("phone") ? `${ids}-err` : undefined
                }
                value={a.phone}
                maxLength={30}
                onChange={(e) => update({ phone: e.target.value })}
              />
            </Field>
          </div>
          {errorEl}
        </>
      );
    case "review":
      return (
        <>
          {head(
            "Check your answers",
            locked
              ? "Your original answers are retained for retry."
              : "Change anything before you send.",
          )}
          <ShareLink />
          <dl className="quote-review">
            {summarize(a).map((row) => (
              <div key={row.step}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
                <button
                  type="button"
                  className="quote-edit"
                  disabled={locked}
                  onClick={() => onEdit(row.step)}
                >
                  Change
                  <span className="sr-only"> {row.label.toLowerCase()}</span>
                </button>
              </div>
            ))}
          </dl>
        </>
      );
  }
}

/**
 * Copies a link to the answers so far. The address bar already holds them;
 * this makes that discoverable and says what the link leaves out.
 */
function ShareLink() {
  const [copied, setCopied] = useState<boolean | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <p className="quote-share">
      <button type="button" className="quote-edit" onClick={copy}>
        Copy a link to these answers
      </button>
      <span aria-live="polite">
        {copied === true &&
          "Link copied. It leaves out your ZIP code, date, notes and contact details."}
        {copied === false &&
          "Couldn't copy. The link in your address bar has these answers."}
      </span>
    </p>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="quote-field">
      <label className="quote-label" htmlFor={id}>
        {label}
      </label>
      {children}
    </div>
  );
}

type ChoicesProps = {
  name: string;
  options: readonly { value: string; label: string; hint?: string }[];
  value?: string;
  onChange: (value: string) => void;
  labelledBy: string;
  invalid: boolean;
  errorId: string;
};

/** A list of large radio rows, like a settings list. */
function Choices({
  name,
  options,
  value,
  onChange,
  labelledBy,
  invalid,
  errorId,
}: ChoicesProps) {
  return (
    <div
      className="quote-choices"
      role="radiogroup"
      aria-required="true"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
    >
      {options.map((o) => (
        <label
          key={o.value}
          className="choice"
          data-on={value === o.value || undefined}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          <span className="choice-text">
            <span className="choice-label">{o.label}</span>
            {o.hint && <span className="choice-hint">{o.hint}</span>}
          </span>
          <span className="choice-dot" aria-hidden="true" />
        </label>
      ))}
    </div>
  );
}

type PillsProps = {
  options: readonly string[];
  value?: string;
  onChange: (value: string) => void;
  labelledBy: string;
  invalid: boolean;
  errorId: string;
};

/** A compact row of radio pills for small numbers. */
function Pills({
  options,
  value,
  onChange,
  labelledBy,
  invalid,
  errorId,
}: PillsProps) {
  const name = useId();
  return (
    <div
      className="quote-pills"
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-required="true"
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
    >
      {options.map((o) => (
        <label key={o} className="pill" data-on={value === o || undefined}>
          <input
            type="radio"
            name={name}
            value={o}
            checked={value === o}
            onChange={() => onChange(o)}
          />
          {o}
        </label>
      ))}
    </div>
  );
}
