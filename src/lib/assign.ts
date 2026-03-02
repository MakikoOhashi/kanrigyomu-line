import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionRow, UserRow } from "../types";
import { getBlockCorrectRate } from "./progress";

const PASS_RATE = 0.7;

type Assignment = {
  question: QuestionRow | null;
  block: number;
  cursor: number;
};

async function findQuestion(supabase: SupabaseClient, block: number, cursor: number): Promise<QuestionRow | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("block_number", block)
    .eq("order_index", cursor)
    .maybeSingle<QuestionRow>();

  if (error) {
    throw new Error(`Failed to fetch question: ${error.message}`);
  }

  return data;
}

async function blockExists(supabase: SupabaseClient, block: number): Promise<boolean> {
  const { count, error } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("block_number", block);

  if (error) {
    throw new Error(`Failed to check block: ${error.message}`);
  }

  return (count ?? 0) > 0;
}

export async function resolveAssignment(supabase: SupabaseClient, user: UserRow): Promise<Assignment> {
  let block = Math.max(1, user.current_block);
  let cursor = Math.max(1, user.cursor_in_block);

  for (let i = 0; i < 100; i += 1) {
    const question = await findQuestion(supabase, block, cursor);
    if (question) {
      return { question, block, cursor };
    }

    const exists = await blockExists(supabase, block);
    if (!exists) {
      return { question: null, block, cursor };
    }

    const rate = await getBlockCorrectRate(supabase, user.id, block);
    if (rate >= PASS_RATE) {
      block += 1;
      cursor = 1;
      continue;
    }

    cursor = 1;
  }

  throw new Error("Failed to resolve assignment after 100 iterations");
}
