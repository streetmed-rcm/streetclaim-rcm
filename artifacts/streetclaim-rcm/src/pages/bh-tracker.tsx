import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  X, Plus, ChevronLeft, ChevronRight, Search, Download,
  UserCheck, Phone, Calendar, FileText, ClipboardCheck,
  AlertCircle, CheckCircle2, Clock, Filter,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type AttemptResult = "answered" | "no_answer" | "left_vm" | "wrong_number" | "disconnected" | "";
type CaseStatus = "open" | "enrolled" | "closed" | "pending";

interface ContactAttempt {
  date: string;
  attemptNum: string;
  result: AttemptResult;
  notes: string;
}

interface ResourceLink {
  apptDate: string;
  followUpDate: string;
  apptType: string;
  status: "scheduled" | "completed" | "cancelled" | "no_show" | "";
}

const EMPTY_LINK: ResourceLink = { apptDate: "", followUpDate: "", apptType: "", status: "" };

interface BHReferral {
  id: string;
  // Phase 1
  name: string;
  dob: string;
  receivedDate: string;
  cphtAdvisor: string;
  attempts: ContactAttempt[];
  letterMailDate: string;
  needsOEAssistance: boolean;
  outOfPocket: boolean;
  needsOtherResource: string;
  // Phase 2
  dateAnsweredCall: string;
  dental: ResourceLink;
  vision: ResourceLink;
  housingReferral: boolean;
  housingResource: string;
  housingDate: string;
  foodReferral: boolean;
  foodResource: string;
  foodDate: string;
  mhReferral: boolean;
  mhResource: string;
  mhDate: string;
  calFresh: boolean;
  calWorks: boolean;
  ssiSsdi: boolean;
  mediCal: boolean;
  transportReferral: boolean;
  transportNotes: string;
  sdohNotes: string;
  // Phase 3
  outreachDate: string;
  outreachMethod: string;
  programEnrolled: string;
  enrollmentDate: string;
  insuranceType: string;
  pcp: string;
  // Phase 4
  followUp1Date: string;
  followUp1Outcome: string;
  followUp2Date: string;
  followUp2Outcome: string;
  followUp3Date: string;
  followUp3Outcome: string;
  caseStatus: CaseStatus;
  closureReason: string;
  qiNotes: string;
  // Meta
  currentPhase: 1 | 2 | 3 | 4;
  createdAt: string;
}

const EMPTY_ATTEMPT: ContactAttempt = { date: "", attemptNum: "", result: "", notes: "" };

