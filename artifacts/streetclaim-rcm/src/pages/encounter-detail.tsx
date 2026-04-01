import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getEncounter, EncounterRecord } from "@/lib/encounter-store";
import { MapPin, Calendar, FileText, Tag } from "lucide-react";

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

export default function EncounterDetail() {
  const params = useParams<{ id: string }>();
  const [encounter, setEncounter] = useState<EncounterRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEncounter(params.id).then((data) => {
      setEncounter(data ?? null);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!encounter) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400 text-sm">Encounter not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">{encounter.patientName}</h1>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColor(
              encounter.syncStatus
            )}`}
          >
            {encounter.syncStatus.charAt(0).toUpperCase() + encounter.syncStatus.slice(1)}
          </span>
        </div>

        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Encounter Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Date of Service</p>
                <p className="text-sm font-medium text-gray-800">{encounter.dateOfService}</p>
              </div>
            </div>
            {encounter.latitude !== null && encounter.longitude !== null && (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">GPS Location</p>
                  <p className="text-sm font-medium text-gray-800 font-mono">
                    {encounter.latitude.toFixed(5)}, {encounter.longitude.toFixed(5)}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Clinical Note</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{encounter.clinicalNote}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {(encounter.codes?.length || encounter.posCode) ? (
          <Card className="border-2 border-purple-200">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-4 h-4" /> Auto-Applied Billing Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex flex-wrap gap-2">
                {encounter.codes?.map((code) => (
                  <Badge
                    key={code}
                    className="bg-purple-600 text-white text-sm px-3 py-1"
                  >
                    {code === "Z59.0" ? "Z59.0 — Homelessness" : code}
                  </Badge>
                ))}
                {encounter.posCode && (
                  <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                    POS {encounter.posCode} — Outreach Site
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs text-gray-400 text-center">
          Created {new Date(encounter.createdAt).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
