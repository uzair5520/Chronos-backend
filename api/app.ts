import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { env } from "./lib/env";
import { Paths } from "../contracts/constants";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
// Allows the API to be called from a frontend hosted on a different domain
// (e.g. Netlify) while still sending/receiving the session cookie. When
// FRONTEND_URL isn't set, this reflects the request's own origin, which is
// harmless for same-origin deployments (browsers don't need CORS headers
// for same-origin requests anyway).
app.use(
  "/api/*",
  cors({
    origin: env.frontendUrl || ((origin) => origin),
    credentials: true,
  }),
);
app.get(Paths.oauthCallback, createOAuthCallbackHandler());
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
