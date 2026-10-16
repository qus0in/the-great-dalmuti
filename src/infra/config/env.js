export class ConfigError extends Error {
  constructor(missingKeys) {
    const list = Array.isArray(missingKeys) ? missingKeys : [missingKeys];
    super(`Missing required environment variables: ${list.join(', ')}`);
    this.name = 'ConfigError';
    this.code = 'MISSING_ENV_VARS';
    this.missingKeys = [...list];
  }
}

export const REQUIRED_ENV_KEYS = Object.freeze([
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_JWKS_URL',
]);

export function validateEnv(env = process.env) {
  const missing = REQUIRED_ENV_KEYS.filter(
    (key) => !env[key] || String(env[key]).trim() === '',
  );
  if (missing.length > 0) {
    throw new ConfigError(missing);
  }
}

export function createConfig(env = process.env) {
  validateEnv(env);
  const publicConfig = Object.freeze({
    supabaseUrl: env.SUPABASE_URL,
    supabasePublishableKey: env.SUPABASE_PUBLISHABLE_KEY,
  });

  return Object.freeze({
    publicConfig,
    getSecretKey: () => env.SUPABASE_SECRET_KEY,
    getJwksUrl: () => env.SUPABASE_JWKS_URL,
  });
}

let cachedConfig = null;

export function loadConfig(env = process.env) {
  if (!cachedConfig || env !== process.env) {
    const config = createConfig(env);
    if (env === process.env) {
      cachedConfig = config;
    }
    return config;
  }
  return cachedConfig;
}
