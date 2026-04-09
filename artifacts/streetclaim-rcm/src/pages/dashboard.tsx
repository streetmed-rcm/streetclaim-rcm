import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { Plus, RefreshCw, FileText, Stethoscope, Users, MapPin, TrendingUp, Home, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listEncounters,
  markSynced,
  markFailed,
  EncounterRecord,
} from "@/lib/encounter-store";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function statusColor(status: EncounterRecord["syncStatus"]) {
  switch (status) {
    case "synced":
      return "bg-green-100 text-green-800 border-green-200";
    case "failed":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
  }
}

interface ProgramStats {
  patients_today: number;
  total_teams: number;
  active_encounter: number;
}

function ProgramBanner() {
  const [stats, setStats] = useState<ProgramStats | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/teams`)
      .then(r => r.json())
      .then(d => setStats(d.summary ?? null))
      .catch(() => {});
  }, []);

  const tiles = [
    { icon: <Activity className="w-4 h-4 text-emerald-600" />, label: "Patients Today", value: stats ? String(stats.patients_today) : "—", bg: "bg-emerald-50 border-emerald-200" },
    { icon: <Users className="w-4 h-4 text-blue-600" />, label: "Active Teams", value: stats ? `${stats.active_encounter} / ${stats.total_teams}` : "—", bg: "bg-blue-50 border-blue-200" },
    { icon: <TrendingUp className="w-4 h-4 text-purple-600" />, label: "Monthly Target", value: "1,000 visits", bg: "bg-purple-50 border-purple-200" },
    { icon: <Home className="w-4 h-4 text-amber-600" />, label: "Housed Rate", value: "30–40%", bg: "bg-amber-50 border-amber-200" },
    { icon: <MapPin className="w-4 h-4 text-red-600" />, label: "POS Code", value: "POS 27 ✓", bg: "bg-red-50 border-red-200" },
  ];

  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Program at a Glance</span>
        <span className="h-px flex-1 bg-gray-200" />
        <span className="text-[10px] text-gray-400">USC Street Medicine · LA Region</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {tiles.map(t => (
          <div key={t.label} className={`rounded-xl border p-2.5 ${t.bg} flex flex-col gap-1`}>
            <div className="flex items-center gap-1">{t.icon}<span className="text-[10px] text-gray-500 leading-tight">{t.label}</span></div>
            <p className="text-base font-black text-gray-900 leading-none">{t.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [encounters, setEncounters] = useState<EncounterRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<Record<string, "success" | "error">>({});

  const load = useCallback(async () => {
    const data = await listEncounters();
    setEncounters(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSyncAll = async () => {
    const pending = encounters.filter((e) => e.syncStatus === "pending" || e.syncStatus === "failed");
    if (pending.length === 0) return;

    setSyncing(true);
    const results: Record<string, "success" | "error"> = {};

    for (const enc of pending) {
      try {
        const res = await fetch(`${BASE}/api/encounters/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ encounterIds: [enc.id] }),
        });
        if (res.ok) {
          await markSynced(enc.id);
          results[enc.id] = "success";
        } else {
          await markFailed(enc.id);
          results[enc.id] = "error";
        }
      } catch {
        await markFailed(enc.id);
        results[enc.id] = "error";
      }
    }

    setSyncResults(results);
    setSyncing(false);
    await load();
  };

  const pendingCount = encounters.filter(
    (e) => e.syncStatus === "pending" || e.syncStatus === "failed"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <ProgramBanner />
        <div className="flex gap-3">
          <Link href="/encounter/new" className="flex-1">
            <Button className="w-full h-14 text-base bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-md">
              <Plus className="w-5 h-5 mr-2" />
              New Encounter
            </Button>
          </Link>
          <Link href="/hpe" className="flex-1">
            <Button
              variant="outline"
              className="w-full h-14 text-base border-blue-600 text-blue-700 hover:bg-blue-50 shadow-md"
            >
              <Stethoscope className="w-5 h-5 mr-2" />
              HPE — Medi-Cal ID
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Encounters</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncAll}
            disabled={syncing || pendingCount === 0}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            Sync All
            {pendingCount > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-xs font-bold rounded-full px-1.5 py-0.5">
                {pendingCount}
              </span>
            )}
          </Button>
        </div>

        {encounters.length === 0 ? (
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center text-gray-400">
              <FileText className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">No encounters yet. Tap "New Encounter" to begin.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {encounters.map((enc) => (
              <Link key={enc.id} href={`/encounter/${enc.id}`}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow active:bg-gray-50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-semibold text-gray-900 leading-tight">
                        {enc.patientName}
                      </CardTitle>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(
                            enc.syncStatus
                          )}`}
                        >
                          {enc.syncStatus.charAt(0).toUpperCase() + enc.syncStatus.slice(1)}
                        </span>
                        {syncResults[enc.id] && (
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              syncResults[enc.id] === "success"
                                ? "bg-green-500 text-white"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {syncResults[enc.id] === "success" ? "Synced!" : "Failed"}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <p className="text-sm text-gray-500">
                      DOS: {enc.dateOfService}
                    </p>
                    {enc.clinicalNote && (
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {enc.clinicalNote}
                      </p>
                    )}
                    {enc.codes && enc.codes.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {enc.codes.map((code) => (
                          <Badge
                            key={code}
                            className="bg-purple-100 text-purple-800 border border-purple-200 text-xs"
                          >
                            {code}
                          </Badge>
                        ))}
                        {enc.posCode && (
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-200 text-xs">
                            POS {enc.posCode}
                          </Badge>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
