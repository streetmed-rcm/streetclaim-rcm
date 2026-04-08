/**
 * ECM Qualification Engine
 *
 * Screens POS 27 encounters against CalAIM Enhanced Care Management (ECM)
 * Populations of Focus criteria. Pulls SDOH Z-codes from the local encounter
 * record and live FHIR Condition resources from athenahealth.
 *
 * CalAIM ECM Populations of Focus (DHCS 2024):
 *  1. Experiencing or At Risk of Homelessness
 *  2. Serious Mental Illness / Serious Emotional Disturbance
 *  3. Substance Use Disorder (Medi-Cal covered)
 *  4. Individuals with Complex Chronic Conditions (2+ conditions)
 *  5. High Utilizers of Multiple Systems (4+ ED/inpatient in 12 months)
 *  6. Involvement with Criminal Justice System
 *  7. Children/Youth in Foster Care
 */

import { db, encountersTable, patientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Encounter, Patient } from "@workspace/db";
import { getConditions, type FhirBundle } from "./athenaFhir.js";

// ─────────────────────────────────────────────────────────────────────────────
// ICD-10 code sets for each Population of Focus
// ─────────────────────────────────────────────────────────────────────────────

const HOMELESS_Z_CODES = new Set([
  "Z59.0", "Z59.00", "Z59.01", "Z59.02",
  "Z59.1", "Z59.10", "Z59.11", "Z59.12",
  "Z59.8", "Z59.81", "Z59.89", "Z59.9",
]);

const SMI_PREFIXES = [
  "F20", "F21", "F22", "F23", "F24", "F25", "F28", "F29", // Schizophrenia spectrum
  "F30", "F31",                                             // Bipolar
  "F32", "F33",                                             // Major depression
  "F84",                                                    // Autism spectrum
];

const SUD_PREFIXES = [
  "F10", "F11", "F12", "F13", "F14", "F15", "F16", "F17", "F18", "F19",
];

// Chronic condition prefixes — patient needs 2+ to qualify
const CHRONIC_CONDITION_PREFIXES: Record<string, string> = {
  "E10": "Type 1 Diabetes",
  "E11": "Type 2 Diabetes",
  "E08": "Diabetes (secondary)",
  "E09": "Diabetes (drug/chemical)",
  "I10": "Hypertension",
  "I11": "Hypertensive heart disease",
  "I12": "Hypertensive CKD",
  "I13": "Hypertensive heart + CKD",
  "J44": "COPD",
  "J45": "Asthma",
  "N18": "Chronic Kidney Disease",
  "I50": "Heart Failure",
  "I25": "Chronic ischemic heart disease",
  "B20": "HIV disease",
  "B18": "Chronic viral hepatitis",
  "F03": "Unspecified dementia",
  "G30": "Alzheimer's disease",
  "C": "Cancer (active)",
};

const JUSTICE_Z_CODES = new Set([
  "Z65.0", "Z65.1", "Z65.2", "Z65.3", "Z65.4",
]);

const FOSTER_CARE_Z_CODES = new Set([
  "Z62.21", "Z62.22",
]);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function startsWithAny(code: string, prefixes: string[]): boolean {
  return prefixes.some(p => code.startsWith(p));
}

