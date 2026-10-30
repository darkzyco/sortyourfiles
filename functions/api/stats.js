// Admin-only. Send the header  Authorization: Bearer <ADMIN_KEY>  (ADMIN_KEY is a secret you set in Cloudflare).
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export async function onRequestGet({ request, env }) {
  const key = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!env.ADMIN_KEY || !safeEqual(key, env.ADMIN_KEY))
    return new Response('{"error":"forbidden"}', { status: 403, headers: { "Content-Type": "application/json" } });
  const days = [];
  const now = Date.now();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 864e5).toISOString().slice(0, 10);
    const v = JSON.parse((await env.STATS.get("day:" + d)) || '{"visits":0,"scans":0,"sorted":0,"users":0,"newUsers":0}');
    days.push({ d, ...v });
  }
  const total = parseInt((await env.STATS.get("total_users")) || "0", 10);
  return new Response(JSON.stringify({ total_users: total, days }), {
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
