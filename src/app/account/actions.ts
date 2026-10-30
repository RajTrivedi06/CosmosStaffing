"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { account } from "@/lib/site";
import { authClient, siteOrigin } from "@/lib/account/server";
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
  /** A forwarded Studio page; the browser opens it with a full page load. */
  goTo?: string;
};

const email = z.email().max(200);
const password = z.string().min(8).max(72);
const { errors } = account;

function failure(error: AuthError | null): FormState {
  if (error?.status === 429 || error?.code === "over_email_send_rate_limit")
    return { error: errors.rateLimited };
  if (error?.code === "weak_password") return { error: errors.weakPassword };
  return { error: errors.unavailable };
}

/** Where to go next: this site's pages directly, Studio pages via the browser. */
function arrive(next: string): FormState {
  if (isStudioDestination(next)) return { goTo: next };
  redirect(next);
}

/** The confirmation and reset links: back here, then on to `next`. */
async function confirmLink(next: string) {
  return `${await siteOrigin()}/account/confirm?next=${encodeURIComponent(next)}`;
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await authClient();
  if (!supabase) return { error: errors.off };
  const address = email.safeParse(String(form.get("email") ?? "").trim());
  const secret = String(form.get("password") ?? "");
  if (!address.success) return { error: errors.email };
  if (!secret || secret.length > 72) return { error: errors.credentials };

  const { error } = await supabase.auth.signInWithPassword({
    email: address.data,
    password: secret,
  });
  if (error?.code === "email_not_confirmed")
    return { error: errors.unconfirmed, unconfirmed: true };
  if (error?.code === "invalid_credentials" || error?.status === 400)
    return { error: errors.credentials };
  if (error) return failure(error);
  return arrive(destinationOr(form.get("next")));
}

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const supabase = await authClient();
  if (!supabase) return { error: errors.off };
  const address = email.safeParse(String(form.get("email") ?? "").trim());
  const secret = password.safeParse(String(form.get("password") ?? ""));
  if (!address.success) return { error: errors.email };
  if (!secret.success) return { error: errors.weakPassword };
  const next = destinationOr(form.get("next"));

  const { data, error } = await supabase.auth.signUp({
    email: address.data,
    password: secret.data,
    options: { emailRedirectTo: await confirmLink(next) },
  });
  // An email that already has a confirmed account gets the same answer as a
  // new one, so this page never reveals which addresses have accounts.
  if (error?.code === "user_already_exists") return { sentTo: address.data };
  if (error) return failure(error);
  // Confirmation switched off for this project: the session already exists.
  if (data.session) return arrive(next);
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
  const next = destinationOr(form.get("next"));
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: address.data,
    options: { emailRedirectTo: await confirmLink(next) },
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
  const address = email.safeParse(String(form.get("email") ?? "").trim());
  if (!address.success) return { error: errors.email };
  const next = destinationOr(form.get("next"));
  const { error } = await supabase.auth.resetPasswordForEmail(address.data, {
    redirectTo: await confirmLink(next),
  });
  // Same answer whether or not the account exists; only limits are shown.
  if (error?.status === 429) return failure(error);
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
  const { error } = await supabase.auth.updateUser({ password: secret.data });
  if (error?.code === "same_password")
    return { error: "Choose a password you haven't used for this account." };
  if (error) return failure(error);
  const next = destinationOr(form.get("next"));
  if (next !== ACCOUNT_HOME) return arrive(next);
  redirect(`${ACCOUNT_HOME}?updated=1`);
}

/**
 * Signs out on this device only. After a "wrong account" link, it returns to
 * the sign-in page with the same destination, so the right account can sign in.
 */
export async function signOut(form: FormData) {
  const supabase = await authClient();
  await supabase?.auth.signOut({ scope: "local" });
  const next = destinationOr(form.get("next"));
  redirect(signInHref(next, "signed_out"));
}
