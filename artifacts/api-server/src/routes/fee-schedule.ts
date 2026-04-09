import { Router, type IRouter } from "express";

const router: IRouter = Router();

/**
 * 2025 CMS Medicare Physician Fee Schedule (MPFS) — National Unadjusted Rates
 * Source: CMS CY 2025 MPFS Final Rule; Conversion Factor: $32.3465
 * POS 27 (Outreach Site/Street) → Non-Facility rate (same as POS 11/12)
 * Established per CMS Change Request 13314, effective Oct 1 2023
 *
 * Medi-Cal TRI (2024 Targeted Rate Increase) — DHCS SPA 23-0035
 * California AB 118 / Budget Act 2023: rates ≥ 87.5% of Medicare non-facility
 * Proposition 35 (2024) locked these rates in as the permanent floor
 *
 * CHW Codes: G0019 / G0022 — CMS finalized CY 2024 MPFS (effective Jan 1, 2024)
 * Chronic Care Management: 99490 / 99439 — CMS CY 2017 MPFS
 * Transitional Care: 99495 / 99496 — CMS CY 2013 MPFS
 * BH Integration: 99484 — CMS CY 2017 MPFS
 */

const CONVERSION_FACTOR_2025 = 32.3465;

interface CptEntry {
  code: string;
  description: string;
  category: string;
  patientType: string;
  mdmLevel: string;
  workRvu: number;
  nonFacPeRvu: number;
  facPeRvu: number;
  mpRvu: number;
  totalNonFacRvu: number;
  totalFacRvu: number;
  medicareNonFac: number;
  medicareFac: number;
  mediCalTri: number;
  mediCalFacilityEra: number;
  pos27Eligible: boolean;
  notes: string;
}

