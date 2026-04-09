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

export async function createAthenaPatient(patient: Patient): Promise<string> {
  const practiceId = getPracticeId();

  const payload: Record<string, unknown> = {
    firstname: patient.firstName,
    lastname: patient.lastName,
    dob: patient.dateOfBirth,
  };

  if (patient.medicaidId) {
    payload["medicaidid"] = patient.medicaidId;
  }
  if (patient.medicareId) {
    payload["medicareid"] = patient.medicareId;
  }

  const result = await athenaRequest<AthenaPatientResponse[]>(
    "POST",
    `/v1/${practiceId}/patients`,
    payload,
  );

  const created = Array.isArray(result) ? result[0] : result;
  if (!created?.patientid) {
    throw new Error("Athenahealth did not return a patient ID after creation.");
  }

  return created.patientid;
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
  gpsLat?: number | null;
  gpsLng?: number | null;
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
    ...(payload.billingProviderId
      ? { billingproviderid: payload.billingProviderId }
      : {}),
    ...(payload.referringProviderId
      ? { referringproviderid: payload.referringProviderId }
      : {}),
  };

  // GPS audit trail block — required for POS 27 audit protection
  const captureTime = new Date().toISOString();
  if (payload.gpsLat != null && payload.gpsLng != null) {
    body["clinicalnote"] = `[Street Claim Audit | GPS: ${payload.gpsLat},${payload.gpsLng} | Date: ${payload.dateOfService} | Submitted: ${captureTime} | StreetClaim RCM]`;
  } else {
    body["clinicalnote"] = `[Street Claim Audit | Date: ${payload.dateOfService} | Submitted: ${captureTime} | StreetClaim RCM]`;
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
