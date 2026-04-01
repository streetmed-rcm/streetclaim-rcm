import { Router, type IRouter } from "express";
import { db, claimsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

const DENIAL_RECOVERY_RATE = 0.4;

interface PayerAggregate {
  payerType: string;
  posCode: string;
  billedAmount: number;
  collectedAmount: number;
  claimCount: number;
  zCodeCount: number;
}

async function getPayerAggregates(): Promise<PayerAggregate[]> {
  const rows = await db
    .select({
      payerType: claimsTable.payerType,
      posCode: claimsTable.posCode,
      billedAmount: sql<number>`COALESCE(SUM(${claimsTable.billedAmount}::numeric), 0)`,
      collectedAmount: sql<number>`COALESCE(SUM(${claimsTable.collectedAmount}::numeric), 0)`,
      claimCount: sql<number>`COUNT(*)`,
      zCodeCount: sql<number>`SUM(CASE WHEN ${claimsTable.hasZCodes} THEN 1 ELSE 0 END)`,
    })
    .from(claimsTable)
    .groupBy(claimsTable.payerType, claimsTable.posCode);

  return rows.map((r) => ({
    payerType: r.payerType,
    posCode: r.posCode,
    billedAmount: Number(r.billedAmount),
    collectedAmount: Number(r.collectedAmount),
    claimCount: Number(r.claimCount),
    zCodeCount: Number(r.zCodeCount),
  }));
}

router.get("/dashboard/revenue-lift", async (_req, res) => {
  try {
    const aggregates = await getPayerAggregates();

    const payerTypes = [...new Set(aggregates.map((a) => a.payerType))];

    const byPayer = payerTypes.map((payerType) => {
      const baseline = aggregates.find(
        (a) => a.payerType === payerType && a.posCode === "11",
      ) ?? {
        payerType,
        posCode: "11",
        billedAmount: 0,
        collectedAmount: 0,
        claimCount: 0,
        zCodeCount: 0,
      };

      const streetclaim = aggregates.find(
        (a) => a.payerType === payerType && a.posCode === "27",
      ) ?? {
        payerType,
        posCode: "27",
        billedAmount: 0,
        collectedAmount: 0,
        claimCount: 0,
        zCodeCount: 0,
      };

      const delta = streetclaim.billedAmount - baseline.billedAmount;
      const lift = delta * DENIAL_RECOVERY_RATE;
      const liftPercent =
        baseline.billedAmount > 0
          ? Math.round((lift / baseline.billedAmount) * 1000) / 10
          : 0;

      return {
        payerType,
        baselineRevenue: {
          billed: Math.round(baseline.billedAmount * 100) / 100,
          collected: Math.round(baseline.collectedAmount * 100) / 100,
        },
        streetclaimRevenue: {
          billed: Math.round(streetclaim.billedAmount * 100) / 100,
          collected: Math.round(streetclaim.collectedAmount * 100) / 100,
          zCodeClaims: streetclaim.zCodeCount,
        },
        lift: Math.round(lift * 100) / 100,
        liftPercent,
        claimCount: baseline.claimCount + streetclaim.claimCount,
      };
    });

    const totalBaselineBilled = byPayer.reduce(
      (sum, p) => sum + p.baselineRevenue.billed,
      0,
    );
    const totalBaselineCollected = byPayer.reduce(
      (sum, p) => sum + p.baselineRevenue.collected,
      0,
    );
    const totalStreetclaimBilled = byPayer.reduce(
      (sum, p) => sum + p.streetclaimRevenue.billed,
      0,
    );
    const totalStreetclaimCollected = byPayer.reduce(
      (sum, p) => sum + p.streetclaimRevenue.collected,
      0,
    );
    const totalDelta = totalStreetclaimBilled - totalBaselineBilled;
    const totalLift = totalDelta * DENIAL_RECOVERY_RATE;
    const totalLiftPercent =
      totalBaselineBilled > 0
        ? Math.round((totalLift / totalBaselineBilled) * 1000) / 10
        : 0;

    const totalClaims = aggregates.reduce((sum, a) => sum + a.claimCount, 0);
    const claimsWithZCodes = aggregates.reduce(
      (sum, a) => sum + a.zCodeCount,
      0,
    );

    res.json({
      baselineRevenue: Math.round(totalBaselineBilled * 100) / 100,
      streetclaimRevenue: Math.round(totalStreetclaimBilled * 100) / 100,
      lift: Math.round(totalLift * 100) / 100,
      liftPercent: totalLiftPercent,
      denialRecoveryRate: DENIAL_RECOVERY_RATE,
      totalClaims,
      claimsWithZCodes,
      segmentation: {
        baseline: {
          posCode: "11",
          totalBilled: Math.round(totalBaselineBilled * 100) / 100,
          totalCollected: Math.round(totalBaselineCollected * 100) / 100,
        },
        streetclaim: {
          posCode: "27",
          totalBilled: Math.round(totalStreetclaimBilled * 100) / 100,
          totalCollected: Math.round(totalStreetclaimCollected * 100) / 100,
          claimsWithZCodes,
        },
      },
      byPayer,
    });
  } catch (err) {
    console.error("revenue-lift error:", err);
    res.status(500).json({ error: "Failed to compute revenue lift" });
  }
});

export default router;
