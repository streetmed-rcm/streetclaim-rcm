interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function getConfig() {
  const clientId = process.env["ATHENA_CLIENT_ID"];
  const clientSecret = process.env["ATHENA_CLIENT_SECRET"];
  const baseUrl = process.env["ATHENA_BASE_URL"];

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error(
      "Missing Athenahealth credentials. Ensure ATHENA_CLIENT_ID, ATHENA_CLIENT_SECRET, and ATHENA_BASE_URL are set.",
    );
  }

  return { clientId, clientSecret, baseUrl };
}

async function fetchToken(): Promise<TokenCache> {
  const { clientId, clientSecret, baseUrl } = getConfig();

  const tokenUrl = `${baseUrl}/oauth2/v1/token`;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Athenahealth OAuth2 token request failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  const expiresAt = Date.now() + data.expires_in * 1000;

  return {
    accessToken: data.access_token,
    expiresAt,
  };
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const refreshThreshold = 60 * 1000;

  if (tokenCache && tokenCache.expiresAt - now > refreshThreshold) {
    return tokenCache.accessToken;
  }

  tokenCache = await fetchToken();
  return tokenCache.accessToken;
}
