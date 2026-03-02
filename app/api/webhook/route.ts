import { NextResponse } from "next/server";
import { getEnv, validateRequiredEnv } from "@/lib/env";
import { sendLineReply } from "@/lib/line/client";
import { buildAnswerFeedbackMessage } from "@/lib/line/messages";
import { verifyLineSignature } from "@/lib/line/signature";
import {
  findOrCreateUser,
  getProgressStats,
  getQuestionById,
  insertAnswer,
  markTodayAssignmentAnswered,
  updateUserAfterAnswer,
} from "@/lib/logic/progress";
import { getServiceSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

type LineWebhookEvent = {
  type: string;
  replyToken?: string;
  source?: {
    userId?: string;
  };
  postback?: {
    data?: string;
  };
};

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

export async function POST(req: Request): Promise<Response> {
  validateRequiredEnv();

  const channelSecret = getEnv("LINE_CHANNEL_SECRET");
  const signature = req.headers.get("x-line-signature");
  const rawBody = await req.text();

  if (!verifyLineSignature(rawBody, signature, channelSecret)) {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  let body: { events?: LineWebhookEvent[] };
  try {
    body = JSON.parse(rawBody) as { events?: LineWebhookEvent[] };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const events = body.events ?? [];

  for (const event of events) {
    const lineUserId = event.source?.userId;
    if (!lineUserId) {
      continue;
    }

    if (event.type === "follow") {
      await findOrCreateUser(supabase, lineUserId);
      if (event.replyToken) {
        await sendLineReply({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: "登録しました。毎朝6:00に1問配信します。" }],
        });
      }
      continue;
    }

    if (event.type !== "postback" || !event.replyToken) {
      continue;
    }

    const search = new URLSearchParams(event.postback?.data ?? "");
    const questionId = search.get("qid");
    const selected = parseChoice(search.get("c"));

    if (!questionId || !selected) {
      await sendLineReply({
        replyToken: event.replyToken,
        messages: [{ type: "text", text: "回答データを読み取れませんでした。もう一度お試しください。" }],
      });
      continue;
    }

    const user = await findOrCreateUser(supabase, lineUserId);
    const question = await getQuestionById(supabase, questionId);
    const isCorrect = question.correct === selected;

    await insertAnswer(supabase, {
      userId: user.id,
      questionId: question.id,
      selected,
      isCorrect,
    });

    const updatedUser = await updateUserAfterAnswer(supabase, user, question);
    await markTodayAssignmentAnswered(supabase, updatedUser.id, question.id);

    const stats = await getProgressStats(
      supabase,
      updatedUser.id,
      updatedUser.current_block,
      updatedUser.cursor_in_block,
    );

    await sendLineReply({
      replyToken: event.replyToken,
      messages: [
        buildAnswerFeedbackMessage({
          isCorrect,
          selected,
          correct: question.correct,
          explanation: question.explanation,
          blockNumber: updatedUser.current_block,
          blockProgressCurrent: stats.blockProgressCurrent,
          blockTotal: stats.blockTotal,
          blockRate: stats.blockRate,
          totalAnswered: stats.totalAnswered,
          totalQuestions: 120,
          streakCount: updatedUser.streak_count,
        }),
      ],
    });
  }

  return NextResponse.json({ ok: true });
}
