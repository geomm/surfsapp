import { AsyncLocalStorage } from 'node:async_hooks';

interface RequestContext {
  requestId: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn);
}

type LogLevel = 'info' | 'warn' | 'error';

function emit(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
  const entry: Record<string, unknown> = {
    level,
    timestamp: new Date().toISOString(),
    message,
  };
  const ctx = requestContext.getStore();
  if (ctx) entry.requestId = ctx.requestId;
  if (fields) Object.assign(entry, fields);
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(entry) + '\n');
}

export const log = {
  info: (message: string, fields?: Record<string, unknown>) => emit('info', message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit('warn', message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit('error', message, fields),
};
