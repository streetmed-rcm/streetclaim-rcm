import { getAccessToken } from "./athenaAuth.js";
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

async function athenaRequest<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const token = await getAccessToken();
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
