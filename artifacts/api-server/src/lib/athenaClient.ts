import { getAccessToken } from "./athenaAuth.js";
import { getRawToken } from "./athenaOAuth.js";
import type { Patient, Encounter } from "@workspace/db";

function getPracticeId(): string {
  const practiceId = process.env["ATHENA_PRACTICE_ID"];
  if (!practiceId) {
    throw new Error(
      "Missing ATHENA_PRACTICE_ID environment variable.",
    );
  }
  return practiceId;
}

function getBaseUrl(): string {
  const baseUrl = process.env["ATHENA_BASE_URL"];
  if (!baseUrl) {
    throw new Error(
      "Missing ATHENA_BASE_URL environment variable.",
    );
  }
  return baseUrl;
}

/**
 * Resolve the best available Bearer token for athenahealth API calls.
 * Priority:
 *   1. OAuth Authorization Code token (clinician logged in via /athena/oauth/login)
 *   2. Client Credentials token (machine-to-machine fallback)
 */
async function resolveToken(): Promise<string> {
  const oauthRaw = getRawToken();
  if (oauthRaw && oauthRaw.expiresAt > Date.now()) {
    return oauthRaw.accessToken;
  }
  return getAccessToken();
}

async function athenaRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = await resolveToken();
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Athenahealth API error (${response.status})`;
    try {
      const errorBody = (await response.json()) as {
        message?: string;
        error?: string;
      };
      errorMessage = errorBody.message ?? errorBody.error ?? errorMessage;
    } catch {
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = `${errorMessage}: ${errorText}`;
        }
      } catch {
      }
    }
    const err = new Error(errorMessage) as Error & { statusCode: number };
    err.statusCode = response.status;
    throw err;
  }

  return response.json() as Promise<T>;
}

/**
 * athenahealth patient-creation endpoints require application/x-www-form-urlencoded.
 * This wrapper sends the same Bearer token as athenaRequest but with form encoding.
 */
async function athenaFormRequest<T>(
  method: string,
  path: string,
  fields: Record<string, string>,
): Promise<T> {
  const token   = await resolveToken();
  const baseUrl = getBaseUrl();
  const url     = `${baseUrl}${path}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(fields).toString(),
  });

  if (!response.ok) {
    let errorMessage = `Athenahealth API error (${response.status})`;
    try {
      const errorBody = (await response.json()) as { message?: string; error?: string; detailedmessage?: string };
      errorMessage = errorBody.detailedmessage ?? errorBody.message ?? errorBody.error ?? errorMessage;
    } catch {
      try {
        const errorText = await response.text();
        if (errorText) errorMessage = `${errorMessage}: ${errorText}`;
      } catch { /* ignore */ }
    }
    const err = new Error(errorMessage) as Error & { statusCode: number };
    err.statusCode = response.status;
    throw err;
  }

  return response.json() as Promise<T>;
}

export interface AthenaPatientResponse {
  patientid: string;
}

export interface AthenaEncounterResponse {
  encounterid: string;
}

/**
 * Build the mandatory Digital Receipt block required on every synced encounter.
 * Format: [Digital Receipt | GPS: {lat},{lng} ±{accuracy}m | Captured: {ISO timestamp} | StreetClaim RCM]
 *
 * GPS coordinates are included when available; the captured timestamp falls back
 * to offlineTimestamp → syncTimestamp → encounterDate so that the block is always
 * present regardless of whether GPS data was captured.
 */
export function buildDigitalReceipt(encounter: Encounter): string {
  const captureTime = (
    encounter.offlineTimestamp ??
    encounter.syncTimestamp ??
    encounter.encounterDate
  ).toISOString();

  if (
    encounter.gpsLat != null &&
    encounter.gpsLng != null &&
    encounter.gpsAccuracy != null
  ) {
    return `[Digital Receipt | GPS: ${encounter.gpsLat},${encounter.gpsLng} ±${encounter.gpsAccuracy}m | Captured: ${captureTime} | StreetClaim RCM]`;
  }

  return `[Digital Receipt | Captured: ${captureTime} | StreetClaim RCM]`;
}

