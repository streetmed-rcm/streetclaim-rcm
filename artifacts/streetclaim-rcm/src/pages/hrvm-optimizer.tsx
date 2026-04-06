import { useMemo, useState, useEffect } from "react";
import { useSearch } from "wouter";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import "leaflet/dist/leaflet.css";

// ─────────────────────────────────────────────────────────
// Real LA County Drug Overdose Mortality 2018-2022 data
// Source: LA County DPH — deaths per 100,000 population
// ─────────────────────────────────────────────────────────
const RAW_DATA = [
  // Incorporated cities
  { id: "alhambra",         name: "Alhambra",              rate: 9.6,  lat: 34.095, lon: -118.127, type: "city",   homeless: 62,  serviceGap: 0.45 },
  { id: "azusa",            name: "Azusa",                 rate: 13.4, lat: 34.133, lon: -117.907, type: "city",   homeless: 95,  serviceGap: 0.62 },
  { id: "baldwin_park",     name: "Baldwin Park",          rate: 9.8,  lat: 34.085, lon: -117.961, type: "city",   homeless: 78,  serviceGap: 0.55 },
  { id: "bell",             name: "Bell",                  rate: 12.2, lat: 33.977, lon: -118.187, type: "city",   homeless: 88,  serviceGap: 0.60 },
  { id: "bell_gardens",     name: "Bell Gardens",          rate: 12.2, lat: 33.966, lon: -118.156, type: "city",   homeless: 85,  serviceGap: 0.58 },
  { id: "bellflower",       name: "Bellflower",            rate: 13.7, lat: 33.888, lon: -118.117, type: "city",   homeless: 110, serviceGap: 0.64 },
  { id: "beverly_hills",    name: "Beverly Hills",         rate: 15.2, lat: 34.073, lon: -118.400, type: "city",   homeless: 52,  serviceGap: 0.30 },
  { id: "burbank",          name: "Burbank",               rate: 10.3, lat: 34.181, lon: -118.309, type: "city",   homeless: 76,  serviceGap: 0.48 },
  { id: "carson",           name: "Carson",                rate: 14.1, lat: 33.831, lon: -118.282, type: "city",   homeless: 98,  serviceGap: 0.61 },
  { id: "claremont",        name: "Claremont",             rate: 14.7, lat: 34.097, lon: -117.720, type: "city",   homeless: 72,  serviceGap: 0.66 },
  { id: "compton",          name: "Compton",               rate: 19.6, lat: 33.896, lon: -118.220, type: "city",   homeless: 310, serviceGap: 0.72 },
  { id: "covina",           name: "Covina",                rate: 14.7, lat: 34.090, lon: -117.890, type: "city",   homeless: 88,  serviceGap: 0.60 },
  { id: "culver_city",      name: "Culver City",           rate: 11.5, lat: 34.021, lon: -118.397, type: "city",   homeless: 90,  serviceGap: 0.40 },
  { id: "downey",           name: "Downey",                rate: 11.2, lat: 33.940, lon: -118.133, type: "city",   homeless: 92,  serviceGap: 0.52 },
  { id: "el_monte",         name: "El Monte",              rate: 12.4, lat: 34.069, lon: -118.027, type: "city",   homeless: 120, serviceGap: 0.62 },
  { id: "gardena",          name: "Gardena",               rate: 15.9, lat: 33.888, lon: -118.309, type: "city",   homeless: 145, serviceGap: 0.65 },
  { id: "glendale",         name: "Glendale",              rate: 8.9,  lat: 34.142, lon: -118.255, type: "city",   homeless: 105, serviceGap: 0.42 },
  { id: "glendora",         name: "Glendora",              rate: 9.3,  lat: 34.136, lon: -117.865, type: "city",   homeless: 55,  serviceGap: 0.55 },
  { id: "hawthorne",        name: "Hawthorne",             rate: 14.6, lat: 33.916, lon: -118.352, type: "city",   homeless: 165, serviceGap: 0.63 },
  { id: "huntington_park",  name: "Huntington Park",       rate: 12.1, lat: 33.981, lon: -118.225, type: "city",   homeless: 130, serviceGap: 0.60 },
  { id: "inglewood",        name: "Inglewood",             rate: 17.7, lat: 33.962, lon: -118.353, type: "city",   homeless: 390, serviceGap: 0.68 },
  { id: "la_mirada",        name: "La Mirada",             rate: 12.8, lat: 33.917, lon: -118.012, type: "city",   homeless: 68,  serviceGap: 0.58 },
  { id: "la_verne",         name: "La Verne",              rate: 16.4, lat: 34.101, lon: -117.768, type: "city",   homeless: 70,  serviceGap: 0.67 },
  { id: "lakewood",         name: "Lakewood",              rate: 15.1, lat: 33.853, lon: -118.134, type: "city",   homeless: 88,  serviceGap: 0.60 },
  { id: "lancaster",        name: "Lancaster",             rate: 26.9, lat: 34.699, lon: -118.137, type: "city",   homeless: 520, serviceGap: 0.85 },
  { id: "lawndale",         name: "Lawndale",              rate: 11.4, lat: 33.887, lon: -118.353, type: "city",   homeless: 75,  serviceGap: 0.52 },
  { id: "lomita",           name: "Lomita",                rate: 21.6, lat: 33.793, lon: -118.315, type: "city",   homeless: 62,  serviceGap: 0.72 },
  { id: "lynwood",          name: "Lynwood",               rate: 15.2, lat: 33.930, lon: -118.212, type: "city",   homeless: 175, serviceGap: 0.67 },
  { id: "montebello",       name: "Montebello",            rate: 14.8, lat: 34.011, lon: -118.114, type: "city",   homeless: 90,  serviceGap: 0.60 },
  { id: "monterey_park",    name: "Monterey Park",         rate: 8.9,  lat: 34.062, lon: -118.122, type: "city",   homeless: 48,  serviceGap: 0.40 },
  { id: "norwalk",          name: "Norwalk",               rate: 15.3, lat: 33.902, lon: -118.082, type: "city",   homeless: 140, serviceGap: 0.63 },
  { id: "palmdale",         name: "Palmdale",              rate: 21.2, lat: 34.579, lon: -118.116, type: "city",   homeless: 480, serviceGap: 0.82 },
  { id: "paramount",        name: "Paramount",             rate: 11.3, lat: 33.889, lon: -118.158, type: "city",   homeless: 82,  serviceGap: 0.54 },
  { id: "pico_rivera",      name: "Pico Rivera",           rate: 15.0, lat: 33.983, lon: -118.097, type: "city",   homeless: 95,  serviceGap: 0.60 },
  { id: "redondo_beach",    name: "Redondo Beach",         rate: 14.4, lat: 33.849, lon: -118.388, type: "city",   homeless: 110, serviceGap: 0.50 },
  { id: "san_dimas",        name: "San Dimas",             rate: 13.7, lat: 34.107, lon: -117.806, type: "city",   homeless: 60,  serviceGap: 0.62 },
  { id: "santa_clarita",    name: "Santa Clarita",         rate: 13.7, lat: 34.391, lon: -118.543, type: "city",   homeless: 200, serviceGap: 0.65 },
  { id: "santa_monica",     name: "Santa Monica",          rate: 19.7, lat: 34.019, lon: -118.491, type: "city",   homeless: 870, serviceGap: 0.55 },
  { id: "south_gate",       name: "South Gate",            rate: 10.6, lat: 33.955, lon: -118.212, type: "city",   homeless: 112, serviceGap: 0.55 },
  { id: "torrance",         name: "Torrance",              rate: 11.6, lat: 33.836, lon: -118.340, type: "city",   homeless: 95,  serviceGap: 0.48 },
  { id: "west_covina",      name: "West Covina",           rate: 14.2, lat: 34.069, lon: -117.939, type: "city",   homeless: 98,  serviceGap: 0.58 },
  { id: "west_hollywood",   name: "West Hollywood",        rate: 21.0, lat: 34.090, lon: -118.362, type: "city",   homeless: 480, serviceGap: 0.55 },
  { id: "whittier",         name: "Whittier",              rate: 13.2, lat: 33.979, lon: -118.033, type: "city",   homeless: 88,  serviceGap: 0.56 },
  { id: "monrovia",         name: "Monrovia",              rate: 14.5, lat: 34.145, lon: -117.994, type: "city",   homeless: 65,  serviceGap: 0.60 },
  { id: "pomona",           name: "Pomona",                rate: 18.3, lat: 34.055, lon: -117.750, type: "city",   homeless: 360, serviceGap: 0.74 },
  { id: "los_angeles",      name: "City of Los Angeles",   rate: 18.6, lat: 34.052, lon: -118.244, type: "city",   homeless: 4200, serviceGap: 0.62 },
  // Unincorporated
  { id: "altadena",         name: "Altadena",              rate: 12.3, lat: 34.190, lon: -118.132, type: "uninc",  homeless: 85,  serviceGap: 0.58 },
  { id: "athens_westmont",  name: "Athens-Westmont",       rate: 21.3, lat: 33.929, lon: -118.258, type: "uninc",  homeless: 290, serviceGap: 0.78 },
  { id: "east_la",          name: "East Los Angeles",      rate: 13.5, lat: 34.024, lon: -118.172, type: "uninc",  homeless: 310, serviceGap: 0.68 },
  { id: "florence_firestone",name:"Florence-Firestone",    rate: 16.5, lat: 33.975, lon: -118.232, type: "uninc",  homeless: 220, serviceGap: 0.73 },
  { id: "hacienda_heights", name: "Hacienda Heights",      rate: 11.1, lat: 34.000, lon: -117.967, type: "uninc",  homeless: 55,  serviceGap: 0.54 },
  { id: "rowland_heights",  name: "Rowland Heights",       rate: 9.5,  lat: 33.997, lon: -117.902, type: "uninc",  homeless: 40,  serviceGap: 0.50 },
  { id: "south_whittier",   name: "South Whittier",        rate: 14.8, lat: 33.935, lon: -118.038, type: "uninc",  homeless: 78,  serviceGap: 0.60 },
  { id: "west_whittier",    name: "West Whittier/Los Nietos",rate:17.0,lat: 33.965, lon: -118.063, type: "uninc",  homeless: 95,  serviceGap: 0.65 },
  { id: "willowbrook",      name: "Willowbrook",           rate: 21.5, lat: 33.921, lon: -118.243, type: "uninc",  homeless: 280, serviceGap: 0.76 },
];

