/**
 * OData 4.0 feed for Power BI, Excel, and any OData-compatible client.
 *
 * Power BI Desktop: Get Data → OData Feed → paste base URL /api/odata
 * Power BI Service: same URL works from the gateway or public endpoint.
 *
 * Entity sets:
 *   Claims          – all claims from PostgreSQL (real CMS 2025 rates)
 *   FeeSchedule     – 2025 CMS MPFS rates + Medi-Cal TRI per CPT code
 *   Teams           – field team locations and status (SoCal)
 *   RevenueSummary  – revenue lift by payer
 *   DenialRates     – payer denial & collection rates (Premier Inc. 2024)
 *   SdohZCodes      – SDOH Z-code reference table
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, claimsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { MPFS_2025, DENIAL_RATES, CONVERSION_FACTOR_2025 } from "./fee-schedule";

const router: IRouter = Router();

const ODATA_VERSION = "4.0";
const SERVICE_NAMESPACE = "StreetClaimRCM";

function odataContext(baseUrl: string, entity: string): string {
  return `${baseUrl}/$metadata#${entity}`;
}

function getBase(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol;
  const host = req.headers["x-forwarded-host"] ?? req.get("host");
  return `${proto}://${host}/api/odata`;
}

function applyQueryOptions<T extends Record<string, unknown>>(
  items: T[],
  req: Request,
): { items: T[]; count: number } {
  const count = items.length;

  const select = req.query.$select as string | undefined;
  const filter = req.query.$filter as string | undefined;
  const top = parseInt((req.query.$top as string) ?? "0", 10) || 0;
  const skip = parseInt((req.query.$skip as string) ?? "0", 10) || 0;
  const orderby = req.query.$orderby as string | undefined;

  let result = [...items];

  if (filter) {
    const eqMatch = filter.match(/^(\w+)\s+eq\s+'?([^']+)'?$/);
    if (eqMatch) {
      const [, field, value] = eqMatch;
      result = result.filter((item) => String(item[field]) === value);
    }
  }

  if (orderby) {
    const [field, dir] = orderby.split(" ");
    result.sort((a, b) => {
      const av = a[field];
      const bv = b[field];
      if (av == null || bv == null) return 0;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return dir === "desc" ? -cmp : cmp;
    });
  }

  if (skip > 0) result = result.slice(skip);
  if (top > 0) result = result.slice(0, top);

  if (select) {
    const fields = select.split(",").map((f) => f.trim());
    result = result.map((item) =>
      Object.fromEntries(fields.map((f) => [f, item[f]])) as T,
    );
  }

  return { items: result, count };
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata  — service document
// ──────────────────────────────────────────────────────────────────────────────
router.get("/odata", (req: Request, res: Response) => {
  const base = getBase(req);
  res.setHeader("OData-Version", ODATA_VERSION);
  res.json({
    "@odata.context": `${base}/$metadata`,
    value: [
      { name: "Claims", kind: "EntitySet", url: `${base}/Claims` },
      { name: "FeeSchedule", kind: "EntitySet", url: `${base}/FeeSchedule` },
      { name: "Teams", kind: "EntitySet", url: `${base}/Teams` },
      { name: "RevenueSummary", kind: "EntitySet", url: `${base}/RevenueSummary` },
      { name: "DenialRates", kind: "EntitySet", url: `${base}/DenialRates` },
      { name: "SdohZCodes", kind: "EntitySet", url: `${base}/SdohZCodes` },
    ],
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata/$metadata  — CSDL metadata document (XML)
// ──────────────────────────────────────────────────────────────────────────────
router.get("/odata/\\$metadata", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("OData-Version", ODATA_VERSION);
  res.send(`<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="${SERVICE_NAMESPACE}" xmlns="http://docs.oasis-open.org/odata/ns/edm">

      <EntityType Name="Claim">
        <Key><PropertyRef Name="Id"/></Key>
        <Property Name="Id" Type="Edm.Int32" Nullable="false"/>
        <Property Name="ClaimNumber" Type="Edm.String"/>
        <Property Name="PayerType" Type="Edm.String"/>
        <Property Name="PosCode" Type="Edm.String"/>
        <Property Name="EmCode" Type="Edm.String"/>
        <Property Name="BilledAmount" Type="Edm.Decimal" Scale="2"/>
        <Property Name="CollectedAmount" Type="Edm.Decimal" Scale="2"/>
        <Property Name="Status" Type="Edm.String"/>
        <Property Name="HasZCodes" Type="Edm.Boolean"/>
        <Property Name="SdohZCodes" Type="Edm.String"/>
        <Property Name="CreatedAt" Type="Edm.DateTimeOffset"/>
      </EntityType>

      <EntityType Name="FeeScheduleEntry">
        <Key><PropertyRef Name="Code"/></Key>
        <Property Name="Code" Type="Edm.String" Nullable="false"/>
        <Property Name="Description" Type="Edm.String"/>
        <Property Name="MdmLevel" Type="Edm.String"/>
        <Property Name="ConversionFactor" Type="Edm.Decimal" Scale="4"/>
        <Property Name="NonFacRvu" Type="Edm.Decimal" Scale="2"/>
        <Property Name="FacRvu" Type="Edm.Decimal" Scale="2"/>
        <Property Name="MedicareNonFacRate" Type="Edm.Decimal" Scale="2"/>
        <Property Name="MedicareFacRate" Type="Edm.Decimal" Scale="2"/>
        <Property Name="MediCalTriRate" Type="Edm.Decimal" Scale="2"/>
        <Property Name="MediCalFacilityEraRate" Type="Edm.Decimal" Scale="2"/>
        <Property Name="LiftPercent" Type="Edm.Decimal" Scale="1"/>
        <Property Name="Source" Type="Edm.String"/>
      </EntityType>

      <EntityType Name="Team">
        <Key><PropertyRef Name="Id"/></Key>
        <Property Name="Id" Type="Edm.String" Nullable="false"/>
        <Property Name="Name" Type="Edm.String"/>
        <Property Name="County" Type="Edm.String"/>
        <Property Name="Region" Type="Edm.String"/>
        <Property Name="Type" Type="Edm.String"/>
        <Property Name="Lead" Type="Edm.String"/>
        <Property Name="Members" Type="Edm.Int32"/>
        <Property Name="Latitude" Type="Edm.Decimal" Scale="6"/>
        <Property Name="Longitude" Type="Edm.Decimal" Scale="6"/>
        <Property Name="Status" Type="Edm.String"/>
        <Property Name="PatientsToday" Type="Edm.Int32"/>
        <Property Name="EncountersToday" Type="Edm.Int32"/>
        <Property Name="CurrentLocation" Type="Edm.String"/>
        <Property Name="LastUpdated" Type="Edm.DateTimeOffset"/>
      </EntityType>

      <EntityType Name="RevenueSummaryEntry">
        <Key><PropertyRef Name="PayerType"/></Key>
        <Property Name="PayerType" Type="Edm.String" Nullable="false"/>
        <Property Name="BaselineBilled" Type="Edm.Decimal" Scale="2"/>
        <Property Name="BaselineCollected" Type="Edm.Decimal" Scale="2"/>
        <Property Name="StreetClaimBilled" Type="Edm.Decimal" Scale="2"/>
        <Property Name="StreetClaimCollected" Type="Edm.Decimal" Scale="2"/>
        <Property Name="Lift" Type="Edm.Decimal" Scale="2"/>
        <Property Name="LiftPercent" Type="Edm.Decimal" Scale="1"/>
        <Property Name="ClaimCount" Type="Edm.Int32"/>
        <Property Name="ZCodeClaims" Type="Edm.Int32"/>
      </EntityType>

      <EntityType Name="DenialRateEntry">
        <Key><PropertyRef Name="PayerType"/></Key>
        <Property Name="PayerType" Type="Edm.String" Nullable="false"/>
        <Property Name="DenialRatePct" Type="Edm.Decimal" Scale="1"/>
        <Property Name="EffectiveCollectionPct" Type="Edm.Decimal" Scale="1"/>
        <Property Name="Source" Type="Edm.String"/>
        <Property Name="Note" Type="Edm.String"/>
      </EntityType>

      <EntityType Name="SdohZCode">
        <Key><PropertyRef Name="Code"/></Key>
        <Property Name="Code" Type="Edm.String" Nullable="false"/>
        <Property Name="Description" Type="Edm.String"/>
        <Property Name="Category" Type="Edm.String"/>
      </EntityType>

      <EntityContainer Name="Container">
        <EntitySet Name="Claims" EntityType="${SERVICE_NAMESPACE}.Claim"/>
        <EntitySet Name="FeeSchedule" EntityType="${SERVICE_NAMESPACE}.FeeScheduleEntry"/>
        <EntitySet Name="Teams" EntityType="${SERVICE_NAMESPACE}.Team"/>
        <EntitySet Name="RevenueSummary" EntityType="${SERVICE_NAMESPACE}.RevenueSummaryEntry"/>
        <EntitySet Name="DenialRates" EntityType="${SERVICE_NAMESPACE}.DenialRateEntry"/>
        <EntitySet Name="SdohZCodes" EntityType="${SERVICE_NAMESPACE}.SdohZCode"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`);
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata/Claims
// ──────────────────────────────────────────────────────────────────────────────
router.get("/odata/Claims", async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        id: claimsTable.id,
        claimNumber: claimsTable.claimNumber,
        payerType: claimsTable.payerType,
        posCode: claimsTable.posCode,
        emCode: claimsTable.emCode,
        billedAmount: claimsTable.billedAmount,
        collectedAmount: claimsTable.collectedAmount,
        status: claimsTable.status,
        hasZCodes: claimsTable.hasZCodes,
        sdohZCodes: claimsTable.sdohZCodes,
        createdAt: claimsTable.createdAt,
      })
      .from(claimsTable);

    const normalized = rows.map((r) => ({
      Id: r.id,
      ClaimNumber: r.claimNumber,
      PayerType: r.payerType,
      PosCode: r.posCode,
      EmCode: r.emCode,
      BilledAmount: Number(r.billedAmount),
      CollectedAmount: Number(r.collectedAmount),
      Status: r.status,
      HasZCodes: r.hasZCodes,
      SdohZCodes: Array.isArray(r.sdohZCodes) ? r.sdohZCodes.join(", ") : "",
      CreatedAt: r.createdAt?.toISOString() ?? null,
    }));

    const { items, count } = applyQueryOptions(normalized, req);

    res.setHeader("OData-Version", ODATA_VERSION);
    const resp: Record<string, unknown> = {
      "@odata.context": odataContext(getBase(req), "Claims"),
      value: items,
    };
    if (req.query.$count === "true") resp["@odata.count"] = count;
    res.json(resp);
  } catch (err) {
    console.error("OData/Claims error:", err);
    res.status(500).json({ error: { message: "Failed to fetch claims" } });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata/FeeSchedule
// ──────────────────────────────────────────────────────────────────────────────
router.get("/odata/FeeSchedule", (req: Request, res: Response) => {
  const rows = MPFS_2025.map((r) => ({
    Code: r.code,
    Description: r.description,
    MdmLevel: r.mdmLevel,
    ConversionFactor: CONVERSION_FACTOR_2025,
    NonFacRvu: r.totalNonFacRvu,
    FacRvu: r.totalFacRvu,
    MedicareNonFacRate: r.medicareNonFac,
    MedicareFacRate: r.medicareFac,
    MediCalTriRate: r.mediCalTri,
    MediCalFacilityEraRate: r.mediCalFacilityEra,
    LiftPercent: Math.round(((r.medicareNonFac - r.medicareFac) / r.medicareFac) * 1000) / 10,
    Source: "CMS CY 2025 MPFS Final Rule; DHCS Medi-Cal TRI SPA 23-0035",
  }));

  const { items, count } = applyQueryOptions(rows, req);
  res.setHeader("OData-Version", ODATA_VERSION);
  const resp: Record<string, unknown> = {
    "@odata.context": odataContext(getBase(req), "FeeSchedule"),
    value: items,
  };
  if (req.query.$count === "true") resp["@odata.count"] = count;
  res.json(resp);
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata/Teams
// ──────────────────────────────────────────────────────────────────────────────
const TEAMS_DATA = [
  { Id: "T-LA-001", Name: "Skid Row Alpha", County: "Los Angeles", Region: "Central LA", Type: "physician", Lead: "Dr. Carmen Vega", Members: 3, Latitude: 34.0452, Longitude: -118.2457, Status: "active_encounter", PatientsToday: 9, EncountersToday: 9, CurrentLocation: "5th & San Pedro St, Skid Row", LastUpdated: "2026-04-01T19:22:00Z" },
  { Id: "T-LA-002", Name: "Skid Row Bravo", County: "Los Angeles", Region: "Central LA", Type: "chw", Lead: "Maria Santos (CHW)", Members: 2, Latitude: 34.0438, Longitude: -118.2478, Status: "in_transit", PatientsToday: 12, EncountersToday: 12, CurrentLocation: "6th & Alameda, Skid Row", LastUpdated: "2026-04-01T19:15:00Z" },
  { Id: "T-LA-003", Name: "Venice Beach Outreach", County: "Los Angeles", Region: "Westside", Type: "peer_navigator", Lead: "Darius King (Peer Nav.)", Members: 2, Latitude: 33.9850, Longitude: -118.4695, Status: "available", PatientsToday: 5, EncountersToday: 5, CurrentLocation: "Venice Boardwalk, Lincoln Blvd", LastUpdated: "2026-04-01T18:55:00Z" },
  { Id: "T-LA-004", Name: "East LA Mobile Unit", County: "Los Angeles", Region: "East LA", Type: "physician", Lead: "Dr. Rosa Flores", Members: 4, Latitude: 34.0195, Longitude: -118.1669, Status: "active_encounter", PatientsToday: 7, EncountersToday: 7, CurrentLocation: "Cesar Chavez Ave encampment", LastUpdated: "2026-04-01T19:30:00Z" },
  { Id: "T-LA-005", Name: "Hollywood Care Team", County: "Los Angeles", Region: "Hollywood", Type: "care_coordinator", Lead: "Aisha Grant (Care Coord.)", Members: 2, Latitude: 34.0928, Longitude: -118.3287, Status: "available", PatientsToday: 6, EncountersToday: 6, CurrentLocation: "Highland Ave & Sunset Blvd", LastUpdated: "2026-04-01T18:40:00Z" },
  { Id: "T-LA-006", Name: "South LA Outreach", County: "Los Angeles", Region: "South LA", Type: "physician", Lead: "Dr. James Osei", Members: 3, Latitude: 33.9731, Longitude: -118.2479, Status: "active_encounter", PatientsToday: 11, EncountersToday: 11, CurrentLocation: "Vermont Ave underpass, Compton Blvd", LastUpdated: "2026-04-01T19:25:00Z" },
  { Id: "T-LA-007", Name: "San Fernando Valley North", County: "Los Angeles", Region: "San Fernando Valley", Type: "chw", Lead: "Elena Torres (CHW)", Members: 3, Latitude: 34.2011, Longitude: -118.5342, Status: "in_transit", PatientsToday: 8, EncountersToday: 8, CurrentLocation: "Reseda Blvd riverbed area", LastUpdated: "2026-04-01T19:10:00Z" },
  { Id: "T-LA-008", Name: "Long Beach Harbor Unit", County: "Los Angeles", Region: "South Bay", Type: "physician", Lead: "Dr. Kevin Park", Members: 3, Latitude: 33.7701, Longitude: -118.1937, Status: "available", PatientsToday: 4, EncountersToday: 4, CurrentLocation: "Long Beach Poly area, PCH", LastUpdated: "2026-04-01T18:30:00Z" },
  { Id: "T-LA-009", Name: "Koreatown Outreach", County: "Los Angeles", Region: "Central LA", Type: "peer_navigator", Lead: "Jin Park (Peer Nav.)", Members: 2, Latitude: 34.0604, Longitude: -118.2993, Status: "offline", PatientsToday: 3, EncountersToday: 3, CurrentLocation: "Last known: 8th & Vermont", LastUpdated: "2026-04-01T16:00:00Z" },
  { Id: "T-LA-010", Name: "Pasadena Rose Bowl", County: "Los Angeles", Region: "San Gabriel Valley", Type: "care_coordinator", Lead: "Priya Nair (Care Coord.)", Members: 2, Latitude: 34.1613, Longitude: -118.1676, Status: "active_encounter", PatientsToday: 6, EncountersToday: 6, CurrentLocation: "Arroyo Seco riverbed, Pasadena", LastUpdated: "2026-04-01T19:28:00Z" },
  { Id: "T-IE-001", Name: "Riverside Downtown", County: "Riverside", Region: "Inland Empire West", Type: "physician", Lead: "Dr. Luis Mendez", Members: 3, Latitude: 33.9806, Longitude: -117.3755, Status: "active_encounter", PatientsToday: 7, EncountersToday: 7, CurrentLocation: "Santa Ana River bed, Riverside", LastUpdated: "2026-04-01T19:18:00Z" },
  { Id: "T-IE-002", Name: "San Bernardino Central", County: "San Bernardino", Region: "Inland Empire East", Type: "chw", Lead: "Tanya Wells (CHW)", Members: 2, Latitude: 34.1083, Longitude: -117.2898, Status: "in_transit", PatientsToday: 9, EncountersToday: 9, CurrentLocation: "E Street corridor, San Bernardino", LastUpdated: "2026-04-01T19:05:00Z" },
  { Id: "T-IE-003", Name: "Ontario Airport Area", County: "San Bernardino", Region: "Inland Empire West", Type: "peer_navigator", Lead: "Marcus Bell (Peer Nav.)", Members: 2, Latitude: 34.0633, Longitude: -117.6009, Status: "available", PatientsToday: 5, EncountersToday: 5, CurrentLocation: "Holt Blvd encampment, Ontario", LastUpdated: "2026-04-01T18:50:00Z" },
  { Id: "T-IE-004", Name: "Fontana Outreach", County: "San Bernardino", Region: "Inland Empire East", Type: "physician", Lead: "Dr. Angela Cruz", Members: 3, Latitude: 34.0922, Longitude: -117.4350, Status: "active_encounter", PatientsToday: 6, EncountersToday: 6, CurrentLocation: "Arrow Blvd, Fontana", LastUpdated: "2026-04-01T19:32:00Z" },
  { Id: "T-IE-005", Name: "Palm Springs Desert Unit", County: "Riverside", Region: "Inland Empire East", Type: "care_coordinator", Lead: "Sam Rivera (Care Coord.)", Members: 2, Latitude: 33.8303, Longitude: -116.5453, Status: "offline", PatientsToday: 2, EncountersToday: 2, CurrentLocation: "Last known: downtown Palm Springs", LastUpdated: "2026-04-01T15:30:00Z" },
  { Id: "T-SD-001", Name: "Downtown SD Alpha", County: "San Diego", Region: "Central San Diego", Type: "physician", Lead: "Dr. Fatima Malik", Members: 4, Latitude: 32.7157, Longitude: -117.1611, Status: "active_encounter", PatientsToday: 10, EncountersToday: 10, CurrentLocation: "16th & Imperial Ave, East Village", LastUpdated: "2026-04-01T19:35:00Z" },
  { Id: "T-SD-002", Name: "City Heights Outreach", County: "San Diego", Region: "Central San Diego", Type: "chw", Lead: "Rebecca Tran (CHW)", Members: 2, Latitude: 32.7531, Longitude: -117.1139, Status: "in_transit", PatientsToday: 8, EncountersToday: 8, CurrentLocation: "University Ave, City Heights", LastUpdated: "2026-04-01T19:12:00Z" },
  { Id: "T-SD-003", Name: "El Cajon Valley Team", County: "San Diego", Region: "East San Diego", Type: "peer_navigator", Lead: "Omar Hassan (Peer Nav.)", Members: 2, Latitude: 32.7948, Longitude: -116.9625, Status: "available", PatientsToday: 4, EncountersToday: 4, CurrentLocation: "Main St, El Cajon", LastUpdated: "2026-04-01T18:45:00Z" },
  { Id: "T-SD-004", Name: "National City Border", County: "San Diego", Region: "South San Diego", Type: "physician", Lead: "Dr. Hector Rios", Members: 3, Latitude: 32.6781, Longitude: -117.0992, Status: "active_encounter", PatientsToday: 7, EncountersToday: 7, CurrentLocation: "National City riverbed camp", LastUpdated: "2026-04-01T19:20:00Z" },
  { Id: "T-SD-005", Name: "North County Escondido", County: "San Diego", Region: "North San Diego", Type: "care_coordinator", Lead: "Jennifer Walsh (Care Coord.)", Members: 2, Latitude: 33.1192, Longitude: -117.0864, Status: "available", PatientsToday: 5, EncountersToday: 5, CurrentLocation: "Grand Ave, Escondido", LastUpdated: "2026-04-01T18:58:00Z" },
];

router.get("/odata/Teams", (req: Request, res: Response) => {
  const { items, count } = applyQueryOptions(TEAMS_DATA, req);
  res.setHeader("OData-Version", ODATA_VERSION);
  const resp: Record<string, unknown> = {
    "@odata.context": odataContext(getBase(req), "Teams"),
    value: items,
  };
  if (req.query.$count === "true") resp["@odata.count"] = count;
  res.json(resp);
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata/RevenueSummary
// ──────────────────────────────────────────────────────────────────────────────
router.get("/odata/RevenueSummary", async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        payerType: claimsTable.payerType,
        posCode: claimsTable.posCode,
        billedAmount: sql<number>`COALESCE(SUM(${claimsTable.billedAmount}::numeric), 0)`,
        collectedAmount: sql<number>`COALESCE(SUM(${claimsTable.collectedAmount}::numeric), 0)`,
        claimCount: sql<number>`COUNT(*)`,
        zCodeCount: sql<number>`SUM(CASE WHEN ${claimsTable.hasZCodes} THEN 1 ELSE 0 END)`,
      })
      .from(claimsTable)
      .groupBy(claimsTable.payerType, claimsTable.posCode);

    const payerMap: Record<string, {
      baselineBilled: number; baselineCollected: number;
      streetBilled: number; streetCollected: number;
      claimCount: number; zCodeClaims: number;
    }> = {};

    for (const r of rows) {
      if (!payerMap[r.payerType]) {
        payerMap[r.payerType] = { baselineBilled: 0, baselineCollected: 0, streetBilled: 0, streetCollected: 0, claimCount: 0, zCodeClaims: 0 };
      }
      const p = payerMap[r.payerType];
      p.claimCount += Number(r.claimCount);
      if (r.posCode === "11") {
        p.baselineBilled += Number(r.billedAmount);
        p.baselineCollected += Number(r.collectedAmount);
      } else {
        p.streetBilled += Number(r.billedAmount);
        p.streetCollected += Number(r.collectedAmount);
        p.zCodeClaims += Number(r.zCodeCount);
      }
    }

    const items = Object.entries(payerMap).map(([payerType, p]) => {
      const lift = (p.streetBilled - p.baselineBilled) * 0.4;
      const liftPct = p.baselineBilled > 0 ? Math.round((lift / p.baselineBilled) * 1000) / 10 : 0;
      return {
        PayerType: payerType,
        BaselineBilled: Math.round(p.baselineBilled * 100) / 100,
        BaselineCollected: Math.round(p.baselineCollected * 100) / 100,
        StreetClaimBilled: Math.round(p.streetBilled * 100) / 100,
        StreetClaimCollected: Math.round(p.streetCollected * 100) / 100,
        Lift: Math.round(lift * 100) / 100,
        LiftPercent: liftPct,
        ClaimCount: p.claimCount,
        ZCodeClaims: p.zCodeClaims,
      };
    });

    const { items: paged, count } = applyQueryOptions(items, req);
    res.setHeader("OData-Version", ODATA_VERSION);
    const resp: Record<string, unknown> = {
      "@odata.context": odataContext(getBase(req), "RevenueSummary"),
      value: paged,
    };
    if (req.query.$count === "true") resp["@odata.count"] = count;
    res.json(resp);
  } catch (err) {
    console.error("OData/RevenueSummary error:", err);
    res.status(500).json({ error: { message: "Failed to compute revenue summary" } });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata/DenialRates
// ──────────────────────────────────────────────────────────────────────────────
router.get("/odata/DenialRates", (req: Request, res: Response) => {
  const PAYER_LABELS: Record<string, string> = {
    medicare: "Medicare FFS",
    medi_cal: "Medi-Cal TRI",
    managed_care: "Managed Care / Medicare Advantage",
    private: "Private / Commercial",
  };

  const items = Object.entries(DENIAL_RATES).map(([key, dr]) => ({
    PayerType: PAYER_LABELS[key] ?? key,
    PayerKey: key,
    DenialRatePct: Math.round(dr.rate * 1000) / 10,
    EffectiveCollectionPct: Math.round(dr.effectiveCollection * 1000) / 10,
    Source: dr.source,
    Note: dr.note,
  }));

  const { items: paged, count } = applyQueryOptions(items, req);
  res.setHeader("OData-Version", ODATA_VERSION);
  const resp: Record<string, unknown> = {
    "@odata.context": odataContext(getBase(req), "DenialRates"),
    value: paged,
  };
  if (req.query.$count === "true") resp["@odata.count"] = count;
  res.json(resp);
});

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/odata/SdohZCodes
// ──────────────────────────────────────────────────────────────────────────────
const SDOH_CODES = [
  { Code: "Z59.0", Description: "Homelessness — unsheltered", Category: "Housing" },
  { Code: "Z59.1", Description: "Inadequate housing", Category: "Housing" },
  { Code: "Z59.2", Description: "Discord with neighbors/lodgers/landlord", Category: "Housing" },
  { Code: "Z59.3", Description: "Problems related to living in residential institution", Category: "Housing" },
  { Code: "Z60.0", Description: "Problems of adjustment to life-cycle transitions", Category: "Social" },
  { Code: "Z60.2", Description: "Problems related to living alone", Category: "Social" },
  { Code: "Z63.8", Description: "Other specified problems related to primary support group", Category: "Social" },
  { Code: "Z55.0", Description: "Illiteracy and low-level literacy", Category: "Education" },
  { Code: "Z56.0", Description: "Unemployment, unspecified", Category: "Employment" },
  { Code: "Z57.1", Description: "Occupational exposure to radiation", Category: "Employment" },
  { Code: "Z72.3", Description: "Lack of physical exercise", Category: "Lifestyle" },
  { Code: "Z76.4", Description: "Health services not provided due to other organizations", Category: "Access" },
];

router.get("/odata/SdohZCodes", (req: Request, res: Response) => {
  const { items, count } = applyQueryOptions(SDOH_CODES, req);
  res.setHeader("OData-Version", ODATA_VERSION);
  const resp: Record<string, unknown> = {
    "@odata.context": odataContext(getBase(req), "SdohZCodes"),
    value: items,
  };
  if (req.query.$count === "true") resp["@odata.count"] = count;
  res.json(resp);
});

export default router;
