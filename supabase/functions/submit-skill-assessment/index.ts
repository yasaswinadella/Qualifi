import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubmitPayload {
  attempt_id: string;
  answers: Record<string, string>;
  violations_count?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("VITE_GEMINI_API_KEY") || "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized user token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SubmitPayload = await req.json();
    const { attempt_id, answers, violations_count = 0 } = body;

    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "Missing attempt_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch attempt and frozen question_set
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from("skill_assessment_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("student_id", user.id)
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: "Assessment attempt not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (attempt.status === "SUBMITTED" || attempt.status === "GRADED") {
      return new Response(
        JSON.stringify({
          score: attempt.total_score,
          mcq_score: attempt.mcq_score,
          coding_score: attempt.coding_score,
          feedback: attempt.ai_feedback,
          already_submitted: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const questionSet: any[] = attempt.question_set || [];

    // 2. Deterministic MCQ Grading
    const mcqItems = questionSet.filter((q) => q.type === "MCQ");
    let earnedMcqPoints = 0;
    let maxMcqPoints = 0;

    mcqItems.forEach((q) => {
      const pts = q.points || 2.5;
      maxMcqPoints += pts;

      const studentSelectedShuffledIdx = answers[q.question_id];
      if (studentSelectedShuffledIdx !== undefined && studentSelectedShuffledIdx !== null) {
        // Map student's shuffled index back to original index
        const mappedOriginalIdx = q.original_option_map
          ? String(q.original_option_map[parseInt(studentSelectedShuffledIdx, 10)])
          : studentSelectedShuffledIdx;

        if (String(mappedOriginalIdx) === String(q.correct_answer)) {
          earnedMcqPoints += pts;
        }
      }
    });

    const round1Score = maxMcqPoints > 0 ? Math.round((earnedMcqPoints / maxMcqPoints) * 50) : 0;

    // 3. Round 2 Coding / Descriptive Grading via Gemini AI
    const codingItems = questionSet.filter((q) => q.type !== "MCQ");
    let round2Score = 0;
    let aiFeedback: any = {
      summary: "Assessment completed and verified against institutional ground truth.",
      strengths: ["Completed assessment questions within timed session."],
      weaknesses: ["Review core architectural tradeoffs and edge cases."],
    };

    if (codingItems.length > 0 && geminiApiKey) {
      try {
        const evaluationPrompt = `
You are an expert technical evaluator. Grade these Round 2 coding and technical answers:

${codingItems
  .map(
    (q, idx) => `
[Challenge ${idx + 1}] (ID: ${q.question_id})
Type: ${q.type}
Max Points: ${q.points || 8.33}
Rubric: ${JSON.stringify(q.rubric || {})}
Student Answer:
${answers[q.question_id] || "[NO ANSWER SUBMITTED]"}
`
  )
  .join("\n---\n")}

Evaluate strictly and return JSON with:
{
  "totalEarnedOutOf50": number (0 to 50),
  "summary": "Executive feedback summary",
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "questionReviews": [
    {
      "questionId": "string",
      "score": number,
      "feedback": "string"
    }
  ]
}
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: evaluationPrompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            round2Score = Math.max(0, Math.min(50, Math.round(parsed.totalEarnedOutOf50 || 0)));
            aiFeedback = {
              summary: parsed.summary || "Evaluation completed.",
              strengths: parsed.strengths || [],
              weaknesses: parsed.weaknesses || [],
              round2Breakdown: {
                totalQuestions: codingItems.length,
                earnedScore: round2Score,
                questionReviews: parsed.questionReviews || [],
              },
            };
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini evaluation error, using heuristic scoring:", geminiErr);
        // Heuristic fallback
        let answeredCount = 0;
        codingItems.forEach((q) => {
          const ans = answers[q.question_id] || "";
          if (ans.trim().length > 20) answeredCount++;
        });
        round2Score = Math.round((answeredCount / codingItems.length) * 35);
      }
    } else {
      let answeredCount = 0;
      codingItems.forEach((q) => {
        const ans = answers[q.question_id] || "";
        if (ans.trim().length > 20) answeredCount++;
      });
      round2Score = Math.round((answeredCount / (codingItems.length || 1)) * 35);
    }

    const totalScore = Math.max(0, Math.min(100, round1Score + round2Score));
    const nowIso = new Date().toISOString();

    // 4. Update attempt record
    await supabaseAdmin
      .from("skill_assessment_attempts")
      .update({
        status: "SUBMITTED",
        submitted_at: nowIso,
        mcq_score: round1Score,
        coding_score: round2Score,
        total_score: totalScore,
        answers,
        ai_feedback: aiFeedback,
        violations_count,
      })
      .eq("id", attempt_id);

    // 5. Upsert student_skill_benchmarks
    await supabaseAdmin.from("student_skill_benchmarks").upsert(
      {
        student_id: user.id,
        skill_id: attempt.skill_id,
        score: totalScore,
        last_attempt_id: attempt_id,
        verified_at: nowIso,
      },
      { onConflict: "student_id,skill_id" }
    );

    return new Response(
      JSON.stringify({
        score: totalScore,
        mcq_score: round1Score,
        coding_score: round2Score,
        feedback: aiFeedback,
        verified_at: nowIso,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Submission failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
