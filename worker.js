// Anonymous usage counter + admin stats. Stores only counts and a random browser id. Never file names or content.
const EVENTS = { visit: 1, scan: 1, sorted: 1 };
const EMPTY = '{"visits":0,"scans":0,"sorted":0,"users":0,"newUsers":0}';
const day = () => new Date().toISOString().slice(0, 10);
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function hit(request, env) {
  let b;
  try { b = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const id = String(b.id || ""), ev = String(b.ev || "");
  if (!/^[a-z0-9]{16,32}$/.test(id) || !EVENTS[ev]) return new Response(null, { status: 400 });
  const n = ev === "sorted" ? Math.max(0, Math.min(100000, parseInt(b.n, 10) || 0)) : 1;
  const d = day(), kv = env.STATS;
  const cur = JSON.parse((await kv.get("day:" + d)) || EMPTY);
  if (ev === "visit") cur.visits += 1;
  if (ev === "scan") cur.scans += 1;
  if (ev === "sorted") cur.sorted += n;
  if (!(await kv.get("ud:" + d + ":" + id))) {
    await kv.put("ud:" + d + ":" + id, "1", { expirationTtl: 60 * 60 * 24 * 3 });
    cur.users += 1;
  }
  if (!(await kv.get("u:" + id))) {
    await kv.put("u:" + id, d);
    cur.newUsers += 1;
    await kv.put("total_users", String(parseInt((await kv.get("total_users")) || "0", 10) + 1));
  }
  await kv.put("day:" + d, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 400 });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

async function stats(request, env) {
  const key = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_KEY || !safeEqual(key, env.ADMIN_KEY)) return json({ error: "forbidden" }, 403);
  const days = [], now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 864e5).toISOString().slice(0, 10);
    days.push({ d, ...JSON.parse((await env.STATS.get("day:" + d)) || EMPTY) });
  }
  return json({ total_users: parseInt((await env.STATS.get("total_users")) || "0", 10), days });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/hit" && request.method === "POST") return hit(request, env);
    if (pathname === "/api/stats" && request.method === "GET") return stats(request, env);
    if (pathname.startsWith("/api/")) return new Response(null, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
