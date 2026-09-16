// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  skill_id: string;
}

function shuffleArray<T>(array: T[]): { shuffled: T[]; originalIndices: number[] } {
  const indices = array.map((_, i) => i);
  const shuffled: T[] = [];
  const originalIndices: number[] = [];

  const temp = [...array];
  const tempIndices = [...indices];

  while (temp.length > 0) {
    const randomIndex = Math.floor(Math.random() * temp.length);
    shuffled.push(temp.splice(randomIndex, 1)[0]);
    originalIndices.push(tempIndices.splice(randomIndex, 1)[0]);
  }

  return { shuffled, originalIndices };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

    const body: RequestPayload = await req.json();
    const { skill_id } = body;

    if (!skill_id) {
      return new Response(JSON.stringify({ error: "Missing skill_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Server-side 7-Day Cooldown Check
    const { data: canAttempt, error: rpcError } = await supabaseAdmin.rpc("can_attempt_skill", {
      p_student_id: user.id,
      p_skill_id: skill_id,
    });

    if (rpcError) {
      console.warn("RPC can_attempt_skill error:", rpcError);
    }

    if (canAttempt === false) {
      return new Response(
        JSON.stringify({
          error: "Skill Cooldown Active: You can only attempt a verified assessment for this skill once every 7 days.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 2. Fetch Question Bank from Supabase
    const { data: questions, error: qError } = await supabaseAdmin
      .from("question_bank")
      .select("*")
      .eq("skill_id", skill_id)
      .eq("is_active", true);

    if (qError || !questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Question bank not initialized for this skill." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 3. Filter and sample with weighted difficulty
    const mcqs = questions.filter((q: any) => q.type === "MCQ");
    const codings = questions.filter((q: any) => q.type !== "MCQ");

    // Partition MCQs by difficulty
    const easyMcqs = mcqs.filter((q: any) => q.difficulty === "EASY");
    const medMcqs = mcqs.filter((q: any) => q.difficulty === "MEDIUM");
    const hardMcqs = mcqs.filter((q: any) => q.difficulty === "HARD");

    // Sample 8 easy, 8 medium, 4 hard (or fallback to pool)
    const sample = (arr: any[], count: number) => {
      const shuffled = [...arr].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };

    let selectedMcqs = [
      ...sample(easyMcqs.length >= 8 ? easyMcqs : mcqs, 8),
      ...sample(medMcqs.length >= 8 ? medMcqs : mcqs, 8),
      ...sample(hardMcqs.length >= 4 ? hardMcqs : mcqs, 4),
    ];

    // Ensure exactly 20 unique MCQs
    const uniqueMcqMap = new Map();
    selectedMcqs.forEach((q) => uniqueMcqMap.set(q.id, q));
    if (uniqueMcqMap.size < 20) {
      const remaining = sample(mcqs, 20);
      remaining.forEach((q) => uniqueMcqMap.set(q.id, q));
    }
    selectedMcqs = Array.from(uniqueMcqMap.values()).slice(0, 20);

    // Sample 6 Coding/Descriptive (2 easy, 3 medium, 1 hard)
    const easyCode = codings.filter((q: any) => q.difficulty === "EASY");
    const medCode = codings.filter((q: any) => q.difficulty === "MEDIUM");
    const hardCode = codings.filter((q: any) => q.difficulty === "HARD");

    let selectedCoding = [
      ...sample(easyCode.length >= 2 ? easyCode : codings, 2),
      ...sample(medCode.length >= 3 ? medCode : codings, 3),
      ...sample(hardCode.length >= 1 ? hardCode : codings, 1),
    ];

    const uniqueCodeMap = new Map();
    selectedCoding.forEach((q) => uniqueCodeMap.set(q.id, q));
    if (uniqueCodeMap.size < 6) {
      const remainingCode = sample(codings, 6);
      remainingCode.forEach((q) => uniqueCodeMap.set(q.id, q));
    }
    selectedCoding = Array.from(uniqueCodeMap.values()).slice(0, 6);

    // 4. Per-User Option Shuffling & Frozen Set Generation
    const frozenQuestionSet: any[] = [];
    const clientQuestions: any[] = [];

    // Shuffle MCQs
    selectedMcqs.forEach((q, idx) => {
      const originalOptions: string[] = Array.isArray(q.options) ? q.options : [];
      const { shuffled, originalIndices } = shuffleArray(originalOptions);

      // Map: originalOptionMap[shuffledIdx] = originalIndex
      const originalOptionMap: Record<number, number> = {};
      originalIndices.forEach((origIdx, shuffIdx) => {
        originalOptionMap[shuffIdx] = origIdx;
      });

      frozenQuestionSet.push({
        question_id: q.id,
        type: q.type,
        correct_answer: q.correct_answer,
        points: q.points || 2.5,
        shuffled_options: shuffled,
        original_option_map: originalOptionMap,
      });

      // Strip correct_answer before sending to client
      clientQuestions.push({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        question_text: q.question_text,
        options: shuffled,
        points: q.points || 2.5,
        order_index: idx + 1,
      });
    });

    // Add Coding / Descriptive Questions
    selectedCoding.forEach((q, idx) => {
      frozenQuestionSet.push({
        question_id: q.id,
        type: q.type,
        points: q.points || 8.33,
        rubric: q.rubric,
        test_cases: q.test_cases,
      });

      // Strip rubric before sending to client
      clientQuestions.push({
        id: q.id,
        type: q.type,
        difficulty: q.difficulty,
        question_text: q.question_text,
        starter_code: q.starter_code,
        test_cases: q.test_cases,
        points: q.points || 8.33,
        order_index: selectedMcqs.length + idx + 1,
      });
    });

    // 5. Insert skill_assessment_attempts row with status IN_PROGRESS
    const { data: attemptRecord, error: insertError } = await supabaseAdmin
      .from("skill_assessment_attempts")
      .insert({
        student_id: user.id,
        skill_id,
        question_set: frozenQuestionSet,
        started_at: new Date().toISOString(),
        duration_seconds: 1800, // 30 mins
        status: "IN_PROGRESS",
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({
        attempt_id: attemptRecord.id,
        duration_seconds: 1800,
        started_at: attemptRecord.started_at,
        questions: clientQuestions,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
