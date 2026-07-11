import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { categories } from "../db/schema";
import { eq } from "drizzle-orm";

export const categoriesRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const cats = await db.query.categories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });
    return cats;
  }),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1),
        slug: z
          .string()
          .min(1)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.query.categories.findFirst({
        where: eq(categories.slug, input.slug),
      });
      if (existing) {
        throw new Error("A category with this slug already exists");
      }
      const [result] = await db.insert(categories).values(input);
      return { success: true, id: Number(result.insertId) };
    }),
});
