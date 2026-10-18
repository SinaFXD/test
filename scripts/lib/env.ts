import { existsSync } from 'node:fs';

/** Load `.env` (if present) using Node's built-in parser. Never prints values. */
export function loadEnv(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

/** Remove secrets from strings before they are logged. */
export function redact(text: string): string {
  return text.replace(/api_key=[^&\s]+/gi, 'api_key=***');
}
