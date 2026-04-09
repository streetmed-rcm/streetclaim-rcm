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
  Search,
  UserPlus,
  User,
  X,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldCheck,
} from "lucide-react";

function statusColor(status: EncounterRecord["syncStatus"]) {
  switch (status) {
    case "synced":  return "bg-green-100 text-green-800 border-green-200";
    case "failed":  return "bg-red-100 text-red-800 border-red-200";
    default:        return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
}

function deriveEmCode(codes?: string[]): string {
  if (!codes) return "99213";
  return codes.find((c) => /^9921[0-5]$|^9920[2-5]$/.test(c)) ?? "99213";
}

function deriveDiagnoses(codes?: string[]): { code: string; description?: string }[] {
  if (!codes) return [];
  return codes
    .filter((c) => !/^9921[0-5]$|^9920[2-5]$/.test(c))
    .map((c) => {
      if (c === "Z59.0" || c === "Z59.01") return { code: "Z59.01", description: "Unsheltered homelessness" };
      if (c === "Z59.10") return { code: "Z59.10", description: "Inadequate housing" };
      if (c === "Z60.2")  return { code: "Z60.2",  description: "Problems related to living alone" };
      if (c === "Z63.4")  return { code: "Z63.4",  description: "Disappearance of family member" };
      return { code: c };
    });
}

interface AthenaPatient {
  patientid: string;
  firstname?: string;
  lastname?: string;
  dob?: string;
  sex?: string;
  city?: string;
  status?: string;
}

type PatientFinderMode  = "closed" | "search" | "create";
type PatientSearchState = "idle" | "searching" | "done" | "error";
type PatientCreateState = "idle" | "creating" | "done" | "error";
type ClaimSubmitState   = "idle" | "submitting" | "success" | "error";
type SubmitVisitStep    = "idle" | "registering" | "checkin" | "filing" | "done" | "error";
type GpsCaptureStatus   = "idle" | "capturing" | "granted" | "denied";

interface LiveGps {
  lat: number;
  lng: number;
  timestamp: string;
}

/** Request current GPS from the device. Returns null if denied. */
function captureCurrentGps(): Promise<LiveGps | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat:       pos.coords.latitude,
        lng:       pos.coords.longitude,
        timestamp: new Date().toISOString(),
      }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 30_000 },
    );
  });
}

