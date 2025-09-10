import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "flows";

async function uploadToStorage(path: string, file: File) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURI(path)}`;
  const r = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${SERVICE_KEY}` }, body: file });
  if (!r.ok) throw new Error(`Storage upload failed ${r.status} ${await r.text()}`);
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURI(path)}`;
}

async function upsertFlow(appName: string, flowName: string) {
  const h = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
  const sel = `${SUPABASE_URL}/rest/v1/flows?select=id&app_name=eq.${encodeURIComponent(appName)}&flow_name=eq.${encodeURIComponent(flowName)}&limit=1`;
  let r = await fetch(sel, { headers: h });
  const rows = r.ok ? await r.json() : [];
  if (rows.length) return rows[0].id as string;

  r = await fetch(`${SUPABASE_URL}/rest/v1/flows`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ app_name: appName, flow_name: flowName }),
  });
  if (!r.ok) throw new Error(`Create flow failed ${r.status} ${await r.text()}`);
  const [row] = await r.json();
  return row.id as string;
}

async function insertScreen(flowId: string, orderIndex: number, imageUrl: string, caption?: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/flow_screens`, {
    method: "POST",
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ flow_id: flowId, order_index: orderIndex, image_url: imageUrl, caption }),
  });
  if (!r.ok) throw new Error(`Insert screen failed ${r.status} ${await r.text()}`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const ct = req.headers.get("content-type") || "";
    if (!ct.includes("multipart/form-data")) {
      return new Response(JSON.stringify({ ok: false, error: "Use multipart/form-data" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const form = await req.formData();
    const appName = String(form.get("appName") || "").trim();
    const flowName = String(form.get("flowName") || "").trim();
    if (!appName || !flowName) {
      return new Response(JSON.stringify({ ok: false, error: "appName and flowName required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const files: File[] = [];
    for (const [k, v] of form.entries()) if (k === "files[]" && v instanceof File) files.push(v);
    if (!files.length) {
      return new Response(JSON.stringify({ ok: false, error: "Attach files[] images" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    const flowId = await upsertFlow(appName, flowName);

    let idx = 1;
    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${appName}/${flowName}/${String(idx).padStart(2, "0")}.${ext}`;
      const publicUrl = await uploadToStorage(path, file);
      await insertScreen(flowId, idx, publicUrl, file.name);
      idx += 1;
    }

    return new Response(JSON.stringify({ ok: true, flowId, count: files.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
