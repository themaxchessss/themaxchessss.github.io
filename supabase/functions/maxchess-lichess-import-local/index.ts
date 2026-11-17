import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const SITE_ORIGIN = "https://themaxchessss.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
function reply(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store", ...extraHeaders },
  });
}
function readDefaultKey(legacyName: string, modernName: string): string {
  const legacy = Deno.env.get(legacyName);
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get(modernName) ?? "{}");
    return typeof keys.default === "string" ? keys.default : "";
  } catch {
    return "";
  }
}
function makeAdminClient(url: string, key: string) {
  const isOpaqueSecret = key.startsWith("sb_secret_");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: isOpaqueSecret ? {
      fetch: (input, init = {}) => {
        const headers = new Headers(init.headers);
        if (headers.get("Authorization") === "Bearer " + key) headers.delete("Authorization");
        return fetch(input, { ...init, headers });
      },
    } : undefined,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.headers.get("origin") !== SITE_ORIGIN) return reply({ error: "This request did not come from MaxChess." }, 403);
  if (req.method !== "POST") return reply({ error: "Use POST." }, 405);
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return reply({ error: "Sign in with Lichess first." }, 401);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publicKey = readDefaultKey("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEYS");
  const serviceKey = readDefaultKey("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS");
  if (!url || !publicKey || !serviceKey) return reply({ error: "MaxChess import service is not configured. Check its Supabase API keys." }, 503);

  const userClient = createClient(url, publicKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serverClient = makeAdminClient(url, serviceKey);

  try {
    const token = authHeader.slice(7);
    const { data: userData, error: authError } = await userClient.auth.getUser(token);
    const user = userData?.user;
    if (authError || !user) return reply({ error: "Your MaxChess sign-in expired. Sign in again." }, 401);

    const body = await req.json();
    const pgn = typeof body?.pgn === "string" ? body.pgn.trim() : "";
    const clientGameId = typeof body?.client_game_id === "string" ? body.client_game_id.trim() : "";
    if (!pgn || pgn.length > 100000 || !clientGameId || clientGameId.length > 100) {
      return reply({ error: "The completed game's PGN or game ID is missing or too large." }, 400);
    }
    if (!/^(?:\[Event\s+["'][^\r\n]*["']\]|\[Result\s+["'](?:1-0|0-1|1\/2-1\/2|\*)["']\])/m.test(pgn)) {
      return reply({ error: "MaxChess could not validate this game's PGN." }, 400);
    }

    const { data: existing, error: existingError } = await serverClient
      .from("lichess_local_game_imports")
      .select("lichess_game_id,lichess_url")
      .eq("user_id", user.id)
      .eq("client_game_id", clientGameId)
      .maybeSingle();
    if (existingError) {
      console.error("Could not check local import history:", existingError.message);
      return reply({ error: "Could not check whether this game was already imported." }, 500);
    }
    if (existing) return reply({ imported: true, already_imported: true, url: existing.lichess_url });

    const { data: tokenRow, error: tokenError } = await serverClient
      .from("lichess_oauth_tokens")
      .select("access_token,lichess_username")
      .eq("user_id", user.id)
      .maybeSingle();
    if (tokenError) {
      console.error("Could not read Lichess connection:", tokenError.message);
      return reply({ error: "Could not access your saved Lichess connection." }, 500);
    }
    if (!tokenRow?.access_token) return reply({ error: "Connect your Lichess account first using Sign in with Lichess." }, 409);

    const response = await fetch("https://lichess.org/api/import", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + tokenRow.access_token,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "User-Agent": "MaxChess (https://themaxchessss.github.io)",
      },
      body: new URLSearchParams({ pgn }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.url !== "string" || typeof result.id !== "string") {
      console.error("Lichess import failed for " + tokenRow.lichess_username + " (HTTP " + response.status + ").");
      if (response.status === 429) {
        const retryAfter = response.headers.get("Retry-After") || "60";
        return reply({ error: "Lichess is rate limiting imports. Wait before trying again.", retry_after: retryAfter }, 429, { "Retry-After": retryAfter });
      }
      return reply({ error: response.status === 401 ? "Your Lichess connection expired. Sign in with Lichess again." : "Lichess could not import this game (HTTP " + response.status + ")." }, 502);
    }

    const { error: recordError } = await serverClient.from("lichess_local_game_imports").insert({
      user_id: user.id,
      client_game_id: clientGameId,
      lichess_game_id: result.id,
      lichess_url: result.url,
    });
    if (recordError) {
      console.error("Could not record imported local game:", recordError.message);
      return reply({ imported: true, url: result.url, warning: "Game imported, but MaxChess could not save its import record." });
    }
    return reply({ imported: true, username: tokenRow.lichess_username, url: result.url });
  } catch (error) {
    console.error("Local Lichess import error:", error instanceof Error ? error.message : "unknown error");
    return reply({ error: "MaxChess could not import this game. Please try again." }, 500);
  }
});