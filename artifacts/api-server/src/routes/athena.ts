import { Router, type IRouter, type Request, type Response } from "express";
import { db, patientsTable, encountersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  createAthenaPatient,
  createAthenaEncounter,
  submitStreetClaim,
  searchAthenaPatients,
  createAthenaPatientQuick,
  submitVisit,
  type StreetClaimPayload,
  type PatientSearchParams as AthenaPatientSearchParams,
  type QuickPatientInput,
  type SubmitVisitPayload,
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
import {
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getStatus,
  clearToken,
  computeRedirectUri,
} from "../lib/athenaOAuth.js";

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
// POST /athena/claims — submit a street medicine claim (POS 27) to athenahealth
//
// Body: {
//   athenaPatientId: string           — required, patient ID in athenahealth
//   procedureCodes: { code, units?, modifiers? }[]  — E&M codes (e.g. 99213)
//   diagnosisCodes: { code, description? }[]        — primary dx + SDOH Z-codes
//   dateOfService:  string            — YYYY-MM-DD
//   departmentId?:  string            — defaults to "1"
//   facilityId?:    string
//   billingProviderId?:  string
//   referringProviderId?: string
//   includeQ3014?:  boolean           — add Q3014 originating site fee (telehealth)
//   gpsLat?:        number
//   gpsLng?:        number
// }
//
// Z59.01 (Unsheltered Homelessness) is always inserted as the first diagnosis.
// POS 27 (Outreach Site) is always set.
// ---------------------------------------------------------------------------
router.post("/athena/claims", async (req: Request, res: Response) => {
  if (!athenaConfigured()) {
    res.status(503).json({ error: "athenahealth integration is not configured." });
    return;
  }

  const {
    athenaPatientId,
    procedureCodes,
    diagnosisCodes,
    dateOfService,
    departmentId,
    facilityId,
    billingProviderId,
    referringProviderId,
    includeQ3014,
    gpsLat,
    gpsLng,
    liveLat,
    liveLng,
    liveGpsTimestamp,
  } = req.body as Partial<StreetClaimPayload>;

  if (!athenaPatientId || typeof athenaPatientId !== "string") {
    res.status(400).json({ error: "athenaPatientId is required." });
    return;
  }
  if (!Array.isArray(procedureCodes) || procedureCodes.length === 0) {
    res.status(400).json({ error: "procedureCodes must be a non-empty array." });
    return;
  }
  if (!dateOfService || typeof dateOfService !== "string") {
    res.status(400).json({ error: "dateOfService is required (YYYY-MM-DD)." });
    return;
  }

  try {
    const claimId = await submitStreetClaim({
      athenaPatientId,
      procedureCodes,
      diagnosisCodes:   diagnosisCodes ?? [],
      dateOfService,
      departmentId,
      facilityId,
      billingProviderId,
      referringProviderId,
      includeQ3014:     includeQ3014 === true,
      gpsLat:           typeof gpsLat === "number" ? gpsLat : null,
      gpsLng:           typeof gpsLng === "number" ? gpsLng : null,
      liveLat:          typeof liveLat === "number" ? liveLat : null,
      liveLng:          typeof liveLng === "number" ? liveLng : null,
      liveGpsTimestamp: typeof liveGpsTimestamp === "string" ? liveGpsTimestamp : null,
    });

    console.log(`[athena/claims] Claim submitted — claimId=${claimId} patient=${athenaPatientId}`);
    res.json({ claimId, message: "Claim submitted successfully." });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[athena/claims] Submission error:", message);
    res.status(502).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /athena/patients — search patients in athenahealth
//
// Query params (all optional):
//   limit     — max results (default 10, max 100)
//   status    — "active" | "inactive" | "deleted" (default: all)
//   firstname — partial or full first name
//   lastname  — partial or full last name
//   dob       — date of birth MM/DD/YYYY
// ---------------------------------------------------------------------------
router.get("/athena/patients", async (req: Request, res: Response) => {
  if (!athenaConfigured()) {
    res.status(503).json({ error: "athenahealth integration is not configured." });
    return;
  }

  const { limit, status, firstname, lastname, dob } = req.query as Record<string, string | undefined>;

  const limitNum = Math.min(Number(limit ?? 10), 100);
  if (isNaN(limitNum) || limitNum < 1) {
    res.status(400).json({ error: "limit must be a positive integer (max 100)." });
    return;
  }

  const params: AthenaPatientSearchParams = { limit: limitNum };
  if (status)    params.status    = status;
  if (firstname) params.firstname = firstname;
  if (lastname)  params.lastname  = lastname;
  if (dob)       params.dob       = dob;

  try {
    const patients = await searchAthenaPatients(params);
    console.log(`[athena/patients] Found ${patients.length} patient(s) matching query`);
    res.json({ patients, total: patients.length, practiceId: process.env["ATHENA_PRACTICE_ID"] ?? "195900" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[athena/patients] Search error:", message);
    res.status(502).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /athena/patients — create a new patient record in athenahealth
//
// Body: {
//   firstname:    string  — required
//   lastname:     string  — required
//   dob:          string  — required, MM/DD/YYYY
//   sex?:         string  — "M" | "F" | "O"
//   departmentid?: string — defaults to "1"
// }
//
// Returns: { patientId, firstname, lastname, practiceId }
// ---------------------------------------------------------------------------
router.post("/athena/patients", async (req: Request, res: Response) => {
  if (!athenaConfigured()) {
    res.status(503).json({ error: "athenahealth integration is not configured." });
    return;
  }

  const { firstname, lastname, dob, sex, departmentid } = req.body as Partial<QuickPatientInput>;

  if (!firstname?.trim()) {
    res.status(400).json({ error: "firstname is required." });
    return;
  }
  if (!lastname?.trim()) {
    res.status(400).json({ error: "lastname is required." });
    return;
  }
  if (!dob?.trim()) {
    res.status(400).json({ error: "dob is required (MM/DD/YYYY)." });
    return;
  }

  try {
    const patientId = await createAthenaPatientQuick({
      firstname: firstname.trim(),
      lastname:  lastname.trim(),
      dob:       dob.trim(),
      sex:       sex?.trim(),
      departmentid: departmentid?.trim() ?? "1",
    });

    console.log(`[athena/patients] Created patient ${patientId} — ${firstname} ${lastname}`);
    res.status(201).json({
      patientId,
      firstname: firstname.trim(),
      lastname:  lastname.trim(),
      practiceId: process.env["ATHENA_PRACTICE_ID"] ?? "195900",
      departmentId: departmentid?.trim() ?? "1",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[athena/patients] Create error:", message);
    res.status(502).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /athena/submit-visit — atomic: register patient + submit POS 27 claim
//
// Use this for unhoused patients who have no prior record in athenahealth.
// The two-step sequence runs server-side so the mobile client only makes
// one network call.
//
// Body: {
//   firstname:     string   — required
//   lastname:      string   — required
//   dob:           string   — required, MM/DD/YYYY
//   sex?:          string   — "M" | "F" | "O"
//   zip?:          string   — e.g. "90033" (USC/Keck area)
//   departmentId?: string   — defaults to "1"
//   procedureCodes: { code, units?, modifiers? }[]
//   diagnosisCodes: { code, description? }[]
//   dateOfService: string   — YYYY-MM-DD
//   includeQ3014?: boolean
//   gpsLat?:       number
//   gpsLng?:       number
// }
//
// Returns: { patientId, claimId, practiceId, steps }
// ---------------------------------------------------------------------------
router.post("/athena/submit-visit", async (req: Request, res: Response) => {
  if (!athenaConfigured()) {
    res.status(503).json({ error: "athenahealth integration is not configured." });
    return;
  }

  const {
    firstname, lastname, dob, sex, zip, departmentId,
    procedureCodes, diagnosisCodes, dateOfService,
    includeQ3014, gpsLat, gpsLng,
    liveLat, liveLng, liveGpsTimestamp,
  } = req.body as Partial<SubmitVisitPayload>;

  if (!firstname?.trim()) { res.status(400).json({ error: "firstname is required." }); return; }
  if (!lastname?.trim())  { res.status(400).json({ error: "lastname is required." });  return; }
  if (!dob?.trim())       { res.status(400).json({ error: "dob is required (MM/DD/YYYY)." }); return; }
  if (!Array.isArray(procedureCodes) || procedureCodes.length === 0) {
    res.status(400).json({ error: "procedureCodes must be a non-empty array." });
    return;
  }
  if (!dateOfService?.trim()) { res.status(400).json({ error: "dateOfService is required (YYYY-MM-DD)." }); return; }

  try {
    const result = await submitVisit({
      firstname:        firstname.trim(),
      lastname:         lastname.trim(),
      dob:              dob.trim(),
      sex:              sex?.trim(),
      zip:              zip?.trim(),
      departmentId:     departmentId?.trim() ?? "1",
      procedureCodes,
      diagnosisCodes:   diagnosisCodes ?? [],
      dateOfService:    dateOfService.trim(),
      includeQ3014:     includeQ3014 === true,
      gpsLat:           typeof gpsLat === "number" ? gpsLat : null,
      gpsLng:           typeof gpsLng === "number" ? gpsLng : null,
      liveLat:          typeof liveLat === "number" ? liveLat : null,
      liveLng:          typeof liveLng === "number" ? liveLng : null,
      liveGpsTimestamp: typeof liveGpsTimestamp === "string" ? liveGpsTimestamp : null,
    });

    const step1Label = result.isExistingPatient
      ? `Existing patient found (ID ${result.patientId}) — no duplicate created`
      : `New patient registered (ID ${result.patientId})`;

    console.log(`[athena/submit-visit] Success — patient=${result.patientId} (existing=${result.isExistingPatient}) claim=${result.claimId}`);
    res.status(201).json({
      ...result,
      steps: [
        { step: 1, label: step1Label, patientId: result.patientId, isExistingPatient: result.isExistingPatient },
        { step: 2, label: `POS 27 claim filed (ID ${result.claimId})`, claimId: result.claimId },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[athena/submit-visit] Error:", message);
    res.status(502).json({ error: message });
  }
});

// ===========================================================================
// OAuth 2.0 — Authorization Code Flow
// Reference: athenahealth API 2026 sandbox preview environment
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /athena/oauth/status — token status (safe, no secrets returned)
// ---------------------------------------------------------------------------
router.get("/athena/oauth/status", (_req: Request, res: Response) => {
  const status = getStatus();
  res.json({
    ...status,
    sandboxPracticeId: process.env["ATHENA_PRACTICE_ID"] ?? "195900",
    loginUrl: "/api/athena/oauth/login",
    docs: "GET /api/athena/oauth/login to begin the Authorization Code flow.",
  });
});

// ---------------------------------------------------------------------------
// GET /athena/oauth/login — redirect browser to athenahealth login page
//
// Open this URL in the browser. After successful login, athenahealth will
// redirect back to /api/athena/oauth/callback with a one-time auth code.
// ---------------------------------------------------------------------------
router.get("/athena/oauth/login", (req: Request, res: Response) => {
  try {
    const redirectUri = computeRedirectUri(
      req.get("x-forwarded-host") ?? req.get("host") ?? "localhost",
      req.get("x-forwarded-proto") ?? req.protocol,
    );

    const { url, state } = buildAuthUrl(redirectUri);

    console.log(`[athena/oauth] Login initiated — redirectUri=${redirectUri} state=${state.slice(0, 8)}...`);
    res.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[athena/oauth] Login error:", message);
    res.status(500).json({ error: `OAuth login failed: ${message}` });
  }
});

// ---------------------------------------------------------------------------
// GET /athena/oauth/callback — athenahealth posts the auth code here
//
// 1. Validates the CSRF state parameter
// 2. Exchanges the one-time authorization code for access + refresh tokens
// 3. Stores tokens in memory
// 4. Redirects the clinician's browser back to the frontend dashboard
// ---------------------------------------------------------------------------
router.get("/athena/oauth/callback", async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query as {
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  };

  // athenahealth returned an error (e.g., user denied access)
  if (error) {
    console.error(`[athena/oauth] Callback error from athenahealth: ${error} — ${error_description ?? ""}`);
    const frontendBase = process.env["REPLIT_DEV_DOMAIN"]
      ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
      : "";
    return res.redirect(`${frontendBase}/?athena=error&reason=${encodeURIComponent(error_description ?? error)}`);
  }

  if (!code || !state) {
    return res.status(400).json({ error: "Missing code or state parameter in callback." });
  }

  try {
    const redirectUri = computeRedirectUri(
      req.get("x-forwarded-host") ?? req.get("host") ?? "localhost",
      req.get("x-forwarded-proto") ?? req.protocol,
    );

    const token = await exchangeCode(code, redirectUri, state);

    console.log(
      `[athena/oauth] Token exchange successful — expires ${new Date(token.expiresAt).toISOString()} practiceId=${token.practiceId}`,
    );

    // Redirect back to the frontend dashboard with a success flag
    const frontendBase = process.env["REPLIT_DEV_DOMAIN"]
      ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
      : "";
    return res.redirect(`${frontendBase}/?athena=connected`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[athena/oauth] Token exchange error:", message);
    return res.status(500).json({
      error: "Token exchange failed",
      detail: message,
      hint: "Verify ATHENA_CLIENT_ID, ATHENA_CLIENT_SECRET, and redirect URI registration in the athenahealth developer portal.",
    });
  }
});

// ---------------------------------------------------------------------------
// POST /athena/oauth/refresh — manually refresh the access token
//
// Tokens last ~60 minutes. Call this before the token expires to stay
// connected without requiring the clinician to log in again.
// ---------------------------------------------------------------------------
router.post("/athena/oauth/refresh", async (_req: Request, res: Response) => {
  try {
    const token = await refreshAccessToken();
    res.json({
      success: true,
      message: "Token refreshed successfully.",
      expiresAt: new Date(token.expiresAt).toISOString(),
      expiresInMinutes: Math.floor((token.expiresAt - Date.now()) / 60_000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[athena/oauth] Refresh error:", message);
    res.status(401).json({
      error: "Token refresh failed",
      detail: message,
      action: "Re-authenticate via GET /api/athena/oauth/login",
    });
  }
});

// ---------------------------------------------------------------------------
// DELETE /athena/oauth/logout — clear the stored token
// ---------------------------------------------------------------------------
router.delete("/athena/oauth/logout", (_req: Request, res: Response) => {
  clearToken();
  console.log("[athena/oauth] Token cleared (logout).");
  res.json({ success: true, message: "athenahealth session cleared. Re-authenticate via /api/athena/oauth/login." });
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
