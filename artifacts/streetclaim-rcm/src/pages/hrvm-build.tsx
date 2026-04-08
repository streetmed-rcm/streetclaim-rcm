import { useState, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShoppingCart, Zap, Shield, Wifi, Sun, BarChart2, Thermometer, CheckCircle, X, ChevronDown, ChevronUp, Send, Phone, Mail, Building2 } from "lucide-react";

// ─────────────────────────────────────────────────────────
// Model definitions
// ─────────────────────────────────────────────────────────

interface Component {
  name: string;
  spec: string;
  vendorOptions: string[];
  unitCost: string;
}

interface HrvmModel {
  id: string;
  tier: number;
  name: string;
  tagline: string;
  imagePath: string;
  price: number;
  priceLabel: string;
  color: string;
  badge: string;
  badgeColor: string;
  capacity: string;
  footprint: string;
  power: string;
  connectivity: string;
  highlight: string[];
  components: Component[];
  bestFor: string;
  leadTime: string;
  vendors: Vendor[];
}

interface Vendor {
  name: string;
  specialty: string;
  contact: string;
  phone: string;
  certifications: string[];
}

const MODELS: HrvmModel[] = [
  {
    id: "virtual_kiosk",
    tier: 1,
    name: "Virtual Board Kiosk",
    tagline: "Digital harm reduction — no moving parts",
    imagePath: "/hrvm-t1-kiosk.png",
    price: 5000,
    priceLabel: "$5,000",
    color: "#2563eb",
    badge: "STARTER",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    capacity: "Digital only — no physical dispensing",
    footprint: '12" × 6" wall mount or 18" × 48" freestanding',
    power: "110V AC / PoE",
    connectivity: "WiFi + LTE failover",
    highlight: [
      "43-inch outdoor-rated display (IP65)",
      "QR code scanner for resource referrals",
      "Naloxone finder + overdose response guide",
      "Real-time service directory (shelter, clinics, food)",
      "Multi-language touch interface (EN/ES/ZH/TL)",
      "Remote content management via web portal",
    ],
    components: [
      { name: '43" Outdoor Display', spec: "IP65, 2500 nit, anti-glare, −20°C to 60°C", vendorOptions: ["LG Commercial Displays", "Samsung SMART Signage", "Peerless-AV"], unitCost: "$1,800" },
      { name: "Industrial Mini PC", spec: "Intel N100, 8GB RAM, 256GB SSD, fanless", vendorOptions: ["Cincoze", "Advantech", "Zotac ZBOX"], unitCost: "$480" },
      { name: "LTE Cellular Module", spec: "Cat-12 LTE, dual SIM, AT&T/T-Mobile certified", vendorOptions: ["Sierra Wireless", "Quectel EM12", "Cradlepoint"], unitCost: "$220" },
      { name: "2D Barcode Scanner", spec: "QR + Code 128, USB HID, IP42", vendorOptions: ["Zebra DS2208", "Honeywell Voyager", "Datalogic"], unitCost: "$95" },
      { name: "Outdoor Enclosure", spec: "NEMA 4X steel, powder-coat, tamper-proof T15 bolts", vendorOptions: ["Hoffman/nVent", "Hammond Mfg", "Bud Industries"], unitCost: "$350" },
      { name: "UPS Battery Backup", spec: "30-min backup, 150W, sealed AGM", vendorOptions: ["Tripp Lite", "CyberPower", "APC"], unitCost: "$180" },
      { name: "Content Management License", spec: "Annual SaaS — remote scheduling, analytics", vendorOptions: ["Mvix", "Screenly", "NoviSign"], unitCost: "$480/yr" },
    ],
    bestFor: "High-foot-traffic walls, bus stops, shelter entrances, clinical lobbies — rapid deployment with zero mechanical risk",
    leadTime: "3–6 weeks",
    vendors: [
      { name: "Mvix Digital Signage", specialty: "Outdoor digital kiosk end-to-end", contact: "sales@mvix.com", phone: "703-382-1838", certifications: ["UL Listed", "FCC Part 15"] },
      { name: "Peerless-AV", specialty: "Outdoor display enclosures + mounts", contact: "sales@peerless-av.com", phone: "800-865-2112", certifications: ["NEMA 4X", "IP65", "RoHS"] },
    ],
  },
  {
    id: "compact_dispenser",
    tier: 2,
    name: "Compact Dispenser Unit",
    tagline: "Secured wall-mount with physical dispensing",
    imagePath: "/hrvm-t2-compact.png",
    price: 15000,
    priceLabel: "$15,000",
    color: "#16a34a",
    badge: "ESSENTIAL",
    badgeColor: "bg-green-100 text-green-700 border-green-200",
    capacity: "20 product slots — 200 units max",
    footprint: '24" × 12" × 60" wall-mount',
    power: "110V AC",
    connectivity: "WiFi + LTE",
    highlight: [
      "20-slot spiraled coil dispensing mechanism",
      "10\" touchscreen with accessible UI",
      "Naloxone, fentanyl strips, clean supplies",
      "Anonymous access — no login required",
      "SMS/email low-inventory alerts",
      "Tamper-evident locked cabinet",
    ],
    components: [
      { name: "Coil Dispensing Mechanism", spec: "20-slot, 240V motor, anti-jam sensor, 200-unit capacity", vendorOptions: ["Crane Merchandising Systems", "USI Alliance", "Jofemar"], unitCost: "$3,200" },
      { name: '10" Touchscreen Controller', spec: "Industrial PCAP, 1280×800, -10°C to 50°C", vendorOptions: ["Elo Touch", "Advantech", "3M Touch"], unitCost: "$520" },
      { name: "Steel Cabinet", spec: "12-gauge steel, powder coat, ANSI Grade 1 lock", vendorOptions: ["MMF Industries", "Vidmar Stanley", "Equipto"], unitCost: "$1,400" },
      { name: "Inventory Controller Board", spec: "ARM Cortex-M4, slot occupancy sensors, CAN bus", vendorOptions: ["Beckhoff", "Advantech ADAM", "custom PCB"], unitCost: "$380" },
      { name: "LTE Router", spec: "Cat-6, dual SIM failover, VPN-capable", vendorOptions: ["Cradlepoint IBR600B", "Sierra RV55", "Digi WR21"], unitCost: "$340" },
      { name: "12V UPS Module", spec: "4-hour battery backup, hot-swap battery", vendorOptions: ["Minuteman", "Tripp Lite DC UPS", "Mean Well"], unitCost: "$290" },
      { name: "Cloud Management Platform", spec: "Real-time inventory, remote restock alerts, reporting", vendorOptions: ["Parlevel Systems", "365 Retail Markets", "Hometek"], unitCost: "$1,200/yr" },
    ],
    bestFor: "Health clinic walls, navigation centers, sober living residences — moderate volume, frequent restocking",
    leadTime: "6–10 weeks",
    vendors: [
      { name: "Crane Merchandising Systems", specialty: "Coil dispensing mechanisms + controllers", contact: "health@cranems.com", phone: "217-228-0300", certifications: ["UL 508A", "CE", "FDA 21 CFR Part 11"] },
      { name: "Parlevel Systems", specialty: "Vending inventory management SaaS", contact: "sales@parlevel.com", phone: "210-693-1633", certifications: ["SOC 2 Type II", "PCI DSS"] },
    ],
  },
  {
    id: "standard_hrvm",
    tier: 3,
    name: "Standard HRVM",
    tagline: "Full harm reduction vending — field standard",
    imagePath: "/hrvm-t3-standard.png",
    price: 35000,
    priceLabel: "$35,000",
    color: "#d97706",
    badge: "STANDARD",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    capacity: "60 product slots — 600 units max",
    footprint: '40" × 32" × 72" freestanding',
    power: "110V / 220V dual",
    connectivity: "WiFi + LTE + Ethernet",
    highlight: [
      "60-slot multi-temperature dispensing",
      "Refrigerated compartment for biologics/sharps",
      "15\" accessible touchscreen (ADA compliant)",
      "Integrated Narcan station with instructions",
      "HL7/FHIR encounter logging per dispense",
      "Visual + audio low-stock alerts",
      "Accepts anonymous ID scan or QR wallet",
    ],
    components: [
      { name: "60-Slot Modular Dispensing Assembly", spec: "Elevator + coil hybrid, 600-unit cap, servo motors", vendorOptions: ["Crane Merchandising", "Seaga", "Automated Merchandising Systems"], unitCost: "$9,500" },
      { name: "Refrigerated Compartment", spec: "2–8°C, 8-slot, CFC-free R-600a, ±0.5°C control", vendorOptions: ["True Refrigeration", "Avanti Products", "Turbo Air"], unitCost: "$3,200" },
      { name: '15" ADA Touchscreen', spec: "WCAG 2.1 AA, braille keypad, 500 nit, I²C", vendorOptions: ["Elo Touch 1502L", "3M MicroTouch", "Avalue Technology"], unitCost: "$780" },
      { name: "Main Computer Module", spec: "Intel Core i5, 16GB, 512GB SSD, Ubuntu LTS", vendorOptions: ["Advantech UNO-2484G", "Kontron", "Cincoze DX-1200"], unitCost: "$1,100" },
      { name: "HL7/FHIR Logging Module", spec: "Anonymous dispense event → FHIR R4 Observation resource", vendorOptions: ["StreetClaim RCM API", "Redox", "Rhapsody"], unitCost: "$2,400/yr" },
      { name: "Cellular/WiFi Gateway", spec: "Cat-12, 802.11ax WiFi 6, Gigabit LAN, VPN", vendorOptions: ["Cradlepoint E300", "Peplink MAX 700", "Digi TX54"], unitCost: "$890" },
      { name: "Stainless Steel Cabinet", spec: "14-gauge 304 SS, ANSI Grade 1, IP54, anti-graffiti coat", vendorOptions: ["A.J. Manufacturing", "Equipto", "Republic Storage"], unitCost: "$4,200" },
      { name: "UPS + Battery Array", spec: "8-hour runtime, 500W, sealed AGM × 4, hot-swap", vendorOptions: ["Eaton 5PX", "Vertiv Liebert", "Tripp Lite SMART"], unitCost: "$1,400" },
      { name: "Inventory + Analytics Software", spec: "Real-time dashboard, low-stock push, HIPAA-compliant logs", vendorOptions: ["Parlevel", "365 Retail Markets", "Vendtek"], unitCost: "$2,400/yr" },
    ],
    bestFor: "Outdoor encampments, street medicine program hubs, county drop-in sites — high-volume continuous access",
    leadTime: "10–14 weeks",
    vendors: [
      { name: "Seaga Manufacturing", specialty: "Full HRVM cabinet + dispensing engineering", contact: "health@seaga.com", phone: "815-316-5800", certifications: ["UL Listed", "NSF", "ADA compliant"] },
      { name: "Automated Merchandising Systems", specialty: "Medical-grade dispensing systems", contact: "sales@automatedmerch.com", phone: "800-567-8387", certifications: ["FDA 21 CFR", "ISO 13485"] },
    ],
  },
  {
    id: "smart_hrvm_pro",
    tier: 4,
    name: "Smart HRVM Pro",
    tagline: "IoT-connected with real-time analytics + solar",
    imagePath: "/hrvm-t4-smart.png",
    price: 65000,
    priceLabel: "$65,000",
    color: "#7c3aed",
    badge: "PRO",
    badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
    capacity: "120 product slots — 1,200 units max",
    footprint: '48" × 36" × 78" freestanding',
    power: "Solar primary / 110V grid backup",
    connectivity: "WiFi 6 + LTE + Ethernet + BLE mesh",
    highlight: [
      "120-slot robotic arm + coil hybrid dispensing",
      "Dual-zone refrigeration (2–8°C and −15°C)",
      "21\" HD touchscreen with telehealth call button",
      "Solar panel array — fully off-grid capable",
      "Real-time inventory API (OData + FHIR R4)",
      "Biometric or QR-wallet anonymous ID",
      "Integrated sharps return collection bin",
      "On-device ML for demand forecasting",
    ],
    components: [
      { name: "Robotic Arm Dispensing System", spec: "X-Y-Z servo arm, 120-slot, 1,200-unit, ±2mm accuracy", vendorOptions: ["Jofemar Vision ES Plus", "Crane Evolution", "N&W Global Vending"], unitCost: "$18,000" },
      { name: "Dual-Zone Refrigeration", spec: "2–8°C and −15°C, 12-slot each, CFC-free, IoT temp sensor", vendorOptions: ["Hussmann Condenser", "True Refrigeration", "Viessmann Coolmatic"], unitCost: "$5,800" },
      { name: '21" Industrial HD Display', spec: "1920×1080, 1000 nit, capacitive 10-pt touch, IK10 vandal-proof", vendorOptions: ["Datec Panel PC", "Avalue EC-W21A", "Advantech FPM-221"], unitCost: "$1,600" },
      { name: "Solar Array + MPPT Controller", spec: "2× 200W monocrystalline, MPPT charge controller, IP67", vendorOptions: ["Renogy 200W", "SunPower SPR-MAX3", "Victron SmartSolar"], unitCost: "$1,200" },
      { name: "LiFePO4 Battery Bank", spec: "48V 200Ah (9.6kWh), BMS, 3,000+ cycle life", vendorOptions: ["Battle Born BBGC2", "RELiON RB200-LT", "Victron Energy"], unitCost: "$3,400" },
      { name: "Edge AI Computer", spec: "NVIDIA Jetson Orin NX, 16GB, 256GB NVMe — demand forecasting", vendorOptions: ["NVIDIA Jetson", "Advantech MIC-730", "Neousys Nuvo-9000"], unitCost: "$1,800" },
      { name: "Real-Time Inventory API Module", spec: "OData 4.0 + FHIR R4, StreetClaim RCM integration", vendorOptions: ["StreetClaim RCM API (built-in)", "Redox", "Azure API Management"], unitCost: "$3,600/yr" },
      { name: "Sharps Return Bin", spec: "10-gallon biohazard, auto-seal, tamper-evident, sensor", vendorOptions: ["Sharps Compliance", "Becton Dickinson", "Stericycle SafeDrop"], unitCost: "$640" },
      { name: "BLE Mesh Controller", spec: "nRF52840, Bluetooth 5.2 mesh for multi-unit coordination", vendorOptions: ["Nordic Semi DK", "Laird DVK-BL5340", "u-blox ODIN-W262"], unitCost: "$380" },
      { name: "Heavy-Duty Stainless Cabinet", spec: "12-gauge 316L SS, IK10, IP56, anti-graffiti nano-coat", vendorOptions: ["Extreme CCTV", "A.J. Manufacturing", "Salsbury Industries"], unitCost: "$6,200" },
    ],
    bestFor: "High-risk outdoor encampments, mobile HRVM trailer programs, county pilot sites with data reporting requirements",
    leadTime: "14–20 weeks",
    vendors: [
      { name: "Jofemar Corporation", specialty: "Robotic arm vending + medical dispensing", contact: "jofemar-usa@jofemar.com", phone: "+1 800-455-6362", certifications: ["CE", "TÜV", "UL", "ISO 9001"] },
      { name: "Crane NMS (National Merchants)", specialty: "Smart vending IoT platform + hardware", contact: "nms@cranems.com", phone: "800-942-5765", certifications: ["PCI DSS", "SOC 2", "FDA 21 CFR Part 11"] },
    ],
  },
  {
    id: "enterprise_hub",
    tier: 5,
    name: "Enterprise HRVM Hub",
    tagline: "Large-format solar hub with telehealth + API",
    imagePath: "/hrvm-t5-enterprise.png",
    price: 120000,
    priceLabel: "$120,000",
    color: "#b91c1c",
    badge: "ENTERPRISE",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    capacity: "200+ product slots — 2,400+ units max",
    footprint: '96" × 48" × 84" — modular pod format',
    power: "Solar + grid + generator backup",
    connectivity: "Fiber / LTE / Starlink-ready + BLE mesh",
    highlight: [
      "200+ slot modular pod dispensing — field expandable",
      "Triple-zone climate control (cold chain + cryo + ambient)",
      "27\" telehealth-enabled HD kiosk with privacy screen",
      "Starlink satellite + LTE + fiber triple WAN",
      "Multi-party encounter verification (caregiver co-sign)",
      "Integrated biometric + DID anonymous identity layer",
      "Full OData + FHIR R4 + HL7 ADT real-time feed",
      "On-site solar + 20kWh battery — 48-hour off-grid",
      "ECM referral trigger on first dispense",
    ],
    components: [
      { name: "Modular 200-Slot Pod System", spec: "4× 50-slot pod, field-expandable, elevator + coil + robotic mix", vendorOptions: ["Crane Modular Vending", "Automated Merchandising", "Custom OEM"], unitCost: "$38,000" },
      { name: "Triple-Zone Climate System", spec: "2–8°C / −15°C / −80°C cryo; independent compressors, IoT", vendorOptions: ["True Refrigeration", "Thermo Scientific", "Follett Corp"], unitCost: "$14,000" },
      { name: '27" Telehealth Kiosk Screen', spec: "4K IPS, 1200 nit, privacy filter, integrated camera + mic", vendorOptions: ["Mimo Monitors", "Mimo Vue", "Barco ClickShare"], unitCost: "$3,200" },
      { name: "Triple-WAN Gateway", spec: "Starlink maritime + LTE Cat-20 + Gigabit WAN, SD-WAN failover", vendorOptions: ["Peplink MAX HD4", "Cradlepoint AER2200", "Fortinet FortiWAN"], unitCost: "$4,800" },
      { name: "Solar + Battery Microgrid", spec: "8× 400W panels, 20kWh LiFePO4, bi-directional inverter", vendorOptions: ["SolarEdge StorEdge", "Enphase IQ8", "Victron Quattro 48/10000"], unitCost: "$18,000" },
      { name: "Server Blade — Edge Compute", spec: "Intel Xeon E-2400, 64GB ECC RAM, 2TB NVMe RAID, Ubuntu", vendorOptions: ["Supermicro SYS-E300", "Kontron MECS-5112", "Dell PowerEdge XR2"], unitCost: "$6,400" },
      { name: "DID / Biometric Identity Module", spec: "Decentralized Identifier, fingerprint + face match, FIDO2 certified", vendorOptions: ["Dock.io", "Evernym", "1Kosmos BlockID"], unitCost: "$4,000/yr" },
      { name: "Multi-Party Verification Layer", spec: "Caregiver co-sign, blockchain attestation, FHIR Provenance resource", vendorOptions: ["StreetClaim RCM API (built-in)", "Avaneer Health", "Fabric Health"], unitCost: "$6,000/yr" },
      { name: "HL7/FHIR/OData Integration Suite", spec: "FHIR R4, HL7 v2.x ADT, OData 4.0, StreetClaim RCM native", vendorOptions: ["StreetClaim RCM API (built-in)", "Rhapsody", "Mirth Connect"], unitCost: "$8,400/yr" },
      { name: "Sharps + Biohazard Return Station", spec: "25-gallon auto-seal, sensor + alert, scheduled pickup scheduling", vendorOptions: ["Sharps Compliance", "Stericycle", "BioMedical Systems"], unitCost: "$1,800" },
      { name: "Structural Pod Enclosure", spec: "Aircraft-grade 6061 aluminum frame, SS panels, IK11, IP57", vendorOptions: ["AMSEC", "Paladin Attachments", "Custom Enclosures Inc."], unitCost: "$22,000" },
    ],
    bestFor: "County HRVM anchor sites, mobile medical clinics, multi-agency coordinated care hubs requiring full data integration and off-grid capability",
    leadTime: "20–28 weeks",
    vendors: [
      { name: "Automated Merchandising Systems", specialty: "Enterprise medical dispensing — large format", contact: "enterprise@automatedmerch.com", phone: "800-567-8387", certifications: ["ISO 13485", "FDA 21 CFR", "CE", "UL"] },
      { name: "SolarEdge Technologies", specialty: "Solar + battery microgrid for outdoor kiosks", contact: "us-commercial@solaredge.com", phone: "510-498-3200", certifications: ["UL 9540", "IEC 62109", "IEEE 1547"] },
      { name: "Peplink / InControl", specialty: "SD-WAN + Starlink multi-WAN connectivity", contact: "sales@peplink.com", phone: "408-935-6602", certifications: ["FCC", "CE", "PTCRB"] },
    ],
  },
];

