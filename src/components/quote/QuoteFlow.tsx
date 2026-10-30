"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { account as accountCopy, coverage, siteConfig } from "@/lib/site";
import { quoteHandoff } from "@/lib/quote-handoff";
import {
  SIGNED_OUT_SIGNAL,
  anonymousWork,
  forgetTabDrafts,
  quoteSlots,
  settleQuoteStorage,
  type Intake,
  type UnresolvedAttempt,
} from "@/lib/quote-store";
import type { QuoteIntakeMode } from "@/lib/quote-intake";
import { updateQuoteAnswers, type QuoteDraft } from "@/lib/quote-draft";
import {
  createQuoteAttempt,
  confirmedQuote,
  type QuoteAttempt,
} from "@/lib/quote-attempt";
import { localCalendarDate, preferredDateError } from "@/lib/quote-date";
import { SignOutButton } from "@/components/account/SignOutButton";
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
  preAccountSteps,
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
  /** The session is missing, ended, or the Studio refused it. */
  | "signin"
  /** Sending is down for now; the attempt is kept for a retry. */
  | "temporary"
  /** Another account is now signed in in this browser. */
  | "switched"
  /** The account's email isn't confirmed (customer intake). */
  | "unverified";

/**
 * The guided quote, one question per screen, in the spirit of a phone's setup
 * assistant. Questions adapt to earlier answers (see stepsFor). Answers are
 * kept when going back and saved for this tab, so a detour to Contact or a
 * refresh loses nothing. The choices so far also live in the address bar
 * (never contact details), so a quote in progress can be shared or
 * bookmarked. Nothing claims success until /api/quote confirms the request
 * was delivered.
 *
 * With client accounts on, a signed-out visitor answers only the choice
 * questions (preAccountSteps), then signs up or signs in. Those choices wait
 * on this device (lib/quote-handoff.ts), even if the confirmation email opens
 * in another tab. Where, when, notes and contact details are asked after
 * signing in, and sending needs a signed-in client.
 *
 * A signed-in client's drafts and send attempts are filed under their owner
 * tag (lib/quote-store.ts). Choices made while signed out are only offered to
 * them ("Use these answers"); nothing moves between accounts.
 */
