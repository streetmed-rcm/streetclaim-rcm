/**
 * athenahealth OAuth 2.0 — Authorization Code Flow
 *
 * Separate from the existing client_credentials flow in athenaAuth.ts.
 * This flow is used when a clinician needs to authenticate as themselves
 * (user-delegated access) rather than the application acting on its own.
 *
 * Reference: athenahealth API 2026 — Sandbox Preview Environment
 * Auth endpoint:  https://api.preview.platform.athenahealth.com/oauth2/v1/authorize
 * Token endpoint: https://api.preview.platform.athenahealth.com/oauth2/v1/token
 * Practice ID:    195900 (athenahealth sandbox standard)
 * Token validity: ~60 minutes; use refresh_token before expiry
 * Auth method:    client_secret_basic (HTTP Basic Authorization header)
 */

// ─── In-memory token store ─────────────────────────────────────────────────
// In a multi-clinician production deployment, this would be keyed per-user
// and persisted to the database or a session store (Redis).

export interface AuthCodeToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;         // Unix ms
  scope?: string;
  practiceId: string;
  connectedAt: string;       // ISO 8601
}

let _token: AuthCodeToken | null = null;
let _pendingState: string | null = null;   // CSRF state parameter

// ─── Config helpers ────────────────────────────────────────────────────────

function cfg() {
  const clientId     = process.env["ATHENA_CLIENT_ID"];
  const clientSecret = process.env["ATHENA_CLIENT_SECRET"];
  const baseUrl      = process.env["ATHENA_BASE_URL"] ?? "https://api.preview.platform.athenahealth.com";
  const practiceId   = process.env["ATHENA_PRACTICE_ID"] ?? "195900";

  if (!clientId)     throw new Error("ATHENA_CLIENT_ID not configured");
  if (!clientSecret) throw new Error("ATHENA_CLIENT_SECRET not configured");

  return { clientId, clientSecret, baseUrl, practiceId };
}

function basicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

function generateState(): string {
  // 16 random bytes → 32-char hex string
  const arr = new Uint8Array(16);
  for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Build the authorization URL and generate a CSRF state parameter.
 * Redirect the browser to the returned `url`.
 */
export function buildAuthUrl(redirectUri: string): { url: string; state: string } {
  const { clientId, baseUrl } = cfg();

  const state = generateState();
  _pendingState = state;

  const params = new URLSearchParams({
    response_type: "code",
    client_id:     clientId,
    redirect_uri:  redirectUri,
    state,
    // scope list: openid covers identity; add more as athenahealth sandbox permits
    scope: "openid",
  });

  return {
    url: `${baseUrl}/oauth2/v1/authorize?${params.toString()}`,
    state,
  };
}

/**
 * Exchange the one-time authorization code for access + refresh tokens.
 * Validates the CSRF state before making the network request.
 */
export async function exchangeCode(
  code: string,
  redirectUri: string,
  state: string,
): Promise<AuthCodeToken> {
  // --- CSRF check ---
  if (!_pendingState || state !== _pendingState) {
    throw new Error("Invalid or expired state parameter — possible CSRF attack. Please restart the login flow.");
  }
  _pendingState = null;   // consume state

  const { clientId, clientSecret, baseUrl, practiceId } = cfg();

  const response = await fetch(`${baseUrl}/oauth2/v1/token`, {
    method: "POST",
    headers: {
      Authorization:   basicAuth(clientId, clientSecret),
      "Content-Type":  "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:   "authorization_code",
      code,
      redirect_uri: redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Token exchange failed (HTTP ${response.status}): ${body}`);
  }

  const data = await response.json() as {
    access_token:  string;
    refresh_token: string;
    expires_in:    number;
    scope?:        string;
  };

  _token = {
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    expiresAt:    Date.now() + data.expires_in * 1000,
    scope:        data.scope,
    practiceId,
    connectedAt:  new Date().toISOString(),
  };

  return _token;
}

/**
 * Use the refresh_token to obtain a new access_token before the current one expires.
 * athenahealth tokens last ~60 minutes; call this at ~50 minutes to stay ahead.
 */
export async function refreshAccessToken(): Promise<AuthCodeToken> {
  if (!_token?.refreshToken) {
    throw new Error("No refresh token available — clinician must authenticate again via /athena/oauth/login.");
  }

  const { clientId, clientSecret, baseUrl, practiceId } = cfg();

  const response = await fetch(`${baseUrl}/oauth2/v1/token`, {
    method: "POST",
    headers: {
      Authorization:  basicAuth(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type:    "refresh_token",
      refresh_token: _token.refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    // Clear the invalid token so the UI shows "Not connected"
    _token = null;
    throw new Error(`Token refresh failed (HTTP ${response.status}): ${body}`);
  }

  const data = await response.json() as {
    access_token:   string;
    refresh_token?: string;
    expires_in:     number;
    scope?:         string;
  };

  _token = {
    ..._token,
    accessToken:  data.access_token,
    refreshToken: data.refresh_token ?? _token.refreshToken,
    expiresAt:    Date.now() + data.expires_in * 1000,
    scope:        data.scope ?? _token.scope,
    practiceId,
  };

  return _token;
}

/** Returns a safe (no tokens) status object for the frontend. */
export function getStatus(): {
  connected: boolean;
  expired?: boolean;
  expiresAt?: string;
  expiresInMinutes?: number;
  scope?: string;
  practiceId?: string;
  connectedAt?: string;
  environment: string;
} {
  const env = process.env["ATHENA_BASE_URL"]?.includes("preview")
    ? "sandbox (preview)"
    : "production";

  if (!_token) {
    return { connected: false, environment: env };
  }

  const now         = Date.now();
  const msLeft      = _token.expiresAt - now;
  const expired     = msLeft <= 0;

  return {
    connected:        !expired,
    expired,
    expiresAt:        new Date(_token.expiresAt).toISOString(),
    expiresInMinutes: Math.max(0, Math.floor(msLeft / 60_000)),
    scope:            _token.scope,
    practiceId:       _token.practiceId,
    connectedAt:      _token.connectedAt,
    environment:      env,
  };
}

/** Returns the raw token for use in FHIR API calls (internal only). */
export function getRawToken(): AuthCodeToken | null {
  return _token;
}

/** Clear the stored token (logout). */
export function clearToken(): void {
  _token        = null;
  _pendingState = null;
}

/**
 * Compute the redirect URI from the current request.
 * Prefers REPLIT_DEV_DOMAIN (always set in Replit), falls back to request host.
 */
export function computeRedirectUri(reqHost: string, reqProtocol: string): string {
  const replitDomain = process.env["REPLIT_DEV_DOMAIN"];
  if (replitDomain) {
    return `https://${replitDomain}/api/athena/oauth/callback`;
  }
  return `${reqProtocol}://${reqHost}/api/athena/oauth/callback`;
}