const MPFS_2025: CptEntry[] = [
  // ─── E&M — New Patient ────────────────────────────────────────────────────
  {
    code: "99202",
    description: "Office/outpatient visit, new patient — straightforward MDM",
    category: "E&M",
    patientType: "new",
    mdmLevel: "straightforward",
    workRvu: 0.93,
    nonFacPeRvu: 1.25,
    facPeRvu: 0.55,
    mpRvu: 0.05,
    totalNonFacRvu: 2.23,
    totalFacRvu: 1.53,
    medicareNonFac: Math.round(2.23 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(1.53 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(2.23 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(1.53 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "POS 27 non-facility rate applies; common for first street medicine encounters",
  },
  {
    code: "99203",
    description: "Office/outpatient visit, new patient — low MDM",
    category: "E&M",
    patientType: "new",
    mdmLevel: "low",
    workRvu: 1.60,
    nonFacPeRvu: 1.77,
    facPeRvu: 0.65,
    mpRvu: 0.08,
    totalNonFacRvu: 3.45,
    totalFacRvu: 2.33,
    medicareNonFac: Math.round(3.45 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(2.33 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(3.45 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(2.33 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Typical new unhoused patient with chronic condition",
  },
  {
    code: "99204",
    description: "Office/outpatient visit, new patient — moderate MDM",
    category: "E&M",
    patientType: "new",
    mdmLevel: "moderate",
    workRvu: 2.60,
    nonFacPeRvu: 2.66,
    facPeRvu: 0.79,
    mpRvu: 0.13,
    totalNonFacRvu: 5.39,
    totalFacRvu: 3.52,
    medicareNonFac: Math.round(5.39 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(3.52 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(5.39 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(3.52 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Multiple uncontrolled chronic conditions + SDoH complexity",
  },
  {
    code: "99205",
    description: "Office/outpatient visit, new patient — high MDM",
    category: "E&M",
    patientType: "new",
    mdmLevel: "high",
    workRvu: 3.50,
    nonFacPeRvu: 3.34,
    facPeRvu: 0.98,
    mpRvu: 0.18,
    totalNonFacRvu: 7.02,
    totalFacRvu: 4.66,
    medicareNonFac: Math.round(7.02 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(4.66 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(7.02 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(4.66 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "High complexity — overdose, sepsis, uncontrolled DM+HTN+MH comorbidities",
  },

  // ─── E&M — Established Patient ────────────────────────────────────────────
  {
    code: "99211",
    description: "Office/outpatient visit, established patient — minimal complexity",
    category: "E&M",
    patientType: "established",
    mdmLevel: "minimal",
    workRvu: 0.18,
    nonFacPeRvu: 0.45,
    facPeRvu: 0.31,
    mpRvu: 0.01,
    totalNonFacRvu: 0.64,
    totalFacRvu: 0.50,
    medicareNonFac: Math.round(0.64 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(0.50 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(0.64 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(0.50 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Medication check, wound check — nurse-supervised",
  },
  {
    code: "99212",
    description: "Office/outpatient visit, established patient — straightforward MDM",
    category: "E&M",
    patientType: "established",
    mdmLevel: "straightforward",
    workRvu: 0.70,
    nonFacPeRvu: 1.02,
    facPeRvu: 0.45,
    mpRvu: 0.04,
    totalNonFacRvu: 1.76,
    totalFacRvu: 1.19,
    medicareNonFac: Math.round(1.76 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(1.19 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(1.76 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(1.19 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Routine follow-up — stable chronic condition",
  },
  {
    code: "99213",
    description: "Office/outpatient visit, established patient — low-moderate MDM",
    category: "E&M",
    patientType: "established",
    mdmLevel: "low",
    workRvu: 1.30,
    nonFacPeRvu: 1.49,
    facPeRvu: 0.47,
    mpRvu: 0.07,
    totalNonFacRvu: 2.86,
    totalFacRvu: 1.84,
    medicareNonFac: Math.round(2.86 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(1.84 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(2.86 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(1.84 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Most common established patient level in street medicine",
  },
  {
    code: "99214",
    description: "Office/outpatient visit, established patient — moderate MDM",
    category: "E&M",
    patientType: "established",
    mdmLevel: "moderate",
    workRvu: 1.92,
    nonFacPeRvu: 2.12,
    facPeRvu: 0.61,
    mpRvu: 0.10,
    totalNonFacRvu: 4.14,
    totalFacRvu: 2.63,
    medicareNonFac: Math.round(4.14 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(2.63 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(4.14 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(2.63 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Multiple chronic conditions with SDoH barriers — typical street medicine complexity",
  },
  {
    code: "99215",
    description: "Office/outpatient visit, established patient — high MDM",
    category: "E&M",
    patientType: "established",
    mdmLevel: "high",
    workRvu: 2.80,
    nonFacPeRvu: 2.86,
    facPeRvu: 0.89,
    mpRvu: 0.14,
    totalNonFacRvu: 5.80,
    totalFacRvu: 3.83,
    medicareNonFac: Math.round(5.80 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(3.83 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(5.80 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(3.83 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Overdose management, polysubstance, severe MH episodes",
  },

  // ─── CHW — Community Health Worker Services (CY 2024 MPFS) ───────────────
  {
    code: "G0019",
    description: "Community health worker services — chronic condition(s) support, per 15 min",
    category: "CHW",
    patientType: "any",
    mdmLevel: "n/a",
    workRvu: 0.45,
    nonFacPeRvu: 0.52,
    facPeRvu: 0.32,
    mpRvu: 0.02,
    totalNonFacRvu: 0.99,
    totalFacRvu: 0.79,
    medicareNonFac: Math.round(0.99 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(0.79 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(0.99 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(0.79 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Billable per 15-min increment. Requires CHW employed/directed by practitioner. Min 20 min/month for first bill. Key for street medicine CHW teams.",
  },
  {
    code: "G0022",
    description: "Community health worker services — social needs screening + referral, per encounter",
    category: "CHW",
    patientType: "any",
    mdmLevel: "n/a",
    workRvu: 0.61,
    nonFacPeRvu: 0.68,
    facPeRvu: 0.41,
    mpRvu: 0.03,
    totalNonFacRvu: 1.32,
    totalFacRvu: 1.05,
    medicareNonFac: Math.round(1.32 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(1.05 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(1.32 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(1.05 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Social needs screening (AHC HRSN tool), navigation, and community referrals. Bill once per qualifying encounter.",
  },

  // ─── Chronic Care Management ──────────────────────────────────────────────
  {
    code: "99490",
    description: "Chronic care management — first 20 min clinical staff time/month",
    category: "CCM",
    patientType: "established",
    mdmLevel: "n/a",
    workRvu: 0.54,
    nonFacPeRvu: 1.14,
    facPeRvu: 0.55,
    mpRvu: 0.03,
    totalNonFacRvu: 1.71,
    totalFacRvu: 1.12,
    medicareNonFac: Math.round(1.71 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(1.12 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(1.71 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(1.12 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "≥2 chronic conditions expected to last 12+ months. Requires care plan + 24/7 access. Billable monthly.",
  },
  {
    code: "99439",
    description: "Chronic care management — each additional 20 min/month (add-on)",
    category: "CCM",
    patientType: "established",
    mdmLevel: "n/a",
    workRvu: 0.54,
    nonFacPeRvu: 0.88,
    facPeRvu: 0.41,
    mpRvu: 0.03,
    totalNonFacRvu: 1.45,
    totalFacRvu: 0.98,
    medicareNonFac: Math.round(1.45 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(0.98 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(1.45 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(0.98 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Add-on to 99490. Bill up to 2×/month. High complexity patients often require 60+ min.",
  },

  // ─── Transitional Care Management ─────────────────────────────────────────
  {
    code: "99495",
    description: "Transitional care management — moderate complexity, 14-day follow-up",
    category: "TCM",
    patientType: "established",
    mdmLevel: "moderate",
    workRvu: 2.11,
    nonFacPeRvu: 2.88,
    facPeRvu: 1.00,
    mpRvu: 0.11,
    totalNonFacRvu: 5.10,
    totalFacRvu: 3.22,
    medicareNonFac: Math.round(5.10 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(3.22 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(5.10 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(3.22 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Post-hospitalization. Requires interactive contact within 2 bus days + face-to-face within 14 days. Critical for patients discharged to streets.",
  },
  {
    code: "99496",
    description: "Transitional care management — high complexity, 7-day follow-up",
    category: "TCM",
    patientType: "established",
    mdmLevel: "high",
    workRvu: 3.05,
    nonFacPeRvu: 3.89,
    facPeRvu: 1.32,
    mpRvu: 0.15,
    totalNonFacRvu: 7.09,
    totalFacRvu: 4.52,
    medicareNonFac: Math.round(7.09 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(4.52 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(7.09 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(4.52 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "High complexity post-discharge. Face-to-face within 7 days. Common after OD hospitalizations — critical street medicine touchpoint.",
  },

  // ─── BH Integration & Care Management ─────────────────────────────────────
  {
    code: "99484",
    description: "Behavioral health integration care management, first 20 min/month",
    category: "BH",
    patientType: "any",
    mdmLevel: "n/a",
    workRvu: 0.61,
    nonFacPeRvu: 1.22,
    facPeRvu: 0.58,
    mpRvu: 0.03,
    totalNonFacRvu: 1.86,
    totalFacRvu: 1.22,
    medicareNonFac: Math.round(1.86 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(1.22 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(1.86 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(1.22 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "BH care manager services — depression/anxiety/SUD. Requires registry, systematic follow-up, psychiatric consultation. Pair with G0019 for CHW support.",
  },

  // ─── Substance Use Disorder ───────────────────────────────────────────────
  {
    code: "H0048",
    description: "Alcohol/drug screening — brief intervention and referral to treatment (SBIRT)",
    category: "SUD",
    patientType: "any",
    mdmLevel: "n/a",
    workRvu: 0.24,
    nonFacPeRvu: 0.31,
    facPeRvu: 0.18,
    mpRvu: 0.01,
    totalNonFacRvu: 0.56,
    totalFacRvu: 0.37,
    medicareNonFac: Math.round(0.56 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(0.37 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(0.56 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(0.37 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Medi-Cal SBIRT — brief screening + counseling. Bill per occurrence. Common adjunct to POS 27 E&M in overdose-risk populations.",
  },
  {
    code: "99408",
    description: "Alcohol/drug screening + brief intervention, 15–30 min",
    category: "SUD",
    patientType: "any",
    mdmLevel: "n/a",
    workRvu: 0.58,
    nonFacPeRvu: 0.75,
    facPeRvu: 0.34,
    mpRvu: 0.03,
    totalNonFacRvu: 1.36,
    totalFacRvu: 0.95,
    medicareNonFac: Math.round(1.36 * CONVERSION_FACTOR_2025 * 100) / 100,
    medicareFac: Math.round(0.95 * CONVERSION_FACTOR_2025 * 100) / 100,
    mediCalTri: Math.round(1.36 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    mediCalFacilityEra: Math.round(0.95 * CONVERSION_FACTOR_2025 * 0.875 * 100) / 100,
    pos27Eligible: true,
    notes: "Medicare SBIRT (15-30 min). Bill in addition to E&M when substance use screening is a primary service.",
  },
];

const DENIAL_RATES = {
  medicare: {
    rate: 0.118,
    source: "Experian Health / Becker's 2024 — overall industry initial denial rate",
    effectiveCollection: 0.80,
    note: "Medicare pays 80% of approved amount; 20% cost-share from patient/secondary",
  },
  medi_cal: {
    rate: 0.083,
    source: "DHCS SPA 23-0035; Medi-Cal TRI — guaranteed floor ≥87.5% of Medicare non-facility",
    effectiveCollection: 0.875,
    note: "No coinsurance split; Medi-Cal pays 87.5% of Medicare non-facility rate directly",
  },
  managed_care: {
    rate: 0.167,
    source: "Premier Inc. survey 2024 — Medicaid Managed Care initial denial rate 16.7%",
    effectiveCollection: 0.833,
    note: "Medicare Advantage denial rate 15.7%; Medicaid MCO 16.7% per Premier 2024 survey",
  },
  private: {
    rate: 0.139,
    source: "Premier Inc. survey 2024 — Commercial/private payer initial denial rate 13.9%",
    effectiveCollection: 0.861,
    note: "ACA Marketplace plans ~19%; broader commercial average 13.9%",
  },
};

const POS_CODES = [
  { code: "27", label: "Outreach Site/Street", description: "Mandatory for outdoor encampment encounters. Non-facility rate applies (same as POS 11). Effective Oct 1, 2023 per CMS CR 13314.", recommended: true },
  { code: "04", label: "Shelter", description: "Emergency/transitional shelter encounters. Use when care is delivered inside a shelter building.", recommended: false },
  { code: "15", label: "Mobile Unit", description: "Care delivered from a mobile van or vehicle. Non-facility rate applies.", recommended: false },
  { code: "11", label: "Office", description: "Traditional clinic setting. Baseline for rate comparison.", recommended: false },
  { code: "22", label: "Outpatient Hospital (legacy)", description: "Pre-POS-27 era — many street claims were miscoded here, receiving lower facility rate. Avoid for street encounters.", recommended: false },
];

const SDOH_Z_CODES = [
  // Housing
  { code: "Z59.0", description: "Homelessness — unspecified", category: "Housing", severity: "high", billingImpact: "Justifies medical necessity for street encounter; required for CalAIM ECM qualification" },
  { code: "Z59.01", description: "Sheltered homelessness (shelter, hotel, couch-surfing)", category: "Housing", severity: "high", billingImpact: "Required for POS 04 (shelter) encounters; ECM Population of Focus #1" },
  { code: "Z59.02", description: "Unsheltered homelessness (street, encampment, vehicle)", category: "Housing", severity: "critical", billingImpact: "Primary code for POS 27 encounters — use on every street medicine claim; highest ECM priority" },
  { code: "Z59.1", description: "Inadequate housing (overcrowding, utilities lacking)", category: "Housing", severity: "moderate", billingImpact: "Use when patient housed but conditions are hazardous" },
  { code: "Z59.3", description: "Problems related to living in residential institution", category: "Housing", severity: "moderate", billingImpact: "Sober living, board-and-care, skilled nursing transitions" },
  // Food / Nutrition
  { code: "Z59.4", description: "Lack of adequate food — food insecurity", category: "Food", severity: "high", billingImpact: "Supports medical necessity for wound care complications, malnutrition-related DM management" },
  // Economic
  { code: "Z59.5", description: "Extreme poverty", category: "Economic", severity: "high", billingImpact: "Medi-Cal presumptive eligibility trigger; ECM social needs documentation" },
  { code: "Z56.0", description: "Unemployment, unspecified", category: "Employment", severity: "moderate", billingImpact: "Contextual complexity documentation" },
  // Social
  { code: "Z60.0", description: "Problems of adjustment to life-cycle transitions", category: "Social", severity: "moderate", billingImpact: "Reentry from incarceration, foster care aging out" },
  { code: "Z60.2", description: "Problems related to living alone", category: "Social", severity: "low", billingImpact: "Supports chronic care management billing" },
  { code: "Z62.810", description: "Personal history of physical abuse in childhood", category: "Trauma", severity: "high", billingImpact: "Trauma-informed care documentation; BH complexity" },
  // Substance Use / OD
  { code: "Z87.891", description: "Personal history of nicotine dependence", category: "SUD History", severity: "low", billingImpact: "Tobacco cessation counseling documentation" },
  { code: "F11.10", description: "Opioid use disorder, uncomplicated", category: "SUD Active", severity: "critical", billingImpact: "MOUD billing; ECM Population of Focus #2; HRVM high-priority flag" },
  { code: "T40.1X1A", description: "Poisoning by heroin, accidental — initial encounter", category: "Overdose", severity: "critical", billingImpact: "Post-OD TCM (99496); highest HRVM risk scoring; mandatory for OD response reporting" },
  // Access
  { code: "Z76.4", description: "Health services not provided due to other organizations", category: "Access", severity: "moderate", billingImpact: "Documents care gaps; supports ECM enrollment justification" },
  { code: "Z75.3", description: "Unavailability or inaccessibility of healthcare facilities", category: "Access", severity: "high", billingImpact: "Core SDoH documentation for street medicine medical necessity" },
  // MH
  { code: "Z13.89", description: "Encounter for screening of other disorders — mental health", category: "MH Screening", severity: "moderate", billingImpact: "Annual depression/anxiety screening; PHQ-9 / GAD-7 pairable with G0019 CHW support" },
];

router.get("/fee-schedule", (_req, res) => {
  res.json({
    metadata: {
      title: "2025 CMS Medicare Physician Fee Schedule + CA Medi-Cal TRI — Street Medicine Edition",
      conversionFactor: CONVERSION_FACTOR_2025,
      effectiveDate: "2025-01-01",
      lastUpdated: "2026-04-09",
      sources: [
        {
          name: "CMS CY 2025 Medicare Physician Fee Schedule Final Rule",
          url: "https://www.cms.gov/medicare/payment/fee-schedules/physician",
          note: "National unadjusted rates; geographic GPCI adjusters apply by locality",
        },
        {
          name: "CMS POS 27 — Outreach Site/Street (CR 13314)",
          url: "https://www.cms.gov/medicare/payment/fee-schedules",
          note: "POS 27 effective Oct 1, 2023 — non-facility rate applies (same as POS 11/12)",
        },
        {
          name: "California DHCS Medi-Cal Targeted Rate Increase (TRI) — SPA 23-0035",
          url: "https://www.dhcs.ca.gov/Pages/Medi-Cal-Targeted-Provider-Rate-Increases.aspx",
          note: "AB 118 / Budget Act 2023; Prop 35 (2024) locked TRI as permanent floor. Rates ≥87.5% of Medicare.",
        },
        {
          name: "CMS CY 2024 MPFS Final Rule — CHW Codes G0019 / G0022",
          url: "https://www.cms.gov/medicare/payment/fee-schedules/physician",
          note: "Community Health Worker billing codes effective Jan 1, 2024. CHW must be employed/directed by the billing practitioner.",
        },
        {
          name: "California APL 22-023 — Street Medicine Enrollment (No Physical Office Required)",
          url: "https://www.dhcs.ca.gov/formsandpubs/Pages/AllPlanLetters.aspx",
          note: "Removes physical office requirement for Medi-Cal enrollment. Use admin billing address + POS 27 service location.",
        },
      ],
      posExplainer: {
        pos27: "Outreach Site/Street — non-facility rate applies. Authorized for street medicine providers treating unhoused individuals. Same RVU basis as POS 11 (office) and POS 12 (home). CMS CR 13314 effective Oct 1, 2023.",
        pos04: "Shelter — use when care is delivered inside a shelter or transitional housing facility.",
        pos15: "Mobile Unit — use when care is delivered from a mobile clinic vehicle.",
        pos11: "Office/clinic — baseline for rate comparison. POS 27 now matches this non-facility rate.",
        facEra: "Pre-POS-27 era — street claims miscoded as POS 22 (outpatient hospital) received the lower facility rate. POS 27 closed this revenue gap nationally (Oct 2023).",
      },
      programContext: {
        uspSource: "USC Street Medicine — Brett Feldman MD, Director & Co-Founder",
        monthlyVisits: "1,000 visits/month (January 2024 — first ever milestone)",
        teamComposition: "MD/NP + RN + 2 CHWs per team; 5 fully-staffed LA teams",
        reimbursementImpact: ">70% of street care went un-reimbursed before POS 27 (Oct 2023)",
        chwBillingNote: "G0019/G0022 enable direct CHW billing — each team's 2 CHWs now generate ~$1,200–$2,400/month in additional reimbursement",
        californiaTRI: "Medi-Cal TRI (Prop 35 permanent floor) guarantees ≥87.5% of Medicare non-facility for street medicine providers",
      },
    },
    posCodes: POS_CODES,
    rates: MPFS_2025,
    denialRates: DENIAL_RATES,
    sdohZCodes: SDOH_Z_CODES,
  });
});

export { MPFS_2025, DENIAL_RATES, CONVERSION_FACTOR_2025 };
export default router;
