import { relations } from "drizzle-orm";
import { users, categories, watches, cartItems, orders, orderItems } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  cartItems: many(cartItems),
  orders: many(orders),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  watches: many(watches),
}));

export const watchesRelations = relations(watches, ({ one, many }) => ({
  category: one(categories, { fields: [watches.categoryId], references: [categories.id] }),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  watch: one(watches, { fields: [cartItems.watchId], references: [watches.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  watch: one(watches, { fields: [orderItems.watchId], references: [watches.id] }),
}));
