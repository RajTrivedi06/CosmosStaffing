# Support: a customer's request we can't confirm

For the Cosmos team. Use this when a customer says the quote screen shows "We
couldn't confirm an earlier request", or asks whether a request reached us.

This follows the Studio's investigation procedure in
`docs/03-guides/launch-2026-10-30.md`, which governs if the two ever differ.

## What it means

Their browser sent a request and never got a confirmed answer, so **it may or
may not have reached us**. The website can't tell, so it stops them sending
more until they check. Nothing has failed for certain.

The screen shows a **reference**, a long ID. It's safe to ask for it. It holds
none of their answers.

## What to ask for, and what never to ask for

- Ask them to stay signed in and leave the message in place.
- Ask for the reference on the screen, roughly when they sent the request, and
  the email on their account.
- Never ask for a password, a cookie or token, or any private link, including
  quote and payment links or anything from an email.
- Never tell them to clear their browser data to make the message go away.

An email address or reference someone gives you is a search hint, not proof of
who they are. It's never enough on its own to reveal a record or attach one to
an account.

## How to investigate

**Step 1: ask them to look in their account.** Signed in, under **My account**,
**Your requests** lists what reached us for that account. This usually settles
it, and it's the safest check because the customer sees only their own records.

**Step 2: look in Operations Studio.** Find the client and check their jobs
around that time. Website requests also appear in the queue as "Review website
inquiry · name".

**Step 3: if it's still unclear, an authorized Studio operator looks up the
reference.** The Studio doesn't show references, so this needs someone with
read-only production database access. They run a bounded query like this, with
the reference in place of the zeros, selecting no answers, hashes or tokens:

```sql
select job_id, lead_id, created_at
from studio_private.website_intake_receipts
where submission_id = '00000000-0000-0000-0000-000000000000';
```

From a row, they follow `job_id` to the job, its client to `customer_accounts`,
and that to the verified account. **If you can't independently establish that
the record belongs to this customer, don't disclose it.** Ask them to check
their signed-in history, and escalate internally.

## What the result means

**A row exists:** the Studio saved the request. Work from the existing job. Don't
create another one, and don't change its reference. If it's confirmed as theirs,
tell them it's in and they don't need to send it again.

**No row:** this doesn't prove nothing arrived. The attempt may not have settled,
or you may be looking in the wrong place. Confirm you're on production, wait for
any active attempt to settle, then check the receipts and job history again. Don't
tell them "nothing arrived" from a single lookup.

**A "conflict" message:** it can mean different answers, or a reference tied to
another account. It proves neither receipt nor failure, and it isn't permission
to show anyone the earlier request.

## If they want to go ahead

Only the customer can do this, on their own screen, with "Start a separate
request". Before they do, explain that it can create a second request if the
first one later turns up. Then review for duplicates before sending any quote or
booking.

Record the outcome internally on the job's timeline, without answers or tokens.

## Good to know

- The message stays until they choose "Start a separate request". It doesn't
  clear with time or once you've looked into it, and that's deliberate: it's what
  stops an accidental duplicate.
- Their answers aren't kept in the browser for this, so a separate request means
  entering them again.
- The message is tied to their account in that browser. Someone else signing in
  there won't see it, and they won't see it on another device.
- Accepting a quote isn't a booking.

## Other things customers may ask

- **Paying:** Cosmos arranges payment directly; online card payment isn't on.
  When a payment is confirmed, record it through the staff payment workflow and
  cancel any obsolete open payment request, with a reason. A redirect or a
  promise isn't a payment.
- **Changing the email on their account:** not available online yet. Note the
  request and pass it on; don't change it without checking who's asking.
- **Changing or forgetting a password:** on the sign-in page, "Forgot your
  password?" emails a secure link. That's the only way to change it, and it
  signs them out on other devices.
