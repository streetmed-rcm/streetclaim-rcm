import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ENTITY_SETS = [
  {
    name: "Claims",
    description: "All 331 claims from PostgreSQL — CPT codes, POS, billed/collected amounts, SDOH Z-codes, payer type, and claim status",
    columns: ["ClaimNumber", "PayerType", "PosCode", "EmCode", "BilledAmount", "CollectedAmount", "Status", "HasZCodes", "SdohZCodes"],
    useCases: ["Claims volume over time", "Revenue by payer & POS code", "Z-code prevalence", "Denial patterns by CPT code"],
  },
  {
    name: "FeeSchedule",
    description: "2025 CMS Medicare MPFS rates and Medi-Cal TRI rates per CPT code — real government data",
    columns: ["Code", "MdmLevel", "NonFacRvu", "FacRvu", "MedicareNonFacRate", "MedicareFacRate", "MediCalTriRate", "LiftPercent"],
    useCases: ["Fee schedule rate comparison", "POS 27 vs POS 22 rate lift chart", "Medi-Cal vs Medicare rate gap"],
  },
  {
    name: "RevenueSummary",
    description: "Pre-aggregated revenue lift by payer — baseline (facility rate) vs. StreetClaim (POS 27 non-facility)",
    columns: ["PayerType", "BaselineBilled", "StreetClaimBilled", "Lift", "LiftPercent", "ClaimCount", "ZCodeClaims"],
    useCases: ["Revenue lift KPI card", "Payer-level bar chart", "Total lift gauge/donut"],
  },
  {
    name: "Teams",
    description: "20 field teams across SoCal — location, status, patients served, team lead, county",
    columns: ["Id", "Name", "County", "Status", "PatientsToday", "Latitude", "Longitude", "Type", "Lead"],
    useCases: ["Team map visual (lat/lng)", "Patients by county", "Status breakdown donut", "Active vs. offline KPIs"],
  },
  {
    name: "DenialRates",
    description: "Real 2024 denial and collection rates by payer — Premier Inc. 2024, Experian/Becker's 2024",
    columns: ["PayerType", "DenialRatePct", "EffectiveCollectionPct", "Source", "Note"],
    useCases: ["Denial rate comparison bar chart", "Collection efficiency by payer"],
  },
  {
    name: "SdohZCodes",
    description: "SDOH Z-code reference table — ICD-10 codes used for homelessness and social determinants billing",
    columns: ["Code", "Description", "Category"],
    useCases: ["Z-code category breakdown", "Housing vs. social vs. employment SDOH split"],
  },
  {
    name: "HrvmKiosks",
    description: "55 LA County communities — real drug overdose mortality rates (DPH 2018–2022) + HRVM weighted placement recommendation scores, risk tiers, lat/lng, and homeless population estimates",
    columns: ["Id", "Name", "CommunityType", "OverdoseMortalityRate", "RiskCategory", "HomelessPopEst", "ServiceGapIndex", "HrvmRecommendationScore", "Latitude", "Longitude"],
    useCases: ["Heat map by Latitude/Longitude (Map visual)", "Top-N communities by HrvmRecommendationScore bar chart", "Risk category pie/donut", "Mortality rate choropleth", "Score vs. mortality scatter plot"],
  },
];

const STEPS = [
  {
    step: "1",
    title: "Open Power BI Desktop",
    detail: 'Click "Get Data" in the Home ribbon → search for "OData" → select "OData Feed" → click Connect.',
  },
  {
    step: "2",
    title: "Enter the OData feed URL",
    detail: 'Paste the URL below into the URL field. Leave authentication as "Anonymous" (no credentials required).',
  },
  {
    step: "3",
    title: "Select entity sets",
    detail: 'In the Navigator pane, check the entity sets you want (Claims, FeeSchedule, Teams, etc.) → click "Load" or "Transform Data".',
  },
  {
    step: "4",
    title: "Build your report",
    detail: 'All columns are typed. Drag BilledAmount, LiftPercent, PayerType onto visuals. Use Latitude/Longitude from the Teams table with the Map visual.',
  },
  {
    step: "5",
    title: "Schedule refresh (Power BI Service)",
    detail: 'Publish the report to Power BI Service → Settings → Datasets → Scheduled Refresh → add the OData URL as a data source. Refresh up to 8×/day on Pro.',
  },
];

