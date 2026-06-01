export type Env = {
  PORT: number;
  MONGO_URI: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_TTL_SECONDS: number;
  JWT_REFRESH_TTL_SECONDS: number;
  BOOTSTRAP_ADMIN_USERNAME: string;
  BOOTSTRAP_ADMIN_EMAIL: string;
  BOOTSTRAP_ADMIN_PASSWORD: string;
};

const DEFAULT_ENV: Env = {
  PORT: 3000,
  MONGO_URI: 'mongodb://localhost:27017/identity_db',
  JWT_ACCESS_SECRET: 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: 'dev-refresh-secret-change-me',
  JWT_ACCESS_TTL_SECONDS: 15 * 60,
  JWT_REFRESH_TTL_SECONDS: 30 * 24 * 60 * 60,
  BOOTSTRAP_ADMIN_USERNAME: 'admin',
  BOOTSTRAP_ADMIN_EMAIL: 'admin@example.com',
  BOOTSTRAP_ADMIN_PASSWORD: 'ChangeMe123!',
};

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

export function envValidation(raw: Record<string, unknown>): Env {
  const env: Env = {
    PORT: readNumber(raw.PORT, DEFAULT_ENV.PORT),
    MONGO_URI: readString(raw.MONGO_URI, DEFAULT_ENV.MONGO_URI),
    JWT_ACCESS_SECRET: readString(
      raw.JWT_ACCESS_SECRET,
      DEFAULT_ENV.JWT_ACCESS_SECRET,
    ),
    JWT_REFRESH_SECRET: readString(
      raw.JWT_REFRESH_SECRET,
      DEFAULT_ENV.JWT_REFRESH_SECRET,
    ),
    JWT_ACCESS_TTL_SECONDS: readNumber(
      raw.JWT_ACCESS_TTL_SECONDS,
      DEFAULT_ENV.JWT_ACCESS_TTL_SECONDS,
    ),
    JWT_REFRESH_TTL_SECONDS: readNumber(
      raw.JWT_REFRESH_TTL_SECONDS,
      DEFAULT_ENV.JWT_REFRESH_TTL_SECONDS,
    ),
    BOOTSTRAP_ADMIN_USERNAME: readString(
      raw.BOOTSTRAP_ADMIN_USERNAME,
      DEFAULT_ENV.BOOTSTRAP_ADMIN_USERNAME,
    ),
    BOOTSTRAP_ADMIN_EMAIL: readString(
      raw.BOOTSTRAP_ADMIN_EMAIL,
      DEFAULT_ENV.BOOTSTRAP_ADMIN_EMAIL,
    ),
    BOOTSTRAP_ADMIN_PASSWORD: readString(
      raw.BOOTSTRAP_ADMIN_PASSWORD,
      DEFAULT_ENV.BOOTSTRAP_ADMIN_PASSWORD,
    ),
  };

  if (!env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }
  if (!env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is required');
  }
  if (!env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET is required');
  }

  return env;
}
