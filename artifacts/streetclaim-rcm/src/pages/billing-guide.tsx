import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2, AlertTriangle, Info, ChevronDown, ChevronRight,
  FileText, Users, Smartphone, DollarSign, ClipboardCheck, BookOpen,
  Shield, Zap, Phone,
} from "lucide-react";

// ─── Types & Data ──────────────────────────────────────────────────────────

interface CodeRow {
  code: string;
  label: string;
  rate?: string;
  note: string;
  tag?: string;
  tagColor?: string;
}

interface AccordionSection {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
  content: React.ReactNode;
}

// ─── Reusable Sub-components ───────────────────────────────────────────────

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${color}`}>
      {text}
    </span>
  );
}

function CodeTable({ rows }: { rows: CodeRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 mt-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 border-b border-gray-200">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-24">Code</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
            {rows.some(r => r.rate) && (
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">Rate (POS 27)</th>
            )}
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-blue-50 transition-colors">
              <td className="px-3 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded w-fit">{r.code}</span>
                  {r.tag && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded w-fit ${r.tagColor ?? "bg-gray-100 text-gray-600"}`}>
                      {r.tag}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2.5 text-xs text-gray-800">{r.label}</td>
              {rows.some(row => row.rate) && (
                <td className="px-3 py-2.5 text-right text-xs font-bold text-green-700">{r.rate ?? "—"}</td>
              )}
              <td className="px-3 py-2.5 text-xs text-gray-500 hidden lg:table-cell">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CheckList({ items }: { items: { text: string; sub?: string; warn?: boolean }[] }) {
  return (
    <ul className="space-y-2 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          {item.warn
            ? <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
          }
          <div>
            <p className="text-sm text-gray-800">{item.text}</p>
            {item.sub && <p className="text-xs text-gray-500 mt-0.5">{item.sub}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function InfoBox({ color, icon, title, body }: { color: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className={`flex gap-3 rounded-lg p-3 mt-3 ${color}`}>
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs font-bold text-gray-800">{title}</p>
        <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function SectionTag({ text, color }: { text: string; color: string }) {
  return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${color}`}>{text}</span>;
}

// ─── Accordion ────────────────────────────────────────────────────────────

function AccordionItem({ section, open, onToggle }: {
  section: AccordionSection;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-xl border-2 transition-colors ${open ? "border-blue-300 shadow-md" : "border-gray-200"} overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${open ? "bg-blue-50" : "bg-white hover:bg-gray-50"}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${section.color}`}>
            {section.icon}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{section.title}</p>
            <p className="text-xs text-gray-500">{section.subtitle}</p>
          </div>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-white border-t border-gray-100">
          {section.content}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function BillingGuidePage() {
  const [openSection, setOpenSection] = useState<string | null>("credentials");

  const toggle = (id: string) => setOpenSection(prev => prev === id ? null : id);

  const sections: AccordionSection[] = [
    {
      id: "credentials",
      icon: <Shield className="w-5 h-5 text-white" />,
      title: "1. Credentials & Enrollment",
      subtitle: "NPI, CAQH, APL 22-023, physical office waiver",
      color: "bg-blue-600",
      content: (
        <div className="space-y-4">
          <InfoBox
            color="bg-blue-50"
            icon={<Info className="w-4 h-4 text-blue-600" />}
            title="California APL 22-023 — No Physical Office Required"
            body="The physical office requirement has been removed for street medicine providers in California. Enroll using an administrative billing address. Plans are prohibited from denying credentialing solely because a provider lacks a traditional exam room."
          />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Provider Enrollment Checklist</p>
            <CheckList items={[
              { text: "Type 1 NPI — each individual practitioner (MD, DO, NP, PA)", sub: "Maintain active status; update address in NPPES within 30 days of any change" },
              { text: "Type 2 NPI — organization / street medicine program entity", sub: "Register as legal entity; required for group billing" },
              { text: "CAQH ProView profile — complete and re-attest every 90 days", sub: "Most payers pull credentials from CAQH; keep current to avoid credentialing gaps" },
              { text: "Medicare enrollment (855I or 855B) — use admin office as billing address, POS 27 as service location", sub: "CMS Change Request 13314 authorizes POS 27 effective Oct 1, 2023" },
              { text: "Medi-Cal Provider Enrollment — submit via DHCS ProviderConnect", sub: "California APL 22-023 waives physical office requirement for FQHC/street medicine providers" },
              { text: "Managed Care credentialing — L.A. Care, Health Net, Molina, Blue Shield Promise", sub: "Submit credentialing application to each plan; use CAQH universal application where accepted" },
              { text: "DEA registration (prescribers) — required for buprenorphine/MOUD", sub: "X-waiver eliminated (2023 Mainstreaming Addiction Treatment Act); DEA registration alone now sufficient for MOUD" },
            ]} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Service Location Enrollment</p>
            <CheckList items={[
              { text: "List service location as POS 27 (Outreach Site/Street) for encampment/outdoor encounters", sub: "GPS coordinates or street addresses acceptable; no fixed exam room required" },
              { text: "POS 04 (Shelter) — when care delivered inside emergency shelter", warn: false },
              { text: "POS 15 (Mobile Unit) — when care delivered from clinic van", warn: false },
              { text: "Do NOT use POS 22 (Outpatient Hospital) for street encounters", warn: true, sub: "Pre-POS-27 error that reduces reimbursement to facility rate; triggers denial scrubbing" },
            ]} />
          </div>
        </div>
      ),
    },
    {
      id: "coding",
      icon: <FileText className="w-5 h-5 text-white" />,
      title: "2. Coding Hierarchy",
      subtitle: "POS codes, E&M, Z-codes, CHW codes, add-ons",
      color: "bg-purple-600",
      content: (
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Place of Service (POS) Codes</p>
              <SectionTag text="Mandatory on every claim" color="bg-red-100 text-red-700" />
            </div>
            <CodeTable rows={[
              { code: "POS 27", label: "Outreach Site / Street", note: "MANDATORY for outdoor & encampment encounters. Non-facility rate (same as POS 11). Use for all street medicine visits.", tag: "✓ Street Med", tagColor: "bg-green-100 text-green-700" },
              { code: "POS 04", label: "Shelter", note: "Emergency & transitional shelters. Non-facility rate.", tag: "Shelter" },
              { code: "POS 15", label: "Mobile Unit", note: "Care delivered from clinic van/vehicle. Non-facility rate.", tag: "Mobile" },
              { code: "POS 11", label: "Office (baseline)", note: "Traditional clinic — baseline for rate comparison. POS 27 now matches this rate.", tag: "Clinic" },
            ]} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">E&M Codes — 2025 Medicare Rates at POS 27</p>
            </div>
            <CodeTable rows={[
              { code: "99202", label: "New patient — straightforward MDM", rate: "$72.13", note: "First street encounter, minor acute issue", tag: "New Pt" },
              { code: "99203", label: "New patient — low MDM", rate: "$111.59", note: "New patient with 1-2 chronic conditions" },
              { code: "99204", label: "New patient — moderate MDM", rate: "$174.35", note: "Complex new patient — multiple chronic + SDoH" },
              { code: "99205", label: "New patient — high MDM", rate: "$227.08", note: "OD, sepsis, acute psychiatric" },
              { code: "99213", label: "Established — low MDM", rate: "$92.51", note: "Most common established level in street medicine", tag: "High Volume" },
              { code: "99214", label: "Established — moderate MDM", rate: "$133.91", note: "Multiple uncontrolled chronics + SDoH complexity" },
              { code: "99215", label: "Established — high MDM", rate: "$187.61", note: "High acuity — OD follow-up, acute MH episode" },
            ]} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">CHW Billing Codes</p>
              <SectionTag text="New CY 2024" color="bg-amber-100 text-amber-700" />
            </div>
            <InfoBox
              color="bg-amber-50"
              icon={<Users className="w-4 h-4 text-amber-600" />}
              title="CHW Billing — Key Requirement"
              body="CHWs must be employed by or under the direction of the billing practitioner. The supervising clinician must be accessible (direct or general supervision depending on payer). Minimum 20 minutes of qualifying service required before billing G0019 in a calendar month."
            />
            <CodeTable rows={[
              { code: "G0019", label: "CHW services — chronic condition support, per 15 min", rate: "$32.02", note: "Bill per 15-min increment. Min 20 min/month first claim. Highest-volume CHW code.", tag: "Per 15 min" },
              { code: "G0022", label: "CHW services — social needs screening + referral", rate: "$42.70", note: "AHC HRSN tool-based. Bill once per qualifying encounter.", tag: "Per encounter" },
            ]} />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Required SDOH Z-Codes</p>
              <SectionTag text="Bill on every street encounter" color="bg-red-100 text-red-700" />
            </div>
            <CodeTable rows={[
              { code: "Z59.02", label: "Unsheltered homelessness — street/encampment/vehicle", note: "PRIMARY Z-code for POS 27. Required for CalAIM ECM qualification. Include on every street encounter.", tag: "Critical", tagColor: "bg-red-100 text-red-700" },
              { code: "Z59.01", label: "Sheltered homelessness — shelter/hotel/couch", note: "Use for POS 04 shelter encounters. ECM Population of Focus #1.", tag: "POS 04" },
              { code: "Z59.4", label: "Food insecurity", note: "Document when food barrier affects treatment plan (nutrition, meds absorption, DM management)." },
              { code: "Z59.5", label: "Extreme poverty", note: "Medi-Cal presumptive eligibility trigger; ECM enrollment documentation." },
              { code: "Z75.3", label: "Inaccessibility of healthcare facilities", note: "Documents care gap — core medical necessity for street medicine visit." },
              { code: "F11.10", label: "Opioid use disorder, uncomplicated", note: "MOUD billing; ECM Population of Focus #2; HRVM high-priority flag. Include when relevant.", tag: "OUD" },
            ]} />
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Chronic & Transitional Care</p>
            <CodeTable rows={[
              { code: "99490", label: "Chronic care management — first 20 min/month", rate: "$55.31", note: "≥2 chronic conditions lasting 12+ months. Bill monthly. Pair with 99439 for longer sessions." },
              { code: "99439", label: "CCM — each additional 20 min (add-on)", rate: "$46.90", note: "Add to 99490. Up to 2× per month. High-complexity patients often need 60 min." },
              { code: "99495", label: "Transitional care — moderate, 14-day", rate: "$164.97", note: "Post-hospitalization. Critical for patients discharged to streets — interactive contact within 2 business days." },
              { code: "99496", label: "Transitional care — high, 7-day", rate: "$229.38", note: "High complexity post-discharge. Face-to-face within 7 days. Common post-OD." },
              { code: "99484", label: "BH integration care management, 20 min/month", rate: "$60.17", note: "Depression/anxiety/SUD. Requires registry + systematic follow-up + psychiatric consult." },
            ]} />
          </div>
        </div>
      ),
    },
    {
      id: "intake",
      icon: <ClipboardCheck className="w-5 h-5 text-white" />,
      title: "3. Specialized Intake & Eligibility",
      subtitle: "HPE, Double-Handoff, point-of-care enrollment",
      color: "bg-green-600",
      content: (
        <div className="space-y-4">
          <InfoBox
            color="bg-green-50"
            icon={<Zap className="w-4 h-4 text-green-600" />}
            title="Hospital Presumptive Eligibility (HPE) — Field-Initiated Medi-Cal"
            body="Field teams trained in HPE can grant temporary Medi-Cal coverage immediately at point-of-care, making the initial bridge visit billable on the same day. HPE is valid until the end of the following month, giving patients time to complete a full application."
          />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">HPE Process — Field Workflow</p>
            <CheckList items={[
              { text: "Screen for Medi-Cal eligibility using AHC HRSN tool or DPSS LA Connect mobile app" },
              { text: "Initiate HPE through authorized HPE entity (hospital, FQHC, or approved street medicine org)" },
              { text: "Collect minimum required documentation: name, DOB, attestation of income/residence" },
              { text: "Assign Temporary Aid Code — coverage begins same day" },
              { text: "Document HPE initiation in EHR; flag for billing team to use Medi-Cal as primary payer" },
              { text: "Navigate patient to full Medi-Cal application within 30 days to maintain coverage", warn: true },
            ]} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Double-Handoff System</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              {[
                { title: "Navigator Role", items: ["Collects consent forms & ID documentation", "Performs HRSN screening (G0022)", "Initiates HPE / benefits enrollment", "Schedules follow-up appointments", "Manages authorization requests"] },
                { title: "Clinician Role", items: ["Focuses on clinical examination", "Documents MDM level accurately", "Orders labs / referrals", "Confirms appropriate E&M level", "Co-signs CHW service notes"] },
              ].map(col => (
                <div key={col.title} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-xs font-bold text-gray-700 mb-2">{col.title}</p>
                  <ul className="space-y-1">
                    {col.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                        <span className="text-green-500 mt-0.5">›</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">CalAIM ECM — Point-of-Care Enrollment Triggers</p>
            <CheckList items={[
              { text: "Unsheltered homeless (Z59.02) — ECM Population of Focus #1", sub: "Highest priority; auto-flag in StreetClaim RCM for ECM referral" },
              { text: "History of OD / OUD (F11.x, T40.x) — ECM Population of Focus #2" },
              { text: "High ED utilizers (≥2 ED visits in 12 months) — ECM Population of Focus #3" },
              { text: "Post-incarceration (within 6 months) — ECM Population of Focus #4" },
              { text: "Child welfare involvement — ECM Population of Focus #5" },
              { text: "Long-term care transitions — ECM Population of Focus #6" },
              { text: "Document ECM eligibility in BH Tracker Phase 3 (Outreach & Enrollment)", sub: "Pair with CalAIM lead plan (L.A. Care, Health Net, Molina) prior authorization" },
            ]} />
          </div>
        </div>
      ),
    },
    {
      id: "technology",
      icon: <Smartphone className="w-5 h-5 text-white" />,
      title: "4. Technology Requirements",
      subtitle: "Offline EHR, HIPAA, FHIR R4, device security",
      color: "bg-orange-500",
      content: (
        <div className="space-y-4">
          <InfoBox
            color="bg-orange-50"
            icon={<AlertTriangle className="w-4 h-4 text-orange-600" />}
            title="Standard EMRs Often Fail in the Field"
            body="Most commercial EHRs require internet connectivity and are optimized for clinic workflows. Street medicine requires offline-first capture, GPS-stamped documentation, and automatic sync when connectivity resumes. StreetClaim RCM is built for this workflow."
          />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Technical Requirements Checklist</p>
            <CheckList items={[
              { text: "Offline-first EHR — capture encounters without cellular/Wi-Fi; sync when online", sub: "StreetClaim RCM uses IndexedDB offline store + athenahealth FHIR R4 sync" },
              { text: "HIPAA-compliant device encryption — all devices must have full-disk encryption enabled", sub: "Require MDM (Mobile Device Management) policy before field deployment" },
              { text: "FHIR R4 integration — bi-directional sync with payer/hospital systems", sub: "Supports CMS Interoperability Rule (2021) and CA AB 133 data exchange requirements" },
              { text: "GPS/location stamping — document service location for POS 27 audit trail", sub: "Required if audited on POS 27 claim — must prove care was delivered in the field" },
              { text: "Digital consent forms — obtain HIPAA authorization and HPE consent at point of care" },
              { text: "OData / BI integration — export to Power BI / Tableau for grant reporting and DHCS reporting", sub: "StreetClaim RCM OData 4.0 feed includes 7 entity sets for analytics" },
              { text: "Automatic code suggestion — AI-assisted MDM level & Z-code extraction from clinical notes", sub: "Reduces undercoding — majority of street encounters qualify for 99213–99215, not 99212" },
            ]} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Recommended Device Configuration</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              {[
                { icon: "📱", title: "Field Clinician", items: ["iPad / Android tablet (ruggedized)", "StreetClaim RCM web app (offline)", "Otoscope camera adapter", "Portable printer (BP, labs)"] },
                { icon: "💻", title: "CHW / Navigator", items: ["Chromebook or smartphone", "HRSN screening app", "LAHSA Coordinated Entry portal", "BH Tracker + HPE workflow"] },
                { icon: "🖥️", title: "Billing Admin", items: ["Desktop — secure VPN", "Clearinghouse access (Waystar/Availity)", "Power BI OData dashboard", "Denial queue + re-bill workflow"] },
              ].map(col => (
                <div key={col.title} className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                  <p className="text-sm font-bold text-gray-700 mb-2">{col.icon} {col.title}</p>
                  <ul className="space-y-1">
                    {col.items.map((item, i) => (
                      <li key={i} className="text-xs text-gray-600">› {item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "chw",
      icon: <Users className="w-5 h-5 text-white" />,
      title: "5. CHW Billing Reference",
      subtitle: "G0019 / G0022, supervision, documentation requirements",
      color: "bg-teal-600",
      content: (
        <div className="space-y-4">
          <InfoBox
            color="bg-teal-50"
            icon={<Info className="w-4 h-4 text-teal-600" />}
            title="CHWs: The Bridge to Health and the Street"
            body={`"The only reason why this works this well is them. They're our bridge to health and the street." — Dr. Brett Feldman, USC Street Medicine Director. Each 4-person team's 2 CHWs generate an estimated $1,200–$2,400/month in G0019/G0022 billings when documented correctly.`}
          />
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">G0019 Documentation Requirements (per 15-min increment)</p>
            <CheckList items={[
              { text: "Patient has ≥1 chronic condition expected to last ≥12 months (or until death)", sub: "Diabetes, HTN, HCV, HIV, COPD, opioid use disorder, serious mental illness, etc." },
              { text: "CHW employed by or under direction of billing practitioner (MD, DO, NP, PA)" },
              { text: "Services include: self-management support, adherence coaching, appointment navigation, community resource linkage" },
              { text: "Minimum 20 minutes of qualified CHW service in the calendar month before first G0019 bill" },
              { text: "Document start/stop times in EHR; note specific activities performed" },
              { text: "Supervising clinician co-signs CHW note or provides general supervision (payer-dependent)" },
            ]} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">G0022 Documentation Requirements (per encounter)</p>
            <CheckList items={[
              { text: "Use validated HRSN screening tool (e.g., AHC HRSN 10-question screen)" },
              { text: "Document specific social needs identified: housing, food, transportation, utilities, safety" },
              { text: "Record referrals made and resources provided to address identified needs" },
              { text: "Bill once per qualifying encounter — not per 15 minutes", sub: "Can be billed on same day as G0019 and E&M if services are distinct" },
              { text: "Link to BH Tracker Phase 2 (SDoH & Resource Linkages) documentation", sub: "StreetClaim RCM auto-populates G0022 context from BH Tracker SDoH section" },
            ]} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Monthly CHW Revenue Projection (per team)</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 mt-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-teal-50 border-b border-teal-200">
                    <th className="px-3 py-2 text-left font-semibold text-teal-700">Scenario</th>
                    <th className="px-3 py-2 text-right font-semibold text-teal-700">G0019 Claims</th>
                    <th className="px-3 py-2 text-right font-semibold text-teal-700">G0022 Claims</th>
                    <th className="px-3 py-2 text-right font-semibold text-teal-700">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { scenario: "Conservative (2 CHWs, 10 pts/wk, 30 min avg)", g19: 80, g22: 40, rev: "$3,120" },
                    { scenario: "Moderate (2 CHWs, 15 pts/wk, 45 min avg)", g19: 180, g22: 60, rev: "$6,340" },
                    { scenario: "Optimized (2 CHWs, 20 pts/wk, 60 min avg + full G0022)", g19: 320, g22: 80, rev: "$11,680" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-700">{row.scenario}</td>
                      <td className="px-3 py-2 text-right font-mono">{row.g19}×</td>
                      <td className="px-3 py-2 text-right font-mono">{row.g22}×</td>
                      <td className="px-3 py-2 text-right font-bold text-green-700">{row.rev}/mo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">* Estimated at Medi-Cal TRI rates. Actual collection varies by payer mix and denial rate.</p>
          </div>
        </div>
      ),
    },
    {
      id: "denials",
      icon: <DollarSign className="w-5 h-5 text-white" />,
      title: "6. Denial Prevention & Recovery",
      subtitle: "Pre-claim scrubbing, common denial codes, appeal workflow",
      color: "bg-red-600",
      content: (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Top Denial Reasons — Street Medicine</p>
            <CodeTable rows={[
              { code: "CO-4", label: "Service inconsistent with diagnosis / POS", note: "Fix: Ensure Z59.02 is present on all POS 27 claims. Validate CPT-ICD-10 pairings in StreetClaim denial scrubber." },
              { code: "CO-B7", label: "Provider not certified/eligible to perform service", note: "Fix: Confirm POS 27 enrollment with each payer before billing. Medi-Cal: verify APL 22-023 enrollment is current." },
              { code: "CO-50", label: "Non-covered service — no authorization", note: "Fix: Obtain prior auth for ECM, DME, specialist referrals. CHW codes (G0019/G0022) do NOT require auth for most payers." },
              { code: "CO-22", label: "Coordination of benefits — primary payer must be billed first", note: "Fix: Screen for Medicare / other insurance at every encounter. For dual-eligibles, bill Medicare first, Medi-Cal second." },
              { code: "PR-96", label: "Non-covered charge; patient's not responsible", note: "Fix: Medi-Cal patients have zero cost-share; this code typically indicates a payer enrollment issue." },
            ]} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Pre-Claim Scrub Checklist</p>
            <CheckList items={[
              { text: "POS 27 present on all field encounters (not POS 11 or POS 22)" },
              { text: "Z59.02 listed as secondary diagnosis on every street encounter" },
              { text: "E&M MDM level matches documented complexity in clinical note" },
              { text: "CHW G0019 has ≥20 min total time documented for month; G0022 has HRSN screening results" },
              { text: "Referring provider NPI valid and credentialed with claim payer" },
              { text: "Duplicate claim check — verify claim not already submitted/paid" },
              { text: "Eligibility verified within 24 hours of encounter (real-time AEVS for Medi-Cal)" },
            ]} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Appeal Timeline Reference</p>
            <CodeTable rows={[
              { code: "Medicare", label: "Redetermination (Level 1)", note: "File within 120 days of denial. Expect response within 60 days. Success rate ~25%." },
              { code: "Medicare", label: "Reconsideration (Level 2 — QIC)", note: "File within 180 days. Independent review. Success rate improves with clinical documentation." },
              { code: "Medi-Cal", label: "Provider Dispute Resolution (PDR)", note: "File within 365 days of denial. Required before administrative hearing. DHCS responds within 45 days." },
              { code: "MCO", label: "Plan grievance / appeal", note: "File within 60 days of denial. Each plan has specific form/portal. Escalate to IMR if denied again." },
            ]} />
          </div>
        </div>
      ),
    },
  ];

  const quickStats = [
    { label: "POS 27 Live", value: "Oct 2023", icon: "📍", color: "bg-blue-100 text-blue-800" },
    { label: "Medi-Cal TRI Floor", value: "87.5% of Medicare", icon: "💰", color: "bg-green-100 text-green-800" },
    { label: "CHW Codes Live", value: "Jan 2024", icon: "👥", color: "bg-teal-100 text-teal-800" },
    { label: "CA Programs", value: "60+ and growing", icon: "🏥", color: "bg-purple-100 text-purple-800" },
    { label: "Top E&M Level", value: "99213–99214", icon: "🩺", color: "bg-amber-100 text-amber-800" },
    { label: "Critical Z-Code", value: "Z59.02", icon: "⚠️", color: "bg-red-100 text-red-800" },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-slate-800 to-blue-900 text-white px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-300" />
            <span className="text-blue-300 text-xs font-semibold uppercase tracking-widest">Billing Operations Guide</span>
          </div>
          <h1 className="text-3xl font-black mb-2 leading-tight">Street Medicine Billing<br />Operations — 2026</h1>
          <p className="text-blue-200 text-sm max-w-2xl leading-relaxed mb-6">
            A complete operational reference for establishing a professional billing operation for street medicine.
            Covers credentialing (APL 22-023), POS 27, CHW codes, HPE enrollment, denial prevention, and CHW revenue projection.
          </p>
          {/* Quick-reference pills */}
          <div className="flex flex-wrap gap-2">
            {quickStats.map(s => (
              <div key={s.label} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.color}`}>
                <span>{s.icon}</span>
                <span>{s.label}:</span>
                <span className="font-black">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key alert banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            <span className="font-bold">Revenue gap alert:</span> Before POS 27 (October 2023), over 70% of street medicine care went un-reimbursed. Using POS 22 instead of POS 27 still causes the most common billing error — always verify the place of service code before submitting.
          </p>
        </div>
      </div>

      {/* Accordion sections */}
      <div className="max-w-5xl mx-auto px-6 pt-8 space-y-3">
        {sections.map(section => (
          <AccordionItem
            key={section.id}
            section={section}
            open={openSection === section.id}
            onToggle={() => toggle(section.id)}
          />
        ))}
      </div>

      {/* Footer contact */}
      <div className="max-w-5xl mx-auto px-6 mt-8">
        <Card className="bg-blue-700 text-white border-0">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm">Need credentialing or billing support?</p>
              <p className="text-blue-200 text-xs mt-1">Reference: USC Street Medicine — Keck School of Medicine · Brett Feldman, MD (Director & Co-Founder)</p>
              <p className="text-blue-200 text-xs">California DHCS Street Medicine resources: <span className="underline">dhcs.ca.gov</span> · APL 22-023 · DHCS SPA 23-0035</p>
            </div>
            <a
              href="tel:3234421900"
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              (323) 442-1900
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
