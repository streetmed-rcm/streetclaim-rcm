import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const patientsTable = pgTable("patients", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: text("date_of_birth").notNull(),
  mrn: text("mrn"),
  medicaidId: text("medicaid_id"),
  medicareId: text("medicare_id"),
  managedCarePlanId: text("managed_care_plan_id"),
  payerType: text("payer_type").notNull(),
  housingStatus: text("housing_status").notNull(),
  qrCodeWallet: text("qr_code_wallet"),
  adtStatus: text("adt_status").notNull().default("unknown"),
  ecmEnrolled: boolean("ecm_enrolled").notNull().default(false),
  athenaPatientId: text("athena_patient_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patientsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patientsTable.$inferSelect;
