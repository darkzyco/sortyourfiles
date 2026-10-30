// Anonymous usage counter. Stores only counts and a random browser id. Never file names or content.
const EVENTS = { visit: 1, scan: 1, sorted: 1 };
const day = () => new Date().toISOString().slice(0, 10);

export async function onRequestPost({ request, env }) {
  let b;
  try { b = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const id = String(b.id || "");
  const ev = String(b.ev || "");
  if (!/^[a-z0-9]{16,32}$/.test(id) || !EVENTS[ev]) return new Response(null, { status: 400 });
  const n = ev === "sorted" ? Math.max(0, Math.min(100000, parseInt(b.n, 10) || 0)) : 1;
  const d = day();
  const kv = env.STATS;

  const key = "day:" + d;
  const cur = JSON.parse((await kv.get(key)) || '{"visits":0,"scans":0,"sorted":0,"users":0,"newUsers":0}');
  if (ev === "visit") cur.visits += 1;
  if (ev === "scan") cur.scans += 1;
  if (ev === "sorted") cur.sorted += n;

  // unique users today / ever (approximate: a browser id)
  if (!(await kv.get("ud:" + d + ":" + id))) {
    await kv.put("ud:" + d + ":" + id, "1", { expirationTtl: 60 * 60 * 24 * 3 });
    cur.users += 1;
  }
  if (!(await kv.get("u:" + id))) {
    await kv.put("u:" + id, d);
    cur.newUsers += 1;
    const t = parseInt((await kv.get("total_users")) || "0", 10) + 1;
    await kv.put("total_users", String(t));
  }
  await kv.put(key, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 400 });
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
