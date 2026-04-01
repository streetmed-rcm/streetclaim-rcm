import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useGetRevenueLift } from "@workspace/api-client-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const BASE_URL = import.meta.env.BASE_URL ?? "/";

const PAYER_LABELS: Record<string, string> = {
  medi_cal: "Medi-Cal",
  medicare: "Medicare",
  managed_care: "Managed Care",
  private: "Private",
};

const chartConfig: ChartConfig = {
  baselineBilled: {
    label: "Baseline (Facility Rate / Old POS)",
    color: "#6366f1",
  },
  streetclaimBilled: {
    label: "StreetClaim (POS 27 Non-Facility)",
    color: "#22c55e",
  },
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface CptRate {
  code: string;
  description: string;
  mdmLevel: string;
  medicareNonFac: number;
  medicareFac: number;
  mediCalTri: number;
  totalNonFacRvu: number;
  totalFacRvu: number;
}

interface DenialRate {
  rate: number;
  effectiveCollection: number;
  source: string;
  note: string;
}

interface FeeScheduleData {
  metadata: {
    title: string;
    conversionFactor: number;
    effectiveDate: string;
    sources: Array<{ name: string; url: string; note: string }>;
    posExplainer: Record<string, string>;
  };
  rates: CptRate[];
  denialRates: Record<string, DenialRate>;
}

export default function RevenueLiftPage() {
  const { data, isLoading, isError } = useGetRevenueLift();
  const [feeSchedule, setFeeSchedule] = useState<FeeScheduleData | null>(null);
  const [fsLoading, setFsLoading] = useState(true);

  useEffect(() => {
    const apiBase = BASE_URL.endsWith("/") ? BASE_URL.slice(0, -1) : BASE_URL;
    fetch(`${apiBase}/api/fee-schedule`)
      .then((r) => r.json())
      .then((d) => setFeeSchedule(d))
      .catch(() => {})
      .finally(() => setFsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-gray-500 text-sm">Loading revenue lift data...</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-red-500 text-sm">Failed to load revenue lift data.</p>
      </div>
    );
  }

  const chartData = (data.byPayer ?? []).map((payer) => ({
    name: PAYER_LABELS[payer.payerType] ?? payer.payerType,
    baselineBilled: payer.baselineRevenue.billed,
    streetclaimBilled: payer.streetclaimRevenue.billed,
  }));

  const liftIsPositive = data.lift >= 0;
  const seg = data.segmentation;

  const DENIAL_PAYER_LABELS: Record<string, string> = {
    medicare: "Medicare FFS",
    medi_cal: "Medi-Cal TRI",
    managed_care: "Managed Care / MA",
    private: "Private / Commercial",
  };

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Lift</h1>
          <p className="mt-1 text-sm text-gray-500">
            POS 27 (Street Outreach, non-facility rate) vs. pre-POS-27 facility-rate baseline —
            powered by real 2025 CMS Medicare rates and California Medi-Cal TRI (SPA 23-0035)
          </p>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-1">
          <p className="font-semibold">Data sources</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>
              <strong>CMS CY 2025 MPFS Final Rule</strong> — Conversion Factor $32.3465 · National unadjusted rates
            </li>
            <li>
              <strong>CMS POS 27 (CR 13314)</strong> — Outreach Site/Street, effective Oct 1, 2023 — non-facility rate applies
            </li>
            <li>
              <strong>California DHCS Medi-Cal TRI (SPA 23-0035)</strong> — AB 118 / Budget Act 2023 · Prop 35 permanent floor · ≥87.5% of Medicare
            </li>
            <li>
              <strong>Denial rates</strong> — Premier Inc. 2024 · Experian/Becker's 2024 (2,100+ hospitals, 300k+ physicians)
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Baseline Revenue (Facility Rate Era)</CardDescription>
              <CardTitle className="text-2xl text-indigo-600">
                {formatCurrency(data.baselineRevenue)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">
                Pre-POS-27 miscoding as POS 22 (outpatient hospital) → facility RVU rate
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Billed: {formatCurrency(seg.baseline.totalBilled)} ·
                Collected: {formatCurrency(seg.baseline.totalCollected)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>StreetClaim Revenue (POS 27)</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {formatCurrency(data.streetclaimRevenue)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">
                POS 27 + SDOH Z-codes → non-facility RVU rate (CMS CR 13314)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Billed: {formatCurrency(seg.streetclaim.totalBilled)} ·
                Collected: {formatCurrency(seg.streetclaim.totalCollected)} ·{" "}
                {data.claimsWithZCodes}/{data.totalClaims} Z-code claims
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Revenue Lift ({Math.round(data.denialRecoveryRate * 100)}% Recovery)</CardDescription>
              <CardTitle className={`text-2xl ${liftIsPositive ? "text-emerald-600" : "text-red-600"}`}>
                {liftIsPositive ? "+" : ""}{formatCurrency(data.lift)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-gray-500">
                {liftIsPositive ? "+" : ""}{data.liftPercent.toFixed(1)}% above baseline
              </p>
              <p className="text-xs text-gray-400 mt-1">
                (POS 27 billed − facility baseline) × 40% denial recovery
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Billed Revenue Comparison by Payer</CardTitle>
            <CardDescription>
              Facility-rate baseline vs. POS 27 non-facility billing across all payer types — real CMS 2025 rates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="baselineBilled" fill="var(--color-baselineBilled)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="streetclaimBilled" fill="var(--color-streetclaimBilled)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lift by Payer</CardTitle>
            <CardDescription>
              Revenue lift per payer after 40% denial recovery applied to the POS 27 − facility rate delta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Payer</th>
                    <th className="pb-2 pr-4 text-right font-medium">Baseline Billed</th>
                    <th className="pb-2 pr-4 text-right font-medium">Baseline Collected</th>
                    <th className="pb-2 pr-4 text-right font-medium">StreetClaim Billed</th>
                    <th className="pb-2 pr-4 text-right font-medium">StreetClaim Collected</th>
                    <th className="pb-2 pr-4 text-right font-medium">Lift (40%)</th>
                    <th className="pb-2 text-right font-medium">Lift %</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.byPayer ?? []).map((payer) => (
                    <tr key={payer.payerType} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium text-gray-800">
                        {PAYER_LABELS[payer.payerType] ?? payer.payerType}
                      </td>
                      <td className="py-3 pr-4 text-right text-indigo-700">{formatCurrency(payer.baselineRevenue.billed)}</td>
                      <td className="py-3 pr-4 text-right text-indigo-500">{formatCurrency(payer.baselineRevenue.collected)}</td>
                      <td className="py-3 pr-4 text-right text-green-700">{formatCurrency(payer.streetclaimRevenue.billed)}</td>
                      <td className="py-3 pr-4 text-right text-green-500">{formatCurrency(payer.streetclaimRevenue.collected)}</td>
                      <td className="py-3 pr-4 text-right text-emerald-700 font-medium">+{formatCurrency(payer.lift)}</td>
                      <td className="py-3 text-right text-emerald-700">+{payer.liftPercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-gray-900 border-t-2">
                    <td className="pt-3 pr-4">Total</td>
                    <td className="pt-3 pr-4 text-right text-indigo-700">{formatCurrency(seg.baseline.totalBilled)}</td>
                    <td className="pt-3 pr-4 text-right text-indigo-500">{formatCurrency(seg.baseline.totalCollected)}</td>
                    <td className="pt-3 pr-4 text-right text-green-700">{formatCurrency(seg.streetclaim.totalBilled)}</td>
                    <td className="pt-3 pr-4 text-right text-green-500">{formatCurrency(seg.streetclaim.totalCollected)}</td>
                    <td className="pt-3 pr-4 text-right text-emerald-700">+{formatCurrency(data.lift)}</td>
                    <td className="pt-3 text-right text-emerald-700">+{data.liftPercent.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2025 CMS Medicare Physician Fee Schedule</CardTitle>
            <CardDescription>
              Real national unadjusted rates · Conversion Factor $
              {feeSchedule?.metadata.conversionFactor ?? "32.3465"} ·
              Source: CMS CY 2025 MPFS Final Rule
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fsLoading ? (
              <p className="text-sm text-gray-400">Loading fee schedule...</p>
            ) : feeSchedule ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 pr-4 font-medium">CPT</th>
                        <th className="pb-2 pr-4 font-medium">MDM Level</th>
                        <th className="pb-2 pr-4 text-right font-medium">Non-Fac RVU</th>
                        <th className="pb-2 pr-4 text-right font-medium">Fac RVU</th>
                        <th className="pb-2 pr-4 text-right font-medium">
                          Medicare POS 27
                          <span className="block text-xs font-normal text-green-600">Non-Facility</span>
                        </th>
                        <th className="pb-2 pr-4 text-right font-medium">
                          Medicare POS 22
                          <span className="block text-xs font-normal text-indigo-500">Facility (old)</span>
                        </th>
                        <th className="pb-2 text-right font-medium">
                          Medi-Cal TRI
                          <span className="block text-xs font-normal text-blue-600">≥87.5% Medicare</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeSchedule.rates.map((r) => {
                        const lift = ((r.medicareNonFac - r.medicareFac) / r.medicareFac * 100).toFixed(0);
                        return (
                          <tr key={r.code} className="border-b last:border-0">
                            <td className="py-2.5 pr-4 font-mono font-semibold text-gray-800">{r.code}</td>
                            <td className="py-2.5 pr-4 text-gray-600 capitalize">{r.mdmLevel}</td>
                            <td className="py-2.5 pr-4 text-right text-gray-500">{r.totalNonFacRvu}</td>
                            <td className="py-2.5 pr-4 text-right text-gray-400">{r.totalFacRvu}</td>
                            <td className="py-2.5 pr-4 text-right font-medium text-green-700">
                              {formatCurrencyFull(r.medicareNonFac)}
                            </td>
                            <td className="py-2.5 pr-4 text-right text-indigo-600">
                              {formatCurrencyFull(r.medicareFac)}
                            </td>
                            <td className="py-2.5 text-right text-blue-700">
                              {formatCurrencyFull(r.mediCalTri)}
                              <span className="ml-1.5 inline-block rounded bg-green-100 px-1 py-0.5 text-[10px] font-medium text-green-700">
                                +{lift}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  +% badge shows revenue gain from POS 27 non-facility rate vs. facility-rate miscoding ·
                  Geographic GPCI adjusters not applied above (national unadjusted) ·
                  Medi-Cal TRI effective Jan 1, 2024 per DHCS SPA 23-0035; Prop 35 permanent floor
                </p>
              </>
            ) : (
              <p className="text-sm text-red-400">Failed to load fee schedule.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payer Denial &amp; Collection Rates</CardTitle>
            <CardDescription>
              Real 2024–2025 denial data — Premier Inc. survey (2024), Experian/Becker's (2024)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {feeSchedule ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 pr-4 font-medium">Payer</th>
                      <th className="pb-2 pr-4 text-right font-medium">Denial Rate</th>
                      <th className="pb-2 pr-4 text-right font-medium">Effective Collection</th>
                      <th className="pb-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(feeSchedule.denialRates).map(([key, dr]) => (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium text-gray-800">{DENIAL_PAYER_LABELS[key] ?? key}</td>
                        <td className="py-3 pr-4 text-right text-red-600 font-medium">
                          {(dr.rate * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 pr-4 text-right text-green-600 font-medium">
                          {(dr.effectiveCollection * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 text-xs text-gray-500 max-w-xs">{dr.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-gray-400">
                  Sources: Premier Inc. Healthcare Performance Improvement Survey 2024 ·
                  Experian Health / Becker's Hospital Review 2024 (2,100+ hospitals, 300k+ physicians) ·
                  CMS Medicare Payment Advisory Commission (MedPAC) 2024
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-400">Loading denial rates...</p>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
