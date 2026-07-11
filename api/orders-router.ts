import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, cartItems } from "../db/schema";
import { eq } from "drizzle-orm";

const orderStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;

export const ordersRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        sessionId: z.string(),
        customerName: z.string().min(1),
        customerEmail: z.string().email(),
        customerPhone: z.string().optional(),
        shippingAddress: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const cart = await db.query.cartItems.findMany({
        where: eq(cartItems.sessionId, input.sessionId),
        with: { watch: true },
      });

      if (cart.length === 0) {
        throw new Error("Cart is empty");
      }

      const total = cart.reduce(
        (sum, item) => sum + Number(item.watch.price) * item.quantity,
        0
      );

      const [order] = await db.insert(orders).values({
        sessionId: input.sessionId,
        total: total.toFixed(2),
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        shippingAddress: input.shippingAddress,
        status: "pending",
      });

      const orderId = Number(order.insertId);

      for (const item of cart) {
        await db.insert(orderItems).values({
          orderId,
          watchId: item.watchId,
          name: item.watch.name,
          price: item.watch.price,
          quantity: item.quantity,
          image: item.watch.image,
        });
      }

      await db.delete(cartItems).where(eq(cartItems.sessionId, input.sessionId));

      return { success: true, orderId };
    }),

  bySession: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const userOrders = await db.query.orders.findMany({
        where: eq(orders.sessionId, input.sessionId),
        with: { items: true },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
      return userOrders;
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: { items: true },
      });
      return order ?? null;
    }),

  // --- Admin-only management endpoints below ---

  adminList: adminQuery
    .input(
      z
        .object({
          status: z.enum(orderStatuses).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const allOrders = await db.query.orders.findMany({
        where: input?.status ? eq(orders.status, input.status) : undefined,
        with: { items: true },
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });
      return allOrders;
    }),

  updateStatus: adminQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(orderStatuses),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(orders)
        .set({ status: input.status })
        .where(eq(orders.id, input.id));
      return { success: true };
    }),
});
