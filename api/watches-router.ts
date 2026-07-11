import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { watches, categories } from "../db/schema";
import { eq, like, and } from "drizzle-orm";

const watchInput = {
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, and hyphen-separated"),
  description: z.string().optional(),
  price: z.coerce.number().positive(),
  salePrice: z.coerce.number().positive().nullable().optional(),
  image: z.string().optional(),
  categoryId: z.number().nullable().optional(),
  caseMaterial: z.string().optional(),
  caseSize: z.string().optional(),
  movement: z.string().optional(),
  waterResistance: z.string().optional(),
  caliber: z.string().optional(),
  dialColor: z.string().optional(),
  strapMaterial: z.string().optional(),
  featured: z.boolean().optional(),
  inStock: z.boolean().optional(),
};

export const watchesRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        categorySlug: z.string().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["price-asc", "price-desc", "name", "newest"]).optional(),
        featured: z.boolean().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.categorySlug) {
        const category = await db.query.categories.findFirst({
          where: eq(categories.slug, input.categorySlug),
        });
        if (category) {
          conditions.push(eq(watches.categoryId, category.id));
        }
      }

      if (input?.search) {
        conditions.push(like(watches.name, `%${input.search}%`));
      }

      if (input?.featured) {
        conditions.push(eq(watches.featured, 1));
      }

      let query = db.select().from(watches).where(and(...conditions));

      const results = await query;

      let sorted = results;
      switch (input?.sortBy) {
        case "price-asc":
          sorted = results.sort((a, b) => Number(a.price) - Number(b.price));
          break;
        case "price-desc":
          sorted = results.sort((a, b) => Number(b.price) - Number(a.price));
          break;
        case "name":
          sorted = results.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case "newest":
          sorted = results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        default:
          break;
      }

      return sorted;
    }),

  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const watch = await db.query.watches.findFirst({
        where: eq(watches.slug, input.slug),
        with: { category: true },
      });
      return watch ?? null;
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const watch = await db.query.watches.findFirst({
        where: eq(watches.id, input.id),
        with: { category: true },
      });
      return watch ?? null;
    }),

  // --- Admin-only management endpoints below ---

  adminList: adminQuery.query(async () => {
    const db = getDb();
    return db.query.watches.findMany({
      with: { category: true },
      orderBy: (watches, { desc }) => [desc(watches.createdAt)],
    });
  }),

  create: adminQuery
    .input(z.object(watchInput))
    .mutation(async ({ input }) => {
      const db = getDb();

      const existing = await db.query.watches.findFirst({
        where: eq(watches.slug, input.slug),
      });
      if (existing) {
        throw new Error("A product with this slug already exists");
      }

      const [result] = await db.insert(watches).values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        price: input.price.toFixed(2),
        salePrice: input.salePrice != null ? input.salePrice.toFixed(2) : null,
        image: input.image,
        categoryId: input.categoryId ?? null,
        caseMaterial: input.caseMaterial,
        caseSize: input.caseSize,
        movement: input.movement,
        waterResistance: input.waterResistance,
        caliber: input.caliber,
        dialColor: input.dialColor,
        strapMaterial: input.strapMaterial,
        featured: input.featured ? 1 : 0,
        inStock: input.inStock === false ? 0 : 1,
      });

      return { success: true, id: Number(result.insertId) };
    }),

  update: adminQuery
    .input(z.object({ id: z.number(), ...watchInput }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...rest } = input;

      const existing = await db.query.watches.findFirst({
        where: eq(watches.slug, rest.slug),
      });
      if (existing && existing.id !== id) {
        throw new Error("A product with this slug already exists");
      }

      await db
        .update(watches)
        .set({
          name: rest.name,
          slug: rest.slug,
          description: rest.description,
          price: rest.price.toFixed(2),
          salePrice: rest.salePrice != null ? rest.salePrice.toFixed(2) : null,
          image: rest.image,
          categoryId: rest.categoryId ?? null,
          caseMaterial: rest.caseMaterial,
          caseSize: rest.caseSize,
          movement: rest.movement,
          waterResistance: rest.waterResistance,
          caliber: rest.caliber,
          dialColor: rest.dialColor,
          strapMaterial: rest.strapMaterial,
          featured: rest.featured ? 1 : 0,
          inStock: rest.inStock === false ? 0 : 1,
        })
        .where(eq(watches.id, id));

      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(watches).where(eq(watches.id, input.id));
      return { success: true };
    }),
});
