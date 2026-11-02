"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { account } from "@/lib/site";
import { recentEmailProof } from "@/lib/account/config";
import { CAPTCHA_FIELD, captchaSiteKey } from "@/lib/account/captcha";
import {
  authClient,
  clearClientCookies,
  siteOrigin,
} from "@/lib/account/server";
import {
  ACCOUNT_HOME,
  destinationOr,
  isStudioDestination,
  signInHref,
} from "@/lib/account/destination";

/**
 * What a form shows after a submit. Field values the person typed stay in the
 * form; nothing personal goes into a URL.
 */
export type FormState = {
  error?: string;
  /** The account needs its email confirmed before it can sign in. */
  unconfirmed?: boolean;
  /** Sign-up done: show "check your email" for this address. */
  sentTo?: string;
  notice?: string;
  /**
   * The email as typed, so a refused submit keeps it. React resets a form
   * after its action; the field's default value restores this. Passwords are
   * never returned, so they clear.
   */
  email?: string;
  /** A forwarded Studio page; the browser opens it with a full page load. */
  goTo?: string;
};

const email = z.email().max(200);
const password = z.string().min(8).max(72);
const { errors } = account;

function failure(error: AuthError | null): FormState {
  if (error?.code === "captcha_failed") return { error: errors.captcha };
  if (error?.status === 429 || error?.code === "over_email_send_rate_limit")
    return { error: errors.rateLimited };
  if (error?.code === "weak_password") return { error: errors.weakPassword };
  return { error: errors.unavailable };
}

/**
 * Where to go next. This site's pages: a redirect. Studio pages need a full
 * page load: a hydrated form (fetched, with a Next-Action header) opens them
 * in the browser; a native form post already is a full page load, so it
 * gets the redirect too.
 */
async function arrive(next: string): Promise<FormState> {
  const fetched = (await headers()).has("next-action");
  if (isStudioDestination(next) && fetched) return { goTo: next };
  redirect(next);
}

/**
 * The form's security-check token for Auth (lib/account/captcha.ts). With a
 * site key set, a form without one is refused here: it can't pass Auth's
 * check, and asking anyway would spend the shared per-address Auth limits
 * that every visitor's requests count against. Null means refuse.
 */
function captcha(form: FormData): { captchaToken?: string } | null {
  if (!captchaSiteKey()) return {};
  const token = String(form.get(CAPTCHA_FIELD) ?? "");
  return token && token.length <= 2048 ? { captchaToken: token } : null;
}

/** The confirmation and reset links: back here, then on to `next`. */
async function confirmLink(next: string) {
  return `${await siteOrigin()}/account/confirm?next=${encodeURIComponent(next)}`;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await authClient();
  if (!supabase) return { error: errors.off };
  const typed = String(form.get("email") ?? "").slice(0, 200);
  const address = email.safeParse(typed.trim());
  const secret = String(form.get("password") ?? "");
  if (!address.success) return { error: errors.email, email: typed };
  if (!secret || secret.length > 72)
    return { error: errors.credentials, email: typed };
  const check = captcha(form);
  if (!check) return { error: errors.captcha, email: typed };

  const { error } = await supabase.auth.signInWithPassword({
    email: address.data,
    password: secret,
    options: check,
  });
  // Before the 400 below: a refused check isn't a wrong password.
  if (error?.code === "captcha_failed")
    return { error: errors.captcha, email: typed };
  if (error?.code === "email_not_confirmed")
    return { error: errors.unconfirmed, unconfirmed: true, email: typed };
  if (error?.code === "invalid_credentials" || error?.status === 400)
    return { error: errors.credentials, email: typed };
  if (error) return { ...failure(error), email: typed };
  return await arrive(destinationOr(form.get("next")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await authClient();
  if (!supabase) return { error: errors.off };
  const typed = String(form.get("email") ?? "").slice(0, 200);
  const address = email.safeParse(typed.trim());
  const secret = password.safeParse(String(form.get("password") ?? ""));
  if (!address.success) return { error: errors.email, email: typed };
  if (!secret.success) return { error: errors.weakPassword, email: typed };
  const check = captcha(form);
  if (!check) return { error: errors.captcha, email: typed };
  const next = destinationOr(form.get("next"));

  const { data, error } = await supabase.auth.signUp({
    email: address.data,
    password: secret.data,
    options: { emailRedirectTo: await confirmLink(next), ...check },
  });
  // An email that already has a confirmed account gets the same answer as a
  // new one, so this page never reveals which addresses have accounts.
  if (error?.code === "user_already_exists") return { sentTo: address.data };
  if (error) return { ...failure(error), email: typed };
  // Confirmation switched off for this project: the session already exists.
  if (data.session) return await arrive(next);
  return { sentTo: address.data };
}

export async function resendConfirmation(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const supabase = await authClient();
  if (!supabase) return { error: errors.off };
  const address = email.safeParse(String(form.get("email") ?? "").trim());
  if (!address.success) return { error: errors.email };
  const check = captcha(form);
  if (!check) return { error: errors.captcha, sentTo: address.data };
  const next = destinationOr(form.get("next"));
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: address.data,
    options: { emailRedirectTo: await confirmLink(next), ...check },
  });
  if (error) return { ...failure(error), sentTo: address.data };
  return { sentTo: address.data, notice: account.checkEmail.resent };
}

