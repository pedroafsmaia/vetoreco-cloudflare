export type Bindings = {
  DB: D1Database;
  APP_ORIGIN: string;
  SESSION_COOKIE_NAME?: string;
};

export type Variables = {
  userId: string;
  sessionId: string;
  requestId: string;
};

export type ApiOk<T = unknown> = {
  success: true;
  data: T;
  requestId?: string;
};

export type ApiErr = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: Variables;
};