export default function PowerBIPage() {
  const [domain, setDomain] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDomain(window.location.host);
  }, []);

  const odataUrl = domain ? `https://${domain}/api/odata` : "https://<your-domain>/api/odata";
  const metaUrl = domain ? `https://${domain}/api/odata/$metadata` : "https://<your-domain>/api/odata/$metadata";

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Power BI Connection</h1>
          <p className="mt-1 text-sm text-gray-500">
            Connect Power BI Desktop or Power BI Service directly to StreetClaim RCM via the OData 4.0 feed —
            no credentials or API keys required.
          </p>
        </div>

        <Card className="border-2 border-yellow-400 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-yellow-900">OData Feed URL</CardTitle>
            <CardDescription className="text-yellow-700">
              Paste this into Power BI Desktop → Get Data → OData Feed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded bg-white border border-yellow-300 px-3 py-2.5 text-sm font-mono text-gray-800 select-all">
                {odataUrl}
              </code>
              <button
                onClick={() => copy(odataUrl)}
                className="shrink-0 rounded-md bg-yellow-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-yellow-600 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-yellow-700">
              Metadata: <code className="text-yellow-800">{metaUrl}</code> — returns CSDL/XML schema for all entity types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Connection Steps</CardTitle>
            <CardDescription>Works with Power BI Desktop (free) and Power BI Service (Pro/Premium)</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {STEPS.map((s) => (
                <li key={s.step} className="flex gap-4">
                  <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-bold">
                    {s.step}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{s.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Available Entity Sets</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {ENTITY_SETS.map((es) => (
              <Card key={es.name} className="flex flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-blue-700">
                    <code className="text-sm">{es.name}</code>
                  </CardTitle>
                  <CardDescription className="text-xs">{es.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Key columns</p>
                    <div className="flex flex-wrap gap-1">
                      {es.columns.map((c) => (
                        <span key={c} className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Suggested visuals</p>
                    <ul className="space-y-0.5">
                      {es.useCases.map((u) => (
                        <li key={u} className="text-xs text-gray-600 flex gap-1.5">
                          <span className="text-blue-400 mt-0.5">›</span>{u}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>OData Query Examples</CardTitle>
            <CardDescription>Use these query parameters directly in Power BI or any OData client</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: "All Medi-Cal claims", url: `${odataUrl}/Claims?$filter=PayerType eq 'medi_cal'` },
                { label: "Top 10 highest-billed claims", url: `${odataUrl}/Claims?$top=10&$orderby=BilledAmount desc` },
                { label: "POS 27 claims with Z-codes only", url: `${odataUrl}/Claims?$filter=PosCode eq '27'` },
                { label: "Fee schedule — all 5 CPT codes", url: `${odataUrl}/FeeSchedule` },
                { label: "Active field teams only", url: `${odataUrl}/Teams?$filter=Status eq 'active_encounter'` },
                { label: "Revenue summary by payer", url: `${odataUrl}/RevenueSummary` },
                { label: "Record count (for pagination)", url: `${odataUrl}/Claims?$count=true&$top=0` },
              ].map((ex) => (
                <div key={ex.label} className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
                  <p className="text-xs font-medium text-gray-600 mb-1">{ex.label}</p>
                  <code className="text-xs text-gray-800 break-all">{ex.url}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>GitHub Repository</CardTitle>
            <CardDescription>Full source code — all 297 files pushed to GitHub</CardDescription>
          </CardHeader>
          <CardContent>
            <a
              href="https://github.com/waynebrockswinson-a11y/streetclaim-rcm"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              waynebrockswinson-a11y/streetclaim-rcm
            </a>
            <p className="mt-2 text-xs text-gray-500">
              297 files · 2 commits · MIT license ·
              Flask + Express + React/Vite + PostgreSQL + OData
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
