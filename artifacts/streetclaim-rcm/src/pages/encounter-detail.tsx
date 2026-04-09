import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEncounter, updateEncounterClaim, EncounterRecord } from "@/lib/encounter-store";
import {
  MapPin,
  Calendar,
  FileText,
  Tag,
  Send,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Loader2,
  Stethoscope,
  Radio,
} from "lucide-react";

function statusColor(status: EncounterRecord["syncStatus"]) {
  switch (status) {
    case "synced":
      return "bg-green-100 text-green-800 border-green-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
}

function deriveEmCode(codes?: string[]): string {
  if (!codes) return "99213";
  const em = codes.find((c) => c.match(/^9921[0-5]$|^9920[2-5]$/));
  return em ?? "99213";
}

function deriveDiagnoses(codes?: string[]): { code: string; description?: string }[] {
  if (!codes) return [];
  return codes
    .filter((c) => !c.match(/^9921[0-5]$|^9920[2-5]$/))
    .map((c) => {
      if (c === "Z59.0" || c === "Z59.01") return { code: "Z59.01", description: "Unsheltered homelessness" };
      if (c === "Z59.10") return { code: "Z59.10", description: "Inadequate housing" };
      if (c === "Z60.2") return { code: "Z60.2", description: "Problems related to living alone" };
      if (c === "Z63.4") return { code: "Z63.4", description: "Disappearance of family member" };
      return { code: c };
    });
}

interface ClaimState {
  status: "idle" | "submitting" | "success" | "error";
  claimId?: string;
  error?: string;
}

export default function EncounterDetail() {
  const params = useParams<{ id: string }>();
  const [encounter, setEncounter] = useState<EncounterRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const [athenaPatientId, setAthenaPatientId] = useState("");
  const [emCode, setEmCode] = useState("99213");
  const [includeQ3014, setIncludeQ3014] = useState(false);
  const [claim, setClaim] = useState<ClaimState>({ status: "idle" });

  useEffect(() => {
    getEncounter(params.id).then((data) => {
      setEncounter(data ?? null);
      setLoading(false);
      if (data) {
        setAthenaPatientId(data.athenaPatientId ?? "");
        setEmCode(deriveEmCode(data.codes));
        if (data.athenaClaimId) {
          setClaim({ status: "success", claimId: data.athenaClaimId });
        }
      }
    });
  }, [params.id]);

  async function handleSubmitClaim() {
    if (!encounter || !athenaPatientId.trim()) return;

    setClaim({ status: "submitting" });

    const diagnoses = deriveDiagnoses(encounter.codes);
    const procedureCodes = [{ code: emCode.trim(), units: "1", modifiers: ["25"] }];

    try {
      const res = await fetch("/api/athena/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athenaPatientId: athenaPatientId.trim(),
          procedureCodes,
          diagnosisCodes: diagnoses,
          dateOfService: encounter.dateOfService,
          placeOfServiceId: encounter.posCode ?? "27",
          includeQ3014,
          gpsLat: encounter.latitude,
          gpsLng: encounter.longitude,
        }),
      });

      const data = await res.json() as { claimId?: string; error?: string };

      if (!res.ok) {
        setClaim({ status: "error", error: data.error ?? `HTTP ${res.status}` });
        return;
      }

      await updateEncounterClaim(encounter.id, athenaPatientId.trim(), data.claimId!);
      setEncounter((prev) =>
        prev
          ? { ...prev, athenaPatientId: athenaPatientId.trim(), athenaClaimId: data.claimId, claimSubmittedAt: new Date().toISOString() }
          : prev
      );
      setClaim({ status: "success", claimId: data.claimId });
    } catch (err) {
      setClaim({ status: "error", error: err instanceof Error ? err.message : "Network error" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Encounter not found.</p>
      </div>
    );
  }

  const hasCodes = !!(encounter.codes?.length || encounter.posCode);
  const alreadyClaimed = !!encounter.athenaClaimId;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        <div className="flex items-center gap-2">
          <Link href="/">
            <button className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{encounter.patientName}</h1>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(
              encounter.syncStatus
            )}`}
          >
            {encounter.syncStatus.charAt(0).toUpperCase() + encounter.syncStatus.slice(1)}
          </span>
        </div>

        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Encounter Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Date of Service</p>
                <p className="text-sm font-medium text-gray-800">{encounter.dateOfService}</p>
              </div>
            </div>
            {encounter.latitude !== null && encounter.longitude !== null && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">GPS Location (POS 27 Audit)</p>
                  <p className="text-sm font-medium text-gray-800 font-mono">
                    {encounter.latitude.toFixed(5)}, {encounter.longitude.toFixed(5)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Clinical Note</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{encounter.clinicalNote}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {hasCodes && (
          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Auto-Applied Billing Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-wrap gap-2">
                {encounter.codes?.map((code) => (
                  <Badge
                    key={code}
                    className="bg-purple-600 text-white text-sm px-3 py-1"
                  >
                    {code === "Z59.0" || code === "Z59.01" ? "Z59.01 — Unsheltered Homelessness" : code}
                  </Badge>
                ))}
                {encounter.posCode && (
                  <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                    POS {encounter.posCode} — Outreach Site
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Send className="w-4 h-4 text-blue-500" /> Submit Claim to athenahealth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">

            {alreadyClaimed && claim.status === "success" ? (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Claim Accepted</p>
                  <p className="text-xs text-green-700 font-mono mt-0.5">
                    Claim ID: {claim.claimId}
                  </p>
                  {encounter.claimSubmittedAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Submitted {new Date(encounter.claimSubmittedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {claim.status === "error" && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{claim.error}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" /> athenahealth Patient ID
                    <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={athenaPatientId}
                    onChange={(e) => setAthenaPatientId(e.target.value)}
                    placeholder="e.g. 12345"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400">
                    The patient must already exist in athenahealth. Use the sandbox ID from your practice (195900).
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    E&M Procedure Code
                  </label>
                  <select
                    value={emCode}
                    onChange={(e) => setEmCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="99202">99202 — Office visit, new patient, low complexity</option>
                    <option value="99203">99203 — Office visit, new patient, moderate complexity</option>
                    <option value="99204">99204 — Office visit, new patient, moderate-high complexity</option>
                    <option value="99211">99211 — Office visit, established, minimal</option>
                    <option value="99212">99212 — Office visit, established, straightforward</option>
                    <option value="99213">99213 — Office visit, established, low complexity</option>
                    <option value="99214">99214 — Office visit, established, moderate complexity</option>
                    <option value="99215">99215 — Office visit, established, high complexity</option>
                  </select>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Compliance Checklist</p>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    POS 27 (Outreach Site) — always applied
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Z59.01 (Unsheltered Homelessness) — guaranteed first dx
                  </div>
                  {encounter.latitude !== null && (
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      GPS coordinates stamped in claim audit block
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={includeQ3014}
                    onChange={(e) => setIncludeQ3014(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-800 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-indigo-500" />
                      Add Q3014 — Originating Site Fee
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Include if a remote specialist was consulted via tablet during this visit (telehealth originating site).
                    </p>
                  </div>
                </label>

                <Button
                  onClick={handleSubmitClaim}
                  disabled={
                    claim.status === "submitting" || !athenaPatientId.trim()
                  }
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {claim.status === "submitting" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting Claim…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Submit Street Claim (POS 27)
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Claim submits to athenahealth Sandbox · Practice ID 195900
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-gray-400 text-center">
          Created {new Date(encounter.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
