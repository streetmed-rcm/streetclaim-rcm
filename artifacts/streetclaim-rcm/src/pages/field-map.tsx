import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Users, Activity, MapPin, Wifi, Clock, ChevronDown, ChevronUp, X } from "lucide-react";

// Fix Leaflet default marker icon paths broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type TeamStatus = "active_encounter" | "in_transit" | "available" | "offline";
type TeamType = "physician" | "chw" | "peer_navigator" | "care_coordinator";

interface Team {
  id: string;
  name: string;
  county: string;
  region: string;
  type: TeamType;
  lead: string;
  members: number;
  lat: number;
  lng: number;
  status: TeamStatus;
  patients_today: number;
  encounters_today: number;
  last_updated: string;
  current_location: string;
  pager: string;
}

interface Summary {
  total_teams: number;
  active_encounter: number;
  in_transit: number;
  available: number;
  offline: number;
  patients_today: number;
}

interface CountySummary {
  county: string;
  teams: number;
  patients_today: number;
  active: number;
}

const STATUS_CONFIG: Record<TeamStatus, { label: string; color: string; dot: string; marker: string }> = {
  active_encounter: { label: "Active Encounter", color: "bg-emerald-100 text-emerald-800 border-emerald-300", dot: "bg-emerald-500", marker: "#10b981" },
  in_transit:       { label: "In Transit",       color: "bg-blue-100 text-blue-800 border-blue-300",     dot: "bg-blue-500",   marker: "#3b82f6" },
  available:        { label: "Available",         color: "bg-amber-100 text-amber-800 border-amber-300",  dot: "bg-amber-500",  marker: "#f59e0b" },
  offline:          { label: "Offline",           color: "bg-gray-100 text-gray-500 border-gray-300",     dot: "bg-gray-400",   marker: "#9ca3af" },
};

const TYPE_LABEL: Record<TeamType, string> = {
  physician: "Physician Team",
  chw: "Community Health Worker",
  peer_navigator: "Peer Navigator",
  care_coordinator: "Care Coordinator",
};

const COUNTY_BOUNDS: Record<string, { center: [number, number]; color: string }> = {
  "Los Angeles":    { center: [34.0522, -118.2437], color: "#4f46e5" },
  "Riverside":      { center: [33.9806, -117.3755], color: "#0891b2" },
  "San Bernardino": { center: [34.1083, -117.2898], color: "#0891b2" },
  "San Diego":      { center: [32.7157, -117.1611], color: "#7c3aed" },
};

