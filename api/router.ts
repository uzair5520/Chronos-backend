import { authRouter } from "./auth-router";
import { watchesRouter } from "./watches-router";
import { categoriesRouter } from "./categories-router";
import { cartRouter } from "./cart-router";
import { ordersRouter } from "./orders-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  watches: watchesRouter,
  categories: categoriesRouter,
  cart: cartRouter,
  orders: ordersRouter,
});

export type AppRouter = typeof appRouter;
