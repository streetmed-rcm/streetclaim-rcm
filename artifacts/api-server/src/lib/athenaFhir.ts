import { getAccessToken } from "./athenaAuth.js";

function getBaseUrl(): string {
  const baseUrl = process.env["ATHENA_BASE_URL"];
  if (!baseUrl) {
    throw new Error("Missing ATHENA_BASE_URL environment variable.");
  }
  return baseUrl;
}

function getPracticeId(): string {
  const practiceId = process.env["ATHENA_PRACTICE_ID"];
  if (!practiceId) {
    throw new Error("Missing ATHENA_PRACTICE_ID environment variable.");
  }
  return practiceId;
}

async function fhirRequest<T>(path: string, params?: Record<string, string>): Promise<T> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();

  const url = new URL(`${baseUrl}/fhir/r4${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/fhir+json",
    },
  });

  if (!response.ok) {
    let errMsg = `athenahealth FHIR error (${response.status})`;
    try {
      const body = (await response.json()) as { issue?: Array<{ diagnostics?: string }> };
      const diag = body.issue?.[0]?.diagnostics;
      if (diag) errMsg = `${errMsg}: ${diag}`;
    } catch {
      try {
        const text = await response.text();
        if (text) errMsg = `${errMsg}: ${text}`;
      } catch { /* ignore */ }
    }
    const err = new Error(errMsg) as Error & { statusCode: number };
    err.statusCode = response.status;
    throw err;
  }

  return response.json() as Promise<T>;
}

export interface FhirBundle {
  resourceType: "Bundle";
  total?: number;
  entry?: Array<{ resource: unknown }>;
}

export interface FhirPatient {
  resourceType: "Patient";
  id: string;
  name?: Array<{ family?: string; given?: string[] }>;
  birthDate?: string;
  gender?: string;
  address?: Array<{
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
  }>;
  identifier?: Array<{ system?: string; value?: string }>;
}

export interface PatientSearchParams {
  family?: string;
  given?: string;
  birthdate?: string;
  identifier?: string;
  _count?: string;
  _offset?: string;
}

export async function searchPatients(params: PatientSearchParams): Promise<FhirBundle> {
  const cleaned: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") cleaned[k] = v;
  }
  return fhirRequest<FhirBundle>("/Patient", cleaned);
}

export async function getPatientById(patientId: string): Promise<FhirPatient> {
  return fhirRequest<FhirPatient>(`/Patient/${patientId}`);
}

export interface ObservationSearchParams {
  patient: string;
  category?: string;
  code?: string;
  date?: string;
  _count?: string;
  _sort?: string;
}

export async function getObservations(params: ObservationSearchParams): Promise<FhirBundle> {
  return fhirRequest<FhirBundle>("/Observation", params as Record<string, string>);
}

export interface ConditionSearchParams {
  patient: string;
  "clinical-status"?: string;
  category?: string;
  code?: string;
  _count?: string;
}

export async function getConditions(params: ConditionSearchParams): Promise<FhirBundle> {
  return fhirRequest<FhirBundle>("/Condition", params as Record<string, string>);
}

export interface AllergySearchParams {
  patient: string;
  "clinical-status"?: string;
  _count?: string;
}

export async function getAllergyIntolerances(params: AllergySearchParams): Promise<FhirBundle> {
  return fhirRequest<FhirBundle>("/AllergyIntolerance", params as Record<string, string>);
}

export async function getCcdaExport(patientId: string): Promise<string> {
  const token = await getAccessToken();
  const baseUrl = getBaseUrl();
  const practiceId = getPracticeId();

  const url = `${baseUrl}/v1/${practiceId}/ccda/${patientId}/ccdaexport`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/xml",
    },
  });

  if (!response.ok) {
    let errMsg = `CCDA export error (${response.status})`;
    try {
      const text = await response.text();
      if (text) errMsg = `${errMsg}: ${text}`;
    } catch { /* ignore */ }
    const err = new Error(errMsg) as Error & { statusCode: number };
    err.statusCode = response.status;
    throw err;
  }

  return response.text();
}