export async function requestReset(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const supabase = await authClient();
  if (!supabase) return { error: errors.off };
  const typed = String(form.get("email") ?? "").slice(0, 200);
  const address = email.safeParse(typed.trim());
  if (!address.success) return { error: errors.email, email: typed };
  const check = captcha(form);
  if (!check) return { error: errors.captcha, email: typed };
  const next = destinationOr(form.get("next"));
  const { error } = await supabase.auth.resetPasswordForEmail(address.data, {
    redirectTo: await confirmLink(next),
    ...check,
  });
  // Supabase accepts a request the same way whether or not the account
  // exists, so "sent" never reveals one. Only a refused or failed request
  // (limits, outage) says so, and offers a retry; it never claims an email.
  if (error) return { ...failure(error), email: typed };
  return { notice: account.forgot.sent };
}

export async function updatePassword(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const supabase = await authClient();
  if (!supabase) return { error: errors.off };
  const secret = password.safeParse(String(form.get("password") ?? ""));
  if (!secret.success) return { error: errors.weakPassword };
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: account.reset.expired };
  if (!recentEmailProof(data.claims))
    return { error: account.reset.linkRequired };
  const { error } = await supabase.auth.updateUser({ password: secret.data });
  if (error?.code === "same_password")
    return { error: "Choose a password you haven't used for this account." };
  if (error) return failure(error);
  const next = destinationOr(form.get("next"));
  if (next !== ACCOUNT_HOME) return await arrive(next);
  redirect(`${ACCOUNT_HOME}?updated=1`);
}

/**
 * Signs out on this device. Supabase is asked to end this session
 * (`scope: "local"`, so other devices and roles are untouched); whatever it
 * answers, every client-session cookie here is expired, so a refresh or
 * provider failure can't leave the client signed in. The page then says
 * which happened: revoked with Supabase too, or only cleared in this browser.
 * After a "wrong account" link it returns to sign-in with the same
 * destination, so the right account can sign in.
 */
export async function signOut(form: FormData) {
  let ended = false;
  try {
    // Never writes cookies: only clearClientCookies below does, so a provider
    // answer arriving after the time limit changes nothing.
    const supabase = await authClient({ writeCookies: false });
    if (supabase) {
      // An expired session refreshes first, and the SDK retries an outage
      // with backoff; don't keep someone waiting to sign out.
      const result = await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise<null>((done) =>
          setTimeout(() => done(null), SIGN_OUT_WAIT_MS),
        ),
      ]);
      ended = result !== null && !result.error;
    }
  } catch {
    ended = false;
  }
  await clearClientCookies();
  const next = destinationOr(form.get("next"));
  redirect(signInHref(next, ended ? "signed_out" : "signed_out_local"));
}

/** How long sign-out waits for Supabase before forgetting the session locally. */
const SIGN_OUT_WAIT_MS = 3_000;
