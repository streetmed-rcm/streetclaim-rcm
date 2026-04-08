import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// ECM Screenings — records the POS 27 → ECM eligibility assessment for each
// encounter. One screening per encounter (upsert on re-screen).
// ---------------------------------------------------------------------------
export const ecmScreeningsTable = pgTable("ecm_screenings", {
  id: serial("id").primaryKey(),

  encounterId: integer("encounter_id").notNull(),
  patientId: integer("patient_id").notNull(),

  screenedAt: timestamp("screened_at").notNull().defaultNow(),
  screeningSource: text("screening_source").notNull().default("auto"), // "auto" | "manual"

  // Which CalAIM Population of Focus buckets the patient qualifies under
  populationsOfFocus: text("populations_of_focus").array().notNull().default([]),

  // Full per-criterion breakdown stored as JSON for audit trail
  criteriaDetails: jsonb("criteria_details"),

  // "eligible" | "not_eligible" | "pending_review"
  eligibilityStatus: text("eligibility_status").notNull().default("pending_review"),

  // "not_referred" | "referred" | "enrolled" | "declined"
  referralStatus: text("referral_status").notNull().default("not_referred"),

  referredAt: timestamp("referred_at"),
  enrolledAt: timestamp("enrolled_at"),

  // SDOH Z-codes present on the encounter at time of screening
  sdohZCodesSnapshot: text("sdoh_z_codes_snapshot").array().notNull().default([]),

  // Conditions pulled from FHIR at time of screening (partial snapshot)
  fhirConditionsSnapshot: jsonb("fhir_conditions_snapshot"),

  // Referral note / override rationale entered manually
  referralNote: text("referral_note"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEcmScreeningSchema = createInsertSchema(ecmScreeningsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEcmScreening = z.infer<typeof insertEcmScreeningSchema>;
export type EcmScreening = typeof ecmScreeningsTable.$inferSelect;

// ---------------------------------------------------------------------------
// ECM Referrals — tracks referral submissions to health plans
// ---------------------------------------------------------------------------
export const ecmReferralsTable = pgTable("ecm_referrals", {
  id: serial("id").primaryKey(),

  screeningId: integer("screening_id").notNull(),
  patientId: integer("patient_id").notNull(),

  healthPlan: text("health_plan").notNull(), // "la_care" | "cal_optima" | "other"
  referralDate: timestamp("referral_date").notNull().defaultNow(),
  referralMethod: text("referral_method").notNull().default("portal"), // "portal" | "fax" | "api"

  // Health plan confirmation number if returned
  planConfirmationId: text("plan_confirmation_id"),
  planResponseDate: timestamp("plan_response_date"),

  // "pending" | "accepted" | "rejected" | "enrolled"
  status: text("status").notNull().default("pending"),
  rejectionReason: text("rejection_reason"),

  submittedBy: text("submitted_by"),
  notes: text("notes"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertEcmReferralSchema = createInsertSchema(ecmReferralsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEcmReferral = z.infer<typeof insertEcmReferralSchema>;
export type EcmReferral = typeof ecmReferralsTable.$inferSelect;