function emptyReferral(): BHReferral {
  return {
    id: crypto.randomUUID(),
    name: "", dob: "", receivedDate: new Date().toISOString().slice(0, 10),
    cphtAdvisor: "",
    attempts: [{ ...EMPTY_ATTEMPT }, { ...EMPTY_ATTEMPT }, { ...EMPTY_ATTEMPT }],
    letterMailDate: "", needsOEAssistance: false, outOfPocket: false, needsOtherResource: "",
    dateAnsweredCall: "",
    dental: { ...EMPTY_LINK }, vision: { ...EMPTY_LINK },
    housingReferral: false, housingResource: "", housingDate: "",
    foodReferral: false, foodResource: "", foodDate: "",
    mhReferral: false, mhResource: "", mhDate: "",
    calFresh: false, calWorks: false, ssiSsdi: false, mediCal: false,
    transportReferral: false, transportNotes: "", sdohNotes: "",
    outreachDate: "", outreachMethod: "", programEnrolled: "",
    enrollmentDate: "", insuranceType: "", pcp: "",
    followUp1Date: "", followUp1Outcome: "",
    followUp2Date: "", followUp2Outcome: "",
    followUp3Date: "", followUp3Outcome: "",
    caseStatus: "open", closureReason: "", qiNotes: "",
    currentPhase: 1,
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────
// Seed data for demo
// ─────────────────────────────────────────────────────────

const SEED: BHReferral[] = [
  {
    ...emptyReferral(),
    id: "ref-001",
    name: "Maria G.",
    dob: "1985-03-12",
    receivedDate: "2026-04-01",
    cphtAdvisor: "J. Rivera",
    attempts: [
      { date: "2026-04-03", attemptNum: "1", result: "no_answer", notes: "Left message" },
      { date: "2026-04-07", attemptNum: "2", result: "answered", notes: "Scheduled dental" },
      { ...EMPTY_ATTEMPT },
    ],
    dateAnsweredCall: "2026-04-07",
    dental: { apptDate: "2026-04-22", followUpDate: "", apptType: "Cleaning", status: "scheduled" },
    vision: { ...EMPTY_LINK },
    mhReferral: true, mhResource: "South Bay MH Clinic", mhDate: "2026-04-08",
    calFresh: true, mediCal: true,
    housingReferral: false, housingResource: "", housingDate: "",
    foodReferral: false, foodResource: "", foodDate: "",
    sdohNotes: "Patient interested in food bank",
    outreachDate: "", outreachMethod: "", programEnrolled: "", enrollmentDate: "", insuranceType: "Medi-Cal", pcp: "",
    followUp1Date: "", followUp1Outcome: "",
    followUp2Date: "", followUp2Outcome: "",
    followUp3Date: "", followUp3Outcome: "",
    caseStatus: "open", closureReason: "", qiNotes: "",
    currentPhase: 2,
    createdAt: "2026-04-01T09:00:00Z",
    needsOEAssistance: true, outOfPocket: false, needsOtherResource: "Food pantry",
    letterMailDate: "", calWorks: false, ssiSsdi: false, transportReferral: false, transportNotes: "",
  },
  {
    ...emptyReferral(),
    id: "ref-002",
    name: "James T.",
    dob: "1971-09-22",
    receivedDate: "2026-03-20",
    cphtAdvisor: "A. Nguyen",
    attempts: [
      { date: "2026-03-22", attemptNum: "1", result: "no_answer", notes: "" },
      { date: "2026-03-26", attemptNum: "2", result: "no_answer", notes: "" },
      { date: "2026-03-31", attemptNum: "3", result: "no_answer", notes: "All attempts exhausted" },
    ],
    letterMailDate: "2026-03-31",
    needsOEAssistance: false, outOfPocket: true, needsOtherResource: "Housing",
    dateAnsweredCall: "", dental: { ...EMPTY_LINK }, vision: { ...EMPTY_LINK },
    housingReferral: true, housingResource: "PATH LA", housingDate: "2026-04-02",
    foodReferral: false, foodResource: "", foodDate: "",
    mhReferral: false, mhResource: "", mhDate: "",
    calFresh: false, calWorks: false, ssiSsdi: true, mediCal: true,
    transportReferral: false, transportNotes: "", sdohNotes: "Unhoused — priority outreach",
    outreachDate: "2026-04-05", outreachMethod: "Street outreach", programEnrolled: "ECM — Street Medicine",
    enrollmentDate: "2026-04-05", insuranceType: "Medi-Cal Managed Care", pcp: "Dr. Chen",
    followUp1Date: "2026-04-10", followUp1Outcome: "Attended PCP appt",
    followUp2Date: "", followUp2Outcome: "",
    followUp3Date: "", followUp3Outcome: "",
    caseStatus: "enrolled", closureReason: "", qiNotes: "Engaged well with outreach team",
    currentPhase: 4,
    createdAt: "2026-03-20T14:00:00Z",
  },
  {
    ...emptyReferral(),
    id: "ref-003",
    name: "Aisha B.",
    dob: "1998-07-04",
    receivedDate: "2026-04-04",
    cphtAdvisor: "J. Rivera",
    attempts: [
      { date: "2026-04-06", attemptNum: "1", result: "answered", notes: "Patient ready to schedule" },
      { ...EMPTY_ATTEMPT },
      { ...EMPTY_ATTEMPT },
    ],
    needsOEAssistance: true, outOfPocket: false, needsOtherResource: "",
    dateAnsweredCall: "2026-04-06",
    dental: { apptDate: "2026-04-15", followUpDate: "2026-04-15", apptType: "Exam + X-ray", status: "completed" },
    vision: { apptDate: "2026-04-20", followUpDate: "", apptType: "Eye exam", status: "scheduled" },
    housingReferral: false, housingResource: "", housingDate: "",
    foodReferral: true, foodResource: "Compton Food Bank", foodDate: "2026-04-07",
    mhReferral: true, mhResource: "CalHOPE Crisis Line", mhDate: "2026-04-07",
    calFresh: true, calWorks: false, ssiSsdi: false, mediCal: true,
    transportReferral: true, transportNotes: "NEMT arranged for dental",
    sdohNotes: "Single parent, food insecure",
    outreachDate: "", outreachMethod: "", programEnrolled: "", enrollmentDate: "", insuranceType: "Medi-Cal", pcp: "",
    followUp1Date: "", followUp1Outcome: "",
    followUp2Date: "", followUp2Outcome: "",
    followUp3Date: "", followUp3Outcome: "",
    caseStatus: "open", closureReason: "", qiNotes: "",
    currentPhase: 3,
    createdAt: "2026-04-04T10:30:00Z",
    letterMailDate: "",
  },
];

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

const PHASE_META = [
  { n: 1, label: "Contact Referral",         color: "#2563eb", icon: <Phone className="w-3.5 h-3.5" /> },
  { n: 2, label: "SDoH & Resource Linkages", color: "#16a34a", icon: <UserCheck className="w-3.5 h-3.5" /> },
  { n: 3, label: "Outreach & Enrollment",    color: "#d97706", icon: <Calendar className="w-3.5 h-3.5" /> },
  { n: 4, label: "Case Follow-up (QI)",      color: "#7c3aed", icon: <ClipboardCheck className="w-3.5 h-3.5" /> },
];

const STATUS_STYLES: Record<CaseStatus, string> = {
  open:     "bg-blue-100 text-blue-700",
  enrolled: "bg-green-100 text-green-700",
  pending:  "bg-amber-100 text-amber-700",
  closed:   "bg-gray-200 text-gray-600",
};

const ATTEMPT_RESULTS: { value: AttemptResult; label: string }[] = [
  { value: "",             label: "— Select —" },
  { value: "answered",     label: "Answered" },
  { value: "no_answer",    label: "No Answer" },
  { value: "left_vm",      label: "Left VM" },
  { value: "wrong_number", label: "Wrong Number" },
  { value: "disconnected", label: "Disconnected" },
];

function resultBadge(r: AttemptResult) {
  if (!r) return null;
  const styles: Record<string, string> = {
    answered:     "bg-green-100 text-green-700",
    no_answer:    "bg-red-100 text-red-600",
    left_vm:      "bg-yellow-100 text-yellow-700",
    wrong_number: "bg-orange-100 text-orange-700",
    disconnected: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    answered: "Answered", no_answer: "No Answer", left_vm: "Left VM",
    wrong_number: "Wrong #", disconnected: "Disconnected",
  };
  return (
    <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${styles[r] ?? ""}`}>
      {labels[r]}
    </span>
  );
}

function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${m}/${day}/${y}`;
}

function daysSince(dateStr: string) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  return diff;
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function PhaseBar({ phase }: { phase: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {PHASE_META.map(p => (
        <div
          key={p.n}
          className="h-1.5 rounded-full flex-1 transition-all"
          style={{ background: phase >= p.n ? p.color : "#e5e7eb" }}
          title={`Phase ${p.n}: ${p.label}`}
        />
      ))}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = "", required = false, className = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  );
}

function Select({ label, value, onChange, options, className = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Check({ label, checked, onChange, className = "" }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded accent-blue-600" />
      <span className="text-xs text-gray-700">{label}</span>
    </label>
  );
}

function PhaseHeader({ phase }: { phase: typeof PHASE_META[0] }) {
  return (
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ background: phase.color }}>
        {phase.n}
      </div>
      <div>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Phase {phase.n}</p>
        <p className="text-base font-bold text-gray-900">{phase.label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Phase form panels
// ─────────────────────────────────────────────────────────

function Phase1Form({ r, set }: { r: BHReferral; set: (k: keyof BHReferral, v: any) => void }) {
  function setAttempt(i: number, k: keyof ContactAttempt, v: string) {
    const updated = r.attempts.map((a, idx) => idx === i ? { ...a, [k]: v } : a);
    set("attempts", updated);
  }

  return (
    <div className="space-y-5">
      <PhaseHeader phase={PHASE_META[0]} />

      {/* Patient identity */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Patient Name" value={r.name} onChange={v => set("name", v)} required className="col-span-2 sm:col-span-1" />
        <Input label="Date of Birth" value={r.dob} onChange={v => set("dob", v)} type="date" className="col-span-2 sm:col-span-1" />
        <Input label="Received Date" value={r.receivedDate} onChange={v => set("receivedDate", v)} type="date" required />
        <Select label="CPHT Advisor" value={r.cphtAdvisor} onChange={v => set("cphtAdvisor", v)}
          options={[
            { value: "", label: "— Select —" },
            { value: "J. Rivera", label: "J. Rivera" },
            { value: "A. Nguyen", label: "A. Nguyen" },
            { value: "D. Williams", label: "D. Williams" },
            { value: "T. Morales", label: "T. Morales" },
          ]} />
      </div>

      {/* Contact attempts */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Contact Attempts</p>
        <div className="space-y-3">
          {r.attempts.map((a, i) => {
            const labels = ["Initial (1–3 days from received)", "2nd Attempt (3–5 days after #1)", "Final Attempt (3–5 days after #2)"];
            return (
              <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50">
                <p className="text-[11px] font-bold text-gray-500 uppercase">Attempt #{i + 1} — {labels[i]}</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input label="Date" value={a.date} onChange={v => setAttempt(i, "date", v)} type="date" />
                  <Input label="Attempt #" value={a.attemptNum} onChange={v => setAttempt(i, "attemptNum", v)} placeholder="e.g. 1" />
                  <Select label="Result" value={a.result} onChange={v => setAttempt(i, "result", v as AttemptResult)}
                    options={ATTEMPT_RESULTS} />
                </div>
                <Input label="Notes" value={a.notes} onChange={v => setAttempt(i, "notes", v)} placeholder="Brief notes..." />
              </div>
            );
          })}
        </div>
      </div>

      {/* Letter + flags */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Letter Mail Date" value={r.letterMailDate} onChange={v => set("letterMailDate", v)} type="date"
          className="col-span-2 sm:col-span-1" />
        <Input label="Other Resource Needed" value={r.needsOtherResource} onChange={v => set("needsOtherResource", v)}
          placeholder="Housing, food, etc." className="col-span-2 sm:col-span-1" />
      </div>
      <div className="flex flex-wrap gap-5 pt-1">
        <Check label="Needs OE Assistance" checked={r.needsOEAssistance} onChange={v => set("needsOEAssistance", v)} />
        <Check label="Out of Pocket Cost" checked={r.outOfPocket} onChange={v => set("outOfPocket", v)} />
      </div>
    </div>
  );
}

function ResourceBlock({ title, link, onChange }: {
  title: string;
  link: ResourceLink;
  onChange: (k: keyof ResourceLink, v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 p-3 space-y-2 bg-gray-50">
      <p className="text-[11px] font-bold text-gray-500 uppercase">{title}</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Appointment Date" value={link.apptDate} onChange={v => onChange("apptDate", v)} type="date" />
        <Input label="Follow-up Date" value={link.followUpDate} onChange={v => onChange("followUpDate", v)} type="date" />
        <Input label="Appointment Type" value={link.apptType} onChange={v => onChange("apptType", v)} placeholder="Exam, cleaning, etc." />
        <Select label="Status" value={link.status} onChange={v => onChange("status", v as ResourceLink["status"])}
          options={[
            { value: "", label: "— Select —" },
            { value: "scheduled", label: "Scheduled" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
            { value: "no_show", label: "No Show" },
          ]} />
      </div>
    </div>
  );
}

function Phase2Form({ r, set }: { r: BHReferral; set: (k: keyof BHReferral, v: any) => void }) {
  return (
    <div className="space-y-5">
      <PhaseHeader phase={PHASE_META[1]} />
      <Input label="Date Patient Answered Call" value={r.dateAnsweredCall} onChange={v => set("dateAnsweredCall", v)} type="date" />

      {/* Clinical appointments */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Clinical Appointments</p>
        <div className="space-y-3">
          <ResourceBlock title="Dental" link={r.dental} onChange={(k, v) => set("dental", { ...r.dental, [k]: v })} />
          <ResourceBlock title="Vision / Eye" link={r.vision} onChange={(k, v) => set("vision", { ...r.vision, [k]: v })} />
        </div>
      </div>

      {/* SDoH resource linkages */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">SDoH Resource Linkages</p>
        <div className="space-y-3">
          {/* Housing */}
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Housing</p>
              <Check label="Referral Made" checked={r.housingReferral} onChange={v => set("housingReferral", v)} />
            </div>
            {r.housingReferral && (
              <div className="grid grid-cols-2 gap-2">
                <Input label="Resource / Agency" value={r.housingResource} onChange={v => set("housingResource", v)} placeholder="PATH, A Bridge Home..." />
                <Input label="Referral Date" value={r.housingDate} onChange={v => set("housingDate", v)} type="date" />
              </div>
            )}
          </div>
          {/* Food */}
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Food / Nutrition</p>
              <Check label="Referral Made" checked={r.foodReferral} onChange={v => set("foodReferral", v)} />
            </div>
            {r.foodReferral && (
              <div className="grid grid-cols-2 gap-2">
                <Input label="Resource / Agency" value={r.foodResource} onChange={v => set("foodResource", v)} placeholder="Food bank, CalFresh..." />
                <Input label="Referral Date" value={r.foodDate} onChange={v => set("foodDate", v)} type="date" />
              </div>
            )}
          </div>
          {/* Mental Health */}
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Mental Health / BH</p>
              <Check label="Referral Made" checked={r.mhReferral} onChange={v => set("mhReferral", v)} />
            </div>
            {r.mhReferral && (
              <div className="grid grid-cols-2 gap-2">
                <Input label="Resource / Agency" value={r.mhResource} onChange={v => set("mhResource", v)} placeholder="DMH, community MH..." />
                <Input label="Referral Date" value={r.mhDate} onChange={v => set("mhDate", v)} type="date" />
              </div>
            )}
          </div>
          {/* Transportation */}
          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-gray-500 uppercase">Transportation</p>
              <Check label="Referral Made" checked={r.transportReferral} onChange={v => set("transportReferral", v)} />
            </div>
            {r.transportReferral && (
              <Input label="Notes" value={r.transportNotes} onChange={v => set("transportNotes", v)} placeholder="NEMT, bus pass, Uber Health..." />
            )}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Benefits Enrollment</p>
        <div className="flex flex-wrap gap-4">
          <Check label="Medi-Cal" checked={r.mediCal} onChange={v => set("mediCal", v)} />
          <Check label="CalFresh" checked={r.calFresh} onChange={v => set("calFresh", v)} />
          <Check label="CalWORKs" checked={r.calWorks} onChange={v => set("calWorks", v)} />
          <Check label="SSI / SSDI" checked={r.ssiSsdi} onChange={v => set("ssiSsdi", v)} />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">SDoH Notes</label>
        <textarea value={r.sdohNotes} onChange={e => set("sdohNotes", e.target.value)} rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="Additional context, barriers, follow-ups needed..." />
      </div>
    </div>
  );
}

function Phase3Form({ r, set }: { r: BHReferral; set: (k: keyof BHReferral, v: any) => void }) {
  return (
    <div className="space-y-5">
      <PhaseHeader phase={PHASE_META[2]} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Outreach Date" value={r.outreachDate} onChange={v => set("outreachDate", v)} type="date" />
        <Select label="Outreach Method" value={r.outreachMethod} onChange={v => set("outreachMethod", v)}
          options={[
            { value: "", label: "— Select —" },
            { value: "Street outreach", label: "Street outreach" },
            { value: "Phone", label: "Phone" },
            { value: "Home visit", label: "Home visit" },
            { value: "Shelter visit", label: "Shelter visit" },
            { value: "Clinic walk-in", label: "Clinic walk-in" },
            { value: "Navigation center", label: "Navigation center" },
            { value: "HRVM referral", label: "HRVM referral" },
          ]} />
        <Input label="Program Enrolled" value={r.programEnrolled} onChange={v => set("programEnrolled", v)}
          placeholder="ECM, CalAIM, street medicine..." className="col-span-2 sm:col-span-1" />
        <Input label="Enrollment Date" value={r.enrollmentDate} onChange={v => set("enrollmentDate", v)} type="date" />
        <Select label="Insurance Type" value={r.insuranceType} onChange={v => set("insuranceType", v)}
          options={[
            { value: "", label: "— Select —" },
            { value: "Medi-Cal", label: "Medi-Cal FFS" },
            { value: "Medi-Cal Managed Care", label: "Medi-Cal Managed Care" },
            { value: "Medicare", label: "Medicare" },
            { value: "Dual Eligible", label: "Dual Eligible (Medi-Cal + Medicare)" },
            { value: "Uninsured", label: "Uninsured" },
            { value: "Other", label: "Other" },
          ]} />
        <Input label="Assigned PCP" value={r.pcp} onChange={v => set("pcp", v)} placeholder="Dr. Name, Clinic" />
      </div>
    </div>
  );
}

function Phase4Form({ r, set }: { r: BHReferral; set: (k: keyof BHReferral, v: any) => void }) {
  const outcomeOpts = [
    { value: "", label: "— Select —" },
    { value: "Attended appt", label: "Attended appointment" },
    { value: "Missed appt", label: "Missed appointment" },
    { value: "Rescheduled", label: "Rescheduled" },
    { value: "Engaged outreach", label: "Engaged with outreach" },
    { value: "Declined services", label: "Declined services" },
    { value: "Hospitalized", label: "Hospitalized" },
    { value: "Unable to locate", label: "Unable to locate" },
    { value: "Enrolled ECM", label: "Enrolled in ECM" },
    { value: "Case closed", label: "Case closed" },
  ];

  return (
    <div className="space-y-5">
      <PhaseHeader phase={PHASE_META[3]} />

      {/* Follow-ups */}
      {[
        { dateKey: "followUp1Date", outKey: "followUp1Outcome", label: "Follow-up #1" },
        { dateKey: "followUp2Date", outKey: "followUp2Outcome", label: "Follow-up #2" },
        { dateKey: "followUp3Date", outKey: "followUp3Outcome", label: "Follow-up #3" },
      ].map(fu => (
        <div key={fu.dateKey} className="rounded-lg border border-gray-200 p-3 bg-gray-50 space-y-2">
          <p className="text-[11px] font-bold text-gray-500 uppercase">{fu.label}</p>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Date" value={(r as any)[fu.dateKey]} onChange={v => set(fu.dateKey as keyof BHReferral, v)} type="date" />
            <Select label="Outcome" value={(r as any)[fu.outKey]} onChange={v => set(fu.outKey as keyof BHReferral, v)} options={outcomeOpts} />
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        <Select label="Case Status" value={r.caseStatus} onChange={v => set("caseStatus", v as CaseStatus)}
          options={[
            { value: "open", label: "Open" },
            { value: "enrolled", label: "Enrolled" },
            { value: "pending", label: "Pending" },
            { value: "closed", label: "Closed" },
          ]} />
        <Select label="Closure Reason" value={r.closureReason} onChange={v => set("closureReason", v)}
          options={[
            { value: "", label: "— Select —" },
            { value: "Enrolled in ECM", label: "Enrolled in ECM" },
            { value: "Enrolled in other program", label: "Enrolled in other program" },
            { value: "Refused services", label: "Refused services" },
            { value: "Unable to contact", label: "Unable to contact (3 attempts)" },
            { value: "Deceased", label: "Deceased" },
            { value: "Moved out of area", label: "Moved out of area" },
            { value: "Duplicate", label: "Duplicate referral" },
          ]} />
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">QI Notes</label>
        <textarea value={r.qiNotes} onChange={e => set("qiNotes", e.target.value)} rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          placeholder="Quality improvement observations, barriers identified, process improvements..." />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Referral Modal (stepper)
// ─────────────────────────────────────────────────────────

function ReferralModal({
  initial,
  onSave,
  onClose,
}: {
  initial: BHReferral;
  onSave: (r: BHReferral) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BHReferral>({ ...initial });
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initial.currentPhase as 1 | 2 | 3 | 4);

  function set(k: keyof BHReferral, v: any) {
    setDraft(prev => ({ ...prev, [k]: v }));
  }

  function save() {
    const phase = Math.max(draft.currentPhase, step) as 1 | 2 | 3 | 4;
    onSave({ ...draft, currentPhase: phase });
  }

  const phaseComponents = [
    <Phase1Form key={1} r={draft} set={set} />,
    <Phase2Form key={2} r={draft} set={set} />,
    <Phase3Form key={3} r={draft} set={set} />,
    <Phase4Form key={4} r={draft} set={set} />,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">BH Referral Tracker</p>
            <p className="text-lg font-bold text-gray-900">{draft.name || "New Referral"}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Phase tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
          {PHASE_META.map(p => (
            <button
              key={p.n}
              onClick={() => setStep(p.n as 1 | 2 | 3 | 4)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                step === p.n
                  ? "border-current"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
              style={{ color: step === p.n ? p.color : undefined, borderColor: step === p.n ? p.color : undefined }}
            >
              {draft.currentPhase >= p.n
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <span className="w-3.5 h-3.5 flex items-center justify-center rounded-full border border-current text-[9px]">{p.n}</span>
              }
              <span className="hidden sm:inline">P{p.n}: {p.label}</span>
              <span className="sm:hidden">P{p.n}</span>
            </button>
          ))}
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {phaseComponents[step - 1]}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 rounded-b-xl">
          <button
            onClick={() => step > 1 && setStep((step - 1) as 1 | 2 | 3 | 4)}
            disabled={step === 1}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={save}
              className="px-4 py-2 rounded-lg border border-green-300 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              Save Draft
            </button>
            {step < 4 ? (
              <button
                onClick={() => {
                  setDraft(d => ({ ...d, currentPhase: Math.max(d.currentPhase, step + 1) as 1 | 2 | 3 | 4 }));
                  setStep((step + 1) as 2 | 3 | 4);
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-colors"
                style={{ background: PHASE_META[step].color }}
              >
                Next: Phase {step + 1} <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={save}
                className="px-5 py-2 rounded-lg bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors"
              >
                Complete & Save
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────

export default function BHTrackerPage() {
  const [referrals, setReferrals] = useState<BHReferral[]>(SEED);
  const [editing, setEditing] = useState<BHReferral | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<CaseStatus | "all">("all");
  const [filterPhase, setFilterPhase] = useState<number | 0>(0);

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const filtered = useMemo(() => {
    return referrals.filter(r => {
      if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.cphtAdvisor.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && r.caseStatus !== filterStatus) return false;
      if (filterPhase && r.currentPhase !== filterPhase) return false;
      return true;
    });
  }, [referrals, search, filterStatus, filterPhase]);

  const stats = useMemo(() => ({
    total: referrals.length,
    open: referrals.filter(r => r.caseStatus === "open").length,
    enrolled: referrals.filter(r => r.caseStatus === "enrolled").length,
    phase1: referrals.filter(r => r.currentPhase === 1).length,
    phase2: referrals.filter(r => r.currentPhase === 2).length,
    phase3: referrals.filter(r => r.currentPhase === 3).length,
    phase4: referrals.filter(r => r.currentPhase === 4).length,
    exhausted: referrals.filter(r => r.attempts.every(a => a.result === "no_answer" || a.result === "left_vm" || a.result === "disconnected" || a.result === "wrong_number") && r.attempts[2].date !== "").length,
  }), [referrals]);

  function saveReferral(r: BHReferral) {
    setReferrals(prev => {
      const exists = prev.findIndex(x => x.id === r.id);
      if (exists >= 0) { const n = [...prev]; n[exists] = r; return n; }
      return [...prev, r];
    });
    setEditing(null);
  }

  function exportCSV() {
    const rows = [
      ["Name", "DOB", "Received", "Advisor", "Phase", "Status", "Attempt1", "Attempt2", "Attempt3", "Dental Appt", "Housing", "MH", "Food", "Program", "Follow-up 1", "Case Status"],
      ...referrals.map(r => [
        r.name, r.dob, r.receivedDate, r.cphtAdvisor, r.currentPhase, r.caseStatus,
        r.attempts[0]?.result || "", r.attempts[1]?.result || "", r.attempts[2]?.result || "",
        r.dental.apptDate || "", r.housingReferral ? "Y" : "", r.mhReferral ? "Y" : "", r.foodReferral ? "Y" : "",
        r.programEnrolled, r.followUp1Outcome, r.caseStatus,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `BH_Tracker_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-white/20 border border-white/30">
              INTERNAL BH TRACKER
            </span>
            <span className="text-xs text-blue-300">Report Date: {today}</span>
          </div>
          <h1 className="text-2xl font-black mb-1">Behavioral Health Referral Tracker</h1>
          <p className="text-blue-200 text-sm max-w-2xl">
            4-phase case management — Contact → SDoH Linkages → Outreach & Enrollment → QI Follow-up
          </p>

          {/* Phase funnel stats */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Total Referrals", value: stats.total, color: "bg-white/20" },
              { label: "Open", value: stats.open, color: "bg-blue-500/40" },
              { label: "Enrolled", value: stats.enrolled, color: "bg-green-500/40" },
              { label: "Phase 1", value: stats.phase1, color: "bg-blue-400/30" },
              { label: "Phase 2", value: stats.phase2, color: "bg-green-400/30" },
              { label: "Phase 3", value: stats.phase3, color: "bg-amber-400/30" },
              { label: "Phase 4", value: stats.phase4, color: "bg-purple-400/30" },
              { label: "Exhausted", value: stats.exhausted, color: "bg-red-500/30" },
            ].map(s => (
              <div key={s.label} className={`rounded-lg px-3 py-2 ${s.color}`}>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-xs text-blue-200 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-6 space-y-4">
        {/* Action bar */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or advisor..."
                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"
              />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="enrolled">Enrolled</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
            <select value={filterPhase} onChange={e => setFilterPhase(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value={0}>All Phases</option>
              {PHASE_META.map(p => <option key={p.n} value={p.n}>Phase {p.n}: {p.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => setEditing(emptyReferral())}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Referral
            </button>
          </div>
        </div>

        {/* Referral table */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Patient</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Received</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Advisor</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Attempts</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Phase Progress</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">SDoH</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Program</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">Days Open</th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-12 text-gray-400 text-sm">No referrals found. Click "New Referral" to add one.</td></tr>
                  )}
                  {filtered.map(r => {
                    const days = daysSince(r.receivedDate);
                    const exhausted = r.attempts.filter(a => a.date).length === 3 && !r.attempts.find(a => a.result === "answered");
                    return (
                      <tr key={r.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors group">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{r.name || <span className="text-gray-400 italic">Unnamed</span>}</p>
                          <p className="text-xs text-gray-400">{r.dob ? fmtDate(r.dob) : "—"}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(r.receivedDate)}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{r.cphtAdvisor || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {r.attempts.map((a, i) => (
                              a.date ? (
                                <div key={i} title={`Attempt ${i + 1}: ${a.result}`}>
                                  {resultBadge(a.result)}
                                </div>
                              ) : (
                                <span key={i} className="text-[10px] text-gray-300">·</span>
                              )
                            ))}
                          </div>
                          {exhausted && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              <span className="text-[10px] text-red-500 font-semibold">Letter sent</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="text-[10px] font-semibold text-gray-500 mb-1" style={{ color: PHASE_META[r.currentPhase - 1].color }}>
                            Phase {r.currentPhase}: {PHASE_META[r.currentPhase - 1].label}
                          </div>
                          <PhaseBar phase={r.currentPhase} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-0.5 text-[10px]">
                            {r.dental.apptDate && <span className="bg-blue-100 text-blue-700 px-1 rounded font-semibold">Dental</span>}
                            {r.vision.apptDate && <span className="bg-indigo-100 text-indigo-700 px-1 rounded font-semibold">Vision</span>}
                            {r.housingReferral && <span className="bg-orange-100 text-orange-700 px-1 rounded font-semibold">Housing</span>}
                            {r.mhReferral && <span className="bg-purple-100 text-purple-700 px-1 rounded font-semibold">MH</span>}
                            {r.foodReferral && <span className="bg-green-100 text-green-700 px-1 rounded font-semibold">Food</span>}
                            {r.transportReferral && <span className="bg-gray-100 text-gray-600 px-1 rounded font-semibold">Trans</span>}
                            {r.mediCal && <span className="bg-teal-100 text-teal-700 px-1 rounded font-semibold">MC</span>}
                            {r.calFresh && <span className="bg-lime-100 text-lime-700 px-1 rounded font-semibold">CF</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[120px] truncate">{r.programEnrolled || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded capitalize ${STATUS_STYLES[r.caseStatus]}`}>
                            {r.caseStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono">
                          {days !== null ? (
                            <span className={days > 30 ? "text-red-600 font-bold" : days > 14 ? "text-amber-600" : "text-gray-600"}>
                              {days}d
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditing(r)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-semibold transition-colors opacity-0 group-hover:opacity-100"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Phase legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {PHASE_META.map(p => (
            <div key={p.n} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
              <span>Phase {p.n}: {p.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-4">
            <AlertCircle className="w-3 h-3 text-red-500" />
            <span>Letter sent = 3 unsuccessful attempts</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {editing && (
        <ReferralModal
          initial={editing}
          onSave={saveReferral}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
