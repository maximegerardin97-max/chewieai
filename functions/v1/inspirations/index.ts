import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ANON_KEY;
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") || "";

// ---------- Helpers ----------
function normalize(s) {
  return s.toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

function keyFor(app, flow) {
  return `${normalize(app)}|${normalize(flow)}`;
}

// Dust -> Supabase exact names (use the folder names you have in Storage / flows)
// Left side: Dust free text; Right side: exact App / Flow used in Storage: "flows/<App> <Flow>/NN.png"
const MAP = new Map([
  // Duolingo
  [
    keyFor("duolingo", "onboarding"),
    {
      app: "Duolingo iOS",
      flow: "Onboarding"
    }
  ],
  [
    keyFor("duolingo", "creating a profile"),
    {
      app: "Duolingo iOS",
      flow: "Creating a profile"
    }
  ],
  [
    keyFor("duolingo", "completing a lesson"),
    {
      app: "Duolingo iOS",
      flow: "Completing a lesson"
    }
  ],
  [
    keyFor("duolingo", "completing the first lesson"),
    {
      app: "Duolingo iOS",
      flow: "Completing the first lesson"
    }
  ],
  [
    keyFor("duolingo", "leaderboard"),
    {
      app: "Duolingo iOS",
      flow: "Leaderboard"
    }
  ],
  [
    keyFor("duolingo", "streak"),
    {
      app: "Duolingo iOS",
      flow: "Streak"
    }
  ],
  [
    keyFor("duolingo", "subscribing to super"),
    {
      app: "Duolingo iOS",
      flow: "Subscribing to Super"
    }
  ],
  // Headspace
  [
    keyFor("headspace", "onboarding"),
    {
      app: "Headspace iOS",
      flow: "Onboarding"
    }
  ],
  [
    keyFor("headspace", "profile"),
    {
      app: "Headspace iOS",
      flow: "Profile"
    }
  ],
  [
    keyFor("headspace", "today"),
    {
      app: "Headspace iOS",
      flow: "Today"
    }
  ],
  [
    keyFor("headspace", "starting a course"),
    {
      app: "Headspace iOS",
      flow: "Starting a course"
    }
  ],
  [
    keyFor("headspace", "joining a program"),
    {
      app: "Headspace iOS",
      flow: "Joining a program"
    }
  ],
  [
    keyFor("headspace", "completing a session"),
    {
      app: "Headspace iOS",
      flow: "Completing a session"
    }
  ],
  [
    keyFor("headspace", "canceling a subscription"),
    {
      app: "Headspace iOS",
      flow: "Canceling a subscription"
    }
  ],
  // Spotify
  [
    keyFor("spotify", "onboarding"),
    {
      app: "Spotify iOS",
      flow: "Onboarding"
    }
  ],
  [
    keyFor("spotify", "listening to a song"),
    {
      app: "Spotify iOS",
      flow: "Listening to a song"
    }
  ],
  [
    keyFor("spotify", "browse music"),
    {
      app: "Spotify iOS",
      flow: "Browse music"
    }
  ],
  [
    keyFor("spotify", "browse podcasts"),
    {
      app: "Spotify iOS",
      flow: "Browse podcasts"
    }
  ],
  [
    keyFor("spotify", "creating a new playlist"),
    {
      app: "Spotify iOS",
      flow: "Creating a new playlist"
    }
  ],
  [
    keyFor("spotify", "inviting collaborators to a playlist"),
    {
      app: "Spotify iOS",
      flow: "Inviting collaborators to a playlist"
    }
  ],
  [
    keyFor("spotify", "view artist profile"),
    {
      app: "Spotify iOS",
      flow: "View artist profile"
    }
  ],
  [
    keyFor("spotify", "your library"),
    {
      app: "Spotify iOS",
      flow: "Your library"
    }
  ],
  [
    keyFor("spotify", "watching spotify wrapped"),
    {
      app: "Spotify iOS",
      flow: "Watching Spotify Wrapped"
    }
  ],
  [
    keyFor("spotify", "browse spotify wrapped collection"),
    {
      app: "Spotify iOS",
      flow: "Browse Spotify Wrapped collection"
    }
  ],
  [
    keyFor("spotify", "searching spotify"),
    {
      app: "Spotify iOS",
      flow: "Searching Spotify"
    }
  ],
  [
    keyFor("spotify", "subscribe to spotify premium"),
    {
      app: "Spotify iOS",
      flow: "Subscribe to Spotify Premium"
    }
  ],
  [
    keyFor("spotify", "adding songs to a playlist"),
    {
      app: "Spotify iOS",
      flow: "Adding songs to a playlist"
    }
  ],
  // Tinder
  [
    keyFor("tinder", "onboarding"),
    {
      app: "Tinder iOS",
      flow: "Onboarding"
    }
  ],
  [
    keyFor("tinder", "view a profile"),
    {
      app: "Tinder iOS",
      flow: "View a profile"
    }
  ],
  [
    keyFor("tinder", "messages"),
    {
      app: "Tinder iOS",
      flow: "Messages"
    }
  ],
  [
    keyFor("tinder", "my subscription"),
    {
      app: "Tinder iOS",
      flow: "My subscription"
    }
  ],
  [
    keyFor("tinder", "sending a message"),
    {
      app: "Tinder iOS",
      flow: "Sending a message"
    }
  ],
  [
    keyFor("tinder", "setting up account"),
    {
      app: "Tinder iOS",
      flow: "Setting up account"
    }
  ],
  [
    keyFor("tinder", "subscribing to tinder plus"),
    {
      app: "Tinder iOS",
      flow: "Subscribing to Tinder Plus"
    }
  ],
  [
    keyFor("tinder", "swiping for a match"),
    {
      app: "Tinder iOS",
      flow: "Swiping for a match"
    }
  ],
  // Uber
  [
    keyFor("uber", "onboarding"),
    {
      app: "Uber iOS",
      flow: "Onboarding"
    }
  ],
  [
    keyFor("uber", "home"),
    {
      app: "Uber iOS",
      flow: "Home"
    }
  ],
  [
    keyFor("uber", "booking a ride"),
    {
      app: "Uber iOS",
      flow: "Booking a ride"
    }
  ],
  [
    keyFor("uber", "reserving a ride"),
    {
      app: "Uber iOS",
      flow: "Reserving a ride"
    }
  ],
  [
    keyFor("uber", "scan to ride"),
    {
      app: "Uber iOS",
      flow: "Scan to ride"
    }
  ],
  [
    keyFor("uber", "2-wheels"),
    {
      app: "Uber iOS",
      flow: "2-wheels"
    }
  ],
  [
    keyFor("uber", "uber eats"),
    {
      app: "Uber iOS",
      flow: "Uber Eats"
    }
  ]
]);

function mapDustToSupabase(app, flow) {
  const m = MAP.get(keyFor(app, flow));
  if (m) return m;
  return {
    app,
    flow
  };
}

function numerically(a, b) {
  const ax = a.replace(/[^0-9]/g, "");
  const bx = b.replace(/[^0-9]/g, "");
  const ai = ax ? parseInt(ax, 10) : 0;
  const bi = bx ? parseInt(bx, 10) : 0;
  if (ai !== bi) return ai - bi;
  return a.localeCompare(b);
}

async function listStorage(prefix) {
  const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/list/flows`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: {
        column: "name",
        order: "asc"
      }
    })
  });
  if (!resp.ok) return [];
  const arr = await resp.json();
  return arr;
}

// Create a short-lived signed URL for a storage object so images render even if the bucket is private
async function signStorageObject(objectPath) {
  const signRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/flows/${encodeURI(objectPath)}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ expiresIn: 60 * 60 }) // 1 hour
  });
  if (!signRes.ok) {
    return null;
  }
  const data = await signRes.json();
  // Endpoint returns { signedURL: "/storage/v1/object/sign/..." }
  const relative = data?.signedURL;
  return relative ? `${SUPABASE_URL}${relative}` : null;
}

// Perplexity search function
async function searchPerplexity(app, flow) {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a design research assistant. Find web pages that contain mobile app screenshots and design examples. Return JSON with clickable URLs to design websites, Dribbble shots, Behance projects, or app store pages that show the requested app designs.'
          },
          {
            role: 'user',
            content: `Find 5 web pages that show ${app} ${flow} mobile app screenshots and designs. Look for Dribbble shots, Behance projects, app store pages, or design websites. Return JSON {"sources": [{"title": "Page Title", "url": "https://example.com", "description": "Brief description"}]}.`
          }
        ],
        max_tokens: 400,
        temperature: 0.2
      })
    });
    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    // Remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
    try {
      const parsed = JSON.parse(cleanContent);
      return Array.isArray(parsed.sources) ? parsed.sources.slice(0, 5) : [];
    } catch (_) {
      // fallback: extract URLs from text and create simple sources
      const urls = (content.match(/https?:[^\s)"']+/gi) || []).slice(0, 5);
      return urls.map((url, index)=>({
          title: `${app} ${flow} Design ${index + 1}`,
          url: url,
          description: `Design inspiration for ${app} ${flow}`
        }));
    }
  } catch (error) {
    console.error('Perplexity search failed:', error);
    return [];
  }
}

// ---------- HTTP entry ----------
serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: cors
  });
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return new Response(JSON.stringify({
        ok: false,
        error: "Missing SUPABASE_URL or SERVICE key"
      }), {
        status: 500,
        headers: cors
      });
    }
    const body = await req.json().catch(()=>({}));
    const recommendation = body?.recommendation ?? {};
    let app = (recommendation.app ?? "").toString().trim();
    let flow = (recommendation.flow ?? "").toString().trim();
    // free-text fallback: "duolingo onboarding"
    if ((!app || !flow) && typeof recommendation.text === "string") {
      const t = recommendation.text.toLowerCase();
      const m = t.match(/([a-z0-9 ]+)\s+([a-z0-9 ][a-z0-9 ]*)$/);
      if (m) {
        app = m[1];
        flow = m[2];
      }
    }
    if (!app) {
      return new Response(JSON.stringify({
        ok: true,
        data: []
      }), {
        headers: cors
      });
    }
    // Map Dust → exact Storage names
    const mapped = mapDustToSupabase(app, flow);
    const appExact = mapped.app;
    const flowExact = mapped.flow || "";
    const folder = flowExact ? `${appExact} ${flowExact}` : appExact; // e.g., "Duolingo iOS Onboarding"
    // Try DB first (if you keep flows/flow_screens filled)
    let flows = [];
    let screens = [];
    try {
      const appFilter = `%${appExact.toLowerCase().replaceAll(" ", "%")}%`;
      const flowFilter = `%${flowExact.toLowerCase().replaceAll(" ", "%")}%`;
      const flowsRes = await fetch(`${SUPABASE_URL}/rest/v1/flows?select=*` + `&app_name=ilike.${encodeURIComponent(appFilter)}` + `&flow_name=ilike.${encodeURIComponent(flowFilter)}`, {
        headers: {
          apikey: ANON_KEY || SERVICE_KEY,
          Authorization: `Bearer ${ANON_KEY || SERVICE_KEY}`
        }
      });
      if (flowsRes.ok) flows = await flowsRes.json();
      if (Array.isArray(flows) && flows.length > 0) {
        const orIds = flows.map((f)=>`flow_id.eq.${f.id}`).join(",");
        const screensRes = await fetch(`${SUPABASE_URL}/rest/v1/flow_screens?select=*` + `&or=(${orIds})&order=order_index.asc`, {
          headers: {
            apikey: ANON_KEY || SERVICE_KEY,
            Authorization: `Bearer ${ANON_KEY || SERVICE_KEY}`
          }
        });
        if (screensRes.ok) screens = await screensRes.json();
      }
    } catch  {}
    // If DB has screens, use them; else list Storage folder
    let payloadScreens = [];
    if (screens.length > 0) {
      const flowRow = flows[0];
      const filtered = screens.filter((s)=>s.flow_id === flowRow.id);
      payloadScreens = await Promise.all(filtered.map(async (s)=>{
        let finalUrl = s.image_url || null;
        try {
          if (typeof s.image_url === "string" && s.image_url.includes("/storage/v1/object/")) {
            const marker = "/flows/";
            const idx = s.image_url.indexOf(marker);
            if (idx !== -1) {
              const objectPath = s.image_url.substring(idx + marker.length);
              // DB may store URL-encoded names; decode before signing
              const decodedPath = decodeURIComponent(objectPath);
              const signed = await signStorageObject(decodedPath);
              if (signed) finalUrl = signed;
            }
          }
        } catch {}
        return {
          order: s.order_index,
          imageUrl: finalUrl,
          caption: s.caption ?? null
        };
      }));
    } else {
      const listed = await listStorage(folder);
      const imgs = listed.filter((f)=>/\.(png|jpg|jpeg|webp)$/i.test(f.name)).sort((a, b)=>numerically(a.name, b.name));
      // Prefer signed URLs so it works even when bucket isn't public
      const signed = await Promise.all(imgs.map(async (f, i)=>{
        // Ensure proper decoding before signing in case folder or name are URL-encoded
        const objectPath = `${folder}/${f.name}`;
        const decodedPath = decodeURIComponent(objectPath);
        const signedUrl = await signStorageObject(decodedPath);
        return {
          order: i + 1,
          imageUrl: signedUrl || `${SUPABASE_URL}/storage/v1/object/public/flows/${encodeURI(folder)}/${encodeURI(f.name)}`
        };
      }));
      payloadScreens = signed;
    }
    // If we found screens, return them
    if (payloadScreens.length > 0) {
      const data = [
        {
          id: crypto.randomUUID(),
          appName: appExact,
          flowName: flowExact,
          slug: `${encodeURI(appExact)}/${encodeURI(flowExact)}`,
          description: null,
          screens: payloadScreens
        }
      ];
      return new Response(JSON.stringify({
        ok: true,
        data
      }), {
        headers: cors
      });
    }
    // No screens found, try Perplexity search as fallback
    console.log('No data found in DB or storage, trying Perplexity search...');
    const perplexitySources = await searchPerplexity(appExact, flowExact);
    if (perplexitySources.length > 0) {
      return new Response(JSON.stringify({
        ok: true,
        data: [],
        sources: perplexitySources,
        isPerplexityFallback: true
      }), {
        headers: cors
      });
    }
    // No data found anywhere
    return new Response(JSON.stringify({
      ok: true,
      data: []
    }), {
      headers: cors
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      error: String(e)
    }), {
      status: 500,
      headers: cors
    });
  }
});