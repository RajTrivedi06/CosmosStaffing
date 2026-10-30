# Support: a customer's request we can't confirm

For the Cosmos team. Use this when a customer says the quote screen shows "We
couldn't confirm an earlier request", or asks whether a request reached us.

## What it means

Their browser sent a request and never got a confirmed answer, so **it may or
may not have reached us**. The website can't tell, so it stops them sending
more until they check. Nothing has failed for certain.

The screen shows a **reference**, a long ID. It's safe to ask for it. It holds
none of their answers.

## What to ask for

- The email address on their Cosmos account.
- The reference on the screen, if they can see it.
- Roughly when they sent the request.

Never ask for their password, or for anything from a link in an email.

## How to investigate

**Step 1: ask them to look in their account.** Sign in, open **My account**, and
check **Your requests**. A request listed there reached us. This usually settles
it.

**Step 2: look in Operations Studio.** Find the client by their account email,
and check their jobs around that time. Website requests also appear in
the queue as "Review website inquiry · name". A verified account shows as
"verified customer account" on the job.

**Step 3: if it's still unclear, look up the reference.** The Studio doesn't show
references yet, so this needs someone with read-only database access to the
production project. Staff should pass the reference to them. They run this one
read-only query, with the reference in place of the zeros:

```sql
select job_id, lead_id, created_at
from studio_private.website_intake_receipts
where submission_id = '00000000-0000-0000-0000-000000000000';
```

A row means the request arrived, and `job_id` is its job. No row means **that
reference** isn't recorded, as of now.

## What to tell them

**It reached us:** tell them their request is in and you're working on it. They
don't need to send it again. If they want a different cleaning as well, they
choose "Start a separate request", which creates a new request.

**It didn't reach us:** tell them nothing arrived, so they can choose "Start a
separate request" and enter their details again. Or take the details by phone
and enter the job yourself, whichever they prefer.

**You can't tell:** don't guess. Take their details and handle it by hand so it
isn't lost, and check for a duplicate before quoting.

## Good to know

- The message stays until they choose "Start a separate request". It does not
  clear with time or once you've confirmed it, and that's deliberate: it's what
  stops an accidental duplicate. Tell them it's safe to click once you've
  checked.
- If they confirm a separate request without checking, and the first one had
  arrived, you'll see two requests. Check for this before quoting.
- Their answers aren't kept in the browser for this, so they'll need to enter
  them again.
- The message is tied to their account in that browser. Someone else signing in
  there won't see it, and they won't see it on another device.
- Accepting a quote isn't a booking, and online payment isn't on yet: Cosmos
  arranges payment directly.

## Other things customers may ask

- **Changing the email on their account:** not available online yet. Note the
  request and pass it on; don't change it for them without checking who's
  asking.
- **Changing or forgetting a password:** on the sign-in page, "Forgot your
  password?" emails a secure link. That's the only way to change it, and it
  signs them out on other devices.
