// 动态值求值：字面量 / {path} 数据绑定 / {call} 函数调用
// 以及 basic catalog 中注册的函数实现

import { getAt, resolvePath } from "./pointer"
import { isDataBinding, isFunctionCall, type FunctionCall } from "./types"

export interface EvalContext {
  data: Record<string, unknown>
  /** 当前集合作用域，例如模板中的 "/items/2"；根作用域为 "" */
  scope: string
}

export function resolveValue(value: unknown, ctx: EvalContext): unknown {
  if (isDataBinding(value)) {
    return getAt(ctx.data, resolvePath(value.path, ctx.scope))
  }
  if (isFunctionCall(value)) return callFunction(value, ctx)
  if (Array.isArray(value)) return value.map((v) => resolveValue(v, ctx))
  return value
}

export function resolveString(value: unknown, ctx: EvalContext): string {
  return stringify(resolveValue(value, ctx))
}

export function stringify(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

type Fn = (args: Record<string, unknown>, ctx: EvalContext) => unknown

const isEmpty = (v: unknown) =>
  v === null ||
  v === undefined ||
  v === false ||
  (typeof v === "string" && v.trim() === "") ||
  (Array.isArray(v) && v.length === 0)

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]

/** Unicode TR35 日期模式（basic catalog 描述的子集） */
export function formatDate(value: unknown, format: string): string {
  const d = value instanceof Date ? value : new Date(String(value ?? ""))
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number, w = 2) => String(n).padStart(w, "0")
  const h12 = d.getHours() % 12 || 12
  return format.replace(
    /'([^']*)'|yyyy|yy|MMMM|MMM|MM|M|dd|d|EEEE|E{1,3}|HH|H|hh|h|mm|ss|a/g,
    (tok, literal) => {
      if (literal !== undefined) return literal
      switch (tok) {
        case "yyyy":
          return String(d.getFullYear())
        case "yy":
          return pad(d.getFullYear() % 100)
        case "MMMM":
          return MONTHS[d.getMonth()]
        case "MMM":
          return MONTHS[d.getMonth()].slice(0, 3)
        case "MM":
          return pad(d.getMonth() + 1)
        case "M":
          return String(d.getMonth() + 1)
        case "dd":
          return pad(d.getDate())
        case "d":
          return String(d.getDate())
        case "EEEE":
          return DAYS[d.getDay()]
        case "HH":
          return pad(d.getHours())
        case "H":
          return String(d.getHours())
        case "hh":
          return pad(h12)
        case "h":
          return String(h12)
        case "mm":
          return pad(d.getMinutes())
        case "ss":
          return pad(d.getSeconds())
        case "a":
          return d.getHours() < 12 ? "AM" : "PM"
        default:
          // E / EE / EEE
          return DAYS[d.getDay()].slice(0, 3)
      }
    }
  )
}

function numberFormat(
  args: Record<string, unknown>,
  extra: Intl.NumberFormatOptions = {}
) {
  const decimals = typeof args.decimals === "number" ? args.decimals : undefined
  return new Intl.NumberFormat("en-US", {
    ...extra,
    useGrouping: args.grouping === undefined ? true : Boolean(args.grouping),
    ...(decimals !== undefined
      ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
      : {}),
  })
}

export const BASIC_FUNCTIONS: Record<string, Fn> = {
  // —— 校验类：返回 boolean ——
  required: ({ value }) => !isEmpty(value),
  regex: ({ value, pattern }) => {
    try {
      return new RegExp(String(pattern)).test(stringify(value))
    } catch {
      return false
    }
  },
  length: ({ value, min, max }) => {
    const len = stringify(value).length
    if (typeof min === "number" && len < min) return false
    if (typeof max === "number" && len > max) return false
    return true
  },
  numeric: ({ value, min, max }) => {
    const n = Number(value)
    if (value === "" || value == null || Number.isNaN(n)) return false
    if (typeof min === "number" && n < min) return false
    if (typeof max === "number" && n > max) return false
    return true
  },
  email: ({ value }) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(stringify(value).trim()),

  // —— 格式化类：返回 string ——
  formatString: ({ value }, ctx) => interpolate(stringify(value), ctx),
  formatNumber: (args) => {
    const n = Number(args.value)
    return Number.isNaN(n) ? "" : numberFormat(args).format(n)
  },
  formatCurrency: (args) => {
    const n = Number(args.value)
    if (Number.isNaN(n)) return ""
    try {
      return numberFormat(args, {
        style: "currency",
        currency: String(args.currency || "USD"),
      }).format(n)
    } catch {
      return String(n)
    }
  },
  formatDate: ({ value, format }) => formatDate(value, stringify(format)),
  pluralize: (args) => {
    const n = Number(args.value)
    if (n === 0 && typeof args.zero === "string") return args.zero
    const cat = new Intl.PluralRules("en-US").select(n)
    const hit = args[cat]
    return stringify(typeof hit === "string" ? hit : args.other)
  },

  // —— 本地动作 ——
  openUrl: ({ url }) => {
    if (typeof url === "string" && url) {
      window.open(url, "_blank", "noopener,noreferrer")
    }
    return undefined
  },

  // —— 逻辑 ——
  and: ({ values }) => Array.isArray(values) && values.every(Boolean),
  or: ({ values }) => Array.isArray(values) && values.some(Boolean),
  not: ({ value }) => !value,

  // formatString 规范示例里的 ${now()}
  now: () => new Date().toISOString(),
}