export function QuoteFlow({
  intakeMode,
  accountsOn = false,
  account = null,
}: {
  intakeMode: QuoteIntakeMode;
  accountsOn?: boolean;
  account?: { email: string; owner: string } | null;
}) {
  const owner = account?.owner ?? null;
  const intake: Intake = intakeMode === "customer" ? 2 : 1;
  const slots = useMemo(
    () => quoteSlots(owner, intake, accountsOn),
    [owner, intake, accountsOn],
  );
  // Signed out with accounts on: only the questions a visitor answers first.
  const gated = accountsOn && !account;
  // Answers from before sign-in, waiting for the client to adopt or discard.
  const [adoptable, setAdoptable] = useState<QuoteDraft | null>(null);
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
  const [unresolved, setUnresolved] = useState<UnresolvedAttempt | null>(null);
  const [attemptRecoveryFailed, setAttemptRecoveryFailed] = useState(false);

  // Restore this tab's draft. Answers in the link (a shared quote, or a
  // service chosen on the site) win over the draft, and the flow opens on
  // the first question they leave open.
  useEffect(() => {
    settleQuoteStorage(accountsOn ? owner : undefined);
    // This tab's draft (this client's, when signed in), or, signed out, the
    // choices left waiting for sign-in.
    const { attempt, unresolved: marker, unreadable } = slots.loadAttempt();
    const draft = slots.loadDraft() ?? (gated ? quoteHandoff.load() : null);
    // Signed in: answers from before sign-in are offered, never loaded.
    const offered = owner && !attempt ? anonymousWork.load() : null;
    const linked = answersFromParams(
      new URLSearchParams(window.location.search),
    );
    const base = draft?.answers ?? EMPTY_ANSWERS;
    const differs = Object.entries(linked).some(
      ([key, value]) =>
        String(value) !== String(base[key as keyof QuoteAnswers]),
    );
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from the URL and sessionStorage, which the server cannot read */
    if (unreadable) setAttemptRecoveryFailed(true);
    if (offered) setAdoptable(offered);
    if (marker) setUnresolved(marker);
    // The first open question this visitor may answer, or the review.
    const openStep = (a: QuoteAnswers) =>
      gated
        ? (preAccountSteps(a).find((s) => stepError(s, a)) ?? "review")
        : firstOpenStep(a);
    if (attempt) {
      attemptRef.current = attempt;
      setHasAttempt(true);
      setAnswers(attempt.answers);
      setStep("review");
    } else if (differs) {
      const merged = updateQuoteAnswers(base, linked);
      setAnswers(merged);
      setStep(openStep(merged));
    } else if (draft) {
      setAnswers(draft.answers);
      setStep(
        !gated || preAccountSteps(draft.answers).includes(draft.step)
          ? draft.step
          : openStep(draft.answers),
      );
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [accountsOn, gated, owner, slots]);

  useEffect(() => {
    if (!ready || unresolved || status === "sent" || status === "signin")
      return;
    const saved = slots.saveDraft({ answers, step });
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
  }, [answers, step, ready, status, unresolved, slots]);

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

  // Signed out in another tab: stop showing this client's answers here, so
  // the next person at this browser never sees them.
  useEffect(() => {
    if (!owner) return;
    const signedOut = (event: StorageEvent) => {
      if (event.key !== SIGNED_OUT_SIGNAL) return;
      forgetTabDrafts();
      window.location.replace("/quote");
    };
    window.addEventListener("storage", signedOut);
    return () => window.removeEventListener("storage", signedOut);
  }, [owner]);

  useEffect(() => {
    if (status === "sent") headingRef.current?.focus({ preventScroll: true });
  }, [status]);

  const steps = gated ? preAccountSteps(answers) : stepsFor(answers);
  const index = Math.max(0, steps.indexOf(step));
  const isReview = step === "review";
  const awaitingStudio =
    intakeMode === "studio_pending" || status === "studio_pending";
  const needsAccount = gated && !awaitingStudio;

  /** Keep the choices so far on this device, then go and sign in. */
  const leaveToSignIn = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (quoteHandoff.save(answers)) return;
    event.preventDefault();
    setError(
      "Your browser can't save your answers while you sign in. Allow site storage, or contact us instead.",
    );
  };

  /** Take over answers started before signing in, or let them go. */
  const adopt = () => {
    if (!adoptable) return;
    setAnswers(adoptable.answers);
    setStep(firstOpenStep(adoptable.answers));
    anonymousWork.clear();
    setAdoptable(null);
  };
  const discard = () => {
    anonymousWork.clear();
    setAdoptable(null);
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
    // Another tab of this client's may hold an unconfirmed attempt: retry
    // that one, with its ID and answers, before any new request. If only its
    // marker is left, nothing more can be sent.
    if (!attemptRef.current) {
      const { attempt: pending, unresolved: marker } = slots.loadAttempt();
      if (marker) {
        slots.saveDraft(null);
        setUnresolved(marker);
        return;
      }
      if (pending) {
        attemptRef.current = pending;
        setHasAttempt(true);
        setAnswers(pending.answers);
        setStep("review");
        setError(accountCopy.quote.pendingAttempt);
        return;
      }
    }
    // Persist before transport: a reload must never mint a replacement UUID.
    const attempt = attemptRef.current ?? createQuoteAttempt(answers);
    if (!slots.saveAttempt(attempt)) {
      setDraftStored(false);
      setError(
        "Your browser could not retain this submission for a safe retry. Enable storage or contact us before sending.",
      );
      return;
    }
    attemptRef.current = attempt;
    setHasAttempt(true);
    sendingRef.current = true;
    slots.saveDraft({ answers, step: "review" });
    setStatus("sending");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...attempt,
          // Which intake and whose attempt; the server checks both against
          // the live session and never takes either as identity.
          ...(intake === 2 ? { version: 2 } : {}),
          ...(owner ? { owner } : {}),
          website: honeypotRef.current?.value || undefined,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        code?: string;
      } | null;
      if (confirmedQuote(res.status, body, intake === 2)) {
        setStatus("sent");
        slots.saveDraft(null);
        quoteHandoff.clear();
        slots.clearAttempt();
        attemptRef.current = null;
        setUnresolved(null);
        return;
      }
      // A different account owns this browser now: take these answers off the
      // screen and out of storage. Only the attempt's marker stays, under its
      // own account.
      if (body?.code === "account_mismatch") {
        forgetTabDrafts();
        slots.retireAttempt();
        attemptRef.current = null;
        setHasAttempt(false);
        setAnswers(EMPTY_ANSWERS);
        setStatus("switched");
        return;
      }
      // Nothing the client entered waits in storage for a session that ended.
      if (body?.code === "sign_in_required") {
        slots.saveDraft(null);
        slots.retireAttempt();
        setStatus("signin");
        return;
      }
      setStatus(
        body?.code === "email_unverified"
          ? "unverified"
          : body?.code === "studio_pending"
            ? "studio_pending"
            : intake === 2 && body?.code === "unavailable"
              ? "temporary"
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
    if (sendingRef.current || (!attemptRef.current && !unresolved)) return;
    if (
      !window.confirm(
        "Your previous request may already be saved. A separate request can create another inquiry. Contact us if you only need to change or resolve the previous request. Start a genuinely separate request?",
      )
    )
      return;
    const held = attemptRef.current ?? unresolved;
    if (!slots.archiveAttempt(held?.submission_id ?? null)) {
      setError(
        "Keep this tab open and contact us. The original attempt could not be retained safely.",
      );
      return;
    }
    if (attemptRef.current) setStep("contact");
    attemptRef.current = null;
    setHasAttempt(false);
    setUnresolved(null);
    setStatus("idle");
    setError(null);
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

  if (status === "switched") {
    return (
      <div
        className={`quote-shell ${styles.shell}`}
        ref={shellRef}
        data-lenis-prevent
      >
        <QuoteTop />
        <main id="main" className="quote-card">
          <div className="quote-step" role="alert">
            <h1>{accountCopy.quote.switchedTitle}</h1>
            <p className="quote-help">{accountCopy.quote.switched}</p>
            <div className="quote-actions">
              {/* A full page load, as whoever is signed in now. */}
              <a className="btn btn-primary" href="/quote">
                {accountCopy.quote.reload}
              </a>
            </div>
          </div>
        </main>
        <QuoteFoot />
      </div>
    );
  }

  // Sign-out here is the way to a real new session: the sign-in page can't
  // offer one while this session's cookies still verify. It leaves only the
  // attempt's marker in this browser.
  if (status === "signin") {
    return (
      <div
        className={`quote-shell ${styles.shell}`}
        ref={shellRef}
        data-lenis-prevent
      >
        <QuoteTop />
        <main id="main" className="quote-card">
          <div className="quote-step" role="alert">
            <h1>{accountCopy.quote.sessionEndedTitle}</h1>
            <p className="quote-help">{accountCopy.quote.sessionEnded}</p>
            <div className="quote-actions">
              <SignOutButton
                next="/quote"
                label={accountCopy.quote.sessionEndedAction}
                className="btn btn-primary"
              />
            </div>
          </div>
        </main>
        <QuoteFoot />
      </div>
    );
  }

  // Only a marker is left, so there's nothing to retry and no way to tell what
  // happened. Nothing is sent from here until the client decides.
  if (unresolved && status !== "sent") {
    return (
      <div
        className={`quote-shell ${styles.shell}`}
        ref={shellRef}
        data-lenis-prevent
      >
        <QuoteTop signedIn />
        <main id="main" className="quote-card">
          <div className="quote-step" role="status">
            <h1>{accountCopy.quote.unresolvedTitle}</h1>
            <p className="quote-help">{accountCopy.quote.unresolved}</p>
            {unresolved.submission_id && (
              <p className="quote-note">
                {accountCopy.quote.unresolvedReference}:{" "}
                {unresolved.submission_id}
              </p>
            )}
            {error && (
              <p className="quote-alert" role="alert">
                {error}
              </p>
            )}
            <div className="quote-actions">
              <button
                type="button"
                className="btn btn-glass"
                onClick={startSeparateRequest}
              >
                Start a separate request
              </button>
              <Link className="btn btn-primary" href={accountCopy.path}>
                {accountCopy.quote.unresolvedAccount}
              </Link>
            </div>
          </div>
        </main>
        <QuoteFoot />
      </div>
    );
  }

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
              {accountsOn && account && ` ${accountCopy.quote.followInAccount}`}
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
          {adoptable && !hasAttempt && (
            <section
              className="quote-alert border-line bg-paper"
              aria-labelledby="adopt-title"
            >
              <h2
                id="adopt-title"
                className="mb-2 text-lg leading-snug font-semibold tracking-tight"
              >
                {accountCopy.quote.adoptTitle}
              </h2>
              <p>{accountCopy.quote.adoptBody}</p>
              <div className="quote-account-actions mt-3">
                <button
                  type="button"
                  className="btn btn-glass"
                  onClick={discard}
                >
                  {accountCopy.quote.discard}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={adopt}
                >
                  {accountCopy.quote.adopt}
                </button>
              </div>
            </section>
          )}
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
                    onlySteps={gated ? steps : undefined}
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
                  ? "We can't match this request ID to its earlier attempt, so we haven't treated it as received or as failed. We kept the original attempt. Contact us to resolve it; retrying will not create a new ID."
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
          {isReview && status === "unverified" && (
            <div className="quote-alert" role="alert">
              {accountCopy.quote.unverified}
            </div>
          )}
          {isReview && status === "temporary" && (
            <div className="quote-alert" role="alert">
              {accountCopy.quote.temporarilyUnavailable}
            </div>
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
              <p>{accountCopy.quote.body}</p>
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
                {/* Full page loads: the choices wait in this device's storage. */}
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
  /** Review only these questions (a signed-out visitor's). */
  onlySteps?: StepId[];
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
  onlySteps,
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
            {summarize(a)
              .filter((row) => !onlySteps || onlySteps.includes(row.step))
              .map((row) => (
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
