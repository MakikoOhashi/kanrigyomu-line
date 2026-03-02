import { requireEnv } from "./env";
import type { LineTextMessage } from "../types";

async function callLine(path: "reply" | "push", payload: unknown): Promise<void> {
  const token = requireEnv("LINE_CHANNEL_ACCESS_TOKEN");
  const response = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE ${path} failed (${response.status}): ${body}`);
  }
}

export async function replyMessage(replyToken: string, messages: LineTextMessage[]): Promise<void> {
  await callLine("reply", { replyToken, messages });
}

export async function pushMessage(to: string, messages: LineTextMessage[]): Promise<void> {
  await callLine("push", { to, messages });
}
