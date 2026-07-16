// Vercel Serverless Function — reads and writes the benchmark_entries table
// in Supabase, so the Benchmark tab persists across sessions regardless of
// which browser/device the tool is opened on.
//
// Required Vercel environment variables (set these in your Vercel project's
// Settings > Environment Variables, never in the repo):
//   SUPABASE_URL         e.g. https://xxxxx.supabase.co
//   SUPABASE_SECRET_KEY  the sb_secret_... (or legacy service_role) key
//
// This key never reaches the browser — the frontend only ever calls this
// function at /api/benchmark on its own domain.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

function supabaseHeaders(extra) {
  return {
    apikey: SUPABASE_SECRET_KEY,
    "Content-Type": "application/json",
    ...(extra || {}),
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    res.status(500).json({
      error: "SUPABASE_URL and/or SUPABASE_SECRET_KEY aren't set as environment variables on this deployment.",
    });
    return;
  }

  const base = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/benchmark_entries`;

  try {
    if (req.method === "GET") {
      const upstream = await fetch(`${base}?select=*`, {
        headers: supabaseHeaders(),
      });
      const text = await upstream.text();
      res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
      return;
    }

    if (req.method === "POST") {
      // Body is an array of rows to insert/update. Relies on the unique
      // (search_id, category) constraint: re-adding the same search+category
      // updates that row instead of creating a duplicate.
      const rows = Array.isArray(req.body) ? req.body : [req.body];
      const upstream = await fetch(`${base}?on_conflict=search_id,category`, {
        method: "POST",
        headers: supabaseHeaders({ Prefer: "resolution=merge-duplicates,return=representation" }),
        body: JSON.stringify(rows),
      });
      const text = await upstream.text();
      res.status(upstream.status).setHeader("Content-Type", "application/json").send(text);
      return;
    }

    if (req.method === "DELETE") {
      const searchId = req.query.search_id;
      if (!searchId) {
        res.status(400).json({ error: "search_id query parameter is required to delete." });
        return;
      }
      const upstream = await fetch(`${base}?search_id=eq.${encodeURIComponent(searchId)}`, {
        method: "DELETE",
        headers: supabaseHeaders(),
      });
      const text = await upstream.text();
      res.status(upstream.status).setHeader("Content-Type", "application/json").send(text || "{}");
      return;
    }

    res.status(405).json({ error: "Only GET, POST, and DELETE are supported." });
  } catch (err) {
    res.status(502).json({ error: "Could not reach Supabase.", detail: err.message });
  }
}
