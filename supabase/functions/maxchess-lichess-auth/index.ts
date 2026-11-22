import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_ORIGIN = "https://themaxchessss.github.io";
const CLIENT_ID = SITE_ORIGIN;
const corsHeaders = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function reply(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
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
    auth: { autoRefreshToken: false, persistSession: false },
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
  if (req.headers.get("origin") !== SITE_ORIGIN) return reply({ error: "This sign-in request did not come from MaxChess." }, 403);
  if (req.method !== "POST") return reply({ error: "Use POST for Lichess sign-in." }, 405);

  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code : "";
    const verifier = typeof body.code_verifier === "string" ? body.code_verifier : "";
    const redirectUri = typeof body.redirect_uri === "string" ? body.redirect_uri : "";
    if (!code || !verifier || redirectUri !== SITE_ORIGIN + "/" && redirectUri !== SITE_ORIGIN + "/sso-connect.html" || verifier.length < 43 || verifier.length > 128) {
      return reply({ error: "The Lichess sign-in response is incomplete. Please try again." }, 400);
    }

    const tokenResponse = await fetch("https://lichess.org/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json", "User-Agent": "MaxChess (https://themaxchessss.github.io)" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
        client_id: CLIENT_ID,
      }),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
      return reply({ error: "Lichess could not confirm the authorization. Please try signing in again." }, 401);
    }

    const accountResponse = await fetch("https://lichess.org/api/account", {
      headers: { "Authorization": "Bearer " + tokenData.access_token, "Accept": "application/json", "User-Agent": "MaxChess (https://themaxchessss.github.io)" },
    });
    const account = await accountResponse.json().catch(() => ({}));
    if (!accountResponse.ok || typeof account.id !== "string" || typeof account.username !== "string") {
      return reply({ error: "Lichess did not return a valid player profile. Please try again." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = readDefaultKey("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEYS");
    if (!supabaseUrl || !serviceKey) {
      console.error("Missing Supabase server environment configuration.");
      return reply({ error: "MaxChess sign-in is temporarily unavailable. Please try again later." }, 503);
    }
    const admin = makeAdminClient(supabaseUrl, serviceKey);

    const email = "lichess_" + account.id.toLowerCase() + "@accounts.maxchess.invalid";
    let profileName = account.username;
    if (profileName.length < 3 || profileName.length > 30) profileName = "LC" + account.id.slice(0, 28);
    const { data: nameTaken, error: nameCheckError } = await admin
      .from("profiles").select("id").eq("username", profileName).maybeSingle();
    if (nameCheckError) {
      console.error("Could not check MaxChess username:", nameCheckError.message);
      return reply({ error: "MaxChess could not prepare your player profile. Please try again." }, 500);
    }
    if (nameTaken) profileName = "LC" + account.id.slice(0, 28);

    const { error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        username: profileName,
        lichess_id: account.id,
        lichess_username: account.username,
        auth_provider: "lichess",
      },
    });
    if (createError && !/already|exists|registered/i.test(createError.message)) {
      console.error("Could not create MaxChess Lichess user:", createError.message);
      return reply({ error: "MaxChess could not create your account. Please try again." }, 500);
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = linkData?.properties?.hashed_token;
    const maxchessUserId = linkData?.user?.id;
    if (linkError || typeof tokenHash !== "string" || !tokenHash || typeof maxchessUserId !== "string") {
      console.error("Could not issue MaxChess session:", linkError?.message ?? "Missing session details");
      return reply({ error: "MaxChess could not finish signing you in. Please try again." }, 500);
    }

    const { error: tokenSaveError } = await admin.from("lichess_oauth_tokens").upsert({
      user_id: maxchessUserId,
      lichess_user_id: account.id,
      lichess_username: account.username,
      access_token: tokenData.access_token,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (tokenSaveError) {
      console.error("Could not securely save Lichess connection:", tokenSaveError.message);
      return reply({ error: "MaxChess signed in but could not enable automatic Lichess game imports. Please try signing in again." }, 500);
    }

    return reply({ token_hash: tokenHash, lichess_username: account.username, maxchess_username: profileName });
  } catch (error) {
    console.error("Lichess sign-in error:", error instanceof Error ? error.message : "unknown error");
    return reply({ error: "Something went wrong during Lichess sign-in. Please try again." }, 500);
  }
});