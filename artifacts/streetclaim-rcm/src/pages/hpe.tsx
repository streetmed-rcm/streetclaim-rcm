import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface HPEResult {
  tempMedicalId: string;
  expiresAt: string;
  patientName: string;
}

export default function HPEPage() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<HPEResult | null>(null);
  const [apiError, setApiError] = useState("");
  const [copied, setCopied] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!dob) errs.dob = "Date of birth is required.";
    if (!gender) errs.gender = "Gender is required.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError("");
    setResult(null);

    try {
      const res = await fetch(`${BASE}/api/hpe/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), dob, gender }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setApiError(data.message ?? "An error occurred. Please try again.");
        return;
      }

      const data = await res.json();
      setResult(data);
    } catch {
      setApiError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.tempMedicalId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setResult(null);
    setName("");
    setDob("");
    setGender("");
    setErrors({});
    setApiError("");
  };

  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (result) {
    return (
      <div className="min-h-screen bg-gray-50 pb-8">
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
          <h1 className="text-xl font-bold text-gray-900">HPE — Temp Medi-Cal ID</h1>

          <Card className="border-2 border-green-200 bg-green-50">
            <CardContent className="pt-6 pb-6 text-center space-y-3">
              <p className="text-sm text-green-700 font-semibold uppercase tracking-wide">
                Temporary Medi-Cal ID Issued
              </p>
              <p className="text-sm text-green-800">{result.patientName}</p>

              <div className="bg-white border border-green-300 rounded-lg px-6 py-4 inline-block mx-auto">
                <p className="text-2xl font-mono font-bold text-green-900 tracking-widest select-all">
                  {result.tempMedicalId}
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="flex items-center gap-1.5 border-green-400 text-green-700 hover:bg-green-100"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy ID
                  </>
                )}
              </Button>

              <p className="text-xs text-green-700 mt-1">
                Valid for <span className="font-bold">45 days</span> — expires{" "}
                <span className="font-bold">{formatExpiry(result.expiresAt)}</span>
              </p>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleReset}
          >
            Issue Another ID
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="max-w-lg mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">HPE — Issue Temp Medi-Cal ID</h1>
        <p className="text-sm text-gray-500 mb-6">
          Hospital Presumptive Eligibility — generates a temporary Medi-Cal ID valid for 45 days.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="hpe-name">Full Name</Label>
            <Input
              id="hpe-name"
              placeholder="Patient's full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? "border-red-400" : ""}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hpe-dob">Date of Birth</Label>
            <Input
              id="hpe-dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className={errors.dob ? "border-red-400" : ""}
            />
            {errors.dob && (
              <p className="text-xs text-red-500">{errors.dob}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hpe-gender">Gender</Label>
            <select
              id="hpe-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.gender ? "border-red-400" : "border-input"
              }`}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Non-binary</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
            {errors.gender && (
              <p className="text-xs text-red-500">{errors.gender}</p>
            )}
          </div>

          {apiError && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying…
              </>
            ) : (
              "Issue Temporary Medi-Cal ID"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
