# Phone pass: account, auth and quote screens

Design brief for the pre-launch phone pass Raj approved on November 3, 2026
(option B plus the safe-area fix). Method: the Studio UX skill's focused-page
rules (390 px first, one task, one main button, every state covered, copy that
restates known facts). Styling stays the website's own: warm ground, ink
buttons, its own type, glass only on wider screens.

Base: `d6cbdac`. Branch: `design/phone-pass-20261103`. No new Auth features;
no change to what any page shows to whom.

Evidence: the current screens were captured at 390 × 844 against local Auth
and the customer-API mock (16 screens), and the safe area in the iOS 18
Simulator before and after the fix.

## Findings that drive the pass

1. **Safe areas.** iOS 18 Safari paints its status bar with `theme-color`
   (`#f4efe7` here). The page's top-right glow is `#f7ead8`, so a flat band
   showed above a peach edge. Fixed and seen in the Simulator: the page's top
   edge now equals the theme colour; the warm ground is one fixed layer that
   stays behind the notch, the home indicator and overscroll; the notch strip
   matches it. iOS 26 Safari (which tints from the page, not `theme-color`)
   isn't installed here; Raj's iPhone confirms it.
2. **Width.** A 28 px-radius card inside the gutter leaves about 303 px of
   content on a 390 px phone. Long emails and dates wrap mid-word ("capture-
   / 1793…@example.test").
3. **Buttons.**
   - Two primaries:
     - The quote's "answers from before sign-in" banner sits above every
       step, with its own primary beside Continue or Send.
     - Account home in the "sign in again" state has two primaries.
   - No primary:
     - "Check your email" after sign-up.
     - Forgot after sending.
     - Request details.
     - The privacy "Try again" overlay.
   - Sign out is a full-width button as large as "New request".
4. **Rows.**
   - Account list rows squeeze the title beside a separate "Details" button,
     the only tap target.
   - Request details puts status after the date with a dot, and runs name,
     email and phone together.
5. **Quote.**
   - The count jumps from "Step 1 of 5" (signed out) to "Step 9 of 10" (signed
     in).
   - Back shares the bottom row with the primary.
   - React warns about a missing `key` in a list QuoteFlow passes to
     `motion.div` (development console, sent screen).
6. **Turnstile.** While a token is pending, the submit is disabled with no
   explanation.
7. **Missing h1:** request details in the `signin` state.

## Shared rules (all focused screens)

| Rule        | At ≤ 600 px                                                                                                                                                                                  |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Surface     | No floating card: content sits on the warm ground, 20 px side gutter plus safe-area insets. Above 600 px the glass card stays as today.                                                      |
| Header      | Wordmark and one 44 px exit pill, as today. Nothing private in the header.                                                                                                                   |
| Back        | Where a screen has a "back" (quote steps, request details), it is a 44 px "‹ Back" or "‹ Back to my account" text button above the heading, never in the bottom row.                         |
| One primary | Exactly one `btn-primary` per view, full width, 52 px, after the content it acts on. Secondary actions sit under it as glass buttons or 44 px text links, in the same order on every screen. |
| Type        | h1 `clamp(1.9rem, 8vw, 2.4rem)`. Body 17 px. Facts 15 px. Emails, dates and IDs get `overflow-wrap: anywhere` and sit on their own line.                                                     |
| Targets     | Every control and link at least 44 × 44 px, including inline links in notes.                                                                                                                 |
| States      | Every state below has an h1, a one-sentence body and its one next step. Alerts keep `role=alert`, statuses `role=status`.                                                                    |
| Motion      | Unchanged: existing step transitions, off under reduced motion.                                                                                                                              |
| Copy        | All new or moved copy goes into `site.ts`. Nothing promises a time, a price, a booking or a policy the data doesn't state.                                                                   |
| Contact     | `info@cosmosgroupusa.com` replaces `info@cosmosservicesllc.com` (Raj, November 3): `site.ts` and `docs/launch-cutover.md`, the only two places it appears.                                   |

## Screens

Each screen lists its states (from the code), the one primary, and what changes. States not listed keep today's behaviour and copy.

### Sign in (`/account/login`)

- **States:** accounts off; wrong account (signed in, Studio link); session
  refused; signed in with a Studio destination ("Continue"); signed out, with
  or without a reason note; form errors; unconfirmed email (resend).
- **Primary:** "Sign in"; in the other states, their existing single primary.
- **Changes:**
  - Edge-to-edge layout.
  - The reason note sits above the h1 as a calm one-line status, or an alert
    for an expired session, wrong account or expired link.
  - "Forgot your password?" and "New to Cosmos? Create an account" become two
    full-width 44 px text rows under the button.
  - The resend form for an unconfirmed email appears in place of the links
    with a glass "Send the link again".
- **Turnstile:** while the token is pending for more than 1 s, a quiet line
  under the button: "Running a quick security check…" (new copy). An
  interactive challenge appears above the button, never between the fields.

### Create account (`/account/signup`)

- **States:** off; signed in (redirect); form; errors; sent.
- **Primary:** "Create account".
- **Changes:** as sign-in.
  - On success the whole screen becomes **Check your email**: h1 "Check your
    email", the address on its own line, the one-device note when coming from
    the quote, the existing-account note, then a glass "Send the link again"
    and a text row "Back to sign in".
  - Deliberately no primary: nothing on the page moves the task forward; the
    next step is the inbox. Flagged as the one exception.
  - Today this is an h2 under "Create your account".

### Reset request (`/account/forgot`)

- **States:** off; expired-link alert; form; errors; sent.
- **Primary:** "Send reset link".
- **Changes:** sent becomes the same Check your email pattern with the existing
  "If an account exists…" sentence; one text row "Back to sign in".

### New password (`/account/reset`)

- **States:** off; link expired (primary "Send reset link"); signed in without
  recent proof (primary "Send reset link"); form; errors.
- **Primary:** "Save new password".
- **Changes:**
  - Layout only.
  - The hard-coded "Choose a password you haven't used for this account." moves
    to `site.ts`.

### Your account (`/account`)

- **States:**
  - off;
  - session refused (`signin`);
  - email unconfirmed;
  - history not connected;
  - records unavailable;
  - empty;
  - records: quotes to review, upcoming, requests, completed, older pages.
- **Primary:** "New request". In the session-refused state it is "Sign in
  again" alone, and "New request" is hidden.
- **Layout, top to bottom:**
  1. h1 "Your account".
  2. Password-changed status, when present.
  3. Primary "New request", full width.
  4. Sections. Each record is **one full-width tappable row**:
     - title on line one, facts on line two;
     - the action as a trailing "Details ›" or "Review quote ›" label;
     - minimum 64 px tall.
     - "Quotes to review" rows carry the leaf accent on their action, the
       page's one highlight.
  5. Older and newer requests as 44 px text rows.
  6. A quiet footer row: "Signed in as {email}" on its own line and a text
     button "Sign out" (still a button named "Sign out", inside the private
     area).
- **Empty and note states:** the existing copy, as a plain block under the
  primary, no box.

### Request details (`/account/requests/[id]`)

- **States:**
  - off;
  - session refused (gets an h1, "Please sign in again");
  - not found;
  - unconfirmed;
  - not connected;
  - unavailable;
  - ready.
- **Primary:** none, the second documented exception. An open quote's row
  carries the leaf accent on its "Review quote ›" action instead.
- **Ready, top to bottom:**
  1. "‹ Back to my account" (the existing label, which tests select on).
  2. h1 "Request #1002".
  3. The status as its own line ("Request received").
  4. "Sent Mon, Nov 2, 2026, 6:42 PM CST" on the next line.
  5. Quotes, if any.
  6. Payments, if any.
  7. The existing empty lines ("No quotes sent yet.", "No payment
     requests."), kept as they are.
  8. "What you asked for": label above value; Contact split into name, email
     and phone lines.

### Request a quote (`/quote`)

- **States:**
  - loading;
  - each question step;
  - gated review (signed out);
  - answers from before sign-in;
  - review;
  - sending;
  - the send outcomes (sent, unavailable, error, studio pending, conflict,
    rate limited, invalid, temporary, unverified);
  - full-screen session ended, account switched and unresolved earlier
    request;
  - attempt held;
  - storage failures.
- **Primary:** "Continue" on questions; "Send my request" / "Try again" on
  review; each full-screen state keeps its one existing primary.
- **Changes:**
  - **Step header:** "‹ Back" (44 px, absent on step 1), then the count, then
    the h1. The bottom holds only the full-width primary.
  - **Count:**
    - Measured against the whole flow for everyone, so it never shrinks or
      jumps.
    - A signed-out visitor sees "Step 5 of 10" on the last question; the
      account gate after it isn't a question and has no count. The review is
      "Step 10 of 10".
  - **Answers from before sign-in:** its own screen, shown once before the next
    step:
    - h1 "You started a request before signing in";
    - the existing body;
    - primary "Use these answers";
    - glass "Start fresh".
    - It is no longer stacked above every step.
  - **Contact step:** Email starts at the signed-in address (Raj, November 3).
    It comes from the session the page was rendered for, fills an empty field
    until the client edits it, and is never saved with the draft. A page whose
    session changes is cleared and reloaded by `AccountPrivacy`.
  - **Review:**
    - Rows as label-above-value, with a 44 px "Change" on the right.
    - Contact split over lines.
    - "Sending as {email}" on its own line above the primary.
    - "Copy a link to these answers" moves below the rows.
  - **Gated review:** "Create an account to continue" with primary "Create
    account" first and glass "Sign in" under it, both full width.
  - **Sent:** h1, the email on its own line, the account sentence, primary
    "Back to my account" or "Back to home" full width.
  - **Fix:** the missing React `key`.

### Interrupted result (`account/error.tsx`)

- Unchanged copy and single primary "Return to the form"; layout only.

## Privacy boundary (`AccountPrivacy`)

- **No logic change:** same views, triggers, timers, signals and replace-on-
  clear. The wrapper keeps `display: contents` and `visibility: hidden` while
  checking, so concealed pages keep their layout.
- **Everything private stays inside the wrapper.** The new footer ("Signed in
  as", "Sign out") and the request header are inside `main`, so they hide with
  the rest. The header and the quote's "My account" pill show nothing private,
  as today.
- **Markup change for review:** the "unconfirmed" overlay's "Try again" becomes
  the view's primary (class change only). The overlay stays centred, as
  today.
- **Tests that must still pass unchanged:** every `toBeHidden` /
  `toHaveCount(0)` privacy case in `account.customer.spec.ts`.

## Verification

- **Simulator:** iOS Simulator, iPhone 16 (iOS 18.5), before and after, every
  state reachable locally.
- **Rendering checks:**
  - 390 × 844 and 320 × 568 captures.
  - No horizontal scroll from 320 to 1440 px.
  - A 44 px check on every `main` control on all focused screens (extends
    today's three-page check).
- **Safe areas:** a computed-style test. On `/account/login` and `/quote` the
  root background is `#f4efe7` and the top edge colour equals `theme-color`.
- **Suites:**
  - Unit, lint, types, Prettier.
  - Auth and customer suites (112 cases) on real local Auth with CAPTCHA on.
  - The full default browser suite, including the 320 px quote layout tests.
- **Selectors:**
  - Tests keep their role and label selectors. Updated: the unit test's
    literal link markup, and "Step 6 of 6" at the gate (now: no count). No
    `toBeHidden` or `toHaveCount(0)` assertion changed.
- **Review gates:** Internal Tools Claude reviews the privacy markup before
  any Preview. Raj checks the phone on the new Preview.

## Decided by Raj (November 3)

1. Pre-fill the quote's Email with the signed-in address, still editable.
2. Edge to edge on phones; the card from 600 px up.

## Outside this pass, noted

- The marketing pages keep `theme-color: #eef0ec` while the home page's ground
  changes per section; on iOS 18 the status bar stays green-grey over warmer
  sections.
- A settings page with signed-in password change (option C) stays after
  launch, pending a security review.
