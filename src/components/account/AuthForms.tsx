"use client";

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type Ref,
} from "react";
import { account } from "@/lib/site";
import { quoteHandoff } from "@/lib/quote-handoff";
import { withNext } from "@/lib/account/destination";
import {
  requestReset,
  resendConfirmation,
  signIn,
  signUp,
  updatePassword,
  type FormState,
} from "@/app/account/actions";

// Each form names its page (useActionState's permalink), so a submit made
// before the page finishes loading still shows its result.

/** Forwarded Studio pages open with a full page load (next/link can't cross zones). */
function useGoTo(state: FormState) {
  useEffect(() => {
    if (state.goTo) window.location.assign(state.goTo);
  }, [state.goTo]);
}

function Alert({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="quote-alert" role="alert">
        {state.error}
      </p>
    );
  if (state.notice)
    return (
      <p className="account-notice" role="status">
        {state.notice}
      </p>
    );
  return null;
}

function EmailField({
  defaultValue,
  invalid,
}: {
  defaultValue?: string;
  invalid?: boolean;
}) {
  const id = useId();
  return (
    <div className="quote-field">
      <label className="quote-label" htmlFor={id}>
        Email
      </label>
      <input
        id={id}
        name="email"
        className="input quote-input"
        type="email"
        required
        maxLength={200}
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        defaultValue={defaultValue}
        aria-invalid={invalid || undefined}
      />
    </div>
  );
}

function PasswordField({
  label = "Password",
  isNew = false,
  inputRef,
}: {
  label?: string;
  isNew?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const id = useId();
  const [shown, setShown] = useState(false);
  return (
    <div className="quote-field">
      <label className="quote-label" htmlFor={id}>
        {label}
      </label>
      <div className="account-password">
        <input
          ref={inputRef}
          id={id}
          name="password"
          className="input quote-input"
          type={shown ? "text" : "password"}
          required
          minLength={isNew ? 8 : undefined}
          maxLength={72}
          autoComplete={isNew ? "new-password" : "current-password"}
          aria-describedby={isNew ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          className="account-reveal"
          aria-pressed={shown}
          onClick={() => setShown((value) => !value)}
        >
          {shown ? "Hide" : "Show"}
        </button>
      </div>
      {isNew && (
        <p id={`${id}-hint`} className="quote-note">
          {account.signUp.passwordHint}
        </p>
      )}
    </div>
  );
}

function Submit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? "One moment…" : label}
    </button>
  );
}

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    signIn,
    {},
    // Without JavaScript the form posts to this address and the page renders
    // there, so it carries the destination through every retry.
    withNext("/account/login", next),
  );
  const [email, setEmail] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  useGoTo(state);
  // A refused sign-in keeps the email (state.email) and clears the password;
  // put the cursor back in the password for an immediate retry.
  useEffect(() => {
    if (state.error && state.email) passwordRef.current?.focus();
  }, [state]);
  return (
    <>
      <form
        action={action}
        className="account-form"
        onChange={(event) => {
          const target = event.target;
          if (target instanceof HTMLInputElement && target.name === "email")
            setEmail(target.value);
        }}
      >
        <input type="hidden" name="next" value={next} />
        <EmailField defaultValue={state.email} invalid={!!state.error} />
        <PasswordField inputRef={passwordRef} />
        <Alert state={state} />
        <Submit pending={pending} label={account.signIn.submit} />
      </form>
      {state.unconfirmed && (
        <ResendForm email={email || state.email || ""} next={next} />
      )}
    </>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    signUp,
    {},
    withNext("/account/signup", next),
  );
  // Offer the email from a quote waiting on this device, if there is one.
  const [suggested, setSuggested] = useState<string>();
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only
    setSuggested(quoteHandoff.load()?.answers.email || undefined);
  }, []);
  useGoTo(state);

  if (state.sentTo) return <CheckEmail email={state.sentTo} next={next} />;
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="next" value={next} />
      <EmailField key={suggested} defaultValue={state.email ?? suggested} />
      <PasswordField isNew />
      <Alert state={state} />
      <Submit pending={pending} label={account.signUp.submit} />
    </form>
  );
}

function CheckEmail({ email, next }: { email: string; next: string }) {
  const { checkEmail } = account;
  return (
    <div className="account-form" role="status">
      <h2 className="account-subtitle">{checkEmail.title}</h2>
      <p>
        {checkEmail.body} <strong>{email}</strong>. {checkEmail.next}
      </p>
      {next === "/quote" && (
        <p className="quote-note">{checkEmail.sameDevice}</p>
      )}
      <p className="quote-note">{checkEmail.existing}</p>
      <ResendForm email={email} next={next} />
    </div>
  );
}

function ResendForm({ email, next }: { email: string; next: string }) {
  const [state, action, pending] = useActionState(resendConfirmation, {});
  return (
    <form action={action} className="account-form account-resend">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <Alert state={state} />
      <button
        type="submit"
        className="btn btn-glass"
        disabled={pending || !email}
      >
        {pending ? "Sending…" : account.checkEmail.resend}
      </button>
    </form>
  );
}

export function ForgotForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    requestReset,
    {},
    withNext("/account/forgot", next),
  );
  if (state.notice)
    return (
      <p className="account-notice" role="status">
        {state.notice}
      </p>
    );
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="next" value={next} />
      <EmailField defaultValue={state.email} invalid={!!state.error} />
      <Alert state={state} />
      <Submit pending={pending} label={account.forgot.submit} />
    </form>
  );
}

export function ResetForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    updatePassword,
    {},
    withNext("/account/reset", next),
  );
  useGoTo(state);
  return (
    <form action={action} className="account-form">
      <input type="hidden" name="next" value={next} />
      <PasswordField label="New password" isNew />
      <Alert state={state} />
      <Submit pending={pending} label={account.reset.submit} />
    </form>
  );
}
