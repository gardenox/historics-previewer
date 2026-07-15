// Vercel Serverless Function — proxies GraphQL calls to Pulsar so the
// browser never has to call trac.pulsarplatform.com directly. Since the
// frontend calls this at /api/graphql on its own domain, it's a same-origin
// request — CORS doesn't apply, so no CORS headers are even required for
// normal use. They're included anyway so this also works if you ever call
// it from a different origin (e.g. testing against a deployed function from
// a local dev page).
//
// Nothing here stores your token — it's read from the incoming request's
// Authorization header and forwarded straight through, per request.

const PULSAR_GRAPHQL_URL = process.env.PULSAR_GRAPHQL_URL || "https://trac.pulsarplatform.com/graphql";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST is supported by this endpoint." });
    return;
  }

  try {
    const upstream = await fetch(PULSAR_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      // Vercel parses a JSON request body into req.body automatically when
      // Content-Type: application/json is sent, which is what the tool sends.
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
  } catch (err) {
    res.status(502).json({ error: "Proxy could not reach the target API.", detail: err.message });
  }
}