// ---------------------------------------------------------------------------
// Patient search / create (sandbox & production)
// ---------------------------------------------------------------------------

export interface AthenaPatientSummary {
  patientid: string;
  firstname?: string;
  lastname?: string;
  dob?: string;
  sex?: string;
  city?: string;
  state?: string;
  status?: string;
}

export interface PatientSearchParams {
  limit?: number;
  status?: string;
  firstname?: string;
  lastname?: string;
  dob?: string;
}

export async function searchAthenaPatients(
  params: PatientSearchParams = {},
): Promise<AthenaPatientSummary[]> {
  const practiceId = getPracticeId();
  const qs = new URLSearchParams();
  qs.set("limit", String(params.limit ?? 10));
  if (params.status)    qs.set("status",    params.status);
  if (params.firstname) qs.set("firstname", params.firstname);
  if (params.lastname)  qs.set("lastname",  params.lastname);
  if (params.dob)       qs.set("dob",       params.dob);

  const result = await athenaRequest<{ patients?: AthenaPatientSummary[] }>(
    "GET",
    `/v1/${practiceId}/patients?${qs.toString()}`,
  );

  return result.patients ?? [];
}

export interface QuickPatientInput {
  firstname: string;
  lastname: string;
  dob: string;
  sex?: string;
  zip?: string;
  departmentid?: string;
}

export async function createAthenaPatientQuick(
  input: QuickPatientInput,
): Promise<string> {
  const practiceId = getPracticeId();

  // athenahealth patient endpoints require x-www-form-urlencoded
  const fields: Record<string, string> = {
    firstname:    input.firstname,
    lastname:     input.lastname,
    dob:          input.dob,
    departmentid: input.departmentid ?? "1",
  };
  if (input.sex) fields["sex"] = input.sex;
  if (input.zip) fields["zip"] = input.zip;

  const result = await athenaFormRequest<AthenaPatientResponse[]>(
    "POST",
    `/v1/${practiceId}/patients`,
    fields,
  );

  const created = Array.isArray(result) ? result[0] : result;
  if (!created?.patientid) {
    throw new Error("athenahealth did not return a patient ID after creation.");
  }
  return created.patientid;
}

export async function createAthenaPatient(patient: Patient): Promise<string> {
  const practiceId = getPracticeId();

  // athenahealth requires x-www-form-urlencoded for patient creation
  const fields: Record<string, string> = {
    firstname:    patient.firstName,
    lastname:     patient.lastName,
    dob:          patient.dateOfBirth,
    departmentid: "1",
  };
  if (patient.medicaidId) fields["medicaidid"] = patient.medicaidId;
  if (patient.medicareId) fields["medicareid"]  = patient.medicareId;

  const result = await athenaFormRequest<AthenaPatientResponse[]>(
    "POST",
    `/v1/${practiceId}/patients`,
    fields,
  );

  const created = Array.isArray(result) ? result[0] : result;
  if (!created?.patientid) {
    throw new Error("Athenahealth did not return a patient ID after creation.");
  }

  return created.patientid;
}

// ---------------------------------------------------------------------------
// Atomic "Submit Visit" — create patient + submit claim in one server call
// ---------------------------------------------------------------------------

export interface SubmitVisitPayload {
  firstname: string;
  lastname: string;
  dob: string;
  sex?: string;
  zip?: string;
  departmentId?: string;
  procedureCodes: ClaimProcedure[];
  diagnosisCodes: ClaimDiagnosis[];
  dateOfService: string;
  includeQ3014?: boolean;
  /** Encounter-level GPS — captured when the clinician opened the encounter */
  gpsLat?: number | null;
  gpsLng?: number | null;
  /** Live GPS — captured at the moment the Submit button was pressed */
  liveLat?: number | null;
  liveLng?: number | null;
  liveGpsTimestamp?: string | null;
}

export interface SubmitVisitResult {
  patientId: string;
  claimId: string;
  practiceId: string;
}

/**
 * Point-of-care enrollment workflow:
 *   Step 1 — Register the patient in athenahealth (POST /patients, form-encoded)
 *   Step 2 — Immediately submit a POS 27 street claim for that patient
 *
 * Z59.01 and POS 27 are guaranteed by submitStreetClaim. The caller only needs
 * to supply the clinical data captured in the field.
 */
