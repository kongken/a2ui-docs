// 动态值求值：字面量 / {path} 数据绑定 / {call} 函数调用
// 以及 basic catalog 中注册的函数实现

import { getAt, parsePointer, resolvePath } from "./pointer"
import { isDataBinding, isFunctionCall, type FunctionCall, type ProtocolVersion, type RemoteResult } from "./types"

/** v1.0：渲染器找不到本地函数时，转交 Agent 执行（callAgentFunction） */
export interface RemoteBridge {
  lookup(key: string): RemoteResult | undefined
  request(key: string, callFunction: { call: string; catalogId?: string; args: Record<string, unknown> }): void
}

export interface EvalContext {
  data: Record<string, unknown>
  /** 当前集合作用域，例如模板中的 "/items/2"；根作用域为 "" */
  scope: string
  /** 默认 v0.9 */
  version?: ProtocolVersion
  remote?: RemoteBridge
}

/** 远程函数尚未返回时的占位值 */
export const PENDING: Readonly<{ __a2uiPending: true }> = Object.freeze({ __a2uiPending: true })
export const isPending = (v: unknown) => v === PENDING

/** v1.0 校验函数的返回结构 */
export interface ValidationResult {
  valid: boolean
  code?: string
  message?: string
  severity?: "error" | "warning" | "info"
}

export function isValidationResult(v: unknown): v is ValidationResult {
  return !!v && typeof v === "object" && typeof (v as ValidationResult).valid === "boolean"
}

/** 布尔语义：ValidationResult 取 valid；等待中视为 false */
export function truthy(v: unknown): boolean {
  if (isPending(v)) return false
  if (isValidationResult(v)) return v.valid
  return Boolean(v)
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
  if (isPending(v)) return "…"
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

  // —— 逻辑（v1.0 的校验函数返回 ValidationResult，按 valid 参与运算）——
  and: ({ values }) => Array.isArray(values) && values.every(truthy),
  or: ({ values }) => Array.isArray(values) && values.some(truthy),
  not: ({ value }) => !truthy(value),

  // formatString 规范示例里的 ${now()}
  now: () => new Date().toISOString(),
}

const VALIDATORS = new Set(["required", "regex", "length", "numeric", "email"])

/** 渲染器本地可执行的函数（v1.0 另有内置的 @index） */
export function isLocalFunction(name: string, version: ProtocolVersion = "v0.9") {
  return name in BASIC_FUNCTIONS || (version === "v1.0" && name === "@index")
}

/** 远程调用的缓存键：同样的函数 + 参数只请求一次 */
export function remoteKey(call: string, args: Record<string, unknown>, catalogId?: string) {
  return JSON.stringify({ call, catalogId, args })
}

/** @index：模板作用域中当前元素的下标（仅 v1.0） */
function currentIndex(ctx: EvalContext): number | undefined {
  const last = parsePointer(ctx.scope).at(-1)
  return last !== undefined && /^\d+$/.test(last) ? Number(last) : undefined
}

/** 用已解析的参数调用函数 */
function invoke(name: string, args: Record<string, unknown>, ctx: EvalContext, catalogId?: string): unknown {
  const version = ctx.version ?? "v0.9"
  if (version === "v1.0" && name === "@index") {
    const i = currentIndex(ctx)
    if (i === undefined) {
      console.warn("[a2ui] @index 只能在模板（集合作用域）中使用")
      return undefined
    }
    return i + (Number(args.offset) || 0)
  }
  const fn = BASIC_FUNCTIONS[name]
  if (!fn) {
    if (version === "v1.0" && ctx.remote) {
      const key = remoteKey(name, args, catalogId)
      const hit = ctx.remote.lookup(key)
      if (hit?.status === "done") return hit.value
      if (hit?.status === "error") return null
      if (!hit) ctx.remote.request(key, { call: name, ...(catalogId ? { catalogId } : {}), args })
      return PENDING
    }
    console.warn(`[a2ui] 未注册的函数: ${name}`)
    return undefined
  }
  const result = fn(args, ctx)
  return version === "v1.0" && VALIDATORS.has(name) ? { valid: Boolean(result) } : result
}

export function callFunction(fc: FunctionCall, ctx: EvalContext): unknown {
  const args: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fc.args ?? {})) {
    args[k] = resolveValue(v, ctx)
  }
  return invoke(fc.call, args, ctx, (fc as { catalogId?: string }).catalogId)
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
  const fn = /^(@?[A-Za-z_][\w]*)\s*\(([\s\S]*)\)$/.exec(e)
  if (fn) {
    const [, name, argSrc] = fn
    const args: Record<string, unknown> = {}
    for (const part of splitTopLevel(argSrc)) {
      const idx = part.indexOf(":")
      if (idx === -1) continue
      args[part.slice(0, idx).trim()] = evalLiteral(part.slice(idx + 1), ctx)
    }
    return invoke(name, args, ctx)
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
    const result = resolveValue(condition, ctx)
    if (isPending(result)) failed.push("验证中…")
    // v1.0：ValidationResult 自带 message，CheckRule.message 作为兜底
    else if (isValidationResult(result)) {
      if (!result.valid) failed.push(result.message ?? r.message ?? "校验未通过")
    } else if (!result) failed.push(r.message ?? "校验未通过")
  }
  return failed
}
