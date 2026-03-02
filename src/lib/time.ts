const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toJst(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET_MS);
}

export function todayJst(now = new Date()): string {
  return toJst(now).toISOString().slice(0, 10);
}

export function yesterdayJst(now = new Date()): string {
  return toJst(new Date(now.getTime() - 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
}
