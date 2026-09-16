import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const runAt = new Date().toISOString();
  let totalAdded = 0;
  let totalUpdated = 0;
  let totalDeactivated = 0;
  let ingestionError: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adzunaAppId = Deno.env.get("ADZUNA_APP_ID") || "";
    const adzunaAppKey = Deno.env.get("ADZUNA_APP_KEY") || "";

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const jobsToUpsert: any[] = [];
    const activeExternalIdsBySource: Record<string, Set<string>> = {
      ADZUNA: new Set(),
      GREENHOUSE: new Set(),
      LEVER: new Set(),
    };

    // -------------------------------------------------------------
    // 1. ADZUNA API INGESTION (India Engineering / Internships)
    // -------------------------------------------------------------
    if (adzunaAppId && adzunaAppKey) {
      try {
        const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${adzunaAppId}&app_key=${adzunaAppKey}&results_per_page=50&what=software%20intern%20developer&content-type=application/json`;
        const res = await fetch(adzunaUrl);
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];

          for (const item of results) {
            if (!item.redirect_url) continue;

            const extId = String(item.id);
            activeExternalIdsBySource.ADZUNA.add(extId);

            const isRemote =
              item.description?.toLowerCase().includes("remote") ||
              item.location?.display_name?.toLowerCase().includes("remote");

            jobsToUpsert.push({
              title: item.title?.replace(/<\/?[^>]+(>|$)/g, "") || "Software Engineer",
              company: item.company?.display_name || "Technology Company",
              location: item.location?.display_name || "India",
              type: "INTERNSHIP",
              job_type: item.title?.toLowerCase().includes("intern") ? "INTERNSHIP" : "FULL_TIME",
              work_mode: isRemote ? "REMOTE" : "HYBRID",
              source: "ADZUNA",
              external_id: extId,
              stipend: item.salary_min ? `₹${Math.round(item.salary_min / 12).toLocaleString()}/mo` : "Competitive",
              min_stipend: item.salary_min ? Math.round(item.salary_min / 12) : 0,
              application_url: item.redirect_url,
              description: item.description || "Real position ingested from Adzuna engineering board.",
              required_skills: [
                { skill: "Software Engineering", weight: 40, min_score: 60 },
                { skill: "Problem Solving", weight: 30, min_score: 60 },
                { skill: "Communication", weight: 30, min_score: 50 },
              ],
              min_cgpa: 7.0,
              status: "ACTIVE",
              last_seen_at: runAt,
            });
          }
        }
      } catch (adzunaErr: any) {
        console.warn("Adzuna fetch warning:", adzunaErr.message);
      }
    }

    // -------------------------------------------------------------
    // 2. GREENHOUSE & LEVER PUBLIC BOARDS
    // -------------------------------------------------------------
    const { data: trackedCompanies } = await supabaseAdmin
      .from("tracked_companies")
      .select("*")
      .eq("is_active", true);

    if (trackedCompanies && trackedCompanies.length > 0) {
      for (const comp of trackedCompanies) {
        try {
          if (comp.board_type === "GREENHOUSE") {
            const ghUrl = `https://boards-api.greenhouse.io/v1/boards/${comp.board_slug}/jobs?content=true`;
            const ghRes = await fetch(ghUrl);
            if (ghRes.ok) {
              const ghData = await ghRes.json();
              const ghJobs = ghData.jobs || [];

              for (const j of ghJobs) {
                if (!j.absolute_url) continue;

                const extId = String(j.id);
                activeExternalIdsBySource.GREENHOUSE.add(extId);

                const isRemote =
                  j.location?.name?.toLowerCase().includes("remote") ||
                  j.title?.toLowerCase().includes("remote");

                jobsToUpsert.push({
                  title: j.title,
                  company: comp.company_name,
                  location: j.location?.name || "Global / Remote",
                  type: j.title.toLowerCase().includes("intern") ? "INTERNSHIP" : "FULL_TIME",
                  job_type: j.title.toLowerCase().includes("intern") ? "INTERNSHIP" : "FULL_TIME",
                  work_mode: isRemote ? "REMOTE" : "HYBRID",
                  source: "GREENHOUSE",
                  external_id: extId,
                  stipend: "Competitive Industry Standard",
                  min_stipend: 25000,
                  application_url: j.absolute_url,
                  description: j.content || j.title,
                  required_skills: [
                    { skill: "Data Structures", weight: 35, min_score: 70 },
                    { skill: "Problem Solving", weight: 35, min_score: 70 },
                    { skill: "Communication", weight: 30, min_score: 60 },
                  ],
                  min_cgpa: 7.5,
                  status: "ACTIVE",
                  last_seen_at: runAt,
                });
              }
            }
          } else if (comp.board_type === "LEVER") {
            const leverUrl = `https://api.lever.co/v0/postings/${comp.board_slug}?mode=json`;
            const leverRes = await fetch(leverUrl);
            if (leverRes.ok) {
              const leverJobs = await leverRes.json();

              for (const j of leverJobs) {
                const applyLink = j.applyUrl || j.hostedUrl;
                if (!applyLink) continue;

                const extId = String(j.id);
                activeExternalIdsBySource.LEVER.add(extId);

                const isRemote =
                  j.categories?.location?.toLowerCase().includes("remote") ||
                  j.text?.toLowerCase().includes("remote");

                jobsToUpsert.push({
                  title: j.text,
                  company: comp.company_name,
                  location: j.categories?.location || "Remote",
                  type: j.text.toLowerCase().includes("intern") ? "INTERNSHIP" : "FULL_TIME",
                  job_type: j.text.toLowerCase().includes("intern") ? "INTERNSHIP" : "FULL_TIME",
                  work_mode: isRemote ? "REMOTE" : "HYBRID",
                  source: "LEVER",
                  external_id: extId,
                  stipend: "Competitive Industry Standard",
                  min_stipend: 25000,
                  application_url: applyLink,
                  description: j.descriptionPlain || j.text,
                  required_skills: [
                    { skill: "Software Engineering", weight: 40, min_score: 70 },
                    { skill: "Problem Solving", weight: 30, min_score: 65 },
                    { skill: "Teamwork", weight: 30, min_score: 60 },
                  ],
                  min_cgpa: 7.5,
                  status: "ACTIVE",
                  last_seen_at: runAt,
                });
              }
            }
          }
        } catch (boardErr: any) {
          console.warn(`Board fetch error for ${comp.company_name}:`, boardErr.message);
        }
      }
    }

    // -------------------------------------------------------------
    // 3. DATABASE UPSERT & DEACTIVATION
    // -------------------------------------------------------------
    if (jobsToUpsert.length > 0) {
      const { data: upsertResult, error: upsertError } = await supabaseAdmin
        .from("jobs")
        .upsert(jobsToUpsert, { onConflict: "source,external_id" })
        .select();

      if (upsertError) {
        throw upsertError;
      }

      totalAdded = upsertResult?.length || 0;
      totalUpdated = jobsToUpsert.length;
    }

    // Deactivate old jobs from sources that were not seen
    for (const [source, idSet] of Object.entries(activeExternalIdsBySource)) {
      if (idSet.size > 0) {
        const idArray = Array.from(idSet);
        const { data: deactivated } = await supabaseAdmin
          .from("jobs")
          .update({ status: "INACTIVE" })
          .eq("source", source)
          .not("external_id", "in", `(${idArray.map((id) => `'${id}'`).join(",")})`);
      }
    }

    // -------------------------------------------------------------
    // 4. LOG TELEMETRY
    // -------------------------------------------------------------
    await supabaseAdmin.from("job_ingestion_log").insert({
      run_at: runAt,
      source: "PIPELINE_AGGREGATOR",
      jobs_added: totalAdded,
      jobs_updated: totalUpdated,
      jobs_deactivated: totalDeactivated,
    });

    return new Response(
      JSON.stringify({
        success: true,
        jobs_processed: jobsToUpsert.length,
        run_at: runAt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    ingestionError = err.message || "Ingestion pipeline error";
    return new Response(JSON.stringify({ error: ingestionError }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
