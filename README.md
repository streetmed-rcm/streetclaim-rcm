# StreetClaim RCM

  **Revenue Cycle Management for street medicine providers treating unhoused populations.**

  ## Features

  - **POS 27 auto-coding** — CMS CR 13314 (Outreach Site/Street, effective Oct 2023) non-facility rate applied automatically
  - **Real 2025 CMS MPFS rates** — Conversion Factor $32.3465; CPT 99211–99215 non-facility & facility RVUs
  - **California Medi-Cal TRI** — DHCS SPA 23-0035 (AB 118 / Prop 35) ≥87.5% of Medicare non-facility rate
  - **SDOH Z-code extraction** — Z59.0 (homelessness) + 11 SDOH codes auto-appended from clinical notes
  - **Power BI OData feed** — `/api/odata` — Claims, FeeSchedule, Teams, RevenueSummary, DenialRates
  - **Director field map** — Live Leaflet map of 20 teams across LA County, Inland Empire, San Diego
  - **Multi-payer rules engine** — Medi-Cal/CalAIM, Medicare FFS, Managed Care, Private

  ## Stack

  - **Frontend**: React + Vite (TypeScript)
  - **Backend**: Flask (Python) + Express (Node.js/TypeScript) — dual server
  - **Database**: PostgreSQL (Drizzle ORM) for claims; SQLite for encounters
  - **Monorepo**: pnpm workspaces

  ## Data Sources

  | Source | Description |
  |--------|-------------|
  | [CMS CY 2025 MPFS Final Rule](https://www.cms.gov/medicare/payment/fee-schedules/physician) | National unadjusted fee schedule; CF $32.3465 |
  | [CMS POS 27 — CR 13314](https://www.cms.gov/medicare/payment/fee-schedules) | Outreach Site/Street code, non-facility rate |
  | [DHCS Medi-Cal TRI — SPA 23-0035](https://www.dhcs.ca.gov/Pages/Medi-Cal-Targeted-Provider-Rate-Increases.aspx) | ≥87.5% of Medicare non-facility (Prop 35 permanent floor) |
  | Premier Inc. 2024 / Experian/Becker's 2024 | Denial rates by payer (2,100+ hospitals, 300k+ physicians) |

  ## Power BI Connection

  Point Power BI Desktop to the OData feed:
  ```
  Get Data → OData Feed → https://<your-domain>/api/odata
  ```

  Entity sets: `Claims`, `FeeSchedule`, `Teams`, `RevenueSummary`, `DenialRates`, `SdohZCodes`

  ## License

  MIT
  