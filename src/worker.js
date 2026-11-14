// Serves /data/{zip3}.ndjson from R2, a copy of iandees/usps-collection-boxes.
// Read-through: a missing or week-old file is fetched from GitHub; if GitHub fails, the old copy is served.
// An hourly cron refreshes a rolling batch, so every file is renewed about every 2.5 days even if nobody asks for it.
const SRC = "https://raw.githubusercontent.com/iandees/usps-collection-boxes/master/data/";
const API = "https://api.github.com/repos/iandees/usps-collection-boxes/commits?path=data&per_page=1";
const MAX_AGE = 7 * 864e5, BATCH = 15; // ponytail: 15 keeps a cron run under the free plan's 50 subrequests

// Scrape date = date of the source repo's latest data commit, checked at most daily.
async function scrapeDate(env) {
  const old = await (await env.BOXES.get("_meta.json"))?.json();
  if (old && Date.now() - old.checked < 864e5) return old.date;
  try {
    const r = await fetch(API, { headers: { "user-agent": "dropbox-finder", accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error("GitHub API " + r.status);
    const date = (await r.json())[0].commit.committer.date.slice(0, 10);
    await env.BOXES.put("_meta.json", JSON.stringify({ date, checked: Date.now() }));
    return date;
  } catch (e) {
    console.error(e);
    return old?.date ?? "";
  }
}

async function refresh(env, z3, date) {
  const r = await fetch(SRC + z3 + ".ndjson");
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${z3}: ${r.status}`);
  const body = await r.text();
  await env.BOXES.put(z3 + ".ndjson", body, { customMetadata: { fetched: String(Date.now()), date } });
  return { body, date };
}

const send = (body, date) => new Response(body, {
  headers: { "content-type": "application/x-ndjson", "x-data-date": date || "", "cache-control": "public, max-age=3600" },
});

export default {
  async fetch(req, env) {
    const m = new URL(req.url).pathname.match(/^\/data\/(\d{3})\.ndjson$/);
    if (!m) return env.ASSETS.fetch(req);
    const z3 = m[1];
    const obj = await env.BOXES.get(z3 + ".ndjson");
    const meta = obj?.customMetadata;
    if (obj && Date.now() - Number(meta.fetched) < MAX_AGE) return send(obj.body, meta.date);
    try {
      const got = await refresh(env, z3, await scrapeDate(env));
      if (got) return send(got.body, got.date);
      if (!obj) return new Response("No such area", { status: 404 });
    } catch (e) {
      console.error(e);
      if (!obj) return new Response("Box data unavailable", { status: 502 });
    }
    return send(obj.body, meta.date); // stale copy beats no copy
  },

  async scheduled(_event, env) {
    const zips = Object.keys(await (await env.ASSETS.fetch("https://assets.local/index.json")).json()).sort();
    const batches = Math.ceil(zips.length / BATCH);
    const i = Math.floor(Date.now() / 36e5) % batches;
    const date = await scrapeDate(env);
    for (const z3 of zips.slice(i * BATCH, (i + 1) * BATCH)) {
      try { await refresh(env, z3, date); } catch (e) { console.error(e); }
    }
  },
};
