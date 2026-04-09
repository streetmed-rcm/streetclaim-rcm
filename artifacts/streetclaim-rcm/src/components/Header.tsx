import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Wifi, WifiOff, Map, BarChart2, Home, Menu, X, Plug, PieChart,
  Thermometer, ShoppingCart, ClipboardList, BookOpen, Landmark,
  FileText, Link2, Zap, LogIn,
} from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Dashboard", icon: <Home className="w-3.5 h-3.5" /> },
  { href: "/field-map", label: "Director Map", icon: <Map className="w-3.5 h-3.5" /> },
  { href: "/revenue-lift", label: "Revenue Lift", icon: <BarChart2 className="w-3.5 h-3.5" /> },
  { href: "/daily-report", label: "Daily Report", icon: <FileText className="w-3.5 h-3.5" /> },
  { href: "/bh-tracker", label: "BH Tracker", icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { href: "/billing-guide", label: "Billing Guide", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { href: "/dpss-outreach", label: "DPSS Outreach", icon: <Landmark className="w-3.5 h-3.5" /> },
  { href: "/hrvm", label: "HRVM Score", icon: <Thermometer className="w-3.5 h-3.5" /> },
  { href: "/hrvm-build", label: "HRVM Build", icon: <ShoppingCart className="w-3.5 h-3.5" /> },
  { href: "/hrvm-sync", label: "HRVM Sync", icon: <Link2 className="w-3.5 h-3.5" /> },
  { href: "/tableau", label: "Tableau", icon: <PieChart className="w-3.5 h-3.5" /> },
  { href: "/power-bi", label: "Power BI", icon: <Plug className="w-3.5 h-3.5" /> },
];

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Athena Live Status Badge ──────────────────────────────────────────────
// Polls /api/athena/oauth/status every 60 s.
// Shows a persistent LIVE / EXPIRED / CONNECT indicator on every page so
// clinicians know at a glance whether the athenahealth data link is active.

interface AthenaStatus {
  connected: boolean;
  expired?: boolean;
  expiresInMinutes?: number;
}

function AthenaStatusBadge() {
  const [status, setStatus] = useState<AthenaStatus | null>(null);

  useEffect(() => {
    let mounted = true;

    async function poll() {
      try {
        const res = await fetch(`${BASE}/api/athena/oauth/status`);
        if (res.ok && mounted) setStatus(await res.json() as AthenaStatus);
      } catch { /* ignore — offline */ }
    }

    poll();
    const id = setInterval(poll, 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Not yet loaded — show nothing to avoid layout flicker
  if (status === null) return null;

  const live          = status.connected && !status.expired;
  const expired       = !status.connected && status.expired;
  const expiringSoon  = live && (status.expiresInMinutes ?? 60) < 10;

  if (live) {
    return (
      <span className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        expiringSoon
          ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
          : "bg-emerald-500/20 border-emerald-400/50 text-emerald-200"
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${expiringSoon ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
        {expiringSoon ? `LIVE · ${status.expiresInMinutes}m` : "LIVE"}
      </span>
    );
  }

  if (expired) {
    return (
      <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/20 border-red-400/50 text-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        EXPIRED
      </span>
    );
  }

  // Not connected — show clickable CONNECT badge
  return (
    <a
      href={`${BASE}/api/athena/oauth/login`}
      className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border bg-white/10 border-white/20 text-blue-200 hover:bg-white/20 hover:text-white transition-colors"
      title="Connect to athenahealth"
    >
      <LogIn className="w-2.5 h-2.5" />
      CONNECT
    </a>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────

export function Header() {
  const [online, setOnline] = useState(navigator.onLine);
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location]);

  return (
    <header className="sticky top-0 z-50 bg-blue-700 text-white shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/">
            <span className="font-bold text-base tracking-tight cursor-pointer select-none">
              StreetClaim <span className="text-blue-200">RCM</span>
            </span>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-0.5">
          {NAV_LINKS.map((link) => {
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <button
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    active ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.icon}
                  {link.label}
                  {link.href === "/field-map" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              </Link>
            );
          })}
        </nav>

        {/* Right side: athena status + online indicator + hamburger */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Athena live status badge — visible on all pages */}
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-blue-300 hidden sm:block" />
            <AthenaStatusBadge />
          </div>

          {/* Device online/offline */}
          <div className="flex items-center gap-1">
            {online ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-green-300" />
                <span className="text-xs text-green-300 font-medium hidden sm:block">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-300" />
                <span className="text-xs text-red-300 font-medium hidden sm:block">Offline</span>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="sm:hidden p-1.5 rounded-lg hover:bg-blue-600 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-blue-600 bg-blue-800 px-2 py-2 space-y-0.5">
          {NAV_LINKS.map((link) => {
            const active = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <button
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    active ? "bg-white/20 text-white" : "text-blue-100 hover:bg-white/10"
                  }`}
                >
                  {link.icon}
                  {link.label}
                  {link.href === "/field-map" && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
