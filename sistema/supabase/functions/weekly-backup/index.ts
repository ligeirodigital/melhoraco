// Backup automático semanal. Exporta tabelas críticas para CSV, zipa, envia para bucket privado "backups".
// Autenticação: header x-cron-secret (CRON_SECRET) para chamadas do cron; usuário logado admin também aceito.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TABLES = [
  "quotes",
  "quote_items",
  "clients",
  "products",
  "payment_transactions",
  "direct_expenses",
  "cash_flow_transactions",
] as const;

const KEEP_LAST = 8;

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => escape(r[c])).join(","))].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const cronSecret = Deno.env.get("MELHORACO_CRON_SECRET") ?? "";
  const supabase = createClient(supabaseUrl, serviceKey, { db: { schema: "melhoraco" } });

  // Autorização: cron secret OU admin autenticado
  const providedCron = req.headers.get("x-cron-secret") ?? "";
  let authorized = cronSecret && providedCron === cronSecret;

  if (!authorized) {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", userData.user.id)
          .maybeSingle();
        authorized = profile?.role === "admin";
      }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const zip = new JSZip();
    const stats: Record<string, number> = {};

    for (const table of TABLES) {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.error(`[weekly-backup] ${table}:`, error.message);
        stats[table] = -1;
        continue;
      }
      const rows = data ?? [];
      zip.file(`${table}.csv`, toCsv(rows as Record<string, unknown>[]));
      stats[table] = rows.length;
    }

    zip.file(
      "manifest.json",
      JSON.stringify({ generated_at: new Date().toISOString(), tables: stats }, null, 2),
    );

    const zipBlob = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

    const now = new Date();
    const stamp = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}_${String(now.getUTCHours()).padStart(2, "0")}${String(now.getUTCMinutes()).padStart(2, "0")}`;
    const filename = `backup_${stamp}.zip`;

    const { error: upErr } = await supabase.storage
      .from("backups")
      .upload(filename, zipBlob, { contentType: "application/zip", upsert: false });
    if (upErr) throw upErr;

    // Retenção: mantém os últimos KEEP_LAST arquivos
    const { data: list } = await supabase.storage.from("backups").list("", { limit: 100 });
    if (list && list.length > KEEP_LAST) {
      const sorted = [...list].sort((a, b) => (a.created_at! < b.created_at! ? 1 : -1));
      const toDelete = sorted.slice(KEEP_LAST).map((f) => f.name);
      if (toDelete.length > 0) {
        await supabase.storage.from("backups").remove(toDelete);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, filename, size_bytes: zipBlob.byteLength, tables: stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[weekly-backup]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
