// 把按 v0.9 编写的消息转换为地道的 v1.0 写法（课程演示据此在两个版本间切换）
//
// 主要差异：
// - version → "v1.0"，basic catalogId → v1_0
// - createSurface 不再有 theme
// - Text 的 variant 只剩 caption / body，标题改用 Markdown（# / ## …）
// - FunctionCall 不再携带 returnType
// - TextField 没有 validationRegexp，改用 checks + regex
// - updateDataModel 的 value 必填，删除改为 value: null
// - 自定义组件不再需要“包含 basic 的大 catalog”：surface 用 basic，领域组件自带 catalogId

import { TRAVEL_CATALOG_ID, TRAVEL_CATALOG_V1, TRAVEL_CATALOG_V1_ID } from "./catalog"
import {
  BASIC_CATALOG_ID,
  BASIC_CATALOG_V1_ID,
  isDataBinding,
  isFunctionCall,
  protocolOf,
  type ComponentDef,
  type ProtocolVersion,
} from "./types"

const CATALOG_MAP: Record<string, string> = {
  [BASIC_CATALOG_ID]: BASIC_CATALOG_V1_ID,
  "https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json": BASIC_CATALOG_V1_ID,
  [TRAVEL_CATALOG_ID]: BASIC_CATALOG_V1_ID,
}

const HEADING: Record<string, number> = { h1: 1, h2: 2, h3: 3, h4: 4, h5: 5 }

/** 深度移除 FunctionCall 上的 returnType */
function stripReturnType(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(stripReturnType)
  if (!v || typeof v !== "object") return v
  const out: Record<string, unknown> = {}
  for (const [k, x] of Object.entries(v)) {
    if (k === "returnType" && isFunctionCall(v)) continue
    out[k] = stripReturnType(x)
  }
  return out
}

function headingText(text: unknown, level: number): unknown {
  const hashes = "#".repeat(level) + " "
  if (typeof text === "string") return text.startsWith("#") ? text : hashes + text
  if (isDataBinding(text)) return { call: "formatString", args: { value: `${hashes}\${${text.path}}` } }
  if (isFunctionCall(text) && text.call === "formatString" && typeof text.args?.value === "string") {
    return { ...text, args: { ...text.args, value: hashes + text.args.value } }
  }
  return text
}

export function convertComponent(c: ComponentDef, travel = false): ComponentDef {
  let comp = stripReturnType(c) as ComponentDef
  if (comp.component === "Text" && typeof comp.variant === "string" && HEADING[comp.variant]) {
    const { variant, ...rest } = comp
    comp = "text" in rest ? { ...rest, text: headingText(rest.text, HEADING[variant as string]) } : rest
  }
  if (comp.component === "TextField" && typeof comp.validationRegexp === "string") {
    const { validationRegexp, ...rest } = comp
    const checks = Array.isArray(rest.checks) ? rest.checks : []
    comp = {
      ...rest,
      checks: [...checks, { condition: { call: "regex", args: { value: rest.value, pattern: validationRegexp } }, message: "格式不正确" }],
    }
  }
  if (travel && TRAVEL_CATALOG_V1.components[comp.component] && !comp.catalogId) {
    comp = { ...comp, catalogId: TRAVEL_CATALOG_V1_ID }
  }
  return comp
}

/** 把一组 v0.9 消息转换为目标版本；已是目标版本的消息原样保留 */
export function convertMessages(messages: unknown[], target: ProtocolVersion): unknown[] {
  if (target === "v0.9") return messages
  const travelSurfaces = new Set<string>()
  return messages.map((m) => {
    if (!m || typeof m !== "object" || protocolOf((m as { version?: unknown }).version) !== "v0.9") return m
    const { version: _v, ...rest } = m as Record<string, unknown>
    void _v
    const out: Record<string, unknown> = { version: "v1.0" }
    for (const [type, raw] of Object.entries(rest)) {
      const body = { ...(raw as Record<string, unknown>) }
      if (type === "createSurface") {
        delete body.theme
        if (body.catalogId === TRAVEL_CATALOG_ID) travelSurfaces.add(String(body.surfaceId))
        if (typeof body.catalogId === "string" && CATALOG_MAP[body.catalogId]) body.catalogId = CATALOG_MAP[body.catalogId]
      }
      if (type === "updateComponents" && Array.isArray(body.components)) {
        const travel = travelSurfaces.has(String(body.surfaceId))
        body.components = (body.components as ComponentDef[]).map((c) => (c && typeof c === "object" ? convertComponent(c, travel) : c))
      }
      if (type === "updateDataModel" && !("value" in body)) body.value = null
      out[type] = body
    }
    return out
  })
}

/** 用于展示：把单个消息或组件片段转换为目标版本 */
export function convertSnippet<T>(snippet: T, target: ProtocolVersion): T {
  if (target === "v0.9" || !snippet || typeof snippet !== "object") return snippet
  if (Array.isArray(snippet)) return convertMessages(snippet, target) as T
  if ("version" in snippet) return convertMessages([snippet], target)[0] as T
  if ("component" in snippet && "id" in snippet) return convertComponent(snippet as ComponentDef) as T
  return stripReturnType(snippet) as T
}
