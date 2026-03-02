import { Router, type Request } from "express";
import { pushMessage } from "../lib/lineClient";
import { buildQuestionMessage } from "../lib/messages";
import { resolveAssignment } from "../lib/assign";
import { findOrCreateUser } from "../lib/progress";
import { getSupabase } from "../lib/supabase";
import { todayJst } from "../lib/time";
import type { UserRow } from "../types";

const router = Router();

function authorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return true;
  }

  const bearer = req.header("authorization");
  const cronSecret = req.header("x-cron-secret");
  return bearer === `Bearer ${expected}` || cronSecret === expected;
}

async function getActiveUsers(): Promise<UserRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.from("kanrigyomu_users").select("*").eq("active", true).returns<UserRow[]>();

  if (error) {
    throw new Error(`Failed to fetch active users: ${error.message}`);
  }

  return data ?? [];
}

router.post("/push/daily", async (req, res) => {
  try {
    if (!authorized(req)) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const supabase = getSupabase();
    const today = todayJst();
    let sent = 0;
    let skipped = 0;

    const users = await getActiveUsers();
    if (users.length === 0 && process.env.DEFAULT_LINE_USER_ID) {
      users.push(await findOrCreateUser(supabase, process.env.DEFAULT_LINE_USER_ID));
    }

    for (const user of users) {
      const { data: existing, error: assignmentErr } = await supabase
        .from("kanrigyomu_daily_assignments")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle<{ id: string }>();

      if (assignmentErr) {
        throw new Error(`Failed to check daily assignment: ${assignmentErr.message}`);
      }

      if (existing) {
        skipped += 1;
        continue;
      }

      const assignment = await resolveAssignment(supabase, user);
      if (!assignment.question) {
        skipped += 1;
        await supabase.from("kanrigyomu_daily_assignments").upsert(
          { user_id: user.id, date: today, question_id: null, sent_at: new Date().toISOString() },
          { onConflict: "user_id,date" },
        );
        continue;
      }

      if (assignment.block !== user.current_block || assignment.cursor !== user.cursor_in_block) {
        const { error: updateErr } = await supabase
          .from("kanrigyomu_users")
          .update({ current_block: assignment.block, cursor_in_block: assignment.cursor })
          .eq("id", user.id);

        if (updateErr) {
          throw new Error(`Failed to align user cursor: ${updateErr.message}`);
        }
      }

      await pushMessage(user.line_user_id, [buildQuestionMessage(assignment.question)]);

      const { error: upsertErr } = await supabase.from("kanrigyomu_daily_assignments").upsert(
        {
          user_id: user.id,
          date: today,
          question_id: assignment.question.id,
          sent_at: new Date().toISOString(),
        },
        { onConflict: "user_id,date" },
      );

      if (upsertErr) {
        throw new Error(`Failed to save daily assignment: ${upsertErr.message}`);
      }

      sent += 1;
    }

    return res.json({ ok: true, sent, skipped });
  } catch (error) {
    const message = error instanceof Error ? error.message : "push daily error";
    return res.status(500).json({ ok: false, error: message });
  }
});

export default router;
