import { Router, type IRouter, type Request, type Response } from "express";
import { db, patientsTable, encountersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createAthenaPatient,
  createAthenaEncounter,
} from "../lib/athenaClient.js";

const router: IRouter = Router();

interface SyncResultItem {
  encounterId: string;
  status: "synced" | "error";
  athenaEncounterId?: string;
  error?: string;
}

router.post("/athena/sync", async (req: Request, res: Response) => {
  const { encounterIds } = req.body as { encounterIds?: unknown };

  if (
    !Array.isArray(encounterIds) ||
    encounterIds.length === 0 ||
    !encounterIds.every((id) => typeof id === "string" || typeof id === "number")
  ) {
    res.status(400).json({
      error: "encounterIds must be a non-empty array of encounter ID strings.",
    });
    return;
  }

  const results: SyncResultItem[] = [];

  for (const rawId of encounterIds as Array<string | number>) {
    const encounterId = String(rawId);
    const numericId = Number(rawId);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      results.push({
        encounterId,
        status: "error",
        error: `Invalid encounter ID: "${encounterId}".`,
      });
      continue;
    }

    try {
      const [encounter] = await db
        .select()
        .from(encountersTable)
        .where(eq(encountersTable.id, numericId))
        .limit(1);

      if (!encounter) {
        results.push({
          encounterId,
          status: "error",
          error: `Encounter ${encounterId} not found.`,
        });
        continue;
      }

      if (encounter.athenaEncounterId) {
        results.push({
          encounterId,
          status: "synced",
          athenaEncounterId: encounter.athenaEncounterId,
        });
        continue;
      }

      const [patient] = await db
        .select()
        .from(patientsTable)
        .where(eq(patientsTable.id, encounter.patientId))
        .limit(1);

      if (!patient) {
        results.push({
          encounterId,
          status: "error",
          error: `Patient ${encounter.patientId} not found for encounter ${encounterId}.`,
        });
        continue;
      }

      let athenaPatientId = patient.athenaPatientId;

      if (!athenaPatientId) {
        athenaPatientId = await createAthenaPatient(patient);
        await db
          .update(patientsTable)
          .set({ athenaPatientId })
          .where(eq(patientsTable.id, patient.id));
      }

      const athenaEncounterId = await createAthenaEncounter(
        encounter,
        athenaPatientId,
      );

      await db
        .update(encountersTable)
        .set({ athenaEncounterId })
        .where(eq(encountersTable.id, numericId));

      results.push({
        encounterId,
        status: "synced",
        athenaEncounterId,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred.";
      results.push({
        encounterId,
        status: "error",
        error: message,
      });
    }
  }

  res.json({ results });
});

export default router;
