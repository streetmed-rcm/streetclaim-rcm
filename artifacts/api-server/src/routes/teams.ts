import { Router, type IRouter } from "express";

const router: IRouter = Router();

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
  composition: string;
  lat: number;
  lng: number;
  status: TeamStatus;
  patients_today: number;
  encounters_today: number;
  last_updated: string;
  current_location: string;
  pager: string;
  funded_by: string;
}

/**
 * USC Street Medicine — 5 fully-staffed LA teams + regional expansion teams
 * Article reference: Brett Feldman, Director — Keck School of Medicine of USC
 * "five fully-staffed teams providing health care to people who are unhoused
 *  throughout the city of Los Angeles" — March 2024
 *
 * Each team composition per article:
 *  medical practitioner + nurse + 2 community health workers + floating staff
 *  ~200 visits/team/month = 1,000 total in January 2024
 */
const TEAMS: Team[] = [
  // ─── USC STREET MEDICINE — CORE 5 LA TEAMS ───────────────────────────────
  {
    id: "T-USC-001",
    name: "Skid Row Alpha",
    county: "Los Angeles",
    region: "Central LA — Skid Row / DTLA",
    type: "physician",
    lead: "Dr. Carmen Vega, MD (Family Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs (lived-expertise)",
    lat: 34.0452,
    lng: -118.2457,
    status: "active_encounter",
    patients_today: 8,
    encounters_today: 8,
    last_updated: new Date(Date.now() - 8 * 60000).toISOString(),
    current_location: "5th & San Pedro St encampment, Skid Row",
    pager: "213-555-0101",
    funded_by: "Health Net $1.5M Grant / Medi-Cal POS 27",
  },
  {
    id: "T-USC-002",
    name: "East LA Outreach",
    county: "Los Angeles",
    region: "East LA — Boyle Heights / East LA",
    type: "physician",
    lead: "Dr. Rosa Flores, MD (Internal Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs (lived-expertise)",
    lat: 34.0221,
    lng: -118.2072,
    status: "active_encounter",
    patients_today: 7,
    encounters_today: 7,
    last_updated: new Date(Date.now() - 12 * 60000).toISOString(),
    current_location: "Cesar Chavez Ave & Indiana St underpass",
    pager: "323-555-0102",
    funded_by: "Medi-Cal POS 27 / CalAIM Enhanced Care Management",
  },
  {
    id: "T-USC-003",
    name: "Hollywood / K-Town Mobile",
    county: "Los Angeles",
    region: "Central LA — Hollywood / Koreatown",
    type: "physician",
    lead: "Dr. James Osei, MD (Family Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs (lived-expertise)",
    lat: 34.0928,
    lng: -118.3287,
    status: "in_transit",
    patients_today: 6,
    encounters_today: 6,
    last_updated: new Date(Date.now() - 20 * 60000).toISOString(),
    current_location: "Highland Ave & Sunset Blvd → 8th & Vermont (K-Town)",
    pager: "323-555-0103",
    funded_by: "Medi-Cal POS 27 / LAHSA Coordinated Entry",
  },
  {
    id: "T-USC-004",
    name: "South LA / Compton Team",
    county: "Los Angeles",
    region: "South LA — Watts / Compton / Florence",
    type: "physician",
    lead: "Dr. Amara Diallo, MD (Family Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs (lived-expertise)",
    lat: 33.9600,
    lng: -118.2429,
    status: "active_encounter",
    patients_today: 9,
    encounters_today: 9,
    last_updated: new Date(Date.now() - 5 * 60000).toISOString(),
    current_location: "Vermont Ave underpass, Florence-Firestone",
    pager: "323-555-0104",
    funded_by: "Medi-Cal POS 27 / DHCS Street Medicine Initiative",
  },
  {
    id: "T-USC-005",
    name: "Westside / Venice Outreach",
    county: "Los Angeles",
    region: "Westside — Venice / Santa Monica",
    type: "physician",
    lead: "Dr. Elena Nakamura, MD (Family Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs (lived-expertise)",
    lat: 33.9906,
    lng: -118.4758,
    status: "available",
    patients_today: 5,
    encounters_today: 5,
    last_updated: new Date(Date.now() - 35 * 60000).toISOString(),
    current_location: "Venice Boardwalk — Lincoln Blvd encampment",
    pager: "310-555-0105",
    funded_by: "Medi-Cal POS 27 / St. Joseph Center Partnership",
  },

  // ─── FLOATING / EXPANSION STAFF ──────────────────────────────────────────
  {
    id: "T-USC-CHW-F",
    name: "CHW Floating Unit",
    county: "Los Angeles",
    region: "Citywide — Flexible Deployment",
    type: "chw",
    lead: "Maria Santos (Sr. CHW — lived expertise)",
    members: 3,
    composition: "3 CHWs with peer navigation specialization",
    lat: 34.0522,
    lng: -118.2437,
    status: "in_transit",
    patients_today: 4,
    encounters_today: 4,
    last_updated: new Date(Date.now() - 15 * 60000).toISOString(),
    current_location: "Dispatching to Skid Row Alpha support",
    pager: "213-555-0110",
    funded_by: "Health Net Grant — CHW Expansion Cohort",
  },
  {
    id: "T-USC-CARE",
    name: "ECM Care Coordination",
    county: "Los Angeles",
    region: "Citywide — CalAIM / ECM",
    type: "care_coordinator",
    lead: "Priya Nair (Care Coordinator, CalAIM ECM)",
    members: 2,
    composition: "2 Care Coordinators — CalAIM DHCS certified",
    lat: 34.0604,
    lng: -118.2993,
    status: "available",
    patients_today: 11,
    encounters_today: 11,
    last_updated: new Date(Date.now() - 10 * 60000).toISOString(),
    current_location: "Administrative — 1975 Zonal Ave, Keck USC",
    pager: "213-555-0111",
    funded_by: "CalAIM Enhanced Care Management (ECM) — DHCS",
  },

  // ─── SAN FERNANDO VALLEY EXPANSION ───────────────────────────────────────
  {
    id: "T-SFV-001",
    name: "San Fernando Valley North",
    county: "Los Angeles",
    region: "San Fernando Valley",
    type: "chw",
    lead: "Elena Torres (CHW Lead)",
    members: 3,
    composition: "NP + 2 CHWs",
    lat: 34.2011,
    lng: -118.5342,
    status: "in_transit",
    patients_today: 6,
    encounters_today: 6,
    last_updated: new Date(Date.now() - 18 * 60000).toISOString(),
    current_location: "Reseda Blvd LA River corridor",
    pager: "818-555-0201",
    funded_by: "PATH SFV Partnership / Medi-Cal POS 27",
  },
  {
    id: "T-SFV-002",
    name: "Pasadena / Arroyo Seco",
    county: "Los Angeles",
    region: "San Gabriel Valley",
    type: "peer_navigator",
    lead: "Darius King (Peer Navigator — lived expertise)",
    members: 2,
    composition: "Peer Navigator + CHW",
    lat: 34.1613,
    lng: -118.1676,
    status: "active_encounter",
    patients_today: 5,
    encounters_today: 5,
    last_updated: new Date(Date.now() - 6 * 60000).toISOString(),
    current_location: "Arroyo Seco riverbed — Pasadena",
    pager: "626-555-0202",
    funded_by: "Medi-Cal POS 27 / Pasadena Public Health Dept",
  },

  // ─── LONG BEACH / SOUTH BAY ───────────────────────────────────────────────
  {
    id: "T-LB-001",
    name: "Long Beach Harbor Unit",
    county: "Los Angeles",
    region: "South Bay — Long Beach",
    type: "physician",
    lead: "Dr. Kevin Park, MD (Family Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs",
    lat: 33.7701,
    lng: -118.1937,
    status: "available",
    patients_today: 4,
    encounters_today: 4,
    last_updated: new Date(Date.now() - 40 * 60000).toISOString(),
    current_location: "Long Beach PCH & Pacific Ave area",
    pager: "562-555-0301",
    funded_by: "Long Beach Dept of Health / Medi-Cal POS 27",
  },

  // ─── INLAND EMPIRE ────────────────────────────────────────────────────────
  {
    id: "T-IE-001",
    name: "Riverside Downtown",
    county: "Riverside",
    region: "Inland Empire West",
    type: "physician",
    lead: "Dr. Luis Mendez, MD (Family Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs",
    lat: 33.9806,
    lng: -117.3755,
    status: "active_encounter",
    patients_today: 7,
    encounters_today: 7,
    last_updated: new Date(Date.now() - 9 * 60000).toISOString(),
    current_location: "Santa Ana River bed encampment, Riverside",
    pager: "951-555-0401",
    funded_by: "Riverside County DPSS / Medi-Cal POS 27",
  },
  {
    id: "T-IE-002",
    name: "San Bernardino Central",
    county: "San Bernardino",
    region: "Inland Empire East",
    type: "chw",
    lead: "Tanya Wells (CHW)",
    members: 3,
    composition: "NP + 2 CHWs",
    lat: 34.1083,
    lng: -117.2898,
    status: "in_transit",
    patients_today: 8,
    encounters_today: 8,
    last_updated: new Date(Date.now() - 22 * 60000).toISOString(),
    current_location: "E Street corridor, San Bernardino",
    pager: "909-555-0402",
    funded_by: "San Bernardino County Dept of Behavioral Health",
  },
  {
    id: "T-IE-003",
    name: "Fontana / Ontario Area",
    county: "San Bernardino",
    region: "Inland Empire West",
    type: "physician",
    lead: "Dr. Angela Cruz, MD",
    members: 4,
    composition: "MD + RN + 2 CHWs",
    lat: 34.0922,
    lng: -117.4350,
    status: "active_encounter",
    patients_today: 6,
    encounters_today: 6,
    last_updated: new Date(Date.now() - 4 * 60000).toISOString(),
    current_location: "Arrow Blvd encampment, Fontana",
    pager: "909-555-0403",
    funded_by: "Medi-Cal POS 27 / IE Street Medicine Coalition",
  },

  // ─── SAN DIEGO ────────────────────────────────────────────────────────────
  {
    id: "T-SD-001",
    name: "Downtown SD Alpha",
    county: "San Diego",
    region: "Central San Diego",
    type: "physician",
    lead: "Dr. Fatima Malik, MD (Family Medicine)",
    members: 4,
    composition: "MD + RN + 2 CHWs",
    lat: 32.7157,
    lng: -117.1611,
    status: "active_encounter",
    patients_today: 10,
    encounters_today: 10,
    last_updated: new Date(Date.now() - 7 * 60000).toISOString(),
    current_location: "16th & Imperial Ave, East Village SD",
    pager: "619-555-0501",
    funded_by: "San Diego County BHS / Medi-Cal POS 27",
  },
  {
    id: "T-SD-002",
    name: "City Heights Outreach",
    county: "San Diego",
    region: "Central San Diego",
    type: "chw",
    lead: "Rebecca Tran (CHW Lead)",
    members: 2,
    composition: "Peer Navigator + CHW",
    lat: 32.7531,
    lng: -117.1139,
    status: "in_transit",
    patients_today: 7,
    encounters_today: 7,
    last_updated: new Date(Date.now() - 16 * 60000).toISOString(),
    current_location: "University Ave, City Heights SD",
    pager: "619-555-0502",
    funded_by: "SD County Office of Equity / Medi-Cal POS 27",
  },
  {
    id: "T-SD-003",
    name: "National City / South SD",
    county: "San Diego",
    region: "South San Diego",
    type: "physician",
    lead: "Dr. Hector Rios, MD",
    members: 4,
    composition: "MD + RN + 2 CHWs",
    lat: 32.6781,
    lng: -117.0992,
    status: "active_encounter",
    patients_today: 6,
    encounters_today: 6,
    last_updated: new Date(Date.now() - 11 * 60000).toISOString(),
    current_location: "National City riverbed camp",
    pager: "619-555-0503",
    funded_by: "Medi-Cal POS 27 / SD Regional Task Force on Homelessness",
  },
];

