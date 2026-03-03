import type { LineTextMessage, QuestionRow } from "../types";

const CHOICES = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];
const BLOCK_THEMES: Record<number, string> = {
  1: "民法",
  2: "区分所有法",
  3: "建替え",
  4: "適正化法",
  5: "設備・維持保全",
};

function blockLabel(blockNumber: number): string {
  const theme = BLOCK_THEMES[blockNumber];
  if (!theme) {
    return `Block${blockNumber}`;
  }
  return `Block${blockNumber}(${theme})`;
}

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
      `【${blockLabel(question.block_number)}】`,
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
      `${blockLabel(params.blockNumber)}：${params.blockProgress}/${params.blockTotal}`,
      `Block正答率：${toPercent(params.blockRate)}%`,
      `総進捗：${params.totalAnswered}/${params.totalQuestions}（${toPercent(
        params.totalAnswered / Math.max(1, params.totalQuestions),
      )}%）`,
      `連続：${params.streakCount}日`,
    ].join("\n"),
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "postback",
            label: "もう一問",
            data: "action=next",
            displayText: "もう一問解く",
          },
        },
        {
          type: "action",
          action: {
            type: "postback",
            label: "やめとく",
            data: "action=stop",
            displayText: "やめとく",
          },
        },
      ],
    },
  };
}
