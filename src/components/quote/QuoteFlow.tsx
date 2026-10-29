"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { coverage, siteConfig } from "@/lib/site";
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

const DRAFT_KEY = "cosmos-quote-draft";
const EASE = [0.32, 0.72, 0, 1] as const;

type Status = "idle" | "sending" | "sent" | "unavailable" | "error";

type Draft = { answers: QuoteAnswers; step: StepId };

function loadDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}
function saveDraft(draft: Draft | null) {
  try {
    if (draft) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Private mode or blocked storage: the flow still works, just unsaved.
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
 */
export function QuoteFlow() {
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<QuoteAnswers>(EMPTY_ANSWERS);
  const [step, setStep] = useState<StepId>("service");
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [ready, setReady] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);

  // Restore this tab's draft. Answers in the link (a shared quote, or a
  // service chosen on the site) win over the draft, and the flow opens on
  // the first question they leave open.
  useEffect(() => {
    const draft = loadDraft();
    const linked = answersFromParams(
      new URLSearchParams(window.location.search),
    );
    const base = draft?.answers ?? EMPTY_ANSWERS;
    const differs = Object.entries(linked).some(
      ([key, value]) =>
        String(value) !== String(base[key as keyof QuoteAnswers]),
    );
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from the URL and sessionStorage, which the server cannot read */
    if (differs) {
      const merged = { ...base, ...linked };
      setAnswers(merged);
      setStep(firstOpenStep(merged));
    } else if (draft) {
      setAnswers(draft.answers);
      setStep(draft.step);
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!ready || status === "sent") return;
    saveDraft({ answers, step });
    const query = answersToParams(answers).toString();
    if (query === window.location.search.slice(1)) return;
    history.replaceState(
      null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  }, [answers, step, ready, status]);

  // Each new question takes focus, so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step, status]);

  const steps = stepsFor(answers);
  const index = Math.max(0, steps.indexOf(step));
  const isReview = step === "review";

  const update = (patch: Partial<QuoteAnswers>) => {
    setAnswers((a) => ({ ...a, ...patch }));
    setError(null);
    if (status === "unavailable" || status === "error") setStatus("idle");
  };

  const go = (to: StepId, direction: number) => {
    setDir(direction);
    setError(null);
    setStep(to);
    window.scrollTo({ top: 0 });
  };

  const next = async () => {
    if (isReview) return send();
    const problem = stepError(step, answers);
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
    // Re-check every applicable question before sending.
    const firstBad = steps.find((s) => stepError(s, answers));
    if (firstBad) {
      go(firstBad, -1);
      setError(stepError(firstBad, answers));
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answers,
          website: honeypotRef.current?.value || undefined,
        }),
      });
      if (res.ok) {
        setStatus("sent");
        saveDraft(null);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      setStatus(body.code === "not_configured" ? "unavailable" : "error");
    } catch {
      setStatus("error");
    }
  };

  const motionProps = {
    custom: dir,
    initial: "enter",
    animate: "center",
    exit: "exit",
    variants: {
      enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 28 }),
      center: { opacity: 1, x: 0 },
      exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -28 }),
    },
    transition: { duration: reduce ? 0.12 : 0.32, ease: EASE },
  };

  if (status === "sent") {
    return (
      <div className="quote-shell">
        <QuoteTop />
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
              <Link className="btn btn-primary" href="/">
                Back to home
              </Link>
            </div>
          </motion.div>
        </main>
        <QuoteFoot />
      </div>
    );
  }

  return (
    <div className="quote-shell">
      <QuoteTop />
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
          onSubmit={(e) => {
            e.preventDefault();
            void next();
          }}
        >
          <p className="quote-count">
            Step {index + 1} of {steps.length}
          </p>
          <div className="quote-viewport">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div
                {...motionProps}
                key={step}
                className="quote-step"
                style={{ visibility: ready ? "visible" : "hidden" }}
              >
                <Step
                  step={step}
                  answers={answers}
                  update={update}
                  error={error}
                  headingRef={headingRef}
                  onEdit={(to) => go(to, -1)}
                />
              </motion.div>
            </AnimatePresence>
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

          {isReview && status === "unavailable" && (
            <div className="quote-alert" role="alert">
              <strong>We couldn&apos;t send this online yet.</strong> Online
              quote requests aren&apos;t connected, so nothing was sent. Your
              answers are saved on this device. Please{" "}
              <Link href={siteConfig.contactCta.href}>contact us</Link>{" "}
              directly.
            </div>
          )}
          {isReview && status === "error" && (
            <div className="quote-alert" role="alert">
              <strong>
                Something went wrong and your request wasn&apos;t sent.
              </strong>{" "}
              Your answers are saved. Please try again, or{" "}
              <Link href={siteConfig.contactCta.href}>contact us</Link>.
            </div>
          )}

          <div className="quote-actions">
            {index > 0 && (
              <button type="button" className="btn btn-glass" onClick={back}>
                Back
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={status === "sending" || !ready}
            >
              {isReview
                ? status === "sending"
                  ? "Sending…"
                  : status === "error"
                    ? "Try again"
                    : "Send my request"
                : "Continue"}
            </button>
          </div>
        </form>
      </main>
      <QuoteFoot />
    </div>
  );
}

function QuoteTop() {
  return (
    <header className="quote-top">
      <Link href="/" className="wordmark">
        {siteConfig.shortName}
      </Link>
      <Link href="/" className="quote-exit">
        Close
      </Link>
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
};

function Step({
  step,
  answers: a,
  update,
  error,
  headingRef,
  onEdit,
}: StepProps) {
  const ids = useId();
  const head = (title: string, help?: React.ReactNode) => (
    <>
      <h1 ref={headingRef} tabIndex={-1} id={`${ids}-h`}>
        {title}
      </h1>
      {help && <p className="quote-help">{help}</p>}
    </>
  );
  const errorEl = error && (
    <p className="field-error" role="alert" id={`${ids}-err`}>
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
          />
          <p className="quote-sub" id={`${ids}-bath`}>
            Bathrooms
          </p>
          <Pills
            options={sizeOptions.bathrooms}
            value={a.bathrooms}
            onChange={(bathrooms) => update({ bathrooms })}
            labelledBy={`${ids}-bath`}
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
            <div className="quote-date">
              <label className="quote-label" htmlFor={`${ids}-date`}>
                Date
              </label>
              <input
                id={`${ids}-date`}
                className="input quote-input"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={a.date ?? ""}
                onChange={(e) => update({ date: e.target.value })}
              />
            </div>
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
          <div className="quote-fields">
            <Field id={`${ids}-name`} label="Name">
              <input
                id={`${ids}-name`}
                className="input quote-input"
                autoComplete="name"
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
                autoComplete="email"
                spellCheck={false}
                value={a.email}
                maxLength={200}
                onChange={(e) => update({ email: e.target.value })}
              />
            </Field>
            <Field id={`${ids}-phone`} label="Phone (optional)">
              <input
                id={`${ids}-phone`}
                className="input quote-input"
                type="tel"
                autoComplete="tel"
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
          {head("Check your answers", "Change anything before you send.")}
          <ShareLink />
          <dl className="quote-review">
            {summarize(a).map((row) => (
              <div key={row.step}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
                <button
                  type="button"
                  className="quote-edit"
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
};

/** A compact row of radio pills for small numbers. */
function Pills({ options, value, onChange, labelledBy }: PillsProps) {
  const name = useId();
  return (
    <div className="quote-pills" role="radiogroup" aria-labelledby={labelledBy}>
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
