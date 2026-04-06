import { Router, type IRouter, type Request, type Response } from "express";
import { db, patientsTable, encountersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createAthenaPatient,
  createAthenaEncounter,
} from "../lib/athenaClient.js";
import {
  searchPatients,
  getPatientById,
  getObservations,
  getConditions,
  getAllergyIntolerances,
  getCcdaExport,
  type PatientSearchParams,
  type ObservationSearchParams,
  type ConditionSearchParams,
  type AllergySearchParams,
} from "../lib/athenaFhir.js";

const router: IRouter = Router();

interface SyncResultItem {
  encounterId: string;
  status: "synced" | "error";
  athenaEncounterId?: string;
  error?: string;
}

function athenaConfigured(): boolean {
  return !!(
    process.env["ATHENA_CLIENT_ID"] &&
    process.env["ATHENA_CLIENT_SECRET"] &&
    process.env["ATHENA_BASE_URL"]
  );
}

function handleFhirError(err: unknown, res: Response): void {
  const error = err as Error & { statusCode?: number };
  const status = error.statusCode ?? 502;
  res.status(status).json({ error: error.message ?? "athenahealth FHIR request failed" });
}

// ---------------------------------------------------------------------------
// POST /athena/sync — sync local encounters to athenahealth
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// GET /athena/fhir/status — confirm credentials are configured
// ---------------------------------------------------------------------------
router.get("/athena/fhir/status", (_req: Request, res: Response) => {
  const configured = athenaConfigured();
  res.json({
    configured,
    message: configured
      ? "athenahealth FHIR R4 credentials are configured."
      : "Missing one or more credentials: ATHENA_CLIENT_ID, ATHENA_CLIENT_SECRET, ATHENA_BASE_URL.",
    endpoints: [
      "GET /athena/fhir/patients",
      "GET /athena/fhir/patients/:patientId",
      "GET /athena/fhir/patients/:patientId/observations",
      "GET /athena/fhir/patients/:patientId/conditions",
      "GET /athena/fhir/patients/:patientId/allergies",
      "GET /athena/fhir/patients/:patientId/ccda",
    ],
  });
});

// ---------------------------------------------------------------------------
// GET /athena/fhir/patients?family=&given=&birthdate=&identifier=&_count=&_offset=
// ---------------------------------------------------------------------------
router.get("/athena/fhir/patients", async (req: Request, res: Response) => {
  const { family, given, birthdate, identifier, _count, _offset } = req.query as Record<string, string | undefined>;

  if (!family && !given && !birthdate && !identifier) {
    res.status(400).json({
      error: "Provide at least one search parameter: family, given, birthdate, or identifier.",
    });
    return;
  }

  const params: PatientSearchParams = {};
  if (family) params.family = family;
  if (given) params.given = given;
  if (birthdate) params.birthdate = birthdate;
  if (identifier) params.identifier = identifier;
  if (_count) params._count = _count;
  if (_offset) params._offset = _offset;

  try {
    const bundle = await searchPatients(params);
    res.json(bundle);
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ---------------------------------------------------------------------------
// GET /athena/fhir/patients/:patientId
// ---------------------------------------------------------------------------
router.get("/athena/fhir/patients/:patientId", async (req: Request, res: Response) => {
  const { patientId } = req.params;

  try {
    const patient = await getPatientById(patientId);
    res.json(patient);
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ---------------------------------------------------------------------------
// GET /athena/fhir/patients/:patientId/observations
//   ?category=vital-signs|laboratory&code=&date=&_count=&_sort=
// ---------------------------------------------------------------------------
router.get("/athena/fhir/patients/:patientId/observations", async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { category, code, date, _count, _sort } = req.query as Record<string, string | undefined>;

  const params: ObservationSearchParams = { patient: patientId };
  if (category) params.category = category;
  if (code) params.code = code;
  if (date) params.date = date;
  if (_count) params._count = _count;
  if (_sort) params._sort = _sort;

  try {
    const bundle = await getObservations(params);
    res.json(bundle);
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ---------------------------------------------------------------------------
// GET /athena/fhir/patients/:patientId/conditions
//   ?clinical-status=active|resolved&category=&code=&_count=
// ---------------------------------------------------------------------------
router.get("/athena/fhir/patients/:patientId/conditions", async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { "clinical-status": clinicalStatus, category, code, _count } = req.query as Record<string, string | undefined>;

  const params: ConditionSearchParams = { patient: patientId };
  if (clinicalStatus) params["clinical-status"] = clinicalStatus;
  if (category) params.category = category;
  if (code) params.code = code;
  if (_count) params._count = _count;

  try {
    const bundle = await getConditions(params);
    res.json(bundle);
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ---------------------------------------------------------------------------
// GET /athena/fhir/patients/:patientId/allergies
//   ?clinical-status=active|resolved&_count=
// ---------------------------------------------------------------------------
router.get("/athena/fhir/patients/:patientId/allergies", async (req: Request, res: Response) => {
  const { patientId } = req.params;
  const { "clinical-status": clinicalStatus, _count } = req.query as Record<string, string | undefined>;

  const params: AllergySearchParams = { patient: patientId };
  if (clinicalStatus) params["clinical-status"] = clinicalStatus;
  if (_count) params._count = _count;

  try {
    const bundle = await getAllergyIntolerances(params);
    res.json(bundle);
  } catch (err) {
    handleFhirError(err, res);
  }
});

// ---------------------------------------------------------------------------
// GET /athena/fhir/patients/:patientId/ccda
// Returns raw CCD-A XML (application/xml)
// ---------------------------------------------------------------------------
router.get("/athena/fhir/patients/:patientId/ccda", async (req: Request, res: Response) => {
  const { patientId } = req.params;

  try {
    const xml = await getCcdaExport(patientId);
    res.setHeader("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    handleFhirError(err, res);
  }
});

export default router;
