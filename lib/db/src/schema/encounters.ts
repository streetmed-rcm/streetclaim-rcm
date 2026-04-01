import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  integer,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const encountersTable = pgTable("encounters", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  providerId: integer("provider_id"),
  encounterDate: timestamp("encounter_date").notNull(),
  posCode: text("pos_code").notNull().default("27"),
  emCode: text("em_code").notNull(),
  diagnosisCodes: text("diagnosis_codes").array().notNull().default([]),
  sdohZCodes: text("sdoh_z_codes").array().notNull().default([]),
  clinicalNotes: text("clinical_notes"),
  locationDescription: text("location_description"),
  gpsLat: doublePrecision("gps_lat"),
  gpsLng: doublePrecision("gps_lng"),
  gpsAccuracy: doublePrecision("gps_accuracy"),
  status: text("status").notNull().default("draft"),
  isOfflineCapture: boolean("is_offline_capture").notNull().default(false),
  offlineTimestamp: timestamp("offline_timestamp"),
  syncTimestamp: timestamp("sync_timestamp"),
  cryptoHash: text("crypto_hash"),
  payerType: text("payer_type").notNull(),
  reimbursementRate: text("reimbursement_rate").notNull().default("non_facility"),
  estimatedReimbursement: doublePrecision("estimated_reimbursement"),
  claimId: integer("claim_id"),
  athenaEncounterId: text("athena_encounter_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEncounterSchema = createInsertSchema(encountersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEncounter = z.infer<typeof insertEncounterSchema>;
export type Encounter = typeof encountersTable.$inferSelect;
