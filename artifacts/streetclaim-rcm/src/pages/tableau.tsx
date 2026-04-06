import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "tableau-viz": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          width?: string;
          height?: string;
          toolbar?: string;
          "hide-tabs"?: boolean;
          device?: string;
        },
        HTMLElement
      >;
    }
  }
}

const TABLEAU_SCRIPT = "https://public.tableau.com/javascripts/api/tableau.embedding.3.latest.min.js";

const DEFAULT_PANELS: { label: string; url: string }[] = [
  {
    label: "Revenue by Payer",
    url: "https://public.tableau.com/views/GlobalSuperstore_16857598070100/GlobalSuperstoreOverviewDashboard",
  },
];

function useTableauScript() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (document.querySelector(`script[src="${TABLEAU_SCRIPT}"]`)) {
      setReady(true);
      return;
    }
    const s = document.createElement("script");
    s.src = TABLEAU_SCRIPT;
    s.type = "module";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

function VizPanel({
  label,
  url,
  onRemove,
  onLabelChange,
  onUrlChange,
  index,
}: {
  label: string;
  url: string;
  onRemove: () => void;
  onLabelChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  index: number;
}) {
  const [editUrl, setEditUrl] = useState(url);
  const [editLabel, setEditLabel] = useState(label);
  const [applied, setApplied] = useState(url);
  const [appliedLabel, setAppliedLabel] = useState(label);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function apply() {
    setApplied(editUrl);
    setAppliedLabel(editLabel);
    onUrlChange(editUrl);
    onLabelChange(editLabel);
    setEditing(false);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="font-semibold text-sm border-b border-blue-400 bg-transparent outline-none w-40"
              />
            ) : (
              <CardTitle className="text-sm truncate">{appliedLabel || `Panel ${index + 1}`}</CardTitle>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { setEditing(!editing); if (!editing) setTimeout(() => inputRef.current?.focus(), 50); }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              {editing ? "Cancel" : "Edit"}
            </button>
            {editing && (
              <button
                onClick={apply}
                className="text-xs bg-blue-600 text-white font-semibold px-2.5 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            )}
            <button
              onClick={onRemove}
              className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
        {editing && (
          <div className="mt-2">
            <label className="text-xs text-gray-500 font-medium block mb-1">Tableau view URL</label>
            <input
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              placeholder="https://public.tableau.com/views/..."
              className="w-full text-xs font-mono border border-gray-300 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-blue-400"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Tableau Public: use the "Embed Code" URL (starts with /views/). Tableau Server/Cloud: use the full HTTPS URL to the view.
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0 overflow-hidden rounded-b-lg">
        {applied ? (
          <tableau-viz
            src={applied}
            width="100%"
            height="550"
            toolbar="bottom"
            hide-tabs
            device="desktop"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-64 bg-gray-50 border-t border-gray-100 text-gray-400">
            <svg className="w-8 h-8 mb-2 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm">Click Edit to enter a Tableau view URL</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TableauPage() {
  const ready = useTableauScript();
  const [panels, setPanels] = useState(DEFAULT_PANELS);
  const [odataUrl, setOdataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOdataUrl(`${window.location.protocol}//${window.location.host}/api/odata`);
  }, []);

  function addPanel() {
    setPanels((prev) => [...prev, { label: `Panel ${prev.length + 1}`, url: "" }]);
  }

  function removePanel(i: number) {
    setPanels((prev) => prev.filter((_, idx) => idx !== i));
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau Dashboards</h1>
            <p className="mt-1 text-sm text-gray-500">
              Embed Tableau Public, Tableau Server, or Tableau Cloud dashboards directly.
              Connect Tableau Desktop to the live OData feed for real-time StreetClaim data.
            </p>
          </div>
          <button
            onClick={addPanel}
            className="shrink-0 flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Panel
          </button>
        </div>

        {!ready && (
          <div className="rounded-md bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700">
            Loading Tableau Embedding API v3…
          </div>
        )}

        <Card className="border border-amber-300 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-amber-900">Connect Tableau Desktop to live data</CardTitle>
            <CardDescription className="text-amber-700">
              Open Tableau Desktop → Connect → To a Server → OData → paste this URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded bg-white border border-amber-300 px-3 py-2.5 text-sm font-mono text-gray-800 select-all break-all">
                {odataUrl || "https://<your-domain>/api/odata"}
              </code>
              <button
                onClick={() => copy(odataUrl)}
                className="shrink-0 rounded-md bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-xs text-amber-700">
              Available entity sets: <span className="font-mono">Claims · FeeSchedule · Teams · RevenueSummary · DenialRates · SdohZCodes · <strong>HrvmKiosks</strong></span>
            </p>
          </CardContent>
        </Card>

        <Card className="border border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-900">HRVM Kiosk Data — Ready for Tableau</CardTitle>
            <CardDescription className="text-red-700">
              55 LA County communities with drug overdose mortality rates, homeless population, service gap index, and weighted HRVM placement scores — available via OData.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { label: "All 55 communities ranked by HRVM score", suffix: "/HrvmKiosks?$orderby=HrvmRecommendationScore desc" },
                { label: "Critical risk only (>20 deaths/100k)", suffix: "/HrvmKiosks?$filter=RiskCategory eq 'Critical (>20)'" },
                { label: "Top 10 by score for bar chart", suffix: "/HrvmKiosks?$top=10&$orderby=HrvmRecommendationScore desc" },
                { label: "Lat/Lng + Score for map visual", suffix: "/HrvmKiosks?$select=Name,Latitude,Longitude,HrvmRecommendationScore,RiskCategory" },
                { label: "Unincorporated areas only", suffix: "/HrvmKiosks?$filter=CommunityType eq 'Unincorporated LA County'" },
              ].map((ex) => (
                <div key={ex.label} className="rounded bg-white border border-red-200 px-3 py-2">
                  <p className="text-[11px] font-medium text-red-700 mb-0.5">{ex.label}</p>
                  <code className="text-[11px] text-gray-700 break-all">{(odataUrl || "https://<domain>/api/odata") + ex.suffix}</code>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-red-600 font-medium">
              In Tableau Desktop: Connect → To a Server → OData → paste the base URL above → select HrvmKiosks → Load.
              Use Latitude + Longitude fields with the Map view. Drag HrvmRecommendationScore to Color and Size for an instant heat bubble map.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-gray-700">How to embed a Tableau Public dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {[
                "Publish or open a workbook on Tableau Public (public.tableau.com).",
                'Click Share → Copy Embed Code. Extract the URL from the src= attribute inside the <script> tag.',
                'Click "Add Panel" above, then click Edit on the panel and paste the URL.',
                "Click Apply — the dashboard loads live inside this page.",
                "Tableau Server / Cloud: use the full HTTPS URL to your view (e.g. https://10.ax.online.tableau.com/views/WorkbookName/SheetName).",
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-600">
                  <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {ready ? (
          <div className="space-y-6">
            {panels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <svg className="w-12 h-12 mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-sm">No panels yet — click "Add Panel" to embed a Tableau dashboard.</p>
              </div>
            ) : (
              panels.map((p, i) => (
                <VizPanel
                  key={i}
                  index={i}
                  label={p.label}
                  url={p.url}
                  onRemove={() => removePanel(i)}
                  onLabelChange={(v) => setPanels((prev) => prev.map((x, idx) => idx === i ? { ...x, label: v } : x))}
                  onUrlChange={(v) => setPanels((prev) => prev.map((x, idx) => idx === i ? { ...x, url: v } : x))}
                />
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {panels.map((_, i) => (
              <Card key={i}>
                <CardContent className="flex items-center justify-center h-64 text-gray-400 text-sm">
                  Loading Tableau API…
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
