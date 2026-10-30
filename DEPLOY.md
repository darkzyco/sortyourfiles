# Put Sort Your Files online (Cloudflare Pages + admin page)

1. Make a GitHub repo and upload everything in this `site` folder (keep the folders as they are).
2. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > pick the repo.
   Build command: none. Output folder: `/` (leave blank).
3. In the new project > Settings > Bindings > add a **KV namespace** called `STATS`
   (create one under Storage & Databases > KV first).
4. Settings > Variables and Secrets > add a secret `ADMIN_KEY` with a long random password. This is your admin password.
5. Custom domains > add `sortyourfiles.l.cd`, then in DNSHE add the CNAME record Cloudflare shows you.
6. Your admin page is `https://sortyourfiles.l.cd/admin/`. Enter the ADMIN_KEY once per browser session.

It counts anonymous visits, scans and files sorted. It never stores file names or content.
Visitors with "Do Not Track" turned on are not counted.
