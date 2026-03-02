const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJstDate(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

export function getTodayJstDate(now = new Date()): string {
  return toJstDate(now).toISOString().slice(0, 10);
}

export function getYesterdayJstDate(now = new Date()): string {
  const jstNow = toJstDate(now);
  const yesterday = new Date(jstNow.getTime() - 24 * 60 * 60 * 1000);
  return yesterday.toISOString().slice(0, 10);
}