export default function EncounterDetail() {
  const params  = useParams<{ id: string }>();
  const [encounter, setEncounter] = useState<EncounterRecord | null>(null);
  const [loading, setLoading]     = useState(true);

  // Claim fields
  const [athenaPatientId, setAthenaPatientId] = useState("");
  const [emCode, setEmCode]                   = useState("99213");
  const [includeQ3014, setIncludeQ3014]       = useState(false);
  const [claimState, setClaimState]           = useState<{ status: ClaimSubmitState; claimId?: string; error?: string }>({ status: "idle" });

  // Patient finder
  const [finderMode, setFinderMode]           = useState<PatientFinderMode>("closed");
  const [searchFirst, setSearchFirst]         = useState("");
  const [searchLast,  setSearchLast]          = useState("");
  const [searchResults, setSearchResults]     = useState<AthenaPatient[]>([]);
  const [searchState, setSearchState]         = useState<PatientSearchState>("idle");
  const [searchError, setSearchError]         = useState("");

  // Create new patient
  const [createFirst, setCreateFirst]         = useState("");
  const [createLast,  setCreateLast]          = useState("");
  const [createDob,   setCreateDob]           = useState("");
  const [createSex,   setCreateSex]           = useState("M");
  const [createZip,   setCreateZip]           = useState("90033");
  const [createState, setCreateState]         = useState<PatientCreateState>("idle");
  const [createError, setCreateError]         = useState("");

  // Submit Visit (atomic: register + check-in + claim)
  const [svStep,             setSvStep]             = useState<SubmitVisitStep>("idle");
  const [svError,            setSvError]            = useState("");
  const [svIsExisting,       setSvIsExisting]       = useState(false);
  const [svAppointmentId,    setSvAppointmentId]    = useState("");

  // Live GPS capture at billing time
  const [gpsStatus, setGpsStatus] = useState<GpsCaptureStatus>("idle");
  const [liveGps,   setLiveGps]   = useState<LiveGps | null>(null);

  useEffect(() => {
    getEncounter(params.id).then((data) => {
      setEncounter(data ?? null);
      setLoading(false);
      if (data) {
        setAthenaPatientId(data.athenaPatientId ?? "");
        setEmCode(deriveEmCode(data.codes));
        if (data.athenaClaimId) {
          setClaimState({ status: "success", claimId: data.athenaClaimId });
        }
        // Pre-fill search fields from patient name
        const parts = (data.patientName ?? "").trim().split(/\s+/);
        if (parts.length >= 2) {
          setSearchFirst(parts[0]);
          setSearchLast(parts[parts.length - 1]);
        } else if (parts.length === 1) {
          setSearchLast(parts[0]);
        }
        setCreateFirst(parts[0] ?? "");
        setCreateLast(parts.length >= 2 ? parts[parts.length - 1] : "");
      }
    });
  }, [params.id]);

  function openFinder(mode: PatientFinderMode) {
    setFinderMode((prev) => (prev === mode ? "closed" : mode));
    setSearchState("idle");
    setSearchResults([]);
    setSearchError("");
    setCreateState("idle");
    setCreateError("");
  }

  async function handleSearch() {
    if (!searchFirst.trim() && !searchLast.trim()) return;
    setSearchState("searching");
    setSearchResults([]);
    setSearchError("");
    try {
      const qs = new URLSearchParams({ limit: "10" });
      if (searchFirst.trim()) qs.set("firstname", searchFirst.trim());
      if (searchLast.trim())  qs.set("lastname",  searchLast.trim());
      const res = await fetch(`/api/athena/patients?${qs.toString()}`);
      const data = await res.json() as { patients?: AthenaPatient[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setSearchResults(data.patients ?? []);
      setSearchState("done");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setSearchState("error");
    }
  }

  function selectPatient(p: AthenaPatient) {
    setAthenaPatientId(p.patientid);
    setFinderMode("closed");
  }

  async function handleCreate() {
    if (!createFirst.trim() || !createLast.trim() || !createDob.trim()) return;
    setCreateState("creating");
    setCreateError("");
    try {
      const res = await fetch("/api/athena/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname:    createFirst.trim(),
          lastname:     createLast.trim(),
          dob:          createDob.trim(),
          sex:          createSex,
          departmentid: "1",
        }),
      });
      const data = await res.json() as { patientId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setAthenaPatientId(data.patientId!);
      setCreateState("done");
      setTimeout(() => setFinderMode("closed"), 1200);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Create failed");
      setCreateState("idle");
    }
  }

  async function handleSubmitVisit() {
    if (!encounter || !createFirst.trim() || !createLast.trim() || !createDob.trim()) return;
    setSvError("");

    // Step 0: Capture live GPS at billing time (audit pillar 3)
    setGpsStatus("capturing");
    const live = await captureCurrentGps();
    if (live) {
      setLiveGps(live);
      setGpsStatus("granted");
    } else {
      setGpsStatus("denied");
    }

    setSvStep("registering");

    const diagnoses      = deriveDiagnoses(encounter.codes);
    const procedureCodes = [{ code: emCode.trim(), units: "1", modifiers: ["25"] }];

    try {
      const res = await fetch("/api/athena/submit-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname:        createFirst.trim(),
          lastname:         createLast.trim(),
          dob:              createDob.trim(),
          sex:              createSex,
          zip:              createZip.trim() || "90033",
          departmentId:     "1",
          procedureCodes,
          diagnosisCodes:   diagnoses,
          dateOfService:    encounter.dateOfService,
          includeQ3014,
          gpsLat:           encounter.latitude,
          gpsLng:           encounter.longitude,
          liveLat:          live?.lat ?? null,
          liveLng:          live?.lng ?? null,
          liveGpsTimestamp: live?.timestamp ?? null,
        }),
      });

      // Animate steps 2 and 3 briefly (server already completed them)
      setSvStep("checkin");
      await new Promise((r) => setTimeout(r, 450));
      setSvStep("filing");
      await new Promise((r) => setTimeout(r, 450));

      const data = await res.json() as {
        patientId?:         string;
        appointmentId?:     string;
        claimId?:           string;
        isExistingPatient?: boolean;
        error?:             string;
      };

      if (!res.ok) {
        setSvStep("error");
        setSvError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      setSvIsExisting(data.isExistingPatient ?? false);
      setSvAppointmentId(data.appointmentId ?? "");
      await updateEncounterClaim(encounter.id, data.patientId!, data.claimId!);
      setAthenaPatientId(data.patientId!);
      setEncounter((prev) => prev
        ? { ...prev, athenaPatientId: data.patientId!, athenaClaimId: data.claimId!, claimSubmittedAt: new Date().toISOString() }
        : prev
      );
      setClaimState({ status: "success", claimId: data.claimId });
      setSvStep("done");
      setTimeout(() => setFinderMode("closed"), 1500);
    } catch (err) {
      setSvStep("error");
      setSvError(err instanceof Error ? err.message : "Network error");
    }
  }

  async function handleSubmitClaim() {
    if (!encounter || !athenaPatientId.trim()) return;

    // Capture live GPS at billing time — audit pillar 3
    setGpsStatus("capturing");
    const live = await captureCurrentGps();
    if (live) { setLiveGps(live); setGpsStatus("granted"); }
    else       { setGpsStatus("denied"); }

    setClaimState({ status: "submitting" });
    const diagnoses      = deriveDiagnoses(encounter.codes);
    const procedureCodes = [{ code: emCode.trim(), units: "1", modifiers: ["25"] }];
    try {
      const res = await fetch("/api/athena/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athenaPatientId:  athenaPatientId.trim(),
          procedureCodes,
          diagnosisCodes:   diagnoses,
          dateOfService:    encounter.dateOfService,
          placeOfServiceId: encounter.posCode ?? "27",
          includeQ3014,
          gpsLat:           encounter.latitude,
          gpsLng:           encounter.longitude,
          liveLat:          live?.lat ?? null,
          liveLng:          live?.lng ?? null,
          liveGpsTimestamp: live?.timestamp ?? null,
        }),
      });
      const data = await res.json() as { claimId?: string; error?: string };
      if (!res.ok) {
        setClaimState({ status: "error", error: data.error ?? `HTTP ${res.status}` });
        return;
      }
      await updateEncounterClaim(encounter.id, athenaPatientId.trim(), data.claimId!);
      setEncounter((prev) => prev
        ? { ...prev, athenaPatientId: athenaPatientId.trim(), athenaClaimId: data.claimId, claimSubmittedAt: new Date().toISOString() }
        : prev
      );
      setClaimState({ status: "success", claimId: data.claimId });
    } catch (err) {
      setClaimState({ status: "error", error: err instanceof Error ? err.message : "Network error" });
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

  const hasCodes     = !!(encounter.codes?.length || encounter.posCode);
  const alreadyClaimed = !!encounter.athenaClaimId;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        <Link href="/">
          <button className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
        </Link>

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{encounter.patientName}</h1>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(encounter.syncStatus)}`}>
            {encounter.syncStatus.charAt(0).toUpperCase() + encounter.syncStatus.slice(1)}
          </span>
        </div>

        {/* ── Encounter Details ── */}
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

        {/* ── Billing Codes ── */}
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
                  <Badge key={code} className="bg-purple-600 text-white text-sm px-3 py-1">
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

        {/* ── Claim Submission ── */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
              <Send className="w-4 h-4 text-blue-500" /> Submit Claim to athenahealth
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pb-4">

            {alreadyClaimed && claimState.status === "success" ? (
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Claim Accepted</p>
                  <p className="text-xs text-green-700 font-mono mt-0.5">Claim ID: {claimState.claimId}</p>
                  {encounter.claimSubmittedAt && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Submitted {new Date(encounter.claimSubmittedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <>
                {claimState.status === "error" && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">{claimState.error}</p>
                  </div>
                )}

                {/* ── Patient ID + Finder ── */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5" /> athenahealth Patient ID
                    <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={athenaPatientId}
                      onChange={(e) => setAthenaPatientId(e.target.value)}
                      placeholder="e.g. 12345"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <button
                      onClick={() => openFinder("search")}
                      className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                        finderMode === "search"
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      Find
                      {finderMode === "search" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                    <button
                      onClick={() => openFinder("create")}
                      className={`flex items-center gap-1 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                        finderMode === "create"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      New
                      {finderMode === "create" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* ── Search Panel ── */}
                  {finderMode === "search" && (
                    <div className="border border-blue-200 rounded-lg p-3 space-y-3 bg-blue-50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-blue-800">Search athenahealth Patients</p>
                        <button onClick={() => setFinderMode("closed")} className="text-blue-400 hover:text-blue-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={searchFirst}
                          onChange={(e) => setSearchFirst(e.target.value)}
                          placeholder="First name"
                          className="flex-1 border border-blue-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <input
                          type="text"
                          value={searchLast}
                          onChange={(e) => setSearchLast(e.target.value)}
                          placeholder="Last name"
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          className="flex-1 border border-blue-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                        />
                        <button
                          onClick={handleSearch}
                          disabled={searchState === "searching"}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                          {searchState === "searching" ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          Search
                        </button>
                      </div>

                      {searchState === "error" && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> {searchError}
                        </p>
                      )}

                      {searchState === "done" && searchResults.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-2">
                          No patients found — try "New" to create one in the sandbox.
                        </p>
                      )}

                      {searchResults.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {searchResults.map((p) => (
                            <button
                              key={p.patientid}
                              onClick={() => selectPatient(p)}
                              className="w-full flex items-center gap-2.5 p-2 bg-white border border-blue-100 rounded-md hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                            >
                              <User className="w-4 h-4 text-blue-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-800 truncate">
                                  {p.firstname} {p.lastname}
                                </p>
                                <p className="text-xs text-gray-500">
                                  DOB: {p.dob ?? "—"} · ID: <span className="font-mono">{p.patientid}</span>
                                  {p.city && ` · ${p.city}`}
                                </p>
                              </div>
                              <span className="text-xs text-blue-600 font-medium shrink-0">Select</span>
                            </button>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-gray-400">
                        Sandbox · Practice ID 195900 · Dept 1 · Provider 10
                      </p>
                    </div>
                  )}

                  {/* ── Create Panel ── */}
                  {finderMode === "create" && (
                    <div className="border border-emerald-200 rounded-lg p-3 space-y-3 bg-emerald-50">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-emerald-800">Create New Patient in athenahealth</p>
                        <button onClick={() => setFinderMode("closed")} className="text-emerald-400 hover:text-emerald-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* ── Submit Visit success ── */}
                      {svStep === "done" ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-emerald-700 text-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-semibold">Check-In &amp; Bill complete!</span>
                          </div>
                          {/* Step 1 */}
                          <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            {svIsExisting
                              ? "Step 1 — Existing patient found, no duplicate created"
                              : "Step 1 — New patient registered in athenahealth"}
                          </div>
                          {svIsExisting && (
                            <p className="text-xs text-blue-600 pl-5">
                              Search-first matched an existing record — patient ID reused safely.
                            </p>
                          )}
                          {/* Step 2 — check-in */}
                          <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Step 2 — Walk-in appointment created, patient status set to ARRIVED
                            {svAppointmentId && (
                              <span className="text-gray-400 font-mono text-xs">
                                (Appt {svAppointmentId})
                              </span>
                            )}
                          </div>
                          {/* Step 3 — claim */}
                          <div className="flex items-center gap-2 text-xs text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Step 3 — POS 27 claim filed with GPS audit stamp
                          </div>
                        </div>
                      ) : createState === "done" ? (
                        <div className="flex items-center gap-2 text-emerald-700 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Patient registered — ID pre-filled in the field above.
                        </div>
                      ) : (
                        <>
                          {/* Errors */}
                          {(createError || svError) && (
                            <p className="text-xs text-red-600 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> {createError || svError}
                            </p>
                          )}

                          {/* Submit Visit step progress (3 steps) */}
                          {(svStep === "registering" || svStep === "checkin" || svStep === "filing") && (
                            <div className="space-y-1.5">
                              {/* Step 1 */}
                              <div className={`flex items-center gap-2 text-xs ${
                                svStep === "registering" ? "text-emerald-700 font-semibold" : "text-emerald-500"
                              }`}>
                                {svStep === "registering"
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <CheckCircle2 className="w-3.5 h-3.5" />
                                }
                                Step 1 of 3 — Searching athenahealth (dedup), then registering if new…
                              </div>
                              {/* Step 2 */}
                              <div className={`flex items-center gap-2 text-xs ${
                                svStep === "checkin" ? "text-emerald-700 font-semibold" :
                                svStep === "filing"  ? "text-emerald-500" : "text-gray-400"
                              }`}>
                                {svStep === "registering"
                                  ? <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                                  : svStep === "checkin"
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <CheckCircle2 className="w-3.5 h-3.5" />
                                }
                                Step 2 of 3 — Scheduling walk-in appointment + checking in (ARRIVED)…
                              </div>
                              {/* Step 3 */}
                              <div className={`flex items-center gap-2 text-xs ${
                                svStep === "filing" ? "text-emerald-700 font-semibold" : "text-gray-400"
                              }`}>
                                {svStep === "filing"
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                                }
                                Step 3 of 3 — Filing POS 27 claim with GPS audit stamp…
                              </div>
                            </div>
                          )}

                          {/* Fields */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-emerald-700 mb-1">First name *</p>
                              <input
                                type="text"
                                value={createFirst}
                                onChange={(e) => setCreateFirst(e.target.value)}
                                placeholder="Maria"
                                className="w-full border border-emerald-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-emerald-700 mb-1">Last name *</p>
                              <input
                                type="text"
                                value={createLast}
                                onChange={(e) => setCreateLast(e.target.value)}
                                placeholder="Garcia"
                                className="w-full border border-emerald-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-emerald-700 mb-1">DOB * (MM/DD/YYYY)</p>
                              <input
                                type="text"
                                value={createDob}
                                onChange={(e) => setCreateDob(e.target.value)}
                                placeholder="01/15/1980"
                                className="w-full border border-emerald-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                            <div>
                              <p className="text-xs text-emerald-700 mb-1">Sex</p>
                              <select
                                value={createSex}
                                onChange={(e) => setCreateSex(e.target.value)}
                                className="w-full border border-emerald-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              >
                                <option value="M">Male</option>
                                <option value="F">Female</option>
                                <option value="O">Other / Unknown</option>
                              </select>
                            </div>
                            <div className="col-span-2">
                              <p className="text-xs text-emerald-700 mb-1">ZIP Code</p>
                              <input
                                type="text"
                                value={createZip}
                                onChange={(e) => setCreateZip(e.target.value)}
                                placeholder="90033"
                                maxLength={10}
                                className="w-full border border-emerald-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
                              />
                            </div>
                          </div>

                          {/* Primary action — atomic Submit Visit */}
                          <button
                            onClick={handleSubmitVisit}
                            disabled={svStep === "registering" || svStep === "filing" || !createFirst.trim() || !createLast.trim() || !createDob.trim()}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 shadow-sm"
                          >
                            {(svStep === "registering" || svStep === "filing") ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Working…</>
                            ) : (
                              <><Send className="w-3.5 h-3.5" /> Submit Visit (Register + POS 27 Claim)</>
                            )}
                          </button>

                          {/* Secondary action — register only */}
                          <button
                            onClick={handleCreate}
                            disabled={createState === "creating" || svStep === "registering" || svStep === "filing" || !createFirst.trim() || !createLast.trim() || !createDob.trim()}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-xs font-medium hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {createState === "creating" ? (
                              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering…</>
                            ) : (
                              <><UserPlus className="w-3.5 h-3.5" /> Register Only (no claim yet)</>
                            )}
                          </button>

                          <p className="text-xs text-gray-400 text-center">
                            Practice 195900 · Dept 1 · Z59.01 guaranteed
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* ── E&M Code ── */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">E&M Procedure Code</label>
                  <select
                    value={emCode}
                    onChange={(e) => setEmCode(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="99202">99202 — New patient, low complexity</option>
                    <option value="99203">99203 — New patient, moderate complexity</option>
                    <option value="99204">99204 — New patient, moderate-high complexity</option>
                    <option value="99211">99211 — Established, minimal</option>
                    <option value="99212">99212 — Established, straightforward</option>
                    <option value="99213">99213 — Established, low complexity</option>
                    <option value="99214">99214 — Established, moderate complexity</option>
                    <option value="99215">99215 — Established, high complexity</option>
                  </select>
                </div>

                {/* ── Compliance Checklist ── */}
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">2026 Compliance</p>
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
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    Modifier 25 applied to E&M code
                  </div>
                </div>

                {/* ── Q3014 Toggle ── */}
                <label className="flex items-start gap-2.5 cursor-pointer">
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
                      Include if a remote specialist was consulted via tablet during this visit.
                    </p>
                  </div>
                </label>

                {/* ── GPS Audit Badge ── */}
                {gpsStatus !== "idle" && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs border ${
                    gpsStatus === "capturing" ? "bg-blue-50 border-blue-200 text-blue-700" :
                    gpsStatus === "granted"   ? "bg-green-50 border-green-200 text-green-700" :
                                               "bg-yellow-50 border-yellow-200 text-yellow-700"
                  }`}>
                    {gpsStatus === "capturing" && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                    {gpsStatus === "granted"   && <ShieldCheck className="w-3.5 h-3.5 shrink-0" />}
                    {gpsStatus === "denied"    && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                    <span>
                      {gpsStatus === "capturing" && "Capturing your location for POS 27 audit proof…"}
                      {gpsStatus === "granted"   && liveGps && `GPS locked: ${liveGps.lat.toFixed(5)}, ${liveGps.lng.toFixed(5)} — stamped on claim`}
                      {gpsStatus === "denied"    && "GPS unavailable — encounter coordinates used as fallback"}
                    </span>
                    {gpsStatus === "granted" && <Lock className="w-3 h-3 ml-auto shrink-0" />}
                  </div>
                )}

                {/* ── Submit Button ── */}
                <Button
                  onClick={handleSubmitClaim}
                  disabled={claimState.status === "submitting" || gpsStatus === "capturing" || !athenaPatientId.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {gpsStatus === "capturing" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Locking GPS…</>
                  ) : claimState.status === "submitting" ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting Claim…</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> Submit Street Claim (POS 27)</>
                  )}
                </Button>

                <p className="text-xs text-gray-400 text-center">
                  Sandbox · Practice 195900 · Dept 1 · Provider 10 · Z59.01 + GPS claimnote
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