function makeMarkerIcon(color: string, pulse: boolean) {
  const size = pulse ? 16 : 14;
  const pulseHtml = pulse
    ? `<span style="position:absolute;top:-4px;left:-4px;width:${size + 8}px;height:${size + 8}px;border-radius:50%;background:${color};opacity:0.3;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>`
    : "";
  return L.divIcon({
    className: "",
    html: `<div style="position:relative;width:${size}px;height:${size}px;">
      ${pulseHtml}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4],
  });
}

export default function FieldMapPage() {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);

  const [teams, setTeams] = useState<Team[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [countySummary, setCountySummary] = useState<CountySummary[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [filterStatus, setFilterStatus] = useState<TeamStatus | "all">("all");
  const [filterCounty, setFilterCounty] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [asOf, setAsOf] = useState("");

  const fetchTeams = async () => {
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeams(data.teams ?? []);
      setSummary(data.summary ?? null);
      setCountySummary(data.by_county ?? []);
      setAsOf(data.as_of ?? "");
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Failed to fetch teams", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    const interval = setInterval(fetchTeams, 30000);
    return () => clearInterval(interval);
  }, []);

  // Init map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [33.8, -117.5],
      zoom: 8,
      zoomControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // County label markers
    Object.entries(COUNTY_BOUNDS).forEach(([county, cfg]) => {
      L.marker(cfg.center, {
        icon: L.divIcon({
          className: "",
          html: `<div style="background:${cfg.color};color:white;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:700;white-space:nowrap;opacity:0.85;box-shadow:0 1px 4px rgba(0,0,0,0.25);">${county} County</div>`,
          iconAnchor: [60, 12],
        }),
        interactive: false,
        zIndexOffset: -100,
      }).addTo(map);
    });

    mapRef.current = map;
  }, []);

  // Drop / refresh markers when teams or filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filtered = teams.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterCounty !== "all" && t.county !== filterCounty) return false;
      return true;
    });

    filtered.forEach((team) => {
      const cfg = STATUS_CONFIG[team.status];
      const pulse = team.status === "active_encounter";
      const icon = makeMarkerIcon(cfg.marker, pulse);

      const marker = L.marker([team.lat, team.lng], { icon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family:system-ui;min-width:200px;">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${team.name}</div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${team.lead}</div>
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
              <span style="width:8px;height:8px;border-radius:50%;background:${cfg.marker};display:inline-block;"></span>
              <span style="font-size:12px;font-weight:600;">${cfg.label}</span>
            </div>
            <div style="font-size:11px;color:#374151;">📍 ${team.current_location}</div>
            <div style="font-size:11px;color:#374151;margin-top:2px;">👥 ${team.members} members</div>
            <div style="font-size:11px;color:#374151;margin-top:2px;">🩺 ${team.patients_today} patients today</div>
            <div style="font-size:11px;color:#374151;margin-top:2px;">📟 ${team.pager}</div>
          </div>`,
          { maxWidth: 260 }
        )
        .on("click", () => setSelectedTeam(team));

      markersRef.current.push(marker);
    });
  }, [teams, filterStatus, filterCounty]);

  const visibleTeams = teams.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterCounty !== "all" && t.county !== filterCounty) return false;
    return true;
  });

  const flyToTeam = (team: Team) => {
    mapRef.current?.flyTo([team.lat, team.lng], 13, { duration: 1.2 });
    setSelectedTeam(team);
  };

  const allCounties = Array.from(new Set(teams.map((t) => t.county))).sort();

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-950 relative overflow-hidden">
      {/* Pulse animation */}
      <style>{`
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `}</style>

      {/* Top control bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-2 mr-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <span className="text-white font-bold text-sm tracking-wide">Director Field Map</span>
          <span className="text-xs text-gray-500 hidden sm:block">SoCal Region</span>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(["all", "active_encounter", "in_transit", "available", "offline"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                filterStatus === s
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
              }`}
            >
              {s === "all" ? "All Teams" : STATUS_CONFIG[s].label}
              {s !== "all" && summary && (
                <span className="ml-1 opacity-70">
                  ({summary[s as keyof Summary] as number})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* County filter */}
        <select
          value={filterCounty}
          onChange={(e) => setFilterCounty(e.target.value)}
          className="ml-auto text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1"
        >
          <option value="all">All Counties</option>
          {allCounties.map((c) => (
            <option key={c} value={c}>{c} County</option>
          ))}
        </select>

        {/* Refresh indicator */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="hidden sm:block">Live · {lastRefresh.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 bg-gray-900 border-r border-gray-800 flex flex-col overflow-hidden flex-shrink-0`}
        >
          {sidebarOpen && (
            <>
              {/* Summary stats */}
              {summary && (
                <div className="grid grid-cols-2 gap-2 p-3 border-b border-gray-800">
                  <StatCard label="Total Teams" value={summary.total_teams} icon={<Users className="w-3.5 h-3.5" />} color="text-blue-400" />
                  <StatCard label="Active Now" value={summary.active_encounter} icon={<Activity className="w-3.5 h-3.5" />} color="text-emerald-400" />
                  <StatCard label="Patients Today" value={summary.patients_today} icon={<MapPin className="w-3.5 h-3.5" />} color="text-amber-400" />
                  <StatCard label="Offline" value={summary.offline} icon={<Wifi className="w-3.5 h-3.5" />} color="text-gray-400" />
                </div>
              )}

              {/* County breakdown */}
              {countySummary.length > 0 && (
                <div className="px-3 py-2 border-b border-gray-800">
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">By County</div>
                  {countySummary.map((c) => (
                    <div
                      key={c.county}
                      onClick={() => setFilterCounty(filterCounty === c.county ? "all" : c.county)}
                      className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer mb-1 transition-colors ${
                        filterCounty === c.county ? "bg-gray-700" : "hover:bg-gray-800"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-200">{c.county}</div>
                        <div className="text-xs text-gray-500">{c.teams} teams · {c.patients_today} pts</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs text-emerald-400 font-bold">{c.active}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Team list */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-3 py-2 text-xs text-gray-500 font-semibold uppercase tracking-wider sticky top-0 bg-gray-900 border-b border-gray-800">
                  Teams ({visibleTeams.length})
                </div>
                {loading ? (
                  <div className="p-4 text-gray-500 text-xs">Loading teams...</div>
                ) : visibleTeams.length === 0 ? (
                  <div className="p-4 text-gray-500 text-xs">No teams match filters</div>
                ) : (
                  visibleTeams.map((team) => {
                    const cfg = STATUS_CONFIG[team.status];
                    const isSelected = selectedTeam?.id === team.id;
                    return (
                      <div
                        key={team.id}
                        onClick={() => flyToTeam(team)}
                        className={`px-3 py-2.5 cursor-pointer border-b border-gray-800/60 transition-colors ${
                          isSelected ? "bg-blue-900/40 border-l-2 border-l-blue-500" : "hover:bg-gray-800/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                              <span className="text-xs font-semibold text-gray-100 truncate">{team.name}</span>
                            </div>
                            <div className="text-xs text-gray-500 truncate pl-3.5">{team.lead}</div>
                            <div className="text-xs text-gray-600 truncate pl-3.5 mt-0.5">{team.current_location}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-xs font-bold text-amber-400">{team.patients_today}</div>
                            <div className="text-xs text-gray-600">pts</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-[1000] bg-gray-800 text-gray-400 hover:text-white border border-gray-700 rounded-r-md p-1 shadow-lg transition-all"
          style={{ left: sidebarOpen ? "288px" : "0" }}
        >
          {sidebarOpen ? <ChevronDown className="w-3 h-3 rotate-90" /> : <ChevronDown className="w-3 h-3 -rotate-90" />}
        </button>

        {/* Map container */}
        <div className="flex-1 relative">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Legend */}
          <div className="absolute bottom-6 right-4 z-[999] bg-gray-900/95 border border-gray-700 rounded-xl px-3 py-2.5 shadow-xl backdrop-blur-sm">
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Status</div>
            {(Object.entries(STATUS_CONFIG) as [TeamStatus, typeof STATUS_CONFIG[TeamStatus]][]).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2 mb-1.5 last:mb-0">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                <span className="text-xs text-gray-300">{cfg.label}</span>
              </div>
            ))}
          </div>

          {/* Selected team detail card */}
          {selectedTeam && (
            <div className="absolute top-3 right-4 z-[999] bg-gray-900/97 border border-gray-700 rounded-xl shadow-2xl w-72 backdrop-blur-sm">
              <div className="flex items-start justify-between p-3 border-b border-gray-800">
                <div>
                  <div className="text-sm font-bold text-white">{selectedTeam.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{selectedTeam.county} County · {selectedTeam.region}</div>
                </div>
                <button onClick={() => setSelectedTeam(null)} className="text-gray-500 hover:text-white p-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-2">
                <DetailRow label="Status">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_CONFIG[selectedTeam.status].color}`}>
                    {STATUS_CONFIG[selectedTeam.status].label}
                  </span>
                </DetailRow>
                <DetailRow label="Team Lead"><span className="text-xs text-gray-200">{selectedTeam.lead}</span></DetailRow>
                <DetailRow label="Team Type"><span className="text-xs text-gray-200">{TYPE_LABEL[selectedTeam.type]}</span></DetailRow>
                <DetailRow label="Members"><span className="text-xs text-gray-200">{selectedTeam.members} staff</span></DetailRow>
                <DetailRow label="Location"><span className="text-xs text-gray-200">{selectedTeam.current_location}</span></DetailRow>
                <DetailRow label="Patients Today">
                  <span className="text-xs font-bold text-amber-400">{selectedTeam.patients_today} patients</span>
                </DetailRow>
                <DetailRow label="Last Updated">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedTeam.last_updated).toLocaleTimeString()}
                  </span>
                </DetailRow>
                <DetailRow label="GPS">
                  <span className="text-xs text-gray-500 font-mono">{selectedTeam.lat.toFixed(4)}, {selectedTeam.lng.toFixed(4)}</span>
                </DetailRow>
                <a
                  href={`tel:${selectedTeam.pager}`}
                  className="mt-2 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                >
                  📟 Page Team · {selectedTeam.pager}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-2">
      <div className={`flex items-center gap-1 ${color} mb-1`}>
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-gray-500 flex-shrink-0 w-24">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  );
}