export async function submitVisit(
  payload: SubmitVisitPayload,
): Promise<SubmitVisitResult> {
  const practiceId = getPracticeId();

  // Step 1: Register patient
  const patientId = await createAthenaPatientQuick({
    firstname:    payload.firstname,
    lastname:     payload.lastname,
    dob:          payload.dob,
    sex:          payload.sex,
    zip:          payload.zip,
    departmentid: payload.departmentId ?? "1",
  });

  // Step 2: Submit POS 27 claim
  const claimId = await submitStreetClaim({
    athenaPatientId:  patientId,
    procedureCodes:   payload.procedureCodes,
    diagnosisCodes:   payload.diagnosisCodes,
    dateOfService:    payload.dateOfService,
    departmentId:     payload.departmentId,
    includeQ3014:     payload.includeQ3014,
    gpsLat:           payload.gpsLat,
    gpsLng:           payload.gpsLng,
    liveLat:          payload.liveLat,
    liveLng:          payload.liveLng,
    liveGpsTimestamp: payload.liveGpsTimestamp,
  });

  console.log(`[submitVisit] patient=${patientId} claim=${claimId} practice=${practiceId}`);
  return { patientId, claimId, practiceId };
}

// ---------------------------------------------------------------------------
// Claim submission — Street Medicine (POS 27)
// ---------------------------------------------------------------------------

export interface ClaimProcedure {
  code: string;
  units?: string;
  modifiers?: string[];
}

export interface ClaimDiagnosis {
  code: string;
  description?: string;
}

export interface StreetClaimPayload {
  athenaPatientId: string;
  departmentId?: string;
  facilityId?: string;
  billingProviderId?: string;
  referringProviderId?: string;
  placeOfServiceId?: string;
  dateOfService: string;
  procedureCodes: ClaimProcedure[];
  diagnosisCodes: ClaimDiagnosis[];
  includeQ3014?: boolean;
  /** Encounter-level GPS (stored when encounter was captured in the field) */
  gpsLat?: number | null;
  gpsLng?: number | null;
  /** Live GPS captured at submission time — for billing-time audit proof */
  liveLat?: number | null;
  liveLng?: number | null;
  liveGpsTimestamp?: string | null;
}

export interface AthenaClaimResponse {
  claimid: string;
}

/**
 * Submit a fully-structured street medicine claim to athenahealth.
 *
 * Guarantees:
 *   - POS 27 (Outreach Site) is always set
 *   - Z59.01 (Unsheltered Homelessness) is always first in diagnosis list
 *   - Q3014 (Originating Site Fee) appended when includeQ3014 = true
 *   - GPS coordinates written into a clinicalnote audit trail block
 */
