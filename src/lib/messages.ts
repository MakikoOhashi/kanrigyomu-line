import type { LineTextMessage, QuestionRow } from "../types";

const CHOICES = ["①", "②", "③", "④"];

function toPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value * 100)));
}

export function buildQuestionMessage(question: QuestionRow): LineTextMessage {
  return {
    type: "text",
    text: [
      `【Block ${question.block_number}】`,
      question.stem,
      `① ${question.c1}`,
      `② ${question.c2}`,
      `③ ${question.c3}`,
      `④ ${question.c4}`,
    ].join("\n"),
    quickReply: {
      items: [1, 2, 3, 4].map((choice) => ({
        type: "action",
        action: {
          type: "postback",
          label: CHOICES[choice - 1],
          data: `qid=${question.id}&c=${choice}`,
          displayText: `回答 ${CHOICES[choice - 1]}`,
        },
      })),
    },
  };
}

export function buildAnswerMessage(params: {
  isCorrect: boolean;
  selected: number;
  correct: number;
  explanation: string;
  blockNumber: number;
  blockProgress: number;
  blockTotal: number;
  blockRate: number;
  totalAnswered: number;
  totalQuestions: number;
  streakCount: number;
}): LineTextMessage {
  const symbol = params.isCorrect ? "✅" : "❌";
  return {
    type: "text",
    text: [
      `${symbol} 正解：${CHOICES[params.correct - 1] ?? params.correct}`,
      `あなたの回答：${CHOICES[params.selected - 1] ?? params.selected}`,
      `理由：${params.explanation}`,
      "",
      `Block${params.blockNumber}：${params.blockProgress}/${params.blockTotal}`,
      `Block正答率：${toPercent(params.blockRate)}%`,
      `総進捗：${params.totalAnswered}/${params.totalQuestions}（${toPercent(
        params.totalAnswered / Math.max(1, params.totalQuestions),
      )}%）`,
      `連続：${params.streakCount}日`,
    ].join("\n"),
  };
}
