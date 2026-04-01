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
  lat: number;
  lng: number;
  status: TeamStatus;
  patients_today: number;
  encounters_today: number;
  last_updated: string;
  current_location: string;
  pager: string;
}

const TEAMS: Team[] = [
  // ─── LOS ANGELES COUNTY ────────────────────────────────────────────────────
  { id: "T-LA-001", name: "Skid Row Alpha", county: "Los Angeles", region: "Central LA", type: "physician", lead: "Dr. Carmen Vega", members: 3, lat: 34.0452, lng: -118.2457, status: "active_encounter", patients_today: 9, encounters_today: 9, last_updated: "2026-04-01T19:22:00", current_location: "5th & San Pedro St, Skid Row", pager: "213-555-0101" },
  { id: "T-LA-002", name: "Skid Row Bravo", county: "Los Angeles", region: "Central LA", type: "chw", lead: "Maria Santos (CHW)", members: 2, lat: 34.0438, lng: -118.2478, status: "in_transit", patients_today: 12, encounters_today: 12, last_updated: "2026-04-01T19:15:00", current_location: "6th & Alameda, Skid Row", pager: "213-555-0102" },
  { id: "T-LA-003", name: "Venice Beach Outreach", county: "Los Angeles", region: "Westside", type: "peer_navigator", lead: "Darius King (Peer Nav.)", members: 2, lat: 33.9850, lng: -118.4695, status: "available", patients_today: 5, encounters_today: 5, last_updated: "2026-04-01T18:55:00", current_location: "Venice Boardwalk, Lincoln Blvd", pager: "310-555-0103" },
  { id: "T-LA-004", name: "East LA Mobile Unit", county: "Los Angeles", region: "East LA", type: "physician", lead: "Dr. Rosa Flores", members: 4, lat: 34.0195, lng: -118.1669, status: "active_encounter", patients_today: 7, encounters_today: 7, last_updated: "2026-04-01T19:30:00", current_location: "Cesar Chavez Ave encampment", pager: "323-555-0104" },
  { id: "T-LA-005", name: "Hollywood Care Team", county: "Los Angeles", region: "Hollywood", type: "care_coordinator", lead: "Aisha Grant (Care Coord.)", members: 2, lat: 34.0928, lng: -118.3287, status: "available", patients_today: 6, encounters_today: 6, last_updated: "2026-04-01T18:40:00", current_location: "Highland Ave & Sunset Blvd", pager: "323-555-0105" },
  { id: "T-LA-006", name: "South LA Outreach", county: "Los Angeles", region: "South LA", type: "physician", lead: "Dr. James Osei", members: 3, lat: 33.9731, lng: -118.2479, status: "active_encounter", patients_today: 11, encounters_today: 11, last_updated: "2026-04-01T19:25:00", current_location: "Vermont Ave underpass, Compton Blvd", pager: "323-555-0106" },
  { id: "T-LA-007", name: "San Fernando Valley North", county: "Los Angeles", region: "San Fernando Valley", type: "chw", lead: "Elena Torres (CHW)", members: 3, lat: 34.2011, lng: -118.5342, status: "in_transit", patients_today: 8, encounters_today: 8, last_updated: "2026-04-01T19:10:00", current_location: "Reseda Blvd riverbed area", pager: "818-555-0107" },
  { id: "T-LA-008", name: "Long Beach Harbor Unit", county: "Los Angeles", region: "South Bay", type: "physician", lead: "Dr. Kevin Park", members: 3, lat: 33.7701, lng: -118.1937, status: "available", patients_today: 4, encounters_today: 4, last_updated: "2026-04-01T18:30:00", current_location: "Long Beach Poly area, PCH", pager: "562-555-0108" },
  { id: "T-LA-009", name: "Koreatown Outreach", county: "Los Angeles", region: "Central LA", type: "peer_navigator", lead: "Jin Park (Peer Nav.)", members: 2, lat: 34.0604, lng: -118.2993, status: "offline", patients_today: 3, encounters_today: 3, last_updated: "2026-04-01T16:00:00", current_location: "Last known: 8th & Vermont", pager: "213-555-0109" },
  { id: "T-LA-010", name: "Pasadena Rose Bowl", county: "Los Angeles", region: "San Gabriel Valley", type: "care_coordinator", lead: "Priya Nair (Care Coord.)", members: 2, lat: 34.1613, lng: -118.1676, status: "active_encounter", patients_today: 6, encounters_today: 6, last_updated: "2026-04-01T19:28:00", current_location: "Arroyo Seco riverbed, Pasadena", pager: "626-555-0110" },

  // ─── INLAND EMPIRE ─────────────────────────────────────────────────────────
  { id: "T-IE-001", name: "Riverside Downtown", county: "Riverside", region: "Inland Empire West", type: "physician", lead: "Dr. Luis Mendez", members: 3, lat: 33.9806, lng: -117.3755, status: "active_encounter", patients_today: 7, encounters_today: 7, last_updated: "2026-04-01T19:18:00", current_location: "Santa Ana River bed, Riverside", pager: "951-555-0201" },
  { id: "T-IE-002", name: "San Bernardino Central", county: "San Bernardino", region: "Inland Empire East", type: "chw", lead: "Tanya Wells (CHW)", members: 2, lat: 34.1083, lng: -117.2898, status: "in_transit", patients_today: 9, encounters_today: 9, last_updated: "2026-04-01T19:05:00", current_location: "E Street corridor, San Bernardino", pager: "909-555-0202" },
  { id: "T-IE-003", name: "Ontario Airport Area", county: "San Bernardino", region: "Inland Empire West", type: "peer_navigator", lead: "Marcus Bell (Peer Nav.)", members: 2, lat: 34.0633, lng: -117.6009, status: "available", patients_today: 5, encounters_today: 5, last_updated: "2026-04-01T18:50:00", current_location: "Holt Blvd encampment, Ontario", pager: "909-555-0203" },
  { id: "T-IE-004", name: "Fontana Outreach", county: "San Bernardino", region: "Inland Empire East", type: "physician", lead: "Dr. Angela Cruz", members: 3, lat: 34.0922, lng: -117.4350, status: "active_encounter", patients_today: 6, encounters_today: 6, last_updated: "2026-04-01T19:32:00", current_location: "Arrow Blvd, Fontana", pager: "909-555-0204" },
  { id: "T-IE-005", name: "Palm Springs Desert Unit", county: "Riverside", region: "Inland Empire East", type: "care_coordinator", lead: "Sam Rivera (Care Coord.)", members: 2, lat: 33.8303, lng: -116.5453, status: "offline", patients_today: 2, encounters_today: 2, last_updated: "2026-04-01T15:30:00", current_location: "Last known: downtown Palm Springs", pager: "760-555-0205" },

  // ─── SAN DIEGO COUNTY ──────────────────────────────────────────────────────
  { id: "T-SD-001", name: "Downtown SD Alpha", county: "San Diego", region: "Central San Diego", type: "physician", lead: "Dr. Fatima Malik", members: 4, lat: 32.7157, lng: -117.1611, status: "active_encounter", patients_today: 10, encounters_today: 10, last_updated: "2026-04-01T19:35:00", current_location: "16th & Imperial Ave, East Village", pager: "619-555-0301" },
  { id: "T-SD-002", name: "City Heights Outreach", county: "San Diego", region: "Central San Diego", type: "chw", lead: "Rebecca Tran (CHW)", members: 2, lat: 32.7531, lng: -117.1139, status: "in_transit", patients_today: 8, encounters_today: 8, last_updated: "2026-04-01T19:12:00", current_location: "University Ave, City Heights", pager: "619-555-0302" },
  { id: "T-SD-003", name: "El Cajon Valley Team", county: "San Diego", region: "East San Diego", type: "peer_navigator", lead: "Omar Hassan (Peer Nav.)", members: 2, lat: 32.7948, lng: -116.9625, status: "available", patients_today: 4, encounters_today: 4, last_updated: "2026-04-01T18:45:00", current_location: "Main St, El Cajon", pager: "619-555-0303" },
  { id: "T-SD-004", name: "National City Border", county: "San Diego", region: "South San Diego", type: "physician", lead: "Dr. Hector Rios", members: 3, lat: 32.6781, lng: -117.0992, status: "active_encounter", patients_today: 7, encounters_today: 7, last_updated: "2026-04-01T19:20:00", current_location: "National City riverbed camp", pager: "619-555-0304" },
  { id: "T-SD-005", name: "North County Escondido", county: "San Diego", region: "North San Diego", type: "care_coordinator", lead: "Jennifer Walsh (Care Coord.)", members: 2, lat: 33.1192, lng: -117.0864, status: "available", patients_today: 5, encounters_today: 5, last_updated: "2026-04-01T18:58:00", current_location: "Grand Ave, Escondido", pager: "760-555-0305" },
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
  });
});

export default router;
