import {
  pgTable,
  serial,
  text,
  numeric,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const claimsTable = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimNumber: text("claim_number").notNull().unique(),
  payerType: text("payer_type").notNull(),
  posCode: text("pos_code").notNull(),
  emCode: text("em_code").notNull(),
  sdohZCodes: jsonb("sdoh_z_codes").$type<string[]>().notNull().default([]),
  billedAmount: numeric("billed_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  collectedAmount: numeric("collected_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  status: text("status").notNull().default("draft"),
  hasZCodes: boolean("has_z_codes").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertClaimSchema = createInsertSchema(claimsTable).omit({
  id: true,
});
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claimsTable.$inferSelect;
