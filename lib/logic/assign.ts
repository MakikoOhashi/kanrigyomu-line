import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionRow, UserRow } from "@/lib/logic/types";
import { getBlockCorrectRate } from "@/lib/logic/progress";

const DEFAULT_PASS_RATE = 0.7;

type ResolveResult = {
  question: QuestionRow | null;
  userPatch: Pick<UserRow, "current_block" | "cursor_in_block">;
};

async function getQuestionAtOrAfter(
  supabase: SupabaseClient,
  blockNumber: number,
  cursorInBlock: number,
): Promise<QuestionRow | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("block_number", blockNumber)
    .gte("order_index", cursorInBlock)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle<QuestionRow>();

  if (error) {
    throw new Error(`Failed to fetch question cursor: ${error.message}`);
  }

  return data ?? null;
}

async function getFirstQuestionInBlock(
  supabase: SupabaseClient,
  blockNumber: number,
): Promise<QuestionRow | null> {
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .eq("block_number", blockNumber)
    .order("order_index", { ascending: true })
    .limit(1)
    .maybeSingle<QuestionRow>();

  if (error) {
    throw new Error(`Failed to fetch first block question: ${error.message}`);
  }

  return data ?? null;
}

async function getMaxBlock(supabase: SupabaseClient): Promise<number> {
  const { data, error } = await supabase
    .from("questions")
    .select("block_number")
    .order("block_number", { ascending: false })
    .limit(1)
    .maybeSingle<{ block_number: number }>();

  if (error) {
    throw new Error(`Failed to fetch max block: ${error.message}`);
  }

  return data?.block_number ?? 0;
}

export async function resolveNextQuestionForUser(
  supabase: SupabaseClient,
  user: UserRow,
  passRate = DEFAULT_PASS_RATE,
): Promise<ResolveResult> {
  const maxBlock = await getMaxBlock(supabase);

  if (maxBlock === 0 || user.current_block > maxBlock) {
    return {
      question: null,
      userPatch: {
        current_block: user.current_block,
        cursor_in_block: user.cursor_in_block,
      },
    };
  }

  let block = Math.max(1, user.current_block);
  let cursor = Math.max(0, user.cursor_in_block);

  for (let i = 0; i < 100; i += 1) {
    if (block > maxBlock) {
      return {
        question: null,
        userPatch: {
          current_block: block,
          cursor_in_block: cursor,
        },
      };
    }

    const nextQuestion = await getQuestionAtOrAfter(supabase, block, cursor);
    if (nextQuestion) {
      return {
        question: nextQuestion,
        userPatch: {
          current_block: block,
          cursor_in_block: cursor,
        },
      };
    }

    const firstInBlock = await getFirstQuestionInBlock(supabase, block);
    if (!firstInBlock) {
      block += 1;
      cursor = 0;
      continue;
    }

    const blockRate = await getBlockCorrectRate(supabase, user.id, block);
    if (blockRate >= passRate) {
      block += 1;
      cursor = 0;
      continue;
    }

    return {
      question: firstInBlock,
      userPatch: {
        current_block: block,
        cursor_in_block: firstInBlock.order_index,
      },
    };
  }

  throw new Error("Failed to resolve next question: loop limit exceeded");
}
