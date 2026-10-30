// A stand-in for the Operations Studio during browser tests, so forwarded
// paths (lib/studio-routes.ts) never reach the real Studio. It answers every
// request with a small page that echoes what arrived.
import { createServer } from "node:http";

const port = Number(process.env.STUDIO_STUB_PORT ?? 3299);

const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    // Synthetic upstream contracts only; these are not live Studio fixtures.
    const headers = {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-robots-tag": "noindex, nofollow, noarchive",
      "referrer-policy": "no-referrer",
      "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
      "x-frame-options": "DENY",
      "x-content-type-options": "nosniff",
      "set-cookie": "synthetic-session=test; Path=/; HttpOnly; SameSite=Lax",
    };
    if (req.url === "/me?test-redirect=1") {
      res.writeHead(303, { ...headers, location: "/me/login" });
      res.end();
      return;
    }
    res.writeHead(200, headers);
    res.end(
      `<!doctype html><title>Studio stub</title><h1>Studio stub</h1>` +
        `<p id="method">${escape(req.method)}</p>` +
        `<p id="path">${escape(req.url)}</p>` +
        `<p id="body">${escape(body)}</p>` +
        `<p id="cookie">${escape(req.headers.cookie ?? "")}</p>` +
        `<p id="action">${escape(req.headers["next-action"] ?? "")}</p>` +
        `<p id="rsc">${escape(req.headers.rsc ?? "")}</p>` +
        `<p id="origin">${escape(req.headers.origin ?? "")}</p>`,
    );
  });
}).listen(port, "127.0.0.1");
