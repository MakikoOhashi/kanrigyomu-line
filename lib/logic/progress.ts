import type { SupabaseClient } from "@supabase/supabase-js";
import { getTodayJstDate, getYesterdayJstDate } from "@/lib/logic/time";
import type { QuestionRow, UserRow } from "@/lib/logic/types";

export async function findOrCreateUser(
  supabase: SupabaseClient,
  lineUserId: string,
): Promise<UserRow> {
  const { data: existing, error: fetchError } = await supabase
    .from("users")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle<UserRow>();

  if (fetchError) {
    throw new Error(`Failed to fetch user: ${fetchError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("users")
    .insert({ line_user_id: lineUserId, current_block: 1, cursor_in_block: 0, streak_count: 0, active: true })
    .select("*")
    .single<UserRow>();

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

export async function getQuestionById(
  supabase: SupabaseClient,
  questionId: string,
): Promise<QuestionRow> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", questionId)
    .single<QuestionRow>();

  if (error || !data) {
    throw new Error(`Question not found: ${questionId}`);
  }

  return data;
}

function nextStreakCount(current: UserRow, todayJst: string, yesterdayJst: string): number {
  if (current.last_answer_date === todayJst) {
    return current.streak_count;
  }
  if (current.last_answer_date === yesterdayJst) {
    return current.streak_count + 1;
  }
  return 1;
}

export async function updateUserAfterAnswer(
  supabase: SupabaseClient,
  user: UserRow,
  question: QuestionRow,
): Promise<UserRow> {
  const todayJst = getTodayJstDate();
  const yesterdayJst = getYesterdayJstDate();

  let cursor = user.cursor_in_block;
  let block = user.current_block;

  if (question.block_number === user.current_block && question.order_index >= user.cursor_in_block) {
    cursor = question.order_index + 1;
  }

  if (question.block_number > user.current_block) {
    block = question.block_number;
    cursor = question.order_index + 1;
  }

  const streak = nextStreakCount(user, todayJst, yesterdayJst);

  const { data, error } = await supabase
    .from("users")
    .update({
      current_block: block,
      cursor_in_block: cursor,
      streak_count: streak,
      last_answer_date: todayJst,
    })
    .eq("id", user.id)
    .select("*")
    .single<UserRow>();

  if (error || !data) {
    throw new Error(`Failed to update user progress: ${error?.message ?? "unknown error"}`);
  }

  return data;
}

export async function insertAnswer(
  supabase: SupabaseClient,
  params: {
    userId: string;
    questionId: string;
    selected: number;
    isCorrect: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from("answers").insert({
    user_id: params.userId,
    question_id: params.questionId,
    selected: params.selected,
    is_correct: params.isCorrect,
  });

  if (error) {
    throw new Error(`Failed to insert answer: ${error.message}`);
  }
}

export async function markTodayAssignmentAnswered(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
): Promise<void> {
  const today = getTodayJstDate();
  const { error } = await supabase.from("daily_assignments").upsert(
    {
      user_id: userId,
      date: today,
      question_id: questionId,
      answered_at: new Date().toISOString(),
      status: "answered",
    },
    { onConflict: "user_id,date" },
  );

  if (error) {
    throw new Error(`Failed to mark assignment answered: ${error.message}`);
  }
}

type BlockRateRow = {
  is_correct: boolean;
  questions: { block_number: number };
};

export async function getBlockCorrectRate(
  supabase: SupabaseClient,
  userId: string,
  blockNumber: number,
): Promise<number> {
  const { data, error } = await supabase
    .from("answers")
    .select("is_correct, questions!inner(block_number)")
    .eq("user_id", userId)
    .eq("questions.block_number", blockNumber)
    .returns<BlockRateRow[]>();

  if (error) {
    throw new Error(`Failed to calculate block correct rate: ${error.message}`);
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return 0;
  }

  const correct = rows.filter((row) => row.is_correct).length;
  return correct / rows.length;
}

export async function getProgressStats(
  supabase: SupabaseClient,
  userId: string,
  blockNumber: number,
  cursorInBlock: number,
): Promise<{ blockProgressCurrent: number; blockTotal: number; blockRate: number; totalAnswered: number }> {
  const [{ count: blockTotal, error: blockCountError }, { count: blockProgress, error: blockProgressError },
    { count: totalAnswered, error: totalCountError }, blockRate] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }).eq("block_number", blockNumber),
    supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("block_number", blockNumber)
      .lt("order_index", cursorInBlock),
    supabase.from("answers").select("id", { count: "exact", head: true }).eq("user_id", userId),
    getBlockCorrectRate(supabase, userId, blockNumber),
  ]);

  if (blockCountError) {
    throw new Error(`Failed to count block questions: ${blockCountError.message}`);
  }
  if (blockProgressError) {
    throw new Error(`Failed to count block progress: ${blockProgressError.message}`);
  }
  if (totalCountError) {
    throw new Error(`Failed to count total answers: ${totalCountError.message}`);
  }

  return {
    blockProgressCurrent: Math.min(blockProgress ?? 0, blockTotal ?? 0),
    blockTotal: blockTotal ?? 0,
    blockRate,
    totalAnswered: totalAnswered ?? 0,
  };
}
