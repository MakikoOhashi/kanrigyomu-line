const REQUIRED_ENV_KEYS = [
  "LINE_CHANNEL_SECRET",
  "LINE_CHANNEL_ACCESS_TOKEN",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function getEnv(key: (typeof REQUIRED_ENV_KEYS)[number]): string;
export function getEnv(key: string): string;
export function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function validateRequiredEnv(): void {
  for (const key of REQUIRED_ENV_KEYS) {
    getEnv(key);
  }
}
