import type { SupabaseClient } from "@supabase/supabase-js";
import { todayJst, yesterdayJst } from "./time";
import type { QuestionRow, UserRow } from "../types";

export async function findOrCreateUser(supabase: SupabaseClient, lineUserId: string): Promise<UserRow> {
  const { data: existing, error: findError } = await supabase
    .from("kanrigyomu_users")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle<UserRow>();

  if (findError) {
    throw new Error(`Failed to find user: ${findError.message}`);
  }

  if (existing) {
    return existing;
  }

  const { data, error } = await supabase
    .from("kanrigyomu_users")
    .insert({ line_user_id: lineUserId, current_block: 1, cursor_in_block: 1, streak_count: 0, active: true })
    .select("*")
    .single<UserRow>();

  if (error || !data) {
    throw new Error(`Failed to create user: ${error?.message ?? "unknown"}`);
  }

  return data;
}

export async function getQuestionById(supabase: SupabaseClient, questionId: string): Promise<QuestionRow> {
  const { data, error } = await supabase
    .from("kanrigyomu_questions")
    .select("*")
    .eq("id", questionId)
    .single<QuestionRow>();

  if (error || !data) {
    throw new Error(`Question not found: ${questionId}`);
  }

  return data;
}

function calculateNextStreak(user: UserRow): number {
  const today = todayJst();
  const yesterday = yesterdayJst();

  if (user.last_answer_date === today) {
    return user.streak_count;
  }

  if (user.last_answer_date === yesterday) {
    return user.streak_count + 1;
  }

  return 1;
}

export async function updateAfterAnswer(
  supabase: SupabaseClient,
  user: UserRow,
  question: QuestionRow,
): Promise<UserRow> {
  const nextCursor =
    question.block_number === user.current_block
      ? Math.max(user.cursor_in_block, question.order_index + 1)
      : question.order_index + 1;

  const nextBlock = Math.max(user.current_block, question.block_number);

  const { data, error } = await supabase
    .from("kanrigyomu_users")
    .update({
      current_block: nextBlock,
      cursor_in_block: nextCursor,
      streak_count: calculateNextStreak(user),
      last_answer_date: todayJst(),
    })
    .eq("id", user.id)
    .select("*")
    .single<UserRow>();

  if (error || !data) {
    throw new Error(`Failed to update user: ${error?.message ?? "unknown"}`);
  }

  return data;
}

export async function insertAnswer(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
  selected: number,
  isCorrect: boolean,
): Promise<void> {
  const { error } = await supabase.from("kanrigyomu_answers").insert({
    user_id: userId,
    question_id: questionId,
    selected,
    is_correct: isCorrect,
  });

  if (error) {
    throw new Error(`Failed to insert answer: ${error.message}`);
  }
}

export async function markAssignmentAnswered(
  supabase: SupabaseClient,
  userId: string,
  questionId: string,
): Promise<void> {
  const { error } = await supabase
    .from("kanrigyomu_daily_assignments")
    .update({ answered_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .eq("date", todayJst());

  if (error) {
    throw new Error(`Failed to mark assignment answered: ${error.message}`);
  }
}

type BlockJoinRow = {
  is_correct: boolean;
};

export async function getBlockCorrectRate(
  supabase: SupabaseClient,
  userId: string,
  blockNumber: number,
): Promise<number> {
  const { data, error } = await supabase
    .from("kanrigyomu_answers")
    .select("is_correct, questions!inner(block_number)")
    .eq("user_id", userId)
    .eq("questions.block_number", blockNumber)
    .returns<BlockJoinRow[]>();

  if (error) {
    throw new Error(`Failed to compute block rate: ${error.message}`);
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return 0;
  }

  const correct = rows.filter((row) => row.is_correct).length;
  return correct / rows.length;
}

export async function getProgressSnapshot(
  supabase: SupabaseClient,
  userId: string,
  blockNumber: number,
  cursorInBlock: number,
): Promise<{ blockProgress: number; blockTotal: number; blockRate: number; totalAnswered: number }> {
  const [{ count: blockTotal, error: blockTotalError }, { count: totalAnswered, error: totalError }, blockRate] =
    await Promise.all([
      supabase.from("kanrigyomu_questions").select("id", { head: true, count: "exact" }).eq("block_number", blockNumber),
      supabase.from("kanrigyomu_answers").select("id", { head: true, count: "exact" }).eq("user_id", userId),
      getBlockCorrectRate(supabase, userId, blockNumber),
    ]);

  if (blockTotalError) {
    throw new Error(`Failed to get block total: ${blockTotalError.message}`);
  }

  if (totalError) {
    throw new Error(`Failed to get total answers: ${totalError.message}`);
  }

  return {
    blockProgress: Math.max(0, cursorInBlock - 1),
    blockTotal: blockTotal ?? 0,
    blockRate,
    totalAnswered: totalAnswered ?? 0,
  };
}