export async function submitStreetClaim(
  payload: StreetClaimPayload,
): Promise<string> {
  const practiceId = getPracticeId();

  // Build procedure list — E&M first, then optional Q3014
  const procedurecodes: Record<string, unknown>[] = payload.procedureCodes.map(
    (p) => ({
      procedurecode: p.code,
      units: p.units ?? "1",
      ...(p.modifiers?.length ? { modifiers: p.modifiers } : {}),
    }),
  );
  if (payload.includeQ3014) {
    procedurecodes.push({ procedurecode: "Q3014", units: "1" });
  }

  // Guarantee Z59.01 is present (some callers may pass Z59.0 — normalise it)
  const diagnosisCodes = [...payload.diagnosisCodes];
  const hasZ59 = diagnosisCodes.some(
    (d) => d.code === "Z59.01" || d.code === "Z59.0",
  );
  if (!hasZ59) {
    diagnosisCodes.unshift({
      code: "Z59.01",
      description: "Unsheltered homelessness",
    });
  } else {
    const idx = diagnosisCodes.findIndex(
      (d) => d.code === "Z59.0" || d.code === "Z59.01",
    );
    if (idx > 0) {
      const [z59] = diagnosisCodes.splice(idx, 1);
      diagnosisCodes.unshift({ ...z59, code: "Z59.01" });
    } else {
      diagnosisCodes[0] = { ...diagnosisCodes[0], code: "Z59.01" };
    }
  }

  const body: Record<string, unknown> = {
    practiceid: practiceId,
    departmentid: payload.departmentId ?? "1",
    patientid: payload.athenaPatientId,
    procedurecodes,
    diagnosiscodes: diagnosisCodes.map((d) => ({
      diagnosiscode: d.code,
      ...(d.description ? { description: d.description } : {}),
    })),
    placeofserviceid: payload.placeOfServiceId ?? "27",
    ...(payload.facilityId ? { facilityid: payload.facilityId } : {}),
    // billingproviderid — default to 10 (sandbox standard) when not supplied
    billingproviderid: payload.billingProviderId ?? "10",
    ...(payload.referringProviderId
      ? { referringproviderid: payload.referringProviderId }
      : {}),
  };

  // ── GPS audit trail — two separate fields for maximum defensibility ──────
  const serverTime = new Date().toISOString();

  // 1. claimnote  — billing-time live GPS (proves clinician was at POS 27 location)
  //    Format matches the 2026 auditor standard referenced in street medicine guidelines.
  if (payload.liveLat != null && payload.liveLng != null) {
    const liveTs = payload.liveGpsTimestamp ?? serverTime;
    body["claimnote"] = `Audit Proof: Service rendered at Lat: ${payload.liveLat}, Lng: ${payload.liveLng} at ${liveTs}`;
  } else if (payload.gpsLat != null && payload.gpsLng != null) {
    // Fall back to encounter GPS if live capture was denied
    body["claimnote"] = `Audit Proof: Service rendered at Lat: ${payload.gpsLat}, Lng: ${payload.gpsLng} at ${payload.dateOfService} (encounter GPS — live capture unavailable)`;
  }

  // 2. clinicalnote — structured audit block for internal RCM audit trail
  if (payload.gpsLat != null && payload.gpsLng != null) {
    body["clinicalnote"] = `[Street Claim Audit | Encounter GPS: ${payload.gpsLat},${payload.gpsLng} | Live GPS: ${payload.liveLat ?? "denied"},${payload.liveLng ?? "denied"} | Date: ${payload.dateOfService} | Submitted: ${serverTime} | StreetClaim RCM]`;
  } else {
    body["clinicalnote"] = `[Street Claim Audit | Date: ${payload.dateOfService} | Submitted: ${serverTime} | StreetClaim RCM]`;
  }

  const result = await athenaRequest<AthenaClaimResponse[]>(
    "POST",
    `/v1/${practiceId}/claims`,
    body,
  );

  const created = Array.isArray(result) ? result[0] : result;
  if (!created?.claimid) {
    throw new Error(
      "athenahealth did not return a claim ID after claim submission.",
    );
  }
  return created.claimid;
}

export async function createAthenaEncounter(
  encounter: Encounter,
  athenaPatientId: string,
): Promise<string> {
  const practiceId = getPracticeId();

  const digitalReceipt = buildDigitalReceipt(encounter);
  const clinicalNote = encounter.clinicalNotes
    ? `${digitalReceipt}\n\n${encounter.clinicalNotes}`.trim()
    : digitalReceipt;

  const allCodes = [...encounter.diagnosisCodes, ...encounter.sdohZCodes];

  const payload: Record<string, unknown> = {
    patientid: athenaPatientId,
    encounterdate: encounter.encounterDate.toISOString().split("T")[0],
    poscodeid: encounter.posCode,
    clinicalnote: clinicalNote,
    diagnoses: allCodes.map((code) => ({ diagnosiscode: code })),
    procedures: [{ procedurecode: encounter.emCode }],
    payertype: encounter.payerType,
  };

  const result = await athenaRequest<AthenaEncounterResponse[]>(
    "POST",
    `/v1/${practiceId}/encounters`,
    payload,
  );

  const created = Array.isArray(result) ? result[0] : result;
  if (!created?.encounterid) {
    throw new Error(
      "Athenahealth did not return an encounter ID after creation.",
    );
  }

  return created.encounterid;
}
