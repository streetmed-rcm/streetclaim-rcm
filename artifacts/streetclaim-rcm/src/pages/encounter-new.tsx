import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Mic, MicOff, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { saveEncounter, updateEncounterCodes } from "@/lib/encounter-store";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const AUTO_CODES = ["Z59.0"];
const AUTO_POS = "27";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<{ transcript: string }[]> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function EncounterNew() {
  const [, navigate] = useLocation();

  const [patientName, setPatientName] = useState("");
  const [dateOfService, setDateOfService] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [clinicalNote, setClinicalNote] = useState("");
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const hasSpeech =
    typeof window !== "undefined" &&
    (!!window.SpeechRecognition || !!window.webkitSpeechRecognition);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by this browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGpsLoading(false);
      },
      (err) => {
        setGpsError("Unable to retrieve location: " + err.message);
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const toggleMic = () => {
    if (!hasSpeech) return;
    const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SRClass) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SRClass();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(" ");
      setClinicalNote((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!patientName.trim()) errs.patientName = "Patient name is required.";
    if (!dateOfService) errs.dateOfService = "Date of service is required.";
    if (!clinicalNote.trim()) errs.clinicalNote = "Clinical note is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);

    try {
      const record = await saveEncounter({
        patientName: patientName.trim(),
        dateOfService,
        latitude: lat,
        longitude: lng,
        clinicalNote: clinicalNote.trim(),
      });

      try {
        const res = await fetch(`${BASE}/api/encounters`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: record.id,
            patientName: record.patientName,
            dateOfService: record.dateOfService,
            latitude: record.latitude,
            longitude: record.longitude,
            clinicalNote: record.clinicalNote,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const codes: string[] = data.codes ?? AUTO_CODES;
          const posCode: string = data.posCode ?? AUTO_POS;
          await updateEncounterCodes(record.id, codes, posCode);
        } else {
          await updateEncounterCodes(record.id, AUTO_CODES, AUTO_POS);
        }
      } catch {
        await updateEncounterCodes(record.id, AUTO_CODES, AUTO_POS);
      }

      setSuccess({ id: record.id });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Encounter Saved</h2>
            <p className="text-sm text-gray-500 mb-5">
              Auto-applied billing codes have been assigned.
            </p>
          </div>

          <Card className="border-2 border-purple-200">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm font-semibold text-gray-700 mb-3">Auto-Applied Codes</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-purple-600 text-white text-sm px-3 py-1">
                  Z59.0 — Homelessness
                </Badge>
                <Badge className="bg-blue-600 text-white text-sm px-3 py-1">
                  POS 27 — Outreach Site
                </Badge>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Review and confirm these codes before final claim submission.
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/encounter/${success.id}`)}
            >
              View Encounter
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate("/")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">New Encounter</h1>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input
              id="patientName"
              placeholder="Full name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className={errors.patientName ? "border-red-400" : ""}
            />
            {errors.patientName && (
              <p className="text-xs text-red-500">{errors.patientName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dos">Date of Service</Label>
            <Input
              id="dos"
              type="date"
              value={dateOfService}
              onChange={(e) => setDateOfService(e.target.value)}
              className={errors.dateOfService ? "border-red-400" : ""}
            />
            {errors.dateOfService && (
              <p className="text-xs text-red-500">{errors.dateOfService}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>GPS Coordinates</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={
                  lat !== null && lng !== null
                    ? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
                    : ""
                }
                placeholder="Tap 'Locate Me' to capture"
                className="flex-1 bg-gray-50"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleLocate}
                disabled={gpsLoading}
                className="shrink-0"
              >
                {gpsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
                <span className="ml-1.5 text-sm">Locate Me</span>
              </Button>
            </div>
            {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="clinicalNote">Clinical Note</Label>
              {hasSpeech && (
                <button
                  type="button"
                  onClick={toggleMic}
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors ${
                    listening
                      ? "bg-red-100 text-red-700 border border-red-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200"
                  }`}
                >
                  {listening ? (
                    <>
                      <MicOff className="w-3 h-3" /> Stop
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3" /> Dictate
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              id="clinicalNote"
              rows={5}
              value={clinicalNote}
              onChange={(e) => setClinicalNote(e.target.value)}
              placeholder="Describe the clinical encounter..."
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                errors.clinicalNote ? "border-red-400" : "border-input"
              } ${listening ? "bg-red-50" : "bg-background"}`}
            />
            {listening && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Listening… speak your note
              </p>
            )}
            {errors.clinicalNote && (
              <p className="text-xs text-red-500">{errors.clinicalNote}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              "Submit Encounter"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
