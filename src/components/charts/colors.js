export const FRAMEWORKS = ['node:http', 'Express', 'Fastify', 'Hono', 'Koa', 'ergo'];

export const COLORS = ['#16a34a', '#eab308', '#0ea5e9', '#f97316', '#8b5cf6', '#4F46E5'];

export const COLOR_MAP = Object.fromEntries(FRAMEWORKS.map((f, i) => [f, COLORS[i]]));
