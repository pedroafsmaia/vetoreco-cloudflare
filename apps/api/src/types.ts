export type Env = {
  DB: D1Database;
  /** R2 bucket used to store generated dossier PDFs (cache) */
  DOSSIERS?: R2Bucket;
  /** Comma-separated list of allowed origins for CORS. Example: https://vetoreco.pages.dev,http://localhost:5173 */
  APP_ORIGIN: string;
  SESSION_DAYS?: string;
  /** Set to 'true' to force Secure cookies even in local dev. Defaults to auto-detect (https). */
  COOKIE_SECURE?: string;
};

export type Stage = 'study' | 'anteproject' | 'executive' | 'construction';
export type Typology = 'residential' | 'commercial' | 'public';

export type ApiResponse<T> =
  | { success: true; data: T; requestId: string }
  | { success: false; error: { code: string; message: string; details?: unknown }; requestId: string };
