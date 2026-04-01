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
 */

const CONVERSION_FACTOR_2025 = 32.3465;

interface CptEntry {
  code: string;
  description: string;
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
}

const MPFS_2025: CptEntry[] = [
  {
    code: "99211",
    description: "Office/outpatient visit, established patient — minimal complexity",
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
  },
  {
    code: "99212",
    description: "Office/outpatient visit, established patient — straightforward MDM",
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
  },
  {
    code: "99213",
    description: "Office/outpatient visit, established patient — low-moderate MDM",
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
  },
  {
    code: "99214",
    description: "Office/outpatient visit, established patient — moderate MDM",
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
  },
  {
    code: "99215",
    description: "Office/outpatient visit, established patient — high MDM",
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

router.get("/fee-schedule", (_req, res) => {
  res.json({
    metadata: {
      title: "2025 CMS Medicare Physician Fee Schedule + California Medi-Cal TRI Rates",
      conversionFactor: CONVERSION_FACTOR_2025,
      effectiveDate: "2025-01-01",
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
      ],
      posExplainer: {
        pos27: "Outreach Site/Street — non-facility rate applies. Authorized for street medicine providers treating unhoused individuals. Same RVU basis as POS 11 (office) and POS 12 (home).",
        pos11: "Office/clinic — non-facility rate. Baseline for comparison.",
        facEra: "Pre-POS-27 era — many street medicine claims were miscoded as POS 22 (outpatient hospital) and received the lower facility rate. POS 27 closes this revenue gap.",
      },
    },
    rates: MPFS_2025,
    denialRates: DENIAL_RATES,
    sdohZCodes: [
      { code: "Z59.0", description: "Homelessness — unsheltered", category: "Housing" },
      { code: "Z59.1", description: "Inadequate housing", category: "Housing" },
      { code: "Z59.2", description: "Discord with neighbors/lodgers/landlord", category: "Housing" },
      { code: "Z59.3", description: "Problems related to living in residential institution", category: "Housing" },
      { code: "Z60.0", description: "Problems of adjustment to life-cycle transitions", category: "Social" },
      { code: "Z60.2", description: "Problems related to living alone", category: "Social" },
      { code: "Z63.8", description: "Other specified problems related to primary support group", category: "Social" },
      { code: "Z55.0", description: "Illiteracy and low-level literacy", category: "Education" },
      { code: "Z56.0", description: "Unemployment, unspecified", category: "Employment" },
      { code: "Z57.1", description: "Occupational exposure to radiation", category: "Employment" },
      { code: "Z72.3", description: "Lack of physical exercise", category: "Lifestyle" },
      { code: "Z76.4", description: "Health services not provided due to other organizations", category: "Access" },
    ],
  });
});

export { MPFS_2025, DENIAL_RATES, CONVERSION_FACTOR_2025 };
export default router;
