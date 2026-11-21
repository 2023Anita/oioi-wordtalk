/** Pull the first JSON object out of a model reply (handles ```json fences and <think> blocks). */
export function extractJson(text: string): unknown {
  const clean = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : clean;
  const start = body.indexOf("{");
  if (start < 0) throw new Error("模型没有返回 JSON");
  // Walk to the matching closing brace, respecting strings.
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < body.length; i++) {
    const ch = body[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return JSON.parse(body.slice(start, i + 1));
  }
  throw new Error("JSON 不完整");
}

/* ---------- tiny validators: return the cleaned value or throw ---------- */

export class SchemaError extends Error {}
const fail = (path: string, what: string): never => {
  throw new SchemaError(`${path}: ${what}`);
};
export const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const obj = (v: unknown, path: string) => (isObj(v) ? v : fail(path, "应为对象"));
export const str = (v: unknown, path: string, { min = 1, max = 4000 } = {}) =>
  typeof v === "string" && v.trim().length >= min ? v.trim().slice(0, max) : fail(path, "应为非空字符串");
export const optStr = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const bool = (v: unknown, path: string) => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : fail(path, "应为布尔值"));
export const int = (v: unknown, path: string, lo: number, hi: number) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= lo && n <= hi ? n : fail(path, `应为 ${lo}-${hi} 的整数`);
};
export const arr = <T>(v: unknown, path: string, item: (x: unknown, p: string) => T, { min = 0, max = 50 } = {}) => {
  if (!Array.isArray(v)) return fail(path, "应为数组");
  const out = v.slice(0, max).map((x, i) => item(x, `${path}[${i}]`));
  return out.length >= min ? out : fail(path, `至少 ${min} 项`);
};
export const oneOf = <T extends string>(v: unknown, path: string, options: readonly T[]) =>
  options.includes(v as T) ? (v as T) : fail(path, `应为 ${options.join("/")}`);