// ─────────────────────────────────────────────────────────
// RFQ Form
// ─────────────────────────────────────────────────────────

interface RfqForm {
  org: string;
  contact: string;
  email: string;
  phone: string;
  model: string;
  qty: string;
  city: string;
  notes: string;
}

const EMPTY_FORM: RfqForm = { org: "", contact: "", email: "", phone: "", model: "", qty: "1", city: "", notes: "" };

function RfqModal({ model, onClose }: { model: HrvmModel | null; onClose: () => void }) {
  const [form, setForm] = useState<RfqForm>({ ...EMPTY_FORM, model: model?.id ?? "" });
  const [sent, setSent] = useState(false);

  if (!model) return null;

  function set(k: keyof RfqForm, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // In production this would POST to /api/hrvm/rfq
    setSent(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200" style={{ borderTop: `4px solid ${model.color}` }}>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Request for Quote</p>
            <p className="text-lg font-bold text-gray-900">{model.name}</p>
            <p className="text-sm font-semibold" style={{ color: model.color }}>{model.priceLabel} per unit</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-12 text-center space-y-3">
            <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
            <p className="text-xl font-bold text-gray-900">RFQ Submitted</p>
            <p className="text-sm text-gray-500">
              A vendor specialist will contact <strong>{form.email}</strong> within 1–2 business days
              with a formal quote for <strong>{form.qty}× {model.name}</strong>.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Organization Name *</label>
                <input required value={form.org} onChange={e => set("org", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="LA County DHS, CityHeart, etc." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact Name *</label>
                <input required value={form.contact} onChange={e => set("contact", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="First Last" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                <input value={form.phone} onChange={e => set("phone", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="213-555-0100" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@organization.org" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Model</label>
                <select value={form.model} onChange={e => set("model", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {MODELS.map(m => <option key={m.id} value={m.id}>{m.name} — {m.priceLabel}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity</label>
                <input type="number" min="1" value={form.qty} onChange={e => set("qty", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Deployment City / Site</label>
                <input value={form.city} onChange={e => set("city", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Compton, CA — intersection of Wilmington Ave & Alondra Blvd" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Additional Notes</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Funding source, CalAIM ECM grant, special requirements..." />
              </div>
            </div>
            <div className="pt-2">
              <button type="submit"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-bold transition-colors"
                style={{ background: model.color }}>
                <Send className="w-4 h-4" />
                Submit RFQ to Vendor Network
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">Response within 1–2 business days · No obligation</p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Component breakdown table
// ─────────────────────────────────────────────────────────

function ComponentTable({ components }: { components: Component[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors"
      >
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {open ? "Hide" : "Show"} component breakdown ({components.length} parts)
      </button>
      {open && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Component</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Spec</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide">Approved Vendors</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase tracking-wide">Unit Cost</th>
              </tr>
            </thead>
            <tbody>
              {components.map((c, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800">{c.name}</td>
                  <td className="px-3 py-2 text-gray-500 hidden md:table-cell max-w-xs">{c.spec}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {c.vendorOptions.map(v => (
                        <span key={v} className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-medium border border-blue-100">{v}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-gray-700">{c.unitCost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Model Card
// ─────────────────────────────────────────────────────────

const TIER_DIFFERENTIATORS: Record<string, { icon: ReactNode; label: string }[]> = {
  virtual_kiosk: [
    { icon: <Wifi className="w-3 h-3" />, label: "Digital display only" },
    { icon: <Zap className="w-3 h-3" />, label: "No mechanical parts" },
    { icon: <Shield className="w-3 h-3" />, label: "QR + multi-language" },
  ],
  compact_dispenser: [
    { icon: <ShoppingCart className="w-3 h-3" />, label: "20-slot physical dispense" },
    { icon: <Wifi className="w-3 h-3" />, label: "Cloud inventory alerts" },
    { icon: <Shield className="w-3 h-3" />, label: "Tamper-proof lock" },
  ],
  standard_hrvm: [
    { icon: <Thermometer className="w-3 h-3" />, label: "Refrigerated compartment" },
    { icon: <Shield className="w-3 h-3" />, label: "ADA compliant display" },
    { icon: <BarChart2 className="w-3 h-3" />, label: "FHIR R4 dispense log" },
  ],
  smart_hrvm_pro: [
    { icon: <Sun className="w-3 h-3" />, label: "Solar + off-grid battery" },
    { icon: <Zap className="w-3 h-3" />, label: "Robotic arm dispensing" },
    { icon: <BarChart2 className="w-3 h-3" />, label: "On-device AI forecasting" },
  ],
  enterprise_hub: [
    { icon: <Wifi className="w-3 h-3" />, label: "Starlink + LTE + fiber" },
    { icon: <Building2 className="w-3 h-3" />, label: "200+ slot modular pods" },
    { icon: <Shield className="w-3 h-3" />, label: "Telehealth + DID biometric" },
  ],
};

function ModelCard({ model, onRfq }: { model: HrvmModel; onRfq: (m: HrvmModel) => void }) {
  const differentiators = TIER_DIFFERENTIATORS[model.id] ?? [];
  return (
    <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-shadow" style={{ borderColor: model.color + "44" }}>
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: model.color }} />

      {/* Model image */}
      <div className="relative overflow-hidden bg-gray-100" style={{ height: 220 }}>
        <img
          src={model.imagePath}
          alt={model.name}
          className="w-full h-full object-cover object-center"
        />
        {/* Tier badge overlay */}
        <div className="absolute top-3 left-3">
          <span className={`text-[10px] px-2 py-1 rounded-full font-bold border shadow-sm ${model.badgeColor}`}>
            TIER {model.tier} · {model.badge}
          </span>
        </div>
        {/* Price overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3"
          style={{ background: `linear-gradient(to top, ${model.color}ee, transparent)` }}>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-white font-black text-2xl leading-none">{model.priceLabel}</p>
              <p className="text-white/70 text-xs">per unit</p>
            </div>
            <div className="flex gap-1.5">
              {differentiators.map(d => (
                <div key={d.label} className="flex items-center gap-1 bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-2 py-0.5">
                  <span className="text-white">{d.icon}</span>
                  <span className="text-white text-[10px] font-semibold whitespace-nowrap hidden sm:block">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <CardHeader className="pb-3 pt-4">
        <div>
          <CardTitle className="text-lg font-bold text-gray-900">{model.name}</CardTitle>
          <CardDescription className="text-sm">{model.tagline}</CardDescription>
        </div>

        {/* Key differentiators — mobile-friendly row */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {differentiators.map(d => (
            <span key={d.label} className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
              style={{ color: model.color, borderColor: model.color + "44", background: model.color + "0d" }}>
              {d.icon}{d.label}
            </span>
          ))}
        </div>

        {/* Quick specs */}
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
          <span><strong className="text-gray-700">Capacity:</strong> {model.capacity}</span>
          <span><strong className="text-gray-700">Footprint:</strong> {model.footprint}</span>
          <span><strong className="text-gray-700">Power:</strong> {model.power}</span>
          <span><strong className="text-gray-700">Lead time:</strong> {model.leadTime}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Feature highlights */}
        <ul className="space-y-1">
          {model.highlight.map(h => (
            <li key={h} className="flex items-start gap-2 text-xs text-gray-700">
              <CheckCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: model.color }} />
              {h}
            </li>
          ))}
        </ul>

        {/* Best for */}
        <div className="rounded-md px-3 py-2.5 text-xs" style={{ background: model.color + "11", borderLeft: `3px solid ${model.color}` }}>
          <p className="font-semibold text-gray-700 mb-0.5">Best for</p>
          <p className="text-gray-600">{model.bestFor}</p>
        </div>

        {/* Component breakdown toggle */}
        <ComponentTable components={model.components} />

        {/* Approved vendors */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Primary Vendors</p>
          <div className="space-y-2">
            {model.vendors.map(v => (
              <div key={v.name} className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50 text-xs">
                <div>
                  <p className="font-semibold text-gray-800">{v.name}</p>
                  <p className="text-gray-500">{v.specialty}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {v.certifications.map(c => (
                      <span key={c} className="px-1 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <a href={`mailto:${v.contact}`} className="flex items-center gap-1 text-blue-600 hover:underline justify-end">
                    <Mail className="w-3 h-3" />{v.contact}
                  </a>
                  <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-gray-500 hover:underline justify-end">
                    <Phone className="w-3 h-3" />{v.phone}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RFQ Button */}
        <button
          onClick={() => onRfq(model)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-bold hover:opacity-90 transition-opacity"
          style={{ background: model.color }}
        >
          <ShoppingCart className="w-4 h-4" />
          Request Quote — {model.priceLabel}
        </button>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function HrvmBuildPage() {
  const [rfqModel, setRfqModel] = useState<HrvmModel | null>(null);
  const [filterTier, setFilterTier] = useState<number | null>(null);

  const displayed = filterTier ? MODELS.filter(m => m.tier === filterTier) : MODELS;

  return (
    <div className="bg-gray-50 min-h-screen pb-12">

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white px-6 py-10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-white/20 border border-white/30">
              HRVM BUILD PROGRAM
            </span>
          </div>
          <h1 className="text-3xl font-black mb-2">Harm Reduction Vending Machine Builder</h1>
          <p className="text-blue-200 text-sm max-w-2xl">
            Select a model tier, review components and approved vendors, then submit an RFQ directly to the vendor network.
            All models integrate with the StreetClaim RCM OData + FHIR R4 API for real-time inventory and ECM trigger events.
          </p>

          {/* Tier summary pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setFilterTier(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                filterTier === null ? "bg-white text-blue-700" : "border-white/40 text-white hover:bg-white/10"
              }`}
            >
              All 5 Models
            </button>
            {MODELS.map(m => (
              <button
                key={m.id}
                onClick={() => setFilterTier(m.tier === filterTier ? null : m.tier)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                  filterTier === m.tier ? "bg-white text-blue-700" : "border-white/40 text-white hover:bg-white/10"
                }`}
              >
                T{m.tier}: {m.name} — {m.priceLabel}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison strip */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 overflow-x-auto">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-6 min-w-max text-xs text-gray-600">
            {MODELS.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color }} />
                <span className="font-semibold" style={{ color: m.color }}>{m.priceLabel}</span>
                <span className="text-gray-400">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Model grid */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayed.map(model => (
            <ModelCard key={model.id} model={model} onRfq={setRfqModel} />
          ))}
        </div>

        {/* Integration callout */}
        <div className="mt-10 rounded-xl bg-blue-50 border border-blue-200 px-6 py-5">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-bold text-blue-900 mb-1">StreetClaim RCM Integration — Built Into Every Model</p>
              <p className="text-xs text-blue-700">
                Every HRVM tier is pre-wired for the StreetClaim RCM OData 4.0 + FHIR R4 API.
                Each dispense event can trigger an anonymous ECM screening, log an SDOH interaction,
                and push inventory data to Power BI or Tableau in real time.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { icon: <Wifi className="w-4 h-4 text-blue-600" />, label: "OData 4.0 live feed" },
                { icon: <Shield className="w-4 h-4 text-green-600" />, label: "FHIR R4 Observation log" },
                { icon: <Zap className="w-4 h-4 text-amber-600" />, label: "ECM trigger on dispense" },
                { icon: <BarChart2 className="w-4 h-4 text-purple-600" />, label: "Power BI / Tableau ready" },
                { icon: <Sun className="w-4 h-4 text-orange-500" />, label: "Solar-capable (T4 & T5)" },
                { icon: <Building2 className="w-4 h-4 text-gray-600" />, label: "CalAIM ECM billing trigger" },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-gray-700">
                  {item.icon}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-gray-400">
          Prices are estimated per-unit FOB. Final quotes depend on quantity, site conditions, installation, and configuration.
          Lead times are from purchase order to delivery. StreetClaim RCM does not manufacture hardware — we connect MSOs to vetted vendors.
        </p>
      </div>

      {/* RFQ Modal */}
      {rfqModel && <RfqModal model={rfqModel} onClose={() => setRfqModel(null)} />}
    </div>
  );
}
