# Chronos — Backend (API + Database)

This is the Hono/tRPC API server for the Chronos watch store, built to deploy on **Railway** along with a Railway-hosted MySQL database.

## What's in here
- `api/` — Hono app, tRPC routers (products, categories, orders, cart, auth), OAuth handling
- `db/` — Drizzle ORM schema, relations, seed script
- `contracts/` — shared constants/types/errors

## 1. Deploy on Railway

1. Push this folder to its own GitHub repo (or use Railway's CLI to deploy a local folder directly).
2. In Railway: **New Project → Deploy from GitHub repo** and pick this repo.
3. Add a MySQL database: **New → Database → Add MySQL**. Railway provisions it and gives you a `DATABASE_URL` — copy it.
4. On your backend service, go to **Variables** and add everything from `.env.example`:
   - `DATABASE_URL` — paste the one Railway gave you for the MySQL plugin
   - `APP_ID`, `APP_SECRET`, `KIMI_AUTH_URL`, `KIMI_OPEN_URL` — your OAuth app's credentials
   - `OWNER_UNION_ID` — leave blank until you've logged in once (see step 4 below), then come back and set it
   - `FRONTEND_URL` — your Netlify site's URL, e.g. `https://chronos-store.netlify.app` (no trailing slash)
   - `NODE_ENV=production`
5. Railway auto-detects Node via `package.json` and runs `npm install && npm start`. No extra build step needed.
6. Once deployed, Railway gives your service a public URL like `https://chronos-backend-production.up.railway.app`. That's your `VITE_API_URL` for the frontend.

## 2. Set up the database

Run these once, either from your local machine (pointing `DATABASE_URL` at the Railway database) or via Railway's shell:

```bash
npm install
npm run db:push      # creates tables from the schema
npm run db:seed      # optional: adds sample categories/watches
```

## 3. Register the OAuth callback URL

Wherever you registered your OAuth app (the platform behind `KIMI_AUTH_URL`/`KIMI_OPEN_URL`), add this as an allowed redirect URI:

```
https://<your-railway-domain>/api/oauth/callback
```

## 4. Become admin

1. Deploy, then visit your site and log in once with the account you want as the store owner.
2. In Railway's database, find your user row and copy its `union_id`.
3. Set `OWNER_UNION_ID` to that value in Railway's environment variables and redeploy (or update the row's `role` to `admin` directly).

## Local development

```bash
npm install
cp .env.example .env   # fill in values, use a local/dev MySQL DATABASE_URL
npm run dev             # starts on http://localhost:4000
```

The companion frontend package's dev server proxies `/api` to `http://localhost:4000` automatically.
