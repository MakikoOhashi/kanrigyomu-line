import type { LineTextMessage } from "@/lib/line/client";
import type { QuestionRow } from "@/lib/logic/types";

const CHOICE_LABELS = ["①", "②", "③", "④"];

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

export function buildQuestionMessage(question: QuestionRow): LineTextMessage {
  const text = [
    `【Block ${question.block_number}】`,
    question.stem,
    `① ${question.c1}`,
    `② ${question.c2}`,
    `③ ${question.c3}`,
    `④ ${question.c4}`,
  ].join("\n");

  return {
    type: "text",
    text,
    quickReply: {
      items: [1, 2, 3, 4].map((choice) => ({
        type: "action",
        action: {
          type: "postback",
          label: CHOICE_LABELS[choice - 1],
          data: `qid=${question.id}&c=${choice}`,
          displayText: `回答 ${CHOICE_LABELS[choice - 1]}`,
        },
      })),
    },
  };
}

type FeedbackParams = {
  isCorrect: boolean;
  selected: number;
  correct: number;
  explanation: string;
  blockNumber: number;
  blockProgressCurrent: number;
  blockTotal: number;
  blockRate: number;
  totalAnswered: number;
  totalQuestions: number;
  streakCount: number;
};

export function buildAnswerFeedbackMessage(params: FeedbackParams): LineTextMessage {
  const symbol = params.isCorrect ? "✅" : "❌";
  const lines = [
    `${symbol} 正解：${CHOICE_LABELS[params.correct - 1] ?? params.correct}`,
    `あなたの回答：${CHOICE_LABELS[params.selected - 1] ?? params.selected}`,
    `理由：${params.explanation}`,
    "",
    `Block${params.blockNumber}：${params.blockProgressCurrent}/${params.blockTotal}`,
    `Block正答率：${clampPercent(params.blockRate)}%`,
    `総進捗：${params.totalAnswered}/${params.totalQuestions}（${clampPercent(
      params.totalAnswered / Math.max(params.totalQuestions, 1),
    )}%）`,
    `連続：${params.streakCount}日`,
  ];

  return {
    type: "text",
    text: lines.join("\n"),
  };
}
