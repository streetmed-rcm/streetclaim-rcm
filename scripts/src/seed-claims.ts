import { db, claimsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * Claims seed using real 2025 CMS Medicare Physician Fee Schedule rates
 * and California Medi-Cal 2024 Targeted Rate Increase (TRI) rates.
 *
 * Sources:
 *  - CMS CY 2025 MPFS Final Rule; Conversion Factor: $32.3465
 *    https://www.cms.gov/medicare/payment/fee-schedules/physician
 *  - CMS POS 27 (Outreach Site/Street) — CR 13314, effective Oct 1, 2023
 *    Non-facility rate applies; processed same as POS 12 (Home)
 *  - California DHCS Medi-Cal TRI — SPA 23-0035 (AB 118 / Budget Act 2023)
 *    Rates ≥ 87.5% of Medicare non-facility (Prop 35 permanent floor)
 *    https://www.dhcs.ca.gov/Pages/Medi-Cal-Targeted-Provider-Rate-Increases.aspx
 *  - Denial rates: Premier Inc. survey 2024; Experian/Becker's 2024 (2,100+ hospitals)
 */

const CONVERSION_FACTOR = 32.3465;

const PAYER_TYPES = ["medi_cal", "medicare", "managed_care", "private"] as const;
const POS_CODES = ["11", "27"] as const;
const EM_CODES = ["99211", "99212", "99213", "99214", "99215"] as const;
const STATUSES = ["submitted", "paid", "denied", "appealed"] as const;

const SDOH_Z_CODES = [
  "Z59.0", "Z59.1", "Z59.2", "Z59.3",
  "Z60.0", "Z60.2", "Z63.8",
  "Z55.0", "Z56.0", "Z57.1",
  "Z72.3", "Z76.4",
];

/**
 * 2025 CMS MPFS RVUs (national, unadjusted)
 * Non-facility total RVU = workRVU + nonFacPeRVU + mpRVU
 * Facility total RVU    = workRVU + facPeRVU + mpRVU
 *
 * POS 27 → non-facility rate (CR 13314)
 * POS 11 (baseline, pre-POS-27 era) → facility rate used here to model
 *   the revenue gap from miscoding street visits as POS 22 (outpatient hospital)
 */
const RVU_TABLE: Record<string, { nonFac: number; fac: number }> = {
  "99211": { nonFac: 0.64, fac: 0.50 },
  "99212": { nonFac: 1.76, fac: 1.19 },
  "99213": { nonFac: 2.86, fac: 1.84 },
  "99214": { nonFac: 4.14, fac: 2.63 },
  "99215": { nonFac: 5.80, fac: 3.83 },
};

function getMedicareBilledRate(posCode: string, emCode: string): number {
  const rvu = RVU_TABLE[emCode];
  const totalRvu = posCode === "27" ? rvu.nonFac : rvu.fac;
  return Math.round(totalRvu * CONVERSION_FACTOR * 100) / 100;
}

function getMediCalBilledRate(posCode: string, emCode: string): number {
  return Math.round(getMedicareBilledRate(posCode, emCode) * 0.875 * 100) / 100;
}

/**
 * Collection rates derived from real 2024-2025 payer denial data:
 *
 * Medicare FFS: 80% of approved amount (statutory 80/20 split).
 *   Source: CMS Medicare payment rules (Part B)
 *
 * Medi-Cal: 87.5% of Medicare non-facility rate (no coinsurance split).
 *   Source: DHCS SPA 23-0035; Prop 35 guaranteed floor
 *
 * Managed Care: 83.3% collection (16.7% initial denial rate).
 *   Source: Premier Inc. 2024 — Medicaid MCO 16.7%; MA 15.7%
 *
 * Private/Commercial: 86.1% (13.9% initial denial rate).
 *   Source: Premier Inc. 2024 — Commercial payer 13.9%
 */
const COLLECTION_RATES: Record<string, number> = {
  medi_cal: 0.875,
  medicare: 0.80,
  managed_care: 0.833,
  private: 0.861,
};

function getBilledRate(payer: string, posCode: string, emCode: string): number {
  if (payer === "medi_cal") return getMediCalBilledRate(posCode, emCode);
  return getMedicareBilledRate(posCode, emCode);
}

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

async function seedClaims() {
  const rand = rng(42);

  await db.execute(sql`TRUNCATE TABLE claims RESTART IDENTITY`);

  const claims: {
    claimNumber: string;
    payerType: string;
    posCode: string;
    emCode: string;
    sdohZCodes: string[];
    billedAmount: string;
    collectedAmount: string;
    status: string;
    hasZCodes: boolean;
  }[] = [];

  /**
   * Payer/POS distribution reflects real street medicine payer mix in California:
   * - Medi-Cal is the dominant payer (~60% of unhoused patients in CA)
   * - Medicare covers ~25% (dual-eligibles, older adults)
   * - Managed Care / private fill the remainder
   * - POS 27 volume is higher, representing proper coding adoption
   */
  const payerDistribution: Array<{ payer: string; pos: string; count: number }> = [
    { payer: "medi_cal",     pos: "27", count: 90 },
    { payer: "medi_cal",     pos: "11", count: 30 },
    { payer: "medicare",     pos: "27", count: 72 },
    { payer: "medicare",     pos: "11", count: 23 },
    { payer: "managed_care", pos: "27", count: 56 },
    { payer: "managed_care", pos: "11", count: 18 },
    { payer: "private",      pos: "27", count: 32 },
    { payer: "private",      pos: "11", count: 10 },
  ];

  let idx = 1;
  for (const { payer, pos, count } of payerDistribution) {
    for (let i = 0; i < count; i++) {
      const emCode = EM_CODES[Math.floor(rand() * EM_CODES.length)];
      const billed = getBilledRate(payer, pos, emCode);

      const hasZCodes = pos === "27" ? rand() > 0.22 : rand() > 0.95;
      const zCodes: string[] = [];
      if (hasZCodes) {
        const zCount = 1 + Math.floor(rand() * 3);
        for (let z = 0; z < zCount; z++) {
          const code = SDOH_Z_CODES[Math.floor(rand() * SDOH_Z_CODES.length)];
          if (!zCodes.includes(code)) zCodes.push(code);
        }
      }

      const collectionRate = COLLECTION_RATES[payer];
      const collected = billed * collectionRate * (0.92 + rand() * 0.1);
      const status = STATUSES[Math.floor(rand() * STATUSES.length)];

      claims.push({
        claimNumber: `CLM-${String(idx).padStart(5, "0")}`,
        payerType: payer,
        posCode: pos,
        emCode,
        sdohZCodes: zCodes,
        billedAmount: billed.toFixed(2),
        collectedAmount: collected.toFixed(2),
        status,
        hasZCodes,
      });
      idx++;
    }
  }

  const batchSize = 50;
  for (let i = 0; i < claims.length; i += batchSize) {
    await db.insert(claimsTable).values(claims.slice(i, i + batchSize));
  }

  console.log(`\nSeeded ${claims.length} claims with real 2025 CMS MPFS rates`);
  console.log(`CMS Conversion Factor: $${CONVERSION_FACTOR}`);
  console.log(`Medi-Cal TRI: ≥87.5% of Medicare non-facility (SPA 23-0035)\n`);

  const summary = payerDistribution.map((d) => {
    const subset = claims.filter(
      (c) => c.payerType === d.payer && c.posCode === d.pos,
    );
    const totalBilled = subset.reduce(
      (sum, c) => sum + parseFloat(c.billedAmount),
      0,
    );
    const totalCollected = subset.reduce(
      (sum, c) => sum + parseFloat(c.collectedAmount),
      0,
    );
    const avgBilled = totalBilled / subset.length;
    return `  ${d.payer.padEnd(12)} POS ${d.pos} (${String(subset.length).padStart(2)} claims):  avg $${avgBilled.toFixed(2)}/claim  collected $${totalCollected.toFixed(0)}`;
  });
  console.log(summary.join("\n"));
  console.log();

  process.exit(0);
}

seedClaims().catch((err) => {
  console.error(err);
  process.exit(1);
});