export function callFunction(fc: FunctionCall, ctx: EvalContext): unknown {
  const fn = BASIC_FUNCTIONS[fc.call]
  if (!fn) {
    console.warn(`[a2ui] 未注册的函数: ${fc.call}`)
    return undefined
  }
  const args: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fc.args ?? {})) {
    args[k] = resolveValue(v, ctx)
  }
  return fn(args, ctx)
}

// ---------------------------------------------------------------------------
// formatString: "${/path}"、"${relative}"、"${fn(arg:${/x}, fmt:'yyyy')}"
// ---------------------------------------------------------------------------

/** 从 start（指向 "${" 之后）找到匹配的 "}"，考虑嵌套与引号 */
function findClose(src: string, start: number): number {
  let depth = 1
  let quote: string | null = null
  for (let i = start; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (ch === quote) quote = null
      continue
    }
    if (ch === "'" || ch === '"') quote = ch
    else if (ch === "$" && src[i + 1] === "{") {
      depth++
      i++
    } else if (ch === "}") {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

export function interpolate(template: string, ctx: EvalContext): string {
  let out = ""
  let i = 0
  while (i < template.length) {
    if (template[i] === "\\" && template.startsWith("${", i + 1)) {
      out += "${"
      i += 3
      continue
    }
    if (template.startsWith("${", i)) {
      const end = findClose(template, i + 2)
      if (end === -1) {
        out += template.slice(i)
        break
      }
      out += stringify(evalExpression(template.slice(i + 2, end), ctx))
      i = end + 1
      continue
    }
    out += template[i]
    i++
  }
  return out
}

function splitTopLevel(src: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let cur = ""
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quote) {
      if (ch === quote) quote = null
    } else if (ch === "'" || ch === '"') quote = ch
    else if (ch === "{" || ch === "(") depth++
    else if (ch === "}" || ch === ")") depth--
    else if (ch === "," && depth === 0) {
      parts.push(cur)
      cur = ""
      continue
    }
    cur += ch
  }
  if (cur.trim()) parts.push(cur)
  return parts
}

function evalLiteral(raw: string, ctx: EvalContext): unknown {
  const s = raw.trim()
  if (/^'.*'$|^".*"$/.test(s)) return s.slice(1, -1)
  if (s === "true") return true
  if (s === "false") return false
  if (s !== "" && !Number.isNaN(Number(s))) return Number(s)
  if (s.startsWith("${") && s.endsWith("}")) {
    return evalExpression(s.slice(2, -1), ctx)
  }
  return evalExpression(s, ctx)
}

function evalExpression(expr: string, ctx: EvalContext): unknown {
  const e = expr.trim()
  const fn = /^([A-Za-z_][\w]*)\s*\(([\s\S]*)\)$/.exec(e)
  if (fn) {
    const [, name, argSrc] = fn
    const args: Record<string, unknown> = {}
    for (const part of splitTopLevel(argSrc)) {
      const idx = part.indexOf(":")
      if (idx === -1) continue
      args[part.slice(0, idx).trim()] = evalLiteral(part.slice(idx + 1), ctx)
    }
    const impl = BASIC_FUNCTIONS[name]
    return impl ? impl(args, ctx) : undefined
  }
  return getAt(ctx.data, resolvePath(e, ctx.scope))
}

// ---------------------------------------------------------------------------
// checks：返回未通过规则的 message 列表
// ---------------------------------------------------------------------------

export function failedChecks(checks: unknown, ctx: EvalContext): string[] {
  if (!Array.isArray(checks)) return []
  const failed: string[] = []
  for (const rule of checks) {
    if (!rule || typeof rule !== "object") continue
    const r = rule as { condition?: unknown; message?: string }
    // 规范 schema 使用 { condition, message }；部分文档示例把 call 直接写在规则上
    const condition = "condition" in r ? r.condition : rule
    if (!resolveValue(condition, ctx)) failed.push(r.message ?? "校验未通过")
  }
  return failed
}