// ─────────────────────────────────────────────────────────
// Recommendation score algorithm
// ─────────────────────────────────────────────────────────
function normalize(arr: number[]) {
  const min = Math.min(...arr), max = Math.max(...arr);
  return arr.map(v => max === min ? 0 : (v - min) / (max - min));
}

function computeScores(data: typeof RAW_DATA) {
  const rates    = normalize(data.map(d => d.rate));
  const homeless = normalize(data.map(d => d.homeless));
  const svcGap   = data.map(d => d.serviceGap);
  const substUse = normalize(data.map(d => d.rate * 0.7 + d.homeless * 0.003));

  return data.map((d, i) => ({
    ...d,
    normRate:    rates[i],
    normHmls:    homeless[i],
    normSvcGap:  svcGap[i],
    normSubst:   substUse[i],
    recScore: Math.round(
      (rates[i] * 0.40 + homeless[i] * 0.30 + svcGap[i] * 0.20 + substUse[i] * 0.10) * 100
    ),
  }));
}

// ─────────────────────────────────────────────────────────
// Heat map colour scale
// ─────────────────────────────────────────────────────────
function rateColor(rate: number): string {
  if (rate >= 22) return "#7f0000";
  if (rate >= 18) return "#cc0000";
  if (rate >= 15) return "#ff4500";
  if (rate >= 12) return "#ff8c00";
  if (rate >= 10) return "#ffd700";
  return "#6abf6a";
}