router.get("/teams", (req, res) => {
  const countyFilter = ((req.query.county as string) ?? "").toLowerCase().trim();
  const teams = countyFilter
    ? TEAMS.filter((t) => t.county.toLowerCase() === countyFilter)
    : TEAMS;

  const summary = {
    total_teams: teams.length,
    active_encounter: teams.filter((t) => t.status === "active_encounter").length,
    in_transit: teams.filter((t) => t.status === "in_transit").length,
    available: teams.filter((t) => t.status === "available").length,
    offline: teams.filter((t) => t.status === "offline").length,
    patients_today: teams.reduce((sum, t) => sum + t.patients_today, 0),
  };

  const countyMap: Record<string, { teams: number; patients_today: number; active: number }> = {};
  for (const t of teams) {
    if (!countyMap[t.county]) countyMap[t.county] = { teams: 0, patients_today: 0, active: 0 };
    countyMap[t.county].teams++;
    countyMap[t.county].patients_today += t.patients_today;
    if (t.status === "active_encounter") countyMap[t.county].active++;
  }

  const by_county = Object.entries(countyMap).map(([county, stats]) => ({ county, ...stats }));

  res.json({
    teams,
    summary,
    by_county,
    as_of: new Date().toISOString(),
    program_stats: {
      monthly_visits_jan2024: 1000,
      visits_doubled_since: "July 2023",
      core_la_teams: 5,
      team_composition: "MD/NP + RN + 2 CHWs + floating staff",
      percent_housed: "30-40%",
      pos_code: "POS 27 — effective Oct 1, 2023",
      ca_programs_total: 60,
      funding: "Medi-Cal POS 27 + Health Net $1.5M grant + CalAIM ECM",
      source: "USC Keck School of Medicine — Brett Feldman, Director",
    },
  });
});

export default router;
