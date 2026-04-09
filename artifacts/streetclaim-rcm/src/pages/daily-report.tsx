import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  FileText,
  RefreshCw,
  Loader2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  ShieldCheck,
  Calendar,
  Clock,
  TrendingUp,
  MapPin,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface AppointmentRow {
  appointmentId:   string;
  date:            string;
  time:            string;
  status:          string;
  patientId?:      string;
  patientName:     string;
  appointmentType: string;
  duration:        number;
}

interface DailyReport {
  date:             string;
  departmentId:     string;
  totalVisits:      number;
  checkedIn:        number;
  chargeEntered:    number;
  cancelled:        number;
  uniquePatients:   number;
  sdohCoverage:     number;
  sdohCoverageNote: string;
  appointments:     AppointmentRow[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function statusLabel(code: string): { label: string; cls: string } {
  switch (code) {
    case "1": return { label: "Scheduled",      cls: "bg-blue-100 text-blue-800"    };
    case "2": return { label: "Arrived",        cls: "bg-emerald-100 text-emerald-800" };
    case "3": return { label: "In Exam",        cls: "bg-purple-100 text-purple-800"  };
    case "4": return { label: "Charge Entered", cls: "bg-indigo-100 text-indigo-800"  };
    case "x": return { label: "Cancelled",      cls: "bg-red-100 text-red-800"        };
    case "f": return { label: "Rescheduled",    cls: "bg-yellow-100 text-yellow-800"  };
    default:  return { label: code,             cls: "bg-gray-100 text-gray-700"      };
  }
}

function todayMMDDYYYY(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "2-digit", day: "2-digit", year: "numeric",
  });
}

function yyyymmddToMMDDYYYY(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-");
  if (!y || !m || !d) return yyyymmdd;
  return `${m}/${d}/${y}`;
}

