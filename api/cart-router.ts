import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { cartItems } from "../db/schema";
import { eq, and } from "drizzle-orm";

export const cartRouter = createRouter({
  list: publicQuery
    .input(z.object({ sessionId: z.string() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const items = await db.query.cartItems.findMany({
        where: input?.sessionId
          ? eq(cartItems.sessionId, input.sessionId)
          : undefined,
        with: { watch: true },
      });
      return items;
    }),

  add: publicQuery
    .input(
      z.object({
        watchId: z.number(),
        sessionId: z.string(),
        quantity: z.number().min(1).default(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const existing = await db.query.cartItems.findFirst({
        where: and(
          eq(cartItems.sessionId, input.sessionId),
          eq(cartItems.watchId, input.watchId)
        ),
      });

      if (existing) {
        await db
          .update(cartItems)
          .set({ quantity: existing.quantity + input.quantity })
          .where(eq(cartItems.id, existing.id));
        return { success: true, updated: true };
      }

      await db.insert(cartItems).values({
        watchId: input.watchId,
        sessionId: input.sessionId,
        quantity: input.quantity,
      });

      return { success: true, updated: false };
    }),

  update: publicQuery
    .input(
      z.object({
        id: z.number(),
        quantity: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      if (input.quantity === 0) {
        await db.delete(cartItems).where(eq(cartItems.id, input.id));
        return { success: true, removed: true };
      }

      await db
        .update(cartItems)
        .set({ quantity: input.quantity })
        .where(eq(cartItems.id, input.id));

      return { success: true, removed: false };
    }),

  remove: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(cartItems).where(eq(cartItems.id, input.id));
      return { success: true };
    }),

  clear: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(cartItems).where(eq(cartItems.sessionId, input.sessionId));
      return { success: true };
    }),

  count: publicQuery
    .input(z.object({ sessionId: z.string() }).optional())
    .query(async ({ input }) => {
      if (!input?.sessionId) return 0;
      const db = getDb();
      const items = await db.query.cartItems.findMany({
        where: eq(cartItems.sessionId, input.sessionId),
      });
      return items.reduce((sum, item) => sum + item.quantity, 0);
    }),
});
