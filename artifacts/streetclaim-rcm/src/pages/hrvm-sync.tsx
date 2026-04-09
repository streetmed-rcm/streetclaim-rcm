import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  Link2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Copy,
  Check,
  RefreshCw,
  Zap,
  BadgeCheck,
  CalendarDays,
  Heart,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InsuranceRow {
  insuranceId?: string;
  name?:        string;
  planName?:    string;
  memberId?:    string;
  sequence?:    string;
  eligibility?: string;
  lastChecked?: string;
}

interface RteResult {
  patientId:    string;
  cin:          string | null;
  cinSource:    string | null;
  planName:     string | null;
  totalPlans:   number;
  insurances:   InsuranceRow[];
  rteTimestamp: string;
  endpoint:     string;
  error?:       string;
}

interface HrvmPayload {
  system_metadata: {
    source:        string;
    athena_app_id: string;
    timestamp:     string;
  };
  patient: {
    cin:       string;
    name:      string;
    athena_id: string;
  };
  clinical_risk: {
    sdoh_code:   string;
    pos:         string;
    geolocation: string;
  };
  service_link: {
    medi_cal_plan:      string;
    ecm_enrolled:       boolean;
    next_outreach_date: string;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MEDI_CAL_PLANS = [
  "L.A. Care Health Plan",
  "Health Net Medi-Cal",
  "Molina Healthcare of California",
  "Anthem Blue Cross Medi-Cal",
  "Kaiser Permanente Medi-Cal",
  "Blue Shield of California Promise Health Plan",
  "IEHP Medi-Cal",
  "CalOptima",
  "Other Medi-Cal Plan",
];

function twoWeeksOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function JsonBlock({ value }: { value: unknown }) {
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="relative">
      <pre className="text-[11px] font-mono leading-relaxed bg-gray-900 text-green-300 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
        {text}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
      >
        {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
      </button>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function HrvmSyncPage() {
  const [patientId,        setPatientId]        = useState("");
  const [patientName,      setPatientName]       = useState("");
  const [cin,              setCin]               = useState("");
  const [mediCalPlan,      setMediCalPlan]       = useState(MEDI_CAL_PLANS[0]);
  const [ecmEnrolled,      setEcmEnrolled]       = useState(false);
  const [nextOutreachDate, setNextOutreachDate]  = useState(twoWeeksOut());
  const [lat,              setLat]               = useState("");
  const [lng,              setLng]               = useState("");
  const [gpsState,         setGpsState]          = useState<"idle" | "getting" | "done" | "denied">("idle");

  const [rteLoading, setRteLoading] = useState(false);
  const [rteResult,  setRteResult]  = useState<RteResult | null>(null);
  const [rteError,   setRteError]   = useState("");

  const [syncLoading, setSyncLoading] = useState(false);
  const [payload,     setPayload]     = useState<HrvmPayload | null>(null);
  const [syncError,   setSyncError]   = useState("");

  // ── GPS ──────────────────────────────────────────────────────────────────

  function captureGps() {
    setGpsState("getting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsState("done");
      },
      () => setGpsState("denied"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // ── RTE Check ────────────────────────────────────────────────────────────

  async function runRte() {
    if (!patientId.trim()) { setRteError("Enter an Athena Patient ID first."); return; }
    setRteLoading(true);
    setRteError("");
    setRteResult(null);

    try {
      const res  = await fetch("/api/athena/hrvm/rte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: patientId.trim() }),
      });
      const data = await res.json() as RteResult;
      if (!res.ok) { setRteError(data.error ?? `HTTP ${res.status}`); return; }
      setRteResult(data);
      if (data.cin)      setCin(data.cin);
      if (data.planName) setMediCalPlan(data.planName);
    } catch (err) {
      setRteError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRteLoading(false);
    }
  }

  // ── Sync Payload ─────────────────────────────────────────────────────────

  async function buildSync() {
    setSyncLoading(true);
    setSyncError("");
    setPayload(null);

    try {
      const body = {
        patientId:       patientId.trim(),
        patientName:     patientName.trim() || "Street Medicine Patient",
        cin:             cin.trim(),
        lat:             parseFloat(lat) || 34.0522,
        lng:             parseFloat(lng) || -118.2437,
        mediCalPlan,
        ecmEnrolled,
        nextOutreachDate,
      };
      const res  = await fetch("/api/athena/hrvm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json() as HrvmPayload & { error?: string };
      if (!res.ok) { setSyncError(data.error ?? `HTTP ${res.status}`); return; }
      setPayload(data);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSyncLoading(false);
    }
  }

  const canSync = patientId.trim() && cin.trim() && mediCalPlan.trim() && nextOutreachDate;

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* Back */}
        <Link href="/">
          <button className="text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
        </Link>

        {/* Header */}
        <div className="flex items-start gap-2">
          <Link2 className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">HRVM Sync</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Real Time Eligibility → Medi-Cal CIN → HRVM Link Payload
            </p>
          </div>
        </div>

        {/* V25 deadline notice */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">V25 Endpoints Active · V22 Sunset May 1, 2026</p>
            <p className="text-xs text-amber-600 mt-0.5">
              All calls use <code className="bg-amber-100 px-0.5 rounded text-amber-700">ap25sandbox.fhirapi.athenahealth.com/demoAPIServer</code>.
              V22 will be discontinued May 1 — StreetClaim is already migrated. ✓
            </p>
          </div>
        </div>

        {/* ── Step 1: Patient identity ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
              Patient Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Athena Patient ID *</p>
                <input
                  type="text"
                  value={patientId}
                  onChange={e => setPatientId(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white font-mono"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Patient Name</p>
                <input
                  type="text"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="First Last"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Step 2: RTE Check ─────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
              Real Time Eligibility (RTE) Check
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <p className="text-xs text-gray-500">
              Queries athenahealth for all insurance records on file. The Medi-Cal CIN is extracted
              automatically and pre-fills Step 3.
            </p>

            <button
              onClick={runRte}
              disabled={rteLoading || !patientId.trim()}
              className="w-full flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
            >
              {rteLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking athenahealth…</>
                : <><Zap className="w-3.5 h-3.5" /> Run RTE Check</>
              }
            </button>

            {rteError && (
              <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600">{rteError}</p>
              </div>
            )}

            {rteResult && !rteError && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  RTE complete · {rteResult.totalPlans} plan{rteResult.totalPlans !== 1 ? "s" : ""} found
                </div>

                {rteResult.cin ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5" /> CIN Extracted
                    </p>
                    <p className="text-sm font-mono font-bold text-emerald-900 mt-0.5">{rteResult.cin}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Source: {rteResult.cinSource}</p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700">No CIN found — enter manually in Step 3.</p>
                  </div>
                )}

                {rteResult.insurances.length > 0 && (
                  <div className="rounded-lg border border-gray-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Plan</th>
                          <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Member ID</th>
                          <th className="text-left px-3 py-1.5 text-gray-500 font-medium">Seq</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rteResult.insurances.map((ins, i) => (
                          <tr key={i} className="border-t border-gray-50">
                            <td className="px-3 py-1.5 text-gray-700">{ins.name ?? ins.planName ?? "—"}</td>
                            <td className="px-3 py-1.5 font-mono text-gray-700">{ins.memberId ?? "—"}</td>
                            <td className="px-3 py-1.5 text-gray-400">{ins.sequence ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-[10px] text-gray-400">
                  Endpoint: {rteResult.endpoint} · {new Date(rteResult.rteTimestamp).toLocaleTimeString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Step 3: Sync parameters ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">3</span>
              Sync Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">

            {/* CIN */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Medi-Cal CIN *</p>
              <input
                type="text"
                value={cin}
                onChange={e => setCin(e.target.value)}
                placeholder="e.g. 987654321A — auto-filled from RTE"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white font-mono"
              />
            </div>

            {/* Medi-Cal Plan */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Medi-Cal Plan *</p>
              <select
                value={mediCalPlan}
                onChange={e => setMediCalPlan(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
              >
                {MEDI_CAL_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* GPS */}
            <div>
              <p className="text-xs text-gray-500 mb-1">GPS Coordinates (Audit Proof)</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={lat}
                  onChange={e => setLat(e.target.value)}
                  placeholder="Lat (e.g. 34.0522)"
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white font-mono"
                />
                <input
                  type="text"
                  value={lng}
                  onChange={e => setLng(e.target.value)}
                  placeholder="Lng (e.g. -118.2437)"
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white font-mono"
                />
                <button
                  onClick={captureGps}
                  disabled={gpsState === "getting"}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {gpsState === "getting"
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <MapPin className="w-3 h-3" />}
                  {gpsState === "done" ? "✓" : gpsState === "denied" ? "!" : "GPS"}
                </button>
              </div>
              {gpsState === "denied" && (
                <p className="text-[10px] text-red-500 mt-1">GPS denied — enter coordinates manually or use default LA coordinates.</p>
              )}
              {gpsState === "done" && (
                <p className="text-[10px] text-emerald-600 mt-1">Device GPS captured — live audit stamp ready.</p>
              )}
            </div>

            {/* ECM + Next outreach */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">ECM Enrolled</p>
                <button
                  onClick={() => setEcmEnrolled(p => !p)}
                  className={`w-full py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                    ecmEnrolled
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-purple-400"
                  }`}
                >
                  <Heart className={`w-3 h-3 inline mr-1 ${ecmEnrolled ? "fill-white" : ""}`} />
                  {ecmEnrolled ? "Yes — ECM" : "No ECM"}
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Next Outreach Date *</p>
                <div className="relative">
                  <CalendarDays className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={nextOutreachDate}
                    onChange={e => setNextOutreachDate(e.target.value)}
                    className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Build Payload button ───────────────────────────────────────── */}
        <button
          onClick={buildSync}
          disabled={syncLoading || !canSync}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-700 text-white rounded-xl text-sm font-bold hover:bg-purple-800 disabled:opacity-40 disabled:cursor-not-allowed shadow"
        >
          {syncLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Building payload…</>
            : <><RefreshCw className="w-4 h-4" /> Build HRVM Sync Payload</>
          }
        </button>
        {!canSync && !syncLoading && (
          <p className="text-[10px] text-center text-gray-400">
            Patient ID + CIN + Medi-Cal plan + next outreach date are required.
          </p>
        )}

        {syncError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{syncError}</p>
          </div>
        )}

        {/* ── Payload output ────────────────────────────────────────────── */}
        {payload && (
          <>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">HRVM Sync Payload Ready</p>
            </div>

            {/* Key/value summary */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-500">CIN</p>
                <p className="font-mono font-bold text-gray-900 mt-0.5">{payload.patient.cin}</p>
              </div>
              <div className="p-2.5 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-500">Athena ID</p>
                <p className="font-mono font-bold text-gray-900 mt-0.5">{payload.patient.athena_id}</p>
              </div>
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-indigo-600">SDOH Code</p>
                <p className="font-mono font-bold text-indigo-900 mt-0.5">{payload.clinical_risk.sdoh_code}</p>
              </div>
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-600">POS</p>
                <p className="font-mono font-bold text-blue-900 mt-0.5">{payload.clinical_risk.pos} (Street)</p>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Geolocation Audit Stamp</p>
                <p className="text-xs font-mono text-emerald-700 mt-0.5">{payload.clinical_risk.geolocation}</p>
              </div>
            </div>

            <JsonBlock value={payload} />

            <p className="text-[10px] text-gray-400 text-center">
              Built by StreetClaim · App ID {payload.system_metadata.athena_app_id} ·{" "}
              {new Date(payload.system_metadata.timestamp).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
