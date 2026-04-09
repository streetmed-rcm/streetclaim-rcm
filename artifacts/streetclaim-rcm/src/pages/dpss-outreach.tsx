import { useState } from "react";
import {
  Users, MapPin, Calendar, CheckSquare, Square, ChevronDown, ChevronRight,
  ClipboardList, MessageCircle, Package, BarChart2, Download, Plus, Trash2,
  Phone, AlertTriangle, Info, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────

type ProgramKey = "mediCal" | "calFresh" | "calWorks" | "generalRelief" | "ssi" | "ihss";

interface EventSetup {
  date: string;
  location: string;
  locationType: string;
  expectedAttendees: string;
  dpssWorker: string;
  streetMedTeam: string;
  programs: ProgramKey[];
  notes: string;
}

interface ContactLog {
  id: string;
  name: string;
  language: string;
  programs: ProgramKey[];
  outcome: "enrolled" | "referred" | "ineligible" | "followup" | "declined";
  notes: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PROGRAM_LABELS: Record<ProgramKey, { label: string; color: string; abbr: string; short: string }> = {
  mediCal:      { label: "Medi-Cal (Medicaid)",         color: "bg-blue-100 text-blue-800",   abbr: "MC",   short: "Medi-Cal" },
  calFresh:     { label: "CalFresh (SNAP)",             color: "bg-green-100 text-green-800", abbr: "CF",   short: "CalFresh" },
  calWorks:     { label: "CalWORKs (Cash Aid)",         color: "bg-purple-100 text-purple-800", abbr: "CW", short: "CalWORKs" },
  generalRelief: { label: "General Relief (GR)",        color: "bg-amber-100 text-amber-800", abbr: "GR",  short: "Gen. Relief" },
  ssi:          { label: "SSI / SSDI (Disability)",     color: "bg-orange-100 text-orange-800", abbr: "SSI", short: "SSI/SSDI" },
  ihss:         { label: "IHSS (In-Home Support)",      color: "bg-teal-100 text-teal-800",   abbr: "IHSS", short: "IHSS" },
};

const ALL_PROGRAMS = Object.keys(PROGRAM_LABELS) as ProgramKey[];

const OUTCOME_STYLES: Record<ContactLog["outcome"], string> = {
  enrolled:    "bg-green-100 text-green-800",
  referred:    "bg-blue-100 text-blue-800",
  ineligible:  "bg-gray-100 text-gray-600",
  followup:    "bg-amber-100 text-amber-700",
  declined:    "bg-red-100 text-red-700",
};

const OUTCOME_LABELS: Record<ContactLog["outcome"], string> = {
  enrolled:   "Enrolled",
  referred:   "Referred",
  ineligible: "Ineligible",
  followup:   "Follow-up",
  declined:   "Declined",
};

const LOCATION_TYPES = [
  "Encampment (outdoor)",
  "Emergency shelter",
  "Transitional housing",
  "Park / public space",
  "Drop-in center",
  "Church / faith site",
  "Laundromat",
  "Library",
  "Mobile van stop",
];

const LANGUAGES = ["English", "Spanish", "Korean", "Chinese (Mandarin)", "Tagalog", "Armenian", "Farsi", "Vietnamese", "Other"];

const EMPTY_EVENT: EventSetup = {
  date: new Date().toISOString().split("T")[0],
  location: "",
  locationType: LOCATION_TYPES[0],
  expectedAttendees: "",
  dpssWorker: "",
  streetMedTeam: "",
  programs: ["mediCal", "calFresh", "generalRelief"],
  notes: "",
};

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionCard({ icon, title, children, defaultOpen = true }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border-2 border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2.5 text-left">
          <span className="text-gray-600">{icon}</span>
          <span className="font-bold text-gray-900 text-sm">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

function ProgramPill({ code }: { code: ProgramKey }) {
  const p = PROGRAM_LABELS[code];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.color}`}>{p.abbr}</span>;
}

function CheckItem({ checked, onToggle, label, sub }: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button onClick={onToggle} className="flex items-start gap-2 text-left w-full py-1 hover:bg-gray-50 rounded px-1 transition-colors">
      {checked
        ? <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
        : <Square className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      }
      <div>
        <p className={`text-sm ${checked ? "line-through text-gray-400" : "text-gray-800"}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </button>
  );
}

// ─── Sections ──────────────────────────────────────────────────────────────

function EventSetupSection({ event, setEvent }: { event: EventSetup; setEvent: (e: EventSetup) => void }) {
  const toggleProgram = (p: ProgramKey) => {
    const current = event.programs;
    setEvent({
      ...event,
      programs: current.includes(p) ? current.filter(x => x !== p) : [...current, p],
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Event Date</label>
          <input
            type="date"
            value={event.date}
            onChange={e => setEvent({ ...event, date: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Expected Attendees</label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 25"
            value={event.expectedAttendees}
            onChange={e => setEvent({ ...event, expectedAttendees: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">DPSS Eligibility Worker</label>
          <input
            type="text"
            placeholder="e.g. M. Ruiz, DPSS Metro District"
            value={event.dpssWorker}
            onChange={e => setEvent({ ...event, dpssWorker: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Street Medicine Team</label>
          <input
            type="text"
            placeholder="e.g. Skid Row Alpha — Dr. Vega"
            value={event.streetMedTeam}
            onChange={e => setEvent({ ...event, streetMedTeam: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Location</label>
        <input
          type="text"
          placeholder="e.g. 5th & San Pedro St encampment, Skid Row"
          value={event.location}
          onChange={e => setEvent({ ...event, location: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Location Type</label>
        <select
          value={event.locationType}
          onChange={e => setEvent({ ...event, locationType: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        >
          {LOCATION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Programs at This Event</label>
        <div className="flex flex-wrap gap-2">
          {ALL_PROGRAMS.map(p => {
            const meta = PROGRAM_LABELS[p];
            const active = event.programs.includes(p);
            return (
              <button
                key={p}
                onClick={() => toggleProgram(p)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border-2 transition-all ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-800"
                    : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Event Notes</label>
        <textarea
          rows={2}
          placeholder="Any special notes (language needs, known barriers, key community contacts, etc.)"
          value={event.notes}
          onChange={e => setEvent({ ...event, notes: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>
    </div>
  );
}

function OutreachScripts({ programs }: { programs: ProgramKey[] }) {
  const scripts: Record<ProgramKey, { opener: string; ask: string; screen: string[]; docsNeeded: string[] }> = {
    mediCal: {
      opener: "Hi, my name is [Name] with LA County DPSS. Are you currently enrolled in Medi-Cal for health coverage?",
      ask: "I can sign you up for free health insurance today — it's called Medi-Cal. It covers doctor visits, prescriptions, dental, and emergency care. Can I help you apply right now?",
      screen: [
        "Are you a California resident?",
        "Are you a US citizen, permanent resident, or have immigration status?",
        "What is your monthly income? (Medi-Cal has no asset limit)",
        "Do you have a Social Security Number or can I apply with just your name and date of birth?",
      ],
      docsNeeded: ["Photo ID or statement of identity", "Proof of address (or attestation if homeless)", "SSN (optional for emergency enrollment)", "Income documentation (or attestation if no income)"],
    },
    calFresh: {
      opener: "Are you getting CalFresh — that's the food assistance benefit that goes on an EBT card?",
      ask: "CalFresh gives you money on a debit card each month to buy groceries — many people get $200 or more. It's completely free and doesn't affect other benefits. Can I check if you qualify today?",
      screen: [
        "Do you have a fixed address or are you living outside / in a shelter? (Both qualify!)",
        "Are you working? (Optional — you may still qualify)",
        "Are you getting SSI? (SSI recipients automatically qualify in California)",
        "Are you a US citizen or legal permanent resident?",
      ],
      docsNeeded: ["ID (any — CA ID, passport, even a utility bill with your name)", "EBT card if you already have one (for reactivation)", "No address required if experiencing homelessness"],
    },
    calWorks: {
      opener: "Do you have children living with you or family members under 19 you're taking care of?",
      ask: "CalWORKs provides cash assistance and job support for families with children. There's also childcare help, housing assistance, and job training. Would you like to apply?",
      screen: [
        "Do you have children under 18 living in your household?",
        "Are you a California resident?",
        "What is your household income?",
        "Are you a US citizen or have qualified immigration status?",
      ],
      docsNeeded: ["Photo ID", "Children's birth certificates", "Proof of income or zero-income declaration", "Social Security Numbers for household members"],
    },
    generalRelief: {
      opener: "Have you applied for General Relief — that's the county cash assistance program for adults without children?",
      ask: "General Relief gives you up to $221/month in cash assistance. It's for adults aged 18–64 who aren't eligible for other programs. You can apply right here today.",
      screen: [
        "Are you between 18 and 64 years old?",
        "Are you currently housed or experiencing homelessness?",
        "Are you working? (You can still qualify with low income)",
        "Are you receiving any other cash aid (SSI, CalWORKs)?",
      ],
      docsNeeded: ["Any photo ID", "Social Security Number or application without SSN (homeless waiver available)", "No address required"],
    },
    ssi: {
      opener: "Do you have a disability or health condition that makes it hard to work — or are you 65 or older?",
      ask: "SSI is a federal benefit that can give you $943/month plus automatic Medi-Cal. I can help start the application process with SSA today and connect you with a benefits counselor.",
      screen: [
        "Are you 65 or older, or do you have a disabling condition?",
        "Has your condition lasted (or is expected to last) 12+ months?",
        "Are you a US citizen or qualified immigrant?",
        "Do you have a Social Security Number?",
      ],
      docsNeeded: ["SSN card or confirmation of SSN", "Photo ID", "Medical records if available (doctor can submit separately)", "Banking info for direct deposit (optional)"],
    },
    ihss: {
      opener: "Do you need help with bathing, cooking, cleaning, or getting around because of a disability or health condition?",
      ask: "IHSS pays a family member or caregiver to help you at home — you can even hire a neighbor or friend. You need to be on Medi-Cal. Would you like me to start an application?",
      screen: [
        "Are you currently on Medi-Cal?",
        "Do you have a doctor who can document your need for in-home care?",
        "Do you have someone in mind who could be your caregiver?",
        "Are you 65+ or have a physical/developmental disability?",
      ],
      docsNeeded: ["Active Medi-Cal ID", "Doctor's statement of need", "Caregiver's info (name, SSN, address) if already selected"],
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-800">
          <span className="font-bold">Trauma-informed approach:</span> Use warm, non-judgmental language. Lead with benefit, not eligibility. Acknowledge the difficulty of the process. Always let the person guide the pace.
        </p>
      </div>
      {(programs.length > 0 ? programs : ALL_PROGRAMS).map(prog => {
        const s = scripts[prog];
        const meta = PROGRAM_LABELS[prog];
        return (
          <div key={prog} className="rounded-lg border border-gray-200 overflow-hidden">
            <div className={`px-3 py-2 flex items-center gap-2 ${meta.color}`}>
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">{meta.label} — Outreach Script</span>
            </div>
            <div className="p-3 space-y-3 bg-white">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Opening Line</p>
                <p className="text-sm text-gray-800 italic bg-gray-50 rounded px-2 py-1.5">"{s.opener}"</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Benefit Ask</p>
                <p className="text-sm text-gray-800 italic bg-blue-50 rounded px-2 py-1.5">"{s.ask}"</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Screening Questions</p>
                <ul className="space-y-1">
                  {s.screen.map((q, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-700">
                      <span className="text-blue-500 font-bold mt-0.5">›</span>{q}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Documents Needed</p>
                <div className="flex flex-wrap gap-1">
                  {s.docsNeeded.map((d, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">{d}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PreEventChecklist() {
  const ITEMS = [
    // Forms
    { label: "SAWS 1 — Application for Benefits (paper backup)", sub: "Medi-Cal / CalFresh / CalWORKs combined app", group: "Forms" },
    { label: "GR 1 / GR 2 — General Relief applications", sub: "LA County DPSS General Relief paper form", group: "Forms" },
    { label: "HPE attestation forms (MCMC forms)", sub: "Hospital Presumptive Eligibility for immediate Medi-Cal", group: "Forms" },
    { label: "ACA marketplace enrollment toolkit", sub: "Covered California paper apps for mixed-status families", group: "Forms" },
    { label: "IHSS referral forms (SOC 295)", sub: "In-Home Supportive Services referral packet", group: "Forms" },
    // Tech
    { label: "Charged tablet / laptop with DPSS apps loaded", sub: "BenefitsCal.com, LA County DPSS ProviderConnect, LAUSD tabs", group: "Technology" },
    { label: "Portable hotspot / cellular backup", sub: "BenefitsCal requires internet — have offline backup forms", group: "Technology" },
    { label: "StreetClaim RCM loaded on field device", sub: "Offline-ready — sync after event", group: "Technology" },
    { label: "Portable printer (receipts / confirmation #s)", sub: "Clients trust printed confirmations", group: "Technology" },
    // Supplies
    { label: "Multilingual flyers — English, Spanish, Korean, Chinese, Tagalog", sub: "At minimum English + Spanish for LA County events", group: "Supplies" },
    { label: "Pens, clipboards, privacy folders", sub: "People may need help writing — always offer assistance", group: "Supplies" },
    { label: "Interpreter contact card or translation app", sub: "DPSS Language Line: 1-800-952-5253", group: "Supplies" },
    { label: "DPSS Outreach ID badge + business cards", sub: "Trust factor — always show ID before beginning", group: "Supplies" },
    // Coordination
    { label: "Briefed on today's street medicine team and CHW staff", sub: "Know who's doing clinical screening vs. benefits enrollment", group: "Coordination" },
    { label: "Confirm LAHSA Coordinated Entry contact on-site or on call", sub: "Co-enrollment with housing system is the goal", group: "Coordination" },
    { label: "Know nearest DPSS district office for same-day escalations", sub: "Metro: (213) 744-4800 · Compton: (323) 249-0500 · Van Nuys: (818) 756-9000", group: "Coordination" },
    { label: "Know nearest ED and urgent care if medical need identified", sub: "Coordinate warm handoff with street medicine team", group: "Coordination" },
  ];

  const groups = [...new Set(ITEMS.map(i => i.group))];
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setChecked(prev => ({ ...prev, [i]: !prev[i] }));

  const total = ITEMS.length;
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">{done}/{total} items checked</div>
        <div className="h-2 flex-1 mx-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        {done === total && (
          <span className="text-xs font-bold text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready!
          </span>
        )}
      </div>
      {groups.map(group => (
        <div key={group}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{group}</p>
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-2 space-y-0.5">
            {ITEMS.filter(i => i.group === group).map((item, absIdx) => {
              const idx = ITEMS.indexOf(item);
              return (
                <CheckItem
                  key={idx}
                  checked={!!checked[idx]}
                  onToggle={() => toggle(idx)}
                  label={item.label}
                  sub={item.sub}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EligibilityRef() {
  const programs = [
    {
      key: "mediCal" as ProgramKey,
      income: "138% FPL (~$20,120/yr single adult)",
      amount: "Full health coverage — $0 premium, $0 copay for most services",
      notes: "No asset limit. Undocumented adults 26–49 eligible in CA since Jan 2024 (Medi-Cal for All). HPE allows same-day presumptive enrollment at point of care.",
      hotline: "1-800-300-1506",
      portal: "BenefitsCal.com",
    },
    {
      key: "calFresh" as ProgramKey,
      income: "200% FPL (~$29,160/yr single adult)",
      amount: "$23–$292/mo per person (2024 SNAP benefit amounts)",
      notes: "No cooking facilities? Homeless individuals may qualify for the restaurant meals program (EBT at participating restaurants). SSI recipients auto-qualify.",
      hotline: "1-877-847-3663",
      portal: "BenefitsCal.com",
    },
    {
      key: "calWorks" as ProgramKey,
      income: "Varies by family size",
      amount: "Up to $1,052/mo (2024) for family of 3, cash + services",
      notes: "Comes with childcare, job training, housing assistance, and substance use treatment linkage. 60-month lifetime limit (may not apply to exempted cases).",
      hotline: "1-800-952-5253",
      portal: "BenefitsCal.com",
    },
    {
      key: "generalRelief" as ProgramKey,
      income: "General Relief recipient must have no other income source",
      amount: "$221/mo (cash) + Medi-Cal enrollment",
      notes: "LA County-specific — not available in all CA counties. For adults 18–64 not eligible for other programs. Apply at DPSS district office OR through mobile outreach.",
      hotline: "(213) 744-4880",
      portal: "dpss.lacounty.gov",
    },
    {
      key: "ssi" as ProgramKey,
      income: "SSI: No income limit (income reduces benefit amount)",
      amount: "$943/mo federal + CA state supplement (2024)",
      notes: "SSI recipients automatically enrolled in Medi-Cal in CA. 5-month waiting period waived for blindness. Can apply online at SSA.gov or via phone — DPSS can facilitate referral.",
      hotline: "1-800-772-1213 (SSA)",
      portal: "ssa.gov/ssi",
    },
    {
      key: "ihss" as ProgramKey,
      income: "Must be on Medi-Cal",
      amount: "Hourly wage paid to caregiver (LA County: $18.55/hr, 2024)",
      notes: "Family members (including spouses in some cases) can be paid caregivers. Requires doctor letter documenting care needs. Processing can take 30–60 days.",
      hotline: "(213) 744-4494",
      portal: "dpss.lacounty.gov/ihss",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800">
          <span className="font-bold">Key point:</span> Most unhoused individuals qualify for both Medi-Cal AND CalFresh AND General Relief simultaneously. Always check all three programs before closing the interaction.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase w-28">Program</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Income Limit</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase hidden md:table-cell">Benefit Amount</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase hidden lg:table-cell">Key Notes</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase w-32">Hotline</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2.5">
                  <ProgramPill code={p.key} />
                  <div className="text-[10px] text-gray-500 mt-0.5">{PROGRAM_LABELS[p.key].short}</div>
                </td>
                <td className="px-3 py-2.5 text-gray-700">{p.income}</td>
                <td className="px-3 py-2.5 text-green-700 font-semibold hidden md:table-cell">{p.amount}</td>
                <td className="px-3 py-2.5 text-gray-500 hidden lg:table-cell">{p.notes}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-blue-700">
                    <Phone className="w-3 h-3" />
                    <span className="font-mono text-[10px]">{p.hotline}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{p.portal}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactTracker({ contacts, setContacts, eventPrograms }: {
  contacts: ContactLog[];
  setContacts: (c: ContactLog[]) => void;
  eventPrograms: ProgramKey[];
}) {
  const newContact = (): ContactLog => ({
    id: `c-${Date.now()}`,
    name: "",
    language: "English",
    programs: [],
    outcome: "followup",
    notes: "",
  });

  const addRow = () => setContacts([...contacts, newContact()]);
  const removeRow = (id: string) => setContacts(contacts.filter(c => c.id !== id));
  const updateRow = (id: string, patch: Partial<ContactLog>) =>
    setContacts(contacts.map(c => c.id === id ? { ...c, ...patch } : c));

  const toggleProg = (contact: ContactLog, prog: ProgramKey) => {
    const updated = contact.programs.includes(prog)
      ? contact.programs.filter(p => p !== prog)
      : [...contact.programs, prog];
    updateRow(contact.id, { programs: updated });
  };

  const summary = {
    total: contacts.length,
    enrolled: contacts.filter(c => c.outcome === "enrolled").length,
    referred: contacts.filter(c => c.outcome === "referred").length,
    followup: contacts.filter(c => c.outcome === "followup").length,
  };

  const exportCSV = () => {
    const headers = ["Name", "Language", "Programs", "Outcome", "Notes"];
    const rows = contacts.map(c => [
      c.name,
      c.language,
      c.programs.map(p => PROGRAM_LABELS[p].abbr).join("+"),
      OUTCOME_LABELS[c.outcome],
      c.notes.replace(/,/g, ";"),
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dpss-event-contacts-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      {contacts.length > 0 && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Contacted", value: summary.total, color: "bg-blue-50 text-blue-800" },
            { label: "Enrolled", value: summary.enrolled, color: "bg-green-50 text-green-800" },
            { label: "Referred", value: summary.referred, color: "bg-purple-50 text-purple-800" },
            { label: "Follow-up", value: summary.followup, color: "bg-amber-50 text-amber-800" },
          ].map(s => (
            <div key={s.label} className={`rounded-lg p-2 ${s.color}`}>
              <p className="text-lg font-black">{s.value}</p>
              <p className="text-[10px] font-bold uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Contact rows */}
      <div className="space-y-2">
        {contacts.map((c) => (
          <div key={c.id} className="rounded-lg border border-gray-200 p-3 bg-white space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Name (initials OK)"
                value={c.name}
                onChange={e => updateRow(c.id, { name: e.target.value })}
                className="border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
              <select
                value={c.language}
                onChange={e => updateRow(c.id, { language: e.target.value })}
                className="border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
              <select
                value={c.outcome}
                onChange={e => updateRow(c.id, { outcome: e.target.value as ContactLog["outcome"] })}
                className="border border-gray-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                {Object.entries(OUTCOME_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={() => removeRow(c.id)}
                className="flex items-center justify-center gap-1 text-xs text-red-400 hover:text-red-600 border border-red-100 rounded px-2 py-1.5 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
            {/* Program toggles */}
            <div className="flex flex-wrap gap-1">
              {(eventPrograms.length > 0 ? eventPrograms : ALL_PROGRAMS).map(prog => {
                const meta = PROGRAM_LABELS[prog];
                const active = c.programs.includes(prog);
                return (
                  <button
                    key={prog}
                    onClick={() => toggleProg(c, prog)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                      active ? `${meta.color} border-transparent` : "bg-white border-gray-200 text-gray-400"
                    }`}
                  >
                    {meta.abbr}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder="Notes (follow-up date, barriers, referrals made...)"
              value={c.notes}
              onChange={e => updateRow(c.id, { notes: e.target.value })}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={addRow}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-xs h-8 px-3"
        >
          <Plus className="w-3.5 h-3.5" /> Add Contact
        </Button>
        {contacts.length > 0 && (
          <Button
            variant="outline"
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs h-8 px-3"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function DPSSOutreachPage() {
  const [event, setEvent] = useState<EventSetup>(EMPTY_EVENT);
  const [contacts, setContacts] = useState<ContactLog[]>([]);

  const headerLocation = event.location || "Location TBD";
  const headerDate = event.date
    ? new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Date TBD";

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-800 to-teal-900 text-white px-6 py-9">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-green-300" />
            <span className="text-green-300 text-xs font-semibold uppercase tracking-widest">DPSS Eligibility Outreach</span>
          </div>
          <h1 className="text-2xl font-black mb-1 leading-tight">Pop-Up Event Outreach Tool</h1>
          <p className="text-green-200 text-sm leading-relaxed mb-4 max-w-xl">
            Scripts, checklists, and a contact tracker for DPSS eligibility workers joining street medicine pop-up events to enroll unhoused individuals in Medi-Cal, CalFresh, General Relief, and more.
          </p>
          {/* Live event info */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 text-sm">
              <Calendar className="w-4 h-4 text-green-300" />
              <span className="font-semibold">{headerDate}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 text-sm">
              <MapPin className="w-4 h-4 text-green-300" />
              <span className="font-semibold">{headerLocation}</span>
            </div>
            {contacts.length > 0 && (
              <div className="flex items-center gap-1.5 bg-green-600/40 rounded-lg px-3 py-1.5 text-sm">
                <BarChart2 className="w-4 h-4 text-green-300" />
                <span className="font-semibold">{contacts.length} contacts logged</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-3">
        <SectionCard icon={<Calendar className="w-4 h-4" />} title="Event Setup">
          <EventSetupSection event={event} setEvent={setEvent} />
        </SectionCard>

        <SectionCard icon={<CheckSquare className="w-4 h-4" />} title="Pre-Event Checklist" defaultOpen={false}>
          <PreEventChecklist />
        </SectionCard>

        <SectionCard icon={<ClipboardList className="w-4 h-4" />} title="Eligibility Quick Reference" defaultOpen={false}>
          <EligibilityRef />
        </SectionCard>

        <SectionCard icon={<MessageCircle className="w-4 h-4" />} title={`Outreach Scripts${event.programs.length > 0 ? ` (${event.programs.length} programs)` : ""}`} defaultOpen={false}>
          <OutreachScripts programs={event.programs} />
        </SectionCard>

        <SectionCard icon={<Package className="w-4 h-4" />} title={`Contact Log${contacts.length > 0 ? ` — ${contacts.length} logged` : ""}`} defaultOpen={true}>
          <ContactTracker contacts={contacts} setContacts={setContacts} eventPrograms={event.programs} />
        </SectionCard>
      </div>
    </div>
  );
}
