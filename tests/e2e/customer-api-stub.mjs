// A MOCK of the Studio's customer API v2 (contract revision 2.1) for the
// website's browser tests. It is not the Studio and proves nothing about it:
// it reads the bearer token's claims WITHOUT verifying the signature, keeps
// synthetic records in memory, and models only the documented responses.
// Real Studio identity, ownership and persistence need the paired
// environment (one isolated Supabase project shared with the Studio).
import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";

const port = Number(process.env.CUSTOMER_STUB_PORT ?? 3398);
const secret = process.env.CUSTOMER_STUB_SECRET ?? "";

/** sub -> { email, requests: [...] } */
const accounts = new Map();
/** submission_id -> { sub, hash, receipt_id, request_id } */
const receipts = new Map();
let jobNumber = 1000;
/** Emails whose next intake commits, then loses its answer (per test). */
const failNextIntake = new Set();
/** Emails whose tokens this mock now refuses, as a revoked session would be. */
const rejected = new Set();

const send = (res, status, body) => {
  res.writeHead(status, {
    "content-type": "application/json",
    "cache-control": "private, no-store, max-age=0",
  });
  res.end(body === undefined ? "" : JSON.stringify(body));
};
const fail = (res, status, code) => send(res, status, { ok: false, code });

/** MOCK ONLY: claims read without signature verification. */
function claims(header) {
  const token = /^Bearer (\S+)$/.exec(header ?? "")?.[1];
  if (!token) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    if (!payload.sub || !payload.email || payload.exp * 1000 < Date.now())
      return null;
    return payload;
  } catch {
    return null;
  }
}

const canonical = (value) =>
  JSON.stringify(value, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)),
        )
      : v,
  );

createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const url = new URL(req.url, "http://stub");
    // Test controls (never part of the contract).
    if (url.pathname === "/health") return send(res, 200, { ok: true });
    if (url.pathname === "/__stub/fail-next-intake") {
      failNextIntake.add(url.searchParams.get("email"));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/__stub/reject") {
      rejected.add(url.searchParams.get("email"));
      return send(res, 200, { ok: true });
    }
    if (url.pathname === "/__stub/state") {
      const sub = url.searchParams.get("sub");
      const email = url.searchParams.get("email");
      const entry = [...accounts.entries()].find(
        ([key, value]) => key === sub || value.email === email,
      );
      return send(res, 200, {
        requests: entry ? entry[1].requests.length : 0,
        submissions: entry ? entry[1].requests.map((r) => r.submission_id) : [],
      });
    }

    if (!url.pathname.startsWith("/api/customer/v2/"))
      return fail(res, 404, "not_found");
    if (!secret || req.headers["x-webhook-secret"] !== secret)
      return fail(res, 401, "unauthorized");
    const who = claims(req.headers.authorization);
    if (!who || rejected.has(who.email)) return fail(res, 401, "unauthorized");
    // Browser cookies must never arrive here.
    if (req.headers.cookie) return fail(res, 422, "invalid");
    const account = accounts.get(who.sub) ?? { email: who.email, requests: [] };
    const path = url.pathname.slice("/api/customer/v2/".length).split("/");

    if (req.method === "GET" && path[0] === "account" && path.length === 1)
      return send(res, 200, {
        ok: true,
        account: {
          user_id: who.sub,
          email: who.email,
          linked: account.requests.length > 0,
        },
      });

    if (req.method === "POST" && path[0] === "intake" && path.length === 1) {
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return fail(res, 400, "invalid_json");
      }
      const keys = Object.keys(body ?? {})
        .sort()
        .join(",");
      if (
        keys !== "answers,submission_id,version" ||
        body.version !== 2 ||
        req.headers["idempotency-key"] !== body.submission_id
      )
        return fail(res, 422, "invalid");
      const hash = createHash("sha256").update(canonical(body)).digest("hex");
      const known = receipts.get(body.submission_id);
      if (known) {
        if (known.sub !== who.sub || known.hash !== hash)
          return fail(res, 409, "idempotency_conflict");
        return send(res, 200, {
          ok: true,
          receipt_id: known.receipt_id,
          status: "received",
        });
      }
      const request = {
        request_id: randomUUID(),
        job_number: ++jobNumber,
        submitted_at: new Date().toISOString(),
        sales_status: "new",
        service_status: "unassigned",
        scheduled_start_at: null,
        scheduled_end_at: null,
        quote_accepted: false,
        payment_status: "unpaid",
        submission_id: body.submission_id,
        answers: body.answers,
      };
      account.requests.unshift(request);
      accounts.set(who.sub, account);
      const receipt_id = randomUUID();
      receipts.set(body.submission_id, {
        sub: who.sub,
        hash,
        receipt_id,
        request_id: request.request_id,
      });
      if (failNextIntake.delete(who.email)) {
        // Committed, then the answer is lost.
        return fail(res, 502, "bad_gateway");
      }
      return send(res, 202, { ok: true, receipt_id, status: "received" });
    }

    const summary = ({ submission_id, answers, ...rest }) => (
      void submission_id,
      void answers,
      rest
    );
    if (req.method === "GET" && path[0] === "requests" && path.length === 1)
      return send(res, 200, {
        ok: true,
        items: account.requests.slice(0, 20).map(summary),
        next_cursor: null,
      });
    if (req.method === "GET" && path[0] === "requests" && path.length === 2) {
      const found = account.requests.find((r) => r.request_id === path[1]);
      // Missing and someone else's look the same.
      if (!found) return fail(res, 404, "not_found");
      return send(res, 200, {
        ok: true,
        request: {
          ...summary(found),
          answers: found.answers,
          quotes: [],
          quotes_has_more: false,
          payment_requests: [],
          payment_requests_has_more: false,
        },
      });
    }
    return fail(res, 404, "not_found");
  });
}).listen(port, "127.0.0.1");