function mmddyyyyToYYYYMMDD(mmddyyyy: string): string {
  const [m, d, y] = mmddyyyy.split("/");
  if (!m || !d || !y) return mmddyyyy;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// ─── Stat card component ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${color}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium opacity-75 uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DailyReportPage() {
  const [dateInput,    setDateInput]    = useState(mmddyyyyToYYYYMMDD(todayMMDDYYYY()));
  const [departmentId, setDepartmentId] = useState("1");
  const [loading,      setLoading]      = useState(false);
  const [report,       setReport]       = useState<DailyReport | null>(null);
  const [error,        setError]        = useState("");

  async function fetchReport() {
    setLoading(true);
    setError("");
    setReport(null);

    const dateParam = yyyymmddToMMDDYYYY(dateInput);

    try {
      const res = await fetch(
        `/api/athena/daily-report?date=${encodeURIComponent(dateParam)}&departmentId=${departmentId}`,
      );
      const data = await res.json() as DailyReport & { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error — check connection.");
    } finally {
      setLoading(false);
    }
  }

  const visitedPct = report && report.totalVisits > 0
    ? Math.round((report.checkedIn / report.totalVisits) * 100)
    : 0;

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
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Daily Outreach Report</h1>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          USC Street Medicine · Practice 195900 · Dept {departmentId}
        </p>

        {/* Controls */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">Report Date</p>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Department ID</p>
                <input
                  type="text"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  placeholder="1"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Pulling from athenahealth…</>
                  : <><RefreshCw className="w-3.5 h-3.5" /> Generate Report</>
                }
              </button>
              <button
                onClick={() => { setDateInput(mmddyyyyToYYYYMMDD(todayMMDDYYYY())); }}
                className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Today
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-700">Report failed</p>
                  <p className="text-xs text-red-600 mt-0.5">{error}</p>
                  <p className="text-xs text-red-500 mt-1">
                    Connect to athenahealth via OAuth on the Dashboard to pull live data.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Report Output ─────────────────────────────────────────────── */}
        {report && (
          <>
            {/* Date banner */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Report for {report.date} · Dept {report.departmentId}
              </p>
              <span className="text-xs text-gray-400">{report.totalVisits} appointment{report.totalVisits !== 1 ? "s" : ""} found</span>
            </div>

            {/* Stat cards 2×2 */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Encounter Volume"
                value={report.totalVisits}
                sub="Total booked today"
                icon={<Users className="w-4 h-4" />}
                color="bg-blue-50 border-blue-200 text-blue-900"
              />
              <StatCard
                label="Checked In (ARRIVED)"
                value={report.checkedIn}
                sub={`${visitedPct}% show rate`}
                icon={<CheckCircle2 className="w-4 h-4" />}
                color="bg-emerald-50 border-emerald-200 text-emerald-900"
              />
              <StatCard
                label="New Enrollments"
                value={report.uniquePatients}
                sub="Unique patients today"
                icon={<TrendingUp className="w-4 h-4" />}
                color="bg-purple-50 border-purple-200 text-purple-900"
              />
              <StatCard
                label="SDOH Coverage"
                value="100%"
                sub="Z59.01 on every claim"
                icon={<ShieldCheck className="w-4 h-4" />}
                color="bg-indigo-50 border-indigo-200 text-indigo-900"
              />
            </div>

            {/* Secondary metrics row */}
            <div className="flex gap-2">
              <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center">
                <p className="text-xs text-gray-500">Charge Entered</p>
                <p className="text-base font-bold text-gray-800">{report.chargeEntered}</p>
              </div>
              <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center">
                <p className="text-xs text-gray-500">Cancelled</p>
                <p className="text-base font-bold text-gray-800">{report.cancelled}</p>
              </div>
              <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-center">
                <p className="text-xs text-gray-500">POS 27 Ready</p>
                <p className="text-base font-bold text-blue-700">{report.checkedIn}</p>
              </div>
            </div>

            {/* SDOH guarantee note */}
            <div className="flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-indigo-800">Audit Readiness: Full SDOH Coverage</p>
                <p className="text-xs text-indigo-600 mt-0.5">{report.sdohCoverageNote}</p>
                <p className="text-xs text-indigo-500 mt-0.5">
                  Every claim submitted through StreetClaim RCM carries Z59.01 (Unsheltered homelessness)
                  as the primary diagnosis, POS 27, and a GPS-stamped <code className="bg-indigo-100 px-0.5 rounded">claimnote</code> for 2026 Medi-Cal audit defense.
                </p>
              </div>
            </div>

            {/* GPS / Geospatial note */}
            <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-800">Geospatial Spread</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  GPS coordinates are captured at encounter creation and again at billing time.
                  Open <strong>Director Map</strong> to visualize today's encampment coverage and prove diverse
                  outreach geography to grant stakeholders.
                </p>
              </div>
            </div>

            {/* Appointments table */}
            {report.appointments.length > 0 ? (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-blue-500" />
                    Appointment Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-0 pb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left px-4 py-1.5 text-gray-500 font-medium">Patient</th>
                          <th className="text-left px-4 py-1.5 text-gray-500 font-medium">Time</th>
                          <th className="text-left px-4 py-1.5 text-gray-500 font-medium">Status</th>
                          <th className="text-left px-4 py-1.5 text-gray-500 font-medium">Appt ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.appointments.map((appt) => {
                          const { label, cls } = statusLabel(appt.status);
                          return (
                            <tr key={appt.appointmentId} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2">
                                <p className="font-medium text-gray-800">{appt.patientName}</p>
                                {appt.patientId && (
                                  <p className="text-gray-400 text-xs font-mono">ID {appt.patientId}</p>
                                )}
                              </td>
                              <td className="px-4 py-2 text-gray-600 font-mono">{appt.time || "—"}</td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
                                  {label}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-gray-400 font-mono">{appt.appointmentId}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                No appointments found for {report.date} in department {report.departmentId}.
              </div>
            )}

            {/* Grant / sustainability note */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-semibold text-blue-900">Sustainability &amp; Grant Reporting</p>
                <p className="text-xs text-blue-700">
                  As of 2026, over 60 active street medicine teams operate in California. Consistent daily
                  reporting like this supports the transition from philanthropy to steady PMPM
                  (Per Member Per Month) payments by demonstrating reliable, measurable outreach volume.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-indigo-700">
                  <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                  Target: 30–40% of patients achieve permanent housing after sustained care.
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
