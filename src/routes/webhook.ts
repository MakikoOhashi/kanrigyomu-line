import { Router } from "express";
import { replyMessage } from "../lib/lineClient";
import { buildAnswerMessage } from "../lib/messages";
import { getSupabase } from "../lib/supabase";
import { verifyLineSignature } from "../lib/lineSignature";
import { requireEnv } from "../lib/env";
import {
  findOrCreateUser,
  getProgressSnapshot,
  getQuestionById,
  insertAnswer,
  markAssignmentAnswered,
  updateAfterAnswer,
} from "../lib/progress";
import type { LineWebhookBody } from "../types";

const router = Router();

function parseChoice(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    return null;
  }
  return parsed;
}

router.post("/webhook", async (req, res) => {
  try {
    const signature = req.header("x-line-signature");
    const rawBody = (req as { rawBody?: string }).rawBody ?? "";
    const secret = requireEnv("LINE_CHANNEL_SECRET");

    if (!verifyLineSignature(rawBody, signature, secret)) {
      return res.status(400).json({ ok: false, error: "invalid signature" });
    }

    const supabase = getSupabase();
    const body = req.body as LineWebhookBody;
    const events = body.events ?? [];

    for (const event of events) {
      const lineUserId = event.source?.userId;
      if (!lineUserId) {
        continue;
      }

      if (event.type === "follow") {
        await findOrCreateUser(supabase, lineUserId);
        if (event.replyToken) {
          await replyMessage(event.replyToken, [{ type: "text", text: "登録しました。毎朝1問を配信します。" }]);
        }
        continue;
      }

      if (event.type !== "postback" || !event.replyToken) {
        continue;
      }

      const payload = new URLSearchParams(event.postback?.data ?? "");
      const questionId = payload.get("qid");
      const selected = parseChoice(payload.get("c"));

      if (!questionId || !selected) {
        await replyMessage(event.replyToken, [{ type: "text", text: "回答データが不正です。" }]);
        continue;
      }

      const user = await findOrCreateUser(supabase, lineUserId);
      const question = await getQuestionById(supabase, questionId);
      const isCorrect = question.correct === selected;

      await insertAnswer(supabase, user.id, question.id, selected, isCorrect);
      const updatedUser = await updateAfterAnswer(supabase, user, question);
      await markAssignmentAnswered(supabase, user.id, question.id);

      const progress = await getProgressSnapshot(
        supabase,
        updatedUser.id,
        updatedUser.current_block,
        updatedUser.cursor_in_block,
      );

      await replyMessage(event.replyToken, [
        buildAnswerMessage({
          isCorrect,
          selected,
          correct: question.correct,
          explanation: question.explanation,
          blockNumber: updatedUser.current_block,
          blockProgress: Math.min(progress.blockProgress, progress.blockTotal),
          blockTotal: progress.blockTotal,
          blockRate: progress.blockRate,
          totalAnswered: progress.totalAnswered,
          totalQuestions: 120,
          streakCount: updatedUser.streak_count,
        }),
      ]);
    }

    return res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook error";
    return res.status(500).json({ ok: false, error: message });
  }
});

export default router;