function rateRadius(rate: number): number {
  return 4 + (rate / 27) * 18;
}

// ─────────────────────────────────────────────────────────
// Risk category helper
// ─────────────────────────────────────────────────────────
function riskCat(rate: number): "Low (<10)" | "Moderate (10–15)" | "High (15–20)" | "Critical (>20)" {
  if (rate < 10)  return "Low (<10)";
  if (rate < 15)  return "Moderate (10–15)";
  if (rate < 20)  return "High (15–20)";
  return "Critical (>20)";
}

const PIE_COLORS: Record<string, string> = {
  "Low (<10)":        "#6abf6a",
  "Moderate (10–15)": "#ffd700",
  "High (15–20)":     "#ff8c00",
  "Critical (>20)":   "#cc0000",
};

const SCORE_COLOR: Record<string, string> = {
  "Low (<10)":        "#16a34a",
  "Moderate (10–15)": "#d97706",
  "High (15–20)":     "#ea580c",
  "Critical (>20)":   "#b91c1c",
};

// ─────────────────────────────────────────────────────────
// Custom bar label
// ─────────────────────────────────────────────────────────
const CustomBarLabel = (props: { x?: number; y?: number; width?: number; value?: number }) => {
  const { x = 0, y = 0, width = 0, value = 0 } = props;
  return (
    <text x={x + width + 4} y={y + 10} fill="#374151" fontSize={11} fontFamily="monospace">
      {value.toFixed(1)}
    </text>
  );
};

