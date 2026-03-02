const REQUIRED_ENV_KEYS = [
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_CHANNEL_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function requireEnv(key: (typeof REQUIRED_ENV_KEYS)[number]): string;
export function requireEnv(key: string): string;
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function assertRequiredEnv(): void {
  for (const key of REQUIRED_ENV_KEYS) {
    requireEnv(key);
  }
}

export function getMissingRequiredEnv(): string[] {
  return REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
}
