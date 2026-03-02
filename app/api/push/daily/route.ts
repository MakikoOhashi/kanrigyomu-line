import { NextResponse } from "next/server";
import { validateRequiredEnv } from "@/lib/env";
import { sendLinePush } from "@/lib/line/client";
import { buildQuestionMessage } from "@/lib/line/messages";
import { resolveNextQuestionForUser } from "@/lib/logic/assign";
import { findOrCreateUser } from "@/lib/logic/progress";
import { getTodayJstDate } from "@/lib/logic/time";
import type { UserRow } from "@/lib/logic/types";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function getActiveUsers(): Promise<UserRow[]> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("active", true)
    .returns<UserRow[]>();

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }

  return data ?? [];
}

function verifyCronAuth(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return true;
  }

  const bearer = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-cron-secret");

  return bearer === `Bearer ${expected}` || cronSecret === expected;
}

export async function POST(req: Request): Promise<Response> {
  validateRequiredEnv();

  if (!verifyCronAuth(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const today = getTodayJstDate();
  let sent = 0;
  let skipped = 0;

  const users = await getActiveUsers();

  if (users.length === 0) {
    const defaultLineUserId = process.env.DEFAULT_LINE_USER_ID;
    if (defaultLineUserId) {
      users.push(await findOrCreateUser(supabase, defaultLineUserId));
    }
  }

  for (const user of users) {
    const { data: existing, error: existingError } = await supabase
      .from("daily_assignments")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle<{ id: string }>();

    if (existingError) {
      throw new Error(`Failed to check daily assignment: ${existingError.message}`);
    }

    if (existing) {
      skipped += 1;
      continue;
    }

    const resolved = await resolveNextQuestionForUser(supabase, user);
    if (!resolved.question) {
      skipped += 1;
      await supabase
        .from("daily_assignments")
        .upsert({ user_id: user.id, date: today, status: "skipped" }, { onConflict: "user_id,date" });
      continue;
    }

    if (
      resolved.userPatch.current_block !== user.current_block ||
      resolved.userPatch.cursor_in_block !== user.cursor_in_block
    ) {
      const { error: updateError } = await supabase
        .from("users")
        .update(resolved.userPatch)
        .eq("id", user.id);
      if (updateError) {
        throw new Error(`Failed to update user state for assignment: ${updateError.message}`);
      }
    }

    await sendLinePush({
      to: user.line_user_id,
      messages: [buildQuestionMessage(resolved.question)],
    });

    const { error: assignmentError } = await supabase.from("daily_assignments").upsert(
      {
        user_id: user.id,
        date: today,
        question_id: resolved.question.id,
        sent_at: new Date().toISOString(),
        status: "sent",
      },
      { onConflict: "user_id,date" },
    );

    if (assignmentError) {
      throw new Error(`Failed to save assignment: ${assignmentError.message}`);
    }

    const { error: sentDateError } = await supabase
      .from("users")
      .update({ last_sent_date: today })
      .eq("id", user.id);

    if (sentDateError) {
      throw new Error(`Failed to update last_sent_date: ${sentDateError.message}`);
    }

    sent += 1;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