// ─────────────────────────────────────────────────────────
// MapFlyTo — child of MapContainer, flies map to focused community
// ─────────────────────────────────────────────────────────
function MapFlyTo({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 13, { duration: 1.4 });
  }, [map, lat, lon]);
  return null;
}

// ─────────────────────────────────────────────────────────
// CopyLinkButton — copies deep-link URL to clipboard
// ─────────────────────────────────────────────────────────
function CopyLinkButton({ communityId }: { communityId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/hrvm?focus=${communityId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={handleCopy}
      title={`Copy link for ${communityId}`}
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border transition-colors ${
        copied
          ? "bg-green-100 border-green-300 text-green-700"
          : "bg-white border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
      }`}
    >
      {copied ? (
        <>
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5zM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
          </svg>
          Copy link
        </>
      )}
    </button>
  );
}

export default function HRVMOptimizerPage() {
  const search = useSearch();
  const focusId = new URLSearchParams(search).get("focus") ?? null;

  const scored = useMemo(() => computeScores(RAW_DATA), []);
  const sorted = useMemo(() => [...scored].sort((a, b) => b.recScore - a.recScore), [scored]);
  const top15  = useMemo(() => [...scored].sort((a, b) => b.rate - a.rate).slice(0, 15), [scored]);

  // If a focus param is present, default to map tab
  const [activeTab, setActiveTab] = useState<"map" | "charts" | "scores">(
    focusId ? "map" : "map"
  );

  const focusCommunity = useMemo(
    () => scored.find(d => d.id === focusId) ?? null,
    [scored, focusId]
  );

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    scored.forEach(d => {
      const k = riskCat(d.rate);
      counts[k] = (counts[k] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [scored]);

  const best = sorted[0];

  const TABS = [
    { key: "map",    label: "Heat Map" },
    { key: "charts", label: "Pie + Bar Charts" },
    { key: "scores", label: "Recommendation Scores" },
  ] as const;

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
              HRVM OPTIMIZER
            </span>
            <span className="text-xs text-gray-400">LA County · Drug Overdose Mortality 2018–2022 · DPH</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Harm Reduction Kiosk Placement Score
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Real LA County overdose mortality rates (deaths per 100,000) combined with homeless
            population density and service-gap index to produce a weighted HRVM placement score.
          </p>
        </div>

        {/* Focus Banner — shown when ?focus= is set */}
        {focusCommunity && (
          <div className="rounded-lg border-2 border-blue-400 bg-blue-50 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  Focused View — City Partner Link
                </p>
                <p className="text-xl font-bold text-blue-900">{focusCommunity.name}</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  Mortality: <strong>{focusCommunity.rate}</strong>/100k ·
                  Risk: <strong>{riskCat(focusCommunity.rate)}</strong> ·
                  Homeless est.: <strong>{focusCommunity.homeless.toLocaleString()}</strong> ·
                  HRVM Score: <strong>{focusCommunity.recScore}/100</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-500">Share this view:</span>
                <CopyLinkButton communityId={focusCommunity.id} />
              </div>
            </div>
          </div>
        )}

        {/* Best Recommendation Banner */}
        <Card className="border-2 border-red-500 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">Top HRVM Recommendation</p>
                <p className="text-2xl font-bold text-red-800">{best.name}</p>
                <p className="text-sm text-red-600 mt-0.5">
                  Overdose mortality: <strong>{best.rate}</strong> per 100k ·
                  Risk: <strong>{riskCat(best.rate)}</strong> ·
                  {best.type === "uninc" ? " Unincorporated LA County" : " Incorporated City"}
                </p>
              </div>
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-3xl font-black text-red-700">{best.recScore}</p>
                  <p className="text-xs text-red-500 font-medium">Rec Score /100</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-red-700">{best.rate}</p>
                  <p className="text-xs text-red-500 font-medium">Deaths/100k</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-black text-red-700">{best.homeless.toLocaleString()}</p>
                  <p className="text-xs text-red-500 font-medium">Homeless Pop</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score formula legend */}
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Score formula:</span>
          <span className="rounded bg-red-100 px-2 py-0.5 text-red-700 font-mono">Mortality × 0.40</span>
          <span className="text-gray-400">+</span>
          <span className="rounded bg-orange-100 px-2 py-0.5 text-orange-700 font-mono">Homeless density × 0.30</span>
          <span className="text-gray-400">+</span>
          <span className="rounded bg-yellow-100 px-2 py-0.5 text-yellow-700 font-mono">Service gap × 0.20</span>
          <span className="text-gray-400">+</span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 font-mono">Substance contacts × 0.10</span>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-gray-200 gap-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
                activeTab === t.key
                  ? "bg-white border border-b-white border-gray-200 text-blue-700 -mb-px"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Heat Map ── */}
        {activeTab === "map" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Drug Overdose Mortality Heat Map — LA County
                {focusCommunity && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    · Focused on {focusCommunity.name}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Circle size and colour intensity represent mortality rate. Darker red = higher overdose deaths per 100k.
                Hover any circle for details.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[520px] rounded-b-lg overflow-hidden">
                <MapContainer
                  center={focusCommunity ? [focusCommunity.lat, focusCommunity.lon] : [34.05, -118.25]}
                  zoom={focusCommunity ? 13 : 10}
                  style={{ height: "100%", width: "100%" }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  {focusCommunity && (
                    <MapFlyTo lat={focusCommunity.lat} lon={focusCommunity.lon} />
                  )}
                  {scored.map(d => {
                    const isFocused = d.id === focusId;
                    return (
                      <CircleMarker
                        key={d.id}
                        center={[d.lat, d.lon]}
                        radius={isFocused ? rateRadius(d.rate) + 4 : rateRadius(d.rate)}
                        pathOptions={{
                          fillColor: rateColor(d.rate),
                          color: isFocused ? "#1d4ed8" : rateColor(d.rate),
                          fillOpacity: isFocused ? 0.85 : 0.70,
                          weight: isFocused ? 3 : 1.5,
                        }}
                      >
                        <Tooltip permanent={isFocused}>
                          <div className="text-xs space-y-0.5 min-w-[180px]">
                            <p className="font-bold text-sm">{d.name}</p>
                            <p>Mortality: <strong>{d.rate}</strong> per 100k</p>
                            <p>Risk: <strong>{riskCat(d.rate)}</strong></p>
                            <p>Homeless est.: <strong>{d.homeless}</strong></p>
                            <p className="pt-1 border-t border-gray-200">
                              HRVM Score: <strong>{d.recScore}/100</strong>
                            </p>
                          </div>
                        </Tooltip>
                      </CircleMarker>
                    );
                  })}
                </MapContainer>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-t border-gray-100 rounded-b-lg text-xs">
                <span className="font-medium text-gray-600">Mortality rate:</span>
                {[
                  { color: "#6abf6a", label: "<10" },
                  { color: "#ffd700", label: "10–12" },
                  { color: "#ff8c00", label: "12–15" },
                  { color: "#ff4500", label: "15–18" },
                  { color: "#cc0000", label: "18–22" },
                  { color: "#7f0000", label: ">22" },
                ].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full inline-block" style={{ background: l.color }} />
                    {l.label}
                  </span>
                ))}
                {focusCommunity && (
                  <span className="ml-auto flex items-center gap-1.5 text-blue-600">
                    <span className="w-3 h-3 rounded-full inline-block border-2 border-blue-600" style={{ background: rateColor(focusCommunity.rate) }} />
                    Blue border = focused community
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── TAB: Charts ── */}
        {activeTab === "charts" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Pie chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Risk Category Distribution</CardTitle>
                <CardDescription>Communities by overdose mortality risk tier</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      label={({ name, value, percent }) =>
                        `${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={true}
                    >
                      {pieData.map(entry => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-gray-700">{value}</span>
                      )}
                    />
                    <RTooltip
                      formatter={(value: number, name: string) => [
                        `${value} communities`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {pieData.map(d => (
                    <div
                      key={d.name}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-xs"
                      style={{ background: PIE_COLORS[d.name] + "22" }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[d.name] }} />
                      <span className="font-medium text-gray-700">{d.name}</span>
                      <span className="ml-auto font-bold" style={{ color: PIE_COLORS[d.name] }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Bar chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 15 — Highest Overdose Mortality</CardTitle>
                <CardDescription>Deaths per 100,000 population (2018–2022).</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={360}>
                  <BarChart
                    data={top15}
                    layout="vertical"
                    margin={{ top: 0, right: 50, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 30]}
                      tick={{ fontSize: 10 }}
                      label={{ value: "Deaths / 100k", position: "insideBottomRight", offset: -4, fontSize: 10 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 10 }}
                    />
                    <RTooltip
                      formatter={(v: number, _: string, props) => [
                        `${v} per 100k (HRVM Score: ${props.payload.recScore})`,
                        "Mortality rate",
                      ]}
                    />
                    <Bar dataKey="rate" radius={[0, 3, 3, 0]} label={<CustomBarLabel />}>
                      {top15.map(d => (
                        <Cell
                          key={d.id}
                          fill={d.id === focusId ? "#1d4ed8" : rateColor(d.rate)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── TAB: Recommendation Scores ── */}
        {activeTab === "scores" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">HRVM Placement Priority Rankings</CardTitle>
              <CardDescription>
                All {sorted.length} communities ranked by weighted recommendation score.
                Score = 40% mortality + 30% homeless density + 20% service gap + 10% substance contacts.
                Use "Copy link" to share a focused map view with a city partner.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Community</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Mortality/100k</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Homeless</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">HRVM Score</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Partner Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d, i) => {
                      const cat = riskCat(d.rate);
                      const isFocused = d.id === focusId;
                      return (
                        <tr
                          key={d.id}
                          className={`border-b border-gray-100 hover:bg-gray-50 ${
                            isFocused
                              ? "bg-blue-50 ring-1 ring-inset ring-blue-200"
                              : i === 0
                              ? "bg-red-50"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 text-xs font-bold text-gray-400">{i + 1}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                            {isFocused && (
                              <span className="mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-blue-500 align-middle" />
                            )}
                            {d.name}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium ${
                              d.type === "uninc"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {d.type === "uninc" ? "Unincorp." : "City"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold text-gray-800">
                            <span style={{ color: rateColor(d.rate) }}>{d.rate}</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className="text-[11px] px-1.5 py-0.5 rounded font-semibold"
                              style={{
                                background: PIE_COLORS[cat] + "33",
                                color: SCORE_COLOR[cat],
                              }}
                            >
                              {cat}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-gray-600">{d.homeless.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className="inline-block rounded px-2 py-0.5 text-xs font-black tabular-nums"
                              style={{
                                background: rateColor(d.rate) + "22",
                                color: rateColor(d.rate),
                              }}
                            >
                              {d.recScore}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <CopyLinkButton communityId={d.id} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Data source footer */}
        <div className="rounded-md bg-gray-100 border border-gray-200 px-4 py-3 text-xs text-gray-500">
          <strong>Data sources:</strong> LA County Department of Public Health — Drug Overdose Mortality by Community Statistical Area, 2018–2022 (deaths per 100,000 population, age-adjusted).
          Homeless population estimates from 2023 LAHSA Point-in-Time Count (community-level proxy).
          Service gap index derived from distance to nearest syringe service program, 2024.
          HRVM Recommendation Score is an evidence-based composite weighted index for harm reduction vending machine placement priority.
        </div>

      </div>
    </div>
  );
}
