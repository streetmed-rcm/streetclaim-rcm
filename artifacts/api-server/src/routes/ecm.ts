import { Router, type IRouter, type Request, type Response } from "express";
import { db, encountersTable, patientsTable, ecmScreeningsTable, ecmReferralsTable } from "@workspace/db";
import { eq, and, inArray, sql, count, isNotNull } from "drizzle-orm";
import { screenEncounterForEcm } from "../lib/athenaEcm.js";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function handleError(err: unknown, res: Response): void {
  const e = err as Error;
  console.error("[ECM]", e.message);
  res.status(500).json({ error: e.message ?? "Unexpected error" });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /ecm/screen/:encounterId
// Run ECM eligibility screening for a single POS 27 encounter.
// Pulls live FHIR Conditions from athenahealth (if patient has athena ID),
// evaluates all 7 CalAIM Population of Focus criteria, and persists the result.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ecm/screen/:encounterId", async (req: Request, res: Response) => {
  const encounterId = parseInt(req.params.encounterId, 10);
  if (isNaN(encounterId) || encounterId <= 0) {
    res.status(400).json({ error: "encounterId must be a positive integer" });
    return;
  }

  try {
    const { encounter, patient, report, fhirConditionsBundle } =
      await screenEncounterForEcm(encounterId);

    if (encounter.posCode !== "27") {
      res.status(422).json({
        error: `Encounter ${encounterId} has POS code ${encounter.posCode}, not 27. ECM screening is only applicable to POS 27 street encounters.`,
      });
      return;
    }

    // Upsert screening record
    const existing = await db
      .select()
      .from(ecmScreeningsTable)
      .where(eq(ecmScreeningsTable.encounterId, encounterId))
      .limit(1);

    const screeningPayload = {
      encounterId,
      patientId: patient.id,
      screenedAt: new Date(),
      screeningSource: (req.body as { source?: string }).source === "manual" ? "manual" : "auto",
      populationsOfFocus: report.populationsOfFocus,
      criteriaDetails: report.criteria as unknown as Record<string, unknown>,
      eligibilityStatus: report.eligibilityStatus,
      sdohZCodesSnapshot: encounter.sdohZCodes,
      fhirConditionsSnapshot: fhirConditionsBundle as unknown as Record<string, unknown> | null,
      updatedAt: new Date(),
    };

    let screeningId: number;
    if (existing.length > 0) {
      await db
        .update(ecmScreeningsTable)
        .set(screeningPayload)
        .where(eq(ecmScreeningsTable.encounterId, encounterId));
      screeningId = existing[0].id;
    } else {
      const [inserted] = await db
        .insert(ecmScreeningsTable)
        .values(screeningPayload)
        .returning({ id: ecmScreeningsTable.id });
      screeningId = inserted.id;
    }

    res.json({
      screeningId,
      encounterId,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      encounterDate: encounter.encounterDate,
      posCode: encounter.posCode,
      eligibilityStatus: report.eligibilityStatus,
      populationsOfFocus: report.populationsOfFocus,
      populationsCount: report.populationsOfFocus.length,
      fhirConditionsLoaded: fhirConditionsBundle !== null,
      criteria: report.criteria,
      allCodesEvaluated: report.allCodes,
      recommendation: report.eligibilityStatus === "eligible"
        ? `Refer to ECM — patient qualifies under ${report.populationsOfFocus.length} Population(s) of Focus`
        : "Patient does not currently meet ECM eligibility criteria",
    });
  } catch (err) {
    handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /ecm/screen/batch
// Screen all POS 27 encounters that have not yet been screened.
// Optional body: { encounterIds?: number[] } to screen a specific subset.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/ecm/screen/batch", async (req: Request, res: Response) => {
  const { encounterIds: requestedIds } = req.body as { encounterIds?: number[] };

  try {
    // Find unscreened POS 27 encounters
    const pos27 = await db
      .select({ id: encountersTable.id })
      .from(encountersTable)
      .where(eq(encountersTable.posCode, "27"));

    const alreadyScreened = await db
      .select({ encounterId: ecmScreeningsTable.encounterId })
      .from(ecmScreeningsTable);

    const screenedIds = new Set(alreadyScreened.map(s => s.encounterId));

    let toScreen = pos27
      .map(e => e.id)
      .filter(id => !screenedIds.has(id));

    if (requestedIds && requestedIds.length > 0) {
      const requested = new Set(requestedIds);
      toScreen = toScreen.filter(id => requested.has(id));
    }

    const results = [];
    for (const id of toScreen) {
      try {
        const { report, patient } = await screenEncounterForEcm(id);
        const [inserted] = await db
          .insert(ecmScreeningsTable)
          .values({
            encounterId: id,
            patientId: patient.id,
            screenedAt: new Date(),
            screeningSource: "auto",
            populationsOfFocus: report.populationsOfFocus,
            criteriaDetails: report.criteria as unknown as Record<string, unknown>,
            eligibilityStatus: report.eligibilityStatus,
            sdohZCodesSnapshot: [],
            updatedAt: new Date(),
          })
          .returning({ id: ecmScreeningsTable.id });

        results.push({
          encounterId: id,
          screeningId: inserted.id,
          eligibilityStatus: report.eligibilityStatus,
          populationsCount: report.populationsOfFocus.length,
          status: "screened",
        });
      } catch (err) {
        results.push({
          encounterId: id,
          status: "error",
          error: (err as Error).message,
        });
      }
    }

    const eligible = results.filter(r => r.eligibilityStatus === "eligible").length;

    res.json({
      processed: results.length,
      eligible,
      notEligible: results.filter(r => r.eligibilityStatus === "not_eligible").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    });
  } catch (err) {
    handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ecm/pipeline
// Full POS 27 → ECM pipeline: all street encounters with screening status,
// referral status, and ECM enrollment flag.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/ecm/pipeline", async (_req: Request, res: Response) => {
  try {
    const pos27Encounters = await db
      .select({
        encounterId: encountersTable.id,
        patientId: encountersTable.patientId,
        encounterDate: encountersTable.encounterDate,
        emCode: encountersTable.emCode,
        sdohZCodes: encountersTable.sdohZCodes,
        diagnosisCodes: encountersTable.diagnosisCodes,
        payerType: encountersTable.payerType,
        status: encountersTable.status,
        athenaEncounterId: encountersTable.athenaEncounterId,
        // Patient
        firstName: patientsTable.firstName,
        lastName: patientsTable.lastName,
        housingStatus: patientsTable.housingStatus,
        ecmEnrolled: patientsTable.ecmEnrolled,
        adtStatus: patientsTable.adtStatus,
        athenaPatientId: patientsTable.athenaPatientId,
        // Screening
        screeningId: ecmScreeningsTable.id,
        eligibilityStatus: ecmScreeningsTable.eligibilityStatus,
        populationsOfFocus: ecmScreeningsTable.populationsOfFocus,
        referralStatus: ecmScreeningsTable.referralStatus,
        screenedAt: ecmScreeningsTable.screenedAt,
        referredAt: ecmScreeningsTable.referredAt,
        enrolledAt: ecmScreeningsTable.enrolledAt,
      })
      .from(encountersTable)
      .innerJoin(patientsTable, eq(encountersTable.patientId, patientsTable.id))
      .leftJoin(ecmScreeningsTable, eq(ecmScreeningsTable.encounterId, encountersTable.id))
      .where(eq(encountersTable.posCode, "27"))
      .orderBy(encountersTable.encounterDate);

    const pipeline = pos27Encounters.map(row => ({
      encounterId: row.encounterId,
      patientName: `${row.firstName} ${row.lastName}`,
      patientId: row.patientId,
      encounterDate: row.encounterDate,
      emCode: row.emCode,
      payerType: row.payerType,
      sdohZCodeCount: row.sdohZCodes.length,
      athenaEncounterId: row.athenaEncounterId,
      athenaPatientId: row.athenaPatientId,
      housingStatus: row.housingStatus,
      adtStatus: row.adtStatus,
      ecmEnrolled: row.ecmEnrolled,
      // Screening state
      screeningStage: !row.screeningId
        ? "unscreened"
        : row.referralStatus === "enrolled" || row.ecmEnrolled
        ? "enrolled"
        : row.referralStatus === "referred"
        ? "referred"
        : row.eligibilityStatus === "eligible"
        ? "eligible_not_referred"
        : "not_eligible",
      eligibilityStatus: row.eligibilityStatus ?? "unscreened",
      populationsOfFocus: row.populationsOfFocus ?? [],
      referralStatus: row.referralStatus ?? "not_referred",
      screenedAt: row.screenedAt,
      referredAt: row.referredAt,
      enrolledAt: row.enrolledAt,
    }));

    const stageCounts = pipeline.reduce<Record<string, number>>((acc, row) => {
      acc[row.screeningStage] = (acc[row.screeningStage] ?? 0) + 1;
      return acc;
    }, {});

    res.json({
      total: pipeline.length,
      stageCounts,
      pipeline,
    });
  } catch (err) {
    handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ecm/conversion-rate
// Funnel metrics: POS 27 → Screened → Eligible → Referred → Enrolled
// ─────────────────────────────────────────────────────────────────────────────
router.get("/ecm/conversion-rate", async (_req: Request, res: Response) => {
  try {
    const [{ totalPos27 }] = await db
      .select({ totalPos27: count() })
      .from(encountersTable)
      .where(eq(encountersTable.posCode, "27"));

    const [{ screened }] = await db
      .select({ screened: count() })
      .from(ecmScreeningsTable);

    const [{ eligible }] = await db
      .select({ eligible: count() })
      .from(ecmScreeningsTable)
      .where(eq(ecmScreeningsTable.eligibilityStatus, "eligible"));

    const [{ referred }] = await db
      .select({ referred: count() })
      .from(ecmScreeningsTable)
      .where(eq(ecmScreeningsTable.referralStatus, "referred"));

    const [{ enrolled }] = await db
      .select({ enrolled: count() })
      .from(ecmScreeningsTable)
      .where(eq(ecmScreeningsTable.referralStatus, "enrolled"));

    const [{ ecmEnrolledPatients }] = await db
      .select({ ecmEnrolledPatients: count() })
      .from(patientsTable)
      .where(eq(patientsTable.ecmEnrolled, true));

    const pct = (n: number, d: number) =>
      d === 0 ? 0 : Math.round((n / d) * 1000) / 10;

    res.json({
      funnel: [
        {
          stage: "POS 27 Encounters",
          count: Number(totalPos27),
          conversionFromPrevious: null,
          description: "Total street medicine encounters captured with POS 27",
        },
        {
          stage: "Screened for ECM",
          count: Number(screened),
          conversionFromPrevious: pct(Number(screened), Number(totalPos27)),
          description: "Encounters that have completed ECM eligibility screening",
        },
        {
          stage: "ECM Eligible",
          count: Number(eligible),
          conversionFromPrevious: pct(Number(eligible), Number(screened)),
          description: "Patients meeting ≥1 CalAIM Population of Focus criteria",
        },
        {
          stage: "Referred to ECM",
          count: Number(referred),
          conversionFromPrevious: pct(Number(referred), Number(eligible)),
          description: "Eligible patients referred to health plan ECM program",
        },
        {
          stage: "ECM Enrolled",
          count: Number(enrolled),
          conversionFromPrevious: pct(Number(enrolled), Number(referred)),
          description: "Patients confirmed enrolled in ECM by health plan",
        },
      ],
      summary: {
        totalPos27Encounters: Number(totalPos27),
        screeningCoverage: `${pct(Number(screened), Number(totalPos27))}%`,
        eligibilityRate: `${pct(Number(eligible), Number(screened))}%`,
        referralRate: `${pct(Number(referred), Number(eligible))}%`,
        enrollmentRate: `${pct(Number(enrolled), Number(referred))}%`,
        overallConversionRate: `${pct(Number(enrolled), Number(totalPos27))}%`,
        ecmEnrolledPatientsTotal: Number(ecmEnrolledPatients),
      },
    });
  } catch (err) {
    handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /ecm/screenings/:id/refer
// Mark a screening as referred to ECM; optionally log the health plan + method.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/ecm/screenings/:id/refer", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid screening id" }); return; }

  const { healthPlan, referralMethod, submittedBy, notes } = req.body as {
    healthPlan?: string;
    referralMethod?: string;
    submittedBy?: string;
    notes?: string;
  };

  try {
    const [screening] = await db
      .select()
      .from(ecmScreeningsTable)
      .where(eq(ecmScreeningsTable.id, id))
      .limit(1);

    if (!screening) { res.status(404).json({ error: "Screening not found" }); return; }
    if (screening.eligibilityStatus !== "eligible") {
      res.status(422).json({
        error: `Cannot refer — patient is ${screening.eligibilityStatus}, not eligible`,
      });
      return;
    }

    const now = new Date();

    await db
      .update(ecmScreeningsTable)
      .set({ referralStatus: "referred", referredAt: now, updatedAt: now })
      .where(eq(ecmScreeningsTable.id, id));

    // Log referral record
    if (healthPlan) {
      await db.insert(ecmReferralsTable).values({
        screeningId: id,
        patientId: screening.patientId,
        healthPlan: healthPlan ?? "unknown",
        referralDate: now,
        referralMethod: referralMethod ?? "portal",
        submittedBy: submittedBy ?? null,
        notes: notes ?? null,
        status: "pending",
        updatedAt: now,
      });
    }

    res.json({
      screeningId: id,
      referralStatus: "referred",
      referredAt: now,
      healthPlan: healthPlan ?? null,
      message: "Referral recorded. Follow up with the health plan for enrollment confirmation.",
    });
  } catch (err) {
    handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /ecm/screenings/:id/enroll
// Mark a patient as ECM-enrolled after health plan confirmation.
// Also flips ecmEnrolled = true on the patient record.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/ecm/screenings/:id/enroll", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid screening id" }); return; }

  const { planConfirmationId, notes } = req.body as {
    planConfirmationId?: string;
    notes?: string;
  };

  try {
    const [screening] = await db
      .select()
      .from(ecmScreeningsTable)
      .where(eq(ecmScreeningsTable.id, id))
      .limit(1);

    if (!screening) { res.status(404).json({ error: "Screening not found" }); return; }

    const now = new Date();

    await db
      .update(ecmScreeningsTable)
      .set({ referralStatus: "enrolled", enrolledAt: now, updatedAt: now })
      .where(eq(ecmScreeningsTable.id, id));

    // Update patient ECM flag
    await db
      .update(patientsTable)
      .set({ ecmEnrolled: true, updatedAt: now })
      .where(eq(patientsTable.id, screening.patientId));

    // Update referral if one exists
    if (planConfirmationId) {
      await db
        .update(ecmReferralsTable)
        .set({
          status: "enrolled",
          planConfirmationId,
          planResponseDate: now,
          notes: notes ?? null,
          updatedAt: now,
        })
        .where(eq(ecmReferralsTable.screeningId, id));
    }

    res.json({
      screeningId: id,
      referralStatus: "enrolled",
      enrolledAt: now,
      patientEcmFlagUpdated: true,
      planConfirmationId: planConfirmationId ?? null,
    });
  } catch (err) {
    handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /ecm/screenings/:id
// Full detail for a single screening record.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/ecm/screenings/:id", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid screening id" }); return; }

  try {
    const [screening] = await db
      .select()
      .from(ecmScreeningsTable)
      .where(eq(ecmScreeningsTable.id, id))
      .limit(1);

    if (!screening) { res.status(404).json({ error: "Screening not found" }); return; }

    const referrals = await db
      .select()
      .from(ecmReferralsTable)
      .where(eq(ecmReferralsTable.screeningId, id));

    res.json({ ...screening, referrals });
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
