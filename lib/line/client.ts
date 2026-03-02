import { getEnv } from "@/lib/env";

export type LineTextMessage = {
  type: "text";
  text: string;
  quickReply?: {
    items: Array<{
      type: "action";
      action: {
        type: "postback";
        label: string;
        data: string;
        displayText: string;
      };
    }>;
  };
};

type ReplyRequest = {
  replyToken: string;
  messages: LineTextMessage[];
};

type PushRequest = {
  to: string;
  messages: LineTextMessage[];
};

async function callLineApi(path: string, payload: ReplyRequest | PushRequest): Promise<void> {
  const accessToken = getEnv("LINE_CHANNEL_ACCESS_TOKEN");
  const response = await fetch(`https://api.line.me/v2/bot/message/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LINE ${path} API failed: ${response.status} ${body}`);
  }
}

export async function sendLineReply(params: ReplyRequest): Promise<void> {
  await callLineApi("reply", params);
}

export async function sendLinePush(params: PushRequest): Promise<void> {
  await callLineApi("push", params);
}