function extractCodesFromBundle(bundle: FhirBundle): string[] {
  if (!bundle.entry) return [];
  const codes: string[] = [];
  for (const entry of bundle.entry) {
    const res = entry.resource as Record<string, unknown> | undefined;
    if (!res) continue;
    const coding = (res.code as { coding?: Array<{ code?: string; system?: string }> } | undefined)?.coding;
    if (!Array.isArray(coding)) continue;
    for (const c of coding) {
      if (c.code) codes.push(c.code);
    }
  }
  return codes;
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-criterion evaluators
// ─────────────────────────────────────────────────────────────────────────────

export interface CriterionResult {
  met: boolean;
  evidence: string[];
  description: string;
}

export interface EcmCriteriaReport {
  populationsOfFocus: string[];
  criteria: {
    homelessness: CriterionResult;
    smi: CriterionResult;
    sud: CriterionResult;
    complexChronic: CriterionResult;
    highUtilizer: CriterionResult;
    justiceInvolvement: CriterionResult;
    fosterCare: CriterionResult;
  };
  eligibilityStatus: "eligible" | "not_eligible" | "pending_review";
  allCodes: string[];
}

export async function evaluateEcmCriteria(
  encounter: Encounter,
  patient: Patient,
  fhirConditionsBundle: FhirBundle | null,
): Promise<EcmCriteriaReport> {

  // Combine local encounter codes with FHIR-sourced ICD-10 codes
  const localCodes = [...encounter.diagnosisCodes, ...encounter.sdohZCodes];
  const fhirCodes = fhirConditionsBundle ? extractCodesFromBundle(fhirConditionsBundle) : [];
  const allCodes = Array.from(new Set([...localCodes, ...fhirCodes]));

  // 1. Homelessness
  const homelessZMatches = allCodes.filter(c => HOMELESS_Z_CODES.has(c));
  const isUnhoused = patient.housingStatus === "unhoused" || patient.housingStatus === "homeless";
  const homelessMet = homelessZMatches.length > 0 || isUnhoused || encounter.posCode === "27";
  const homelessEvidence: string[] = [];
  if (isUnhoused) homelessEvidence.push(`Housing status: ${patient.housingStatus}`);
  if (encounter.posCode === "27") homelessEvidence.push("POS 27 — encounter at street/found environment");
  homelessEvidence.push(...homelessZMatches.map(c => `Z-code: ${c}`));

  // 2. Serious Mental Illness
  const smiCodes = allCodes.filter(c => startsWithAny(c, SMI_PREFIXES));
  const smiMet = smiCodes.length > 0;

  // 3. Substance Use Disorder
  const sudCodes = allCodes.filter(c => startsWithAny(c, SUD_PREFIXES));
  const sudMet = sudCodes.length > 0;

  // 4. Complex Chronic Conditions (2+ distinct categories)
  const chronicMatches: string[] = [];
  const seenCategories = new Set<string>();
  for (const code of allCodes) {
    for (const [prefix, label] of Object.entries(CHRONIC_CONDITION_PREFIXES)) {
      if (code.startsWith(prefix) && !seenCategories.has(prefix)) {
        seenCategories.add(prefix);
        chronicMatches.push(`${code} (${label})`);
      }
    }
  }
  const complexChronicMet = seenCategories.size >= 2;

  // 5. High Utilizer — ADT status signals
  const highUtilizerMet = patient.adtStatus === "high_utilizer" || patient.adtStatus === "frequent_ed";
  const highUtilizerEvidence = highUtilizerMet ? [`ADT status: ${patient.adtStatus}`] : [];

  // 6. Justice Involvement
  const justiceCodes = allCodes.filter(c => JUSTICE_Z_CODES.has(c));
  const justiceMet = justiceCodes.length > 0;

  // 7. Foster Care
  const fosterCodes = allCodes.filter(c => FOSTER_CARE_Z_CODES.has(c));
  const fosterMet = fosterCodes.length > 0;

  // Build populations list
  const populationsOfFocus: string[] = [];
  if (homelessMet) populationsOfFocus.push("Experiencing or At Risk of Homelessness");
  if (smiMet) populationsOfFocus.push("Serious Mental Illness / SED");
  if (sudMet) populationsOfFocus.push("Substance Use Disorder");
  if (complexChronicMet) populationsOfFocus.push("Complex Chronic Conditions");
  if (highUtilizerMet) populationsOfFocus.push("High Utilizer of Multiple Systems");
  if (justiceMet) populationsOfFocus.push("Criminal Justice Involvement");
  if (fosterMet) populationsOfFocus.push("Children/Youth in Foster Care");

  const eligibilityStatus = populationsOfFocus.length > 0 ? "eligible" : "not_eligible";

  return {
    populationsOfFocus,
    criteria: {
      homelessness: {
        met: homelessMet,
        evidence: homelessEvidence,
        description: "Experiencing or At Risk of Homelessness (Z59.x, POS 27, housing status)",
      },
      smi: {
        met: smiMet,
        evidence: smiCodes,
        description: "Serious Mental Illness / Serious Emotional Disturbance (F20–F33, F84)",
      },
      sud: {
        met: sudMet,
        evidence: sudCodes,
        description: "Substance Use Disorder — Medi-Cal covered (F10–F19)",
      },
      complexChronic: {
        met: complexChronicMet,
        evidence: chronicMatches,
        description: `Complex Chronic Conditions — 2+ categories required (found ${seenCategories.size})`,
      },
      highUtilizer: {
        met: highUtilizerMet,
        evidence: highUtilizerEvidence,
        description: "High Utilizer of Multiple Systems (ADT status flag)",
      },
      justiceInvolvement: {
        met: justiceMet,
        evidence: justiceCodes,
        description: "Involvement with Criminal Justice System (Z65.0–Z65.4)",
      },
      fosterCare: {
        met: fosterMet,
        evidence: fosterCodes,
        description: "Children/Youth in Foster Care (Z62.21–Z62.22)",
      },
    },
    eligibilityStatus,
    allCodes,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screening entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function screenEncounterForEcm(encounterId: number): Promise<{
  encounter: Encounter;
  patient: Patient;
  report: EcmCriteriaReport;
  fhirConditionsBundle: FhirBundle | null;
}> {
  const [encounter] = await db
    .select()
    .from(encountersTable)
    .where(eq(encountersTable.id, encounterId))
    .limit(1);

  if (!encounter) throw new Error(`Encounter ${encounterId} not found`);

  const [patient] = await db
    .select()
    .from(patientsTable)
    .where(eq(patientsTable.id, encounter.patientId))
    .limit(1);

  if (!patient) throw new Error(`Patient ${encounter.patientId} not found`);

  // Pull FHIR conditions from athenahealth if patient has an athena ID
  let fhirConditionsBundle: FhirBundle | null = null;
  if (patient.athenaPatientId) {
    try {
      fhirConditionsBundle = await getConditions({
        patient: patient.athenaPatientId,
        "clinical-status": "active",
        _count: "100",
      });
    } catch {
      // Non-fatal — proceed with local codes only
      fhirConditionsBundle = null;
    }
  }

  const report = await evaluateEcmCriteria(encounter, patient, fhirConditionsBundle);
  return { encounter, patient, report, fhirConditionsBundle };
}
