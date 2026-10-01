// 消息处理器：把 Agent 发来的 A2UI 消息应用到客户端状态（纯函数）
// 按消息中的 version 路由：v0.9 / v0.9.1 与 v1.0 的规则分别实现

import { CATALOGS, enumValues, requiredProps, type CatalogDef } from "./catalog"
import { setAt } from "./pointer"
import { runRendererFunction } from "./renderer-functions"
import {
  LEGACY_V08_TYPES,
  SERVER_MESSAGE_TYPES,
  protocolOf,
  type ComponentDef,
  type ErrorPayload,
  type ProtocolVersion,
  type Surface,
  type SurfacesState,
} from "./types"

export const SUPPORTED_VERSIONS = ["v0.9", "v0.9.1", "v1.0"]

/** 客户端需要回给 Agent 的消息（error / rendererFunctionResponse） */
export type Reply = Record<string, unknown>

export interface ProcessResult {
  state: SurfacesState
  errors: ErrorPayload[]
  replies: Reply[]
}

const MAX_DEPTH = 50

const err = (
  surfaceId: string,
  message: string,
  path?: string,
  code = path ? "VALIDATION_FAILED" : "INVALID_MESSAGE"
): ErrorPayload => ({ code, ...(surfaceId ? { surfaceId } : {}), message, ...(path ? { path } : {}) })

function depthOf(v: unknown, d = 0): number {
  if (d > MAX_DEPTH || !v || typeof v !== "object") return d
  let max = d
  for (const x of Object.values(v)) max = Math.max(max, depthOf(x, d + 1))
  return max
}

/** 组件引用的子组件 ID（静态引用；模板按 componentId 计） */
export function childIds(c: ComponentDef): string[] {
  const ids: string[] = []
  if (Array.isArray(c.children)) ids.push(...c.children.map(String))
  else if (c.children && typeof c.children === "object") {
    const t = (c.children as { componentId?: unknown }).componentId
    if (typeof t === "string") ids.push(t)
  }
  for (const k of ["child", "trigger", "content"]) if (typeof c[k] === "string") ids.push(c[k] as string)
  if (Array.isArray(c.tabs)) for (const t of c.tabs as { child?: unknown }[]) if (typeof t?.child === "string") ids.push(t.child)
  return ids
}

function findCycle(components: Record<string, ComponentDef>): string[] | null {
  const state: Record<string, 1 | 2> = {}
  const stack: string[] = []
  const visit = (id: string): string[] | null => {
    if (state[id] === 2) return null
    if (state[id] === 1) return [...stack.slice(stack.indexOf(id)), id]
    const c = components[id]
    if (!c) return null
    state[id] = 1
    stack.push(id)
    for (const child of childIds(c)) {
      const cyc = visit(child)
      if (cyc) return cyc
    }
    stack.pop()
    state[id] = 2
    return null
  }
  for (const id of Object.keys(components)) {
    const cyc = visit(id)
    if (cyc) return cyc
  }
  return null
}

/** 解析组件所属的 catalog：v1.0 先看组件自己的 catalogId，再看 surface 默认值 */
export function resolveCatalogId(surface: Pick<Surface, "version" | "catalogId">, comp: ComponentDef) {
  if (surface.version === "v1.0" && typeof comp.catalogId === "string") return comp.catalogId
  return surface.catalogId
}

function validateComponents(
  surface: Surface,
  list: unknown[],
  base: string
): { components: Record<string, ComponentDef>; errors: ErrorPayload[]; fatal?: ErrorPayload } {
  const errors: ErrorPayload[] = []
  const sid = surface.id
  const v1 = surface.version === "v1.0"
  const seen = new Set<string>()
  const incoming: ComponentDef[] = []

  for (let i = 0; i < list.length; i++) {
    const c = list[i]
    const at = `${base}/${i}`
    if (!c || typeof c !== "object") {
      errors.push(err(sid, "组件必须是对象", at))
      continue
    }
    const comp = c as ComponentDef
    if (typeof comp.id !== "string" || !comp.id) {
      errors.push(err(sid, "组件缺少 id", `${at}/id`))
      continue
    }
    if (seen.has(comp.id)) {
      return { components: surface.components, errors, fatal: err(sid, `同一条消息中出现重复的组件 id "${comp.id}"，整条消息被拒绝`, `${at}/id`) }
    }
    seen.add(comp.id)
    if (typeof comp.component !== "string") {
      errors.push(err(sid, `组件 "${comp.id}" 缺少 component 类型`, `${at}/component`))
      continue
    }
    if (v1 && comp.component === "Surface") {
      errors.push(err(sid, `"Surface" 是 v1.0 保留的根容器类型，不能通过组件定义修改`, `${at}/component`))
      continue
    }

    const catalogId = resolveCatalogId(surface, comp)
    const catalog = catalogId ? CATALOGS[catalogId] : undefined
    if (!catalogId) {
      errors.push(err(sid, `组件 "${comp.id}" 没有 catalogId，surface 也没有默认 catalog，无法解析`, `${at}/catalogId`))
    } else if (!catalog) {
      errors.push(err(sid, `客户端不支持 catalog "${catalogId}"`, `${at}/catalogId`))
    } else if (catalog.protocol !== surface.version) {
      errors.push(err(sid, `catalog "${catalog.title}" 属于 ${catalog.protocol}，不能用于 ${surface.version} 的 surface`, `${at}/catalogId`))
    } else if (!catalog.components[comp.component]) {
      errors.push(err(sid, `"${comp.component}" 不在 catalog 中，客户端拒绝渲染`, `${at}/component`))
    } else {
      for (const p of requiredProps(catalog, comp.component)) {
        if (!(p in comp)) errors.push(err(sid, `${comp.component} "${comp.id}" 缺少必填属性 ${p}`, `${at}/${p}`))
      }
      for (const p of catalog.components[comp.component].props) {
        const allowed = enumValues(p)
        const value = comp[p.name]
        if (allowed && typeof value === "string" && !allowed.includes(value)) {
          errors.push(err(sid, `${comp.component}.${p.name} 不接受 "${value}"（可选：${allowed.join(" / ")}）`, `${at}/${p.name}`))
        }
      }
    }
    incoming.push(comp)
  }

  const components = { ...surface.components }
  for (const c of incoming) components[c.id] = c

  const cycle = findCycle(components)
  if (cycle) {
    return {
      components: surface.components,
      errors,
      fatal: err(sid, `检测到循环引用 ${cycle.join(" → ")}，整条消息被拒绝`, base, "CYCLE_DETECTED"),
    }
  }
  return { components, errors }
}

/** v1.0 组合约束：allowedParents / allowedChildren */
function compositionErrors(surface: Surface): ErrorPayload[] {
  const errors: ErrorPayload[] = []
  const metaOf = (c: ComponentDef) => {
    const id = resolveCatalogId(surface, c)
    return id ? CATALOGS[id]?.components[c.component] : undefined
  }
  const check = (parentType: string, parentMeta: ReturnType<typeof metaOf>, child: ComponentDef) => {
    const childMeta = metaOf(child)
    if (childMeta?.allowedParents && !childMeta.allowedParents.includes(parentType)) {
      errors.push(
        err(surface.id, `${child.component} "${child.id}" 只能放在 ${childMeta.allowedParents.join(" / ")} 中，不能放在 ${parentType} 里`, `/components/${child.id}`, "UNALLOWED_PARENT")
      )
    }
    if (parentMeta?.allowedChildren && !parentMeta.allowedChildren.includes(child.component)) {
      errors.push(err(surface.id, `${parentType} 不允许包含 ${child.component} "${child.id}"`, `/components/${child.id}`, "UNALLOWED_CHILD"))
    }
  }
  const root = surface.components.root
  if (root) check("Surface", undefined, root)
  for (const parent of Object.values(surface.components)) {
    for (const cid of childIds(parent)) {
      const child = surface.components[cid]
      if (child) check(parent.component, metaOf(parent), child)
    }
  }
  return errors
}

function withSurface(state: SurfacesState, surface: Surface): SurfacesState {
  return { ...state, surfaces: { ...state.surfaces, [surface.id]: surface } }
}

export function processMessage(state: SurfacesState, raw: unknown): ProcessResult {
  const errors: ErrorPayload[] = []
  const replies: Reply[] = []
  const done = (next: SurfacesState, reply: ProtocolVersion = "v0.9"): ProcessResult => ({
    state: next,
    errors,
    replies: [...replies, ...errors.map((error) => ({ version: reply, error }))],
  })

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(err("", "消息必须是 JSON 对象"))
    return done(state)
  }
  const msg = raw as Record<string, unknown>
  const types = SERVER_MESSAGE_TYPES.filter((t) => t in msg)
  const legacy = LEGACY_V08_TYPES.find((t) => t in msg)
  const protocol = protocolOf(msg.version)
  const reply = protocol ?? "v0.9"

  if (!("version" in msg)) {
    errors.push(err("", "缺少必填的 version 字段", "/version"))
    return done(state)
  }
  if (!protocol) {
    errors.push(err("", `不支持的协议版本 ${JSON.stringify(msg.version)}（支持 v0.9 / v0.9.1 / v1.0）`, "/version"))
    return done(state)
  }
  if (legacy && !types.length) {
    errors.push(err("", `"${legacy}" 是 v0.8 的消息，${protocol} 中不再支持`, `/${legacy}`))
    return done(state, reply)
  }
  if (types.length !== 1) {
    errors.push(err("", types.length ? `一条消息包含多个互相冲突的操作：${types.join("、")}` : "无法识别的消息类型"))
    return done(state, reply)
  }
  if (depthOf(msg) > MAX_DEPTH) {
    errors.push(err("", `消息嵌套超过 ${MAX_DEPTH} 层`, undefined, "RECURSION_LIMIT"))
    return done(state, reply)
  }

  const type = types[0]
  const body = (msg[type] ?? {}) as Record<string, unknown>

  if ((type === "callRendererFunction" || type === "agentFunctionResponse") && protocol !== "v1.0") {
    errors.push(err("", `${type} 是 v1.0 新增的消息，${protocol} 不支持`, `/${type}`))
    return done(state, reply)
  }

  // —— v1.0：Agent 调用渲染器函数 ——
  if (type === "callRendererFunction") {
    const functionCallId = String(body.functionCallId ?? "")
    const fc = (body.callFunction ?? {}) as { call?: string; catalogId?: string; args?: Record<string, unknown> }
    const catalog = fc.catalogId ? CATALOGS[fc.catalogId] : undefined
    const meta = fc.call ? catalog?.functions[fc.call] : undefined
    const callers = meta?.allowedCallers ?? "rendererOnly"
    if (!meta || callers === "rendererOnly") {
      replies.push({
        version: "v1.0",
        error: {
          code: "INVALID_FUNCTION_CALL",
          functionCallId,
          message: !catalog
            ? `无法解析函数 catalog "${fc.catalogId ?? ""}"`
            : !meta
              ? `函数 "${fc.call}" 未在 catalog 中注册`
              : `函数 "${fc.call}" 是 rendererOnly，不能由 Agent 远程调用`,
        },
      })
      return done(state, reply)
    }
    try {
      replies.push({ version: "v1.0", rendererFunctionResponse: { functionCallId, value: runRendererFunction(fc.call!, fc.args ?? {}) } })
    } catch (e) {
      replies.push({ version: "v1.0", rendererFunctionResponse: { functionCallId, error: { code: "EXECUTION_FAILED", message: (e as Error).message } } })
    }
    return done(state, reply)
  }

  // —— v1.0：Agent 返回渲染器发起的远程调用结果 ——
  if (type === "agentFunctionResponse") {
    const functionCallId = String(body.functionCallId ?? "")
    const pending = state.pendingCalls[functionCallId]
    if (!pending) {
      errors.push(err("", `没有等待中的调用 "${functionCallId}"`, "/agentFunctionResponse/functionCallId"))
      return done(state, reply)
    }
    const pendingCalls = { ...state.pendingCalls }
    delete pendingCalls[functionCallId]
    const surface = state.surfaces[pending.surfaceId]
    if (!surface) return done({ ...state, pendingCalls }, reply)
    const result = body.error
      ? { status: "error" as const, error: body.error as { code: string; message: string } }
      : { status: "done" as const, value: body.value }
    return done(withSurface({ ...state, pendingCalls }, { ...surface, remote: { ...surface.remote, [pending.key]: result } }), reply)
  }

  // —— 以下消息都针对某个 surface ——
  if (typeof body.surfaceId !== "string" || !body.surfaceId) {
    errors.push(err("", "surfaceId 必须是非空字符串", `/${type}/surfaceId`))
    return done(state, reply)
  }
  const surfaceId = body.surfaceId
  const existing = state.surfaces[surfaceId]

  if (existing && type !== "createSurface" && existing.version !== protocol) {
    errors.push(err(surfaceId, `surface "${surfaceId}" 以 ${existing.version} 创建，不能接收 ${protocol} 消息`, "/version", "VERSION_MISMATCH"))
    return done(state, reply)
  }

  switch (type) {
    case "createSurface": {
      if (existing) {
        errors.push(err(surfaceId, `surface "${surfaceId}" 已存在，需先 deleteSurface`, undefined, "SURFACE_EXISTS"))
        return done(state, reply)
      }
      const catalogId = typeof body.catalogId === "string" ? body.catalogId : undefined
      if (protocol === "v0.9" && !catalogId) {
        errors.push(err(surfaceId, "v0.9 的 createSurface 必须指定 catalogId", "/createSurface/catalogId"))
        return done(state, reply)
      }
      if (catalogId) {
        const catalog: CatalogDef | undefined = CATALOGS[catalogId]
        if (!catalog) {
          errors.push(err(surfaceId, `客户端不支持 catalog "${catalogId}"`, "/createSurface/catalogId", "CATALOG_NOT_SUPPORTED"))
          return done(state, reply)
        }
        if (catalog.protocol !== protocol) {
          errors.push(err(surfaceId, `catalog "${catalog.title}" 属于 ${catalog.protocol}，与消息版本 ${protocol} 不一致`, "/createSurface/catalogId", "CATALOG_VERSION_MISMATCH"))
          return done(state, reply)
        }
      }
      if (protocol === "v1.0" && "theme" in body) {
        errors.push(err(surfaceId, "v1.0 已移除 theme，外观完全由渲染器决定（该字段被忽略）", "/createSurface/theme"))
      }
      if (protocol === "v0.9" && ("components" in body || "dataModel" in body)) {
        errors.push(err(surfaceId, "v0.9 的 createSurface 不能内联 components / dataModel（这是 v1.0 的能力），已忽略", "/createSurface"))
      }
      let surface: Surface = {
        id: surfaceId,
        version: protocol,
        catalogId,
        theme: protocol === "v0.9" ? (body.theme as Surface["theme"]) : undefined,
        sendDataModel: Boolean(body.sendDataModel),
        components: {},
        dataModel: {},
        remote: {},
      }
      if (protocol === "v1.0") {
        if (body.dataModel && typeof body.dataModel === "object") surface = { ...surface, dataModel: body.dataModel as Record<string, unknown> }
        if (Array.isArray(body.components)) {
          const r = validateComponents(surface, body.components, "/createSurface/components")
          errors.push(...r.errors)
          if (r.fatal) errors.push(r.fatal)
          else {
            surface = { ...surface, components: r.components }
            errors.push(...compositionErrors(surface))
          }
        }
      }
      return done({ ...withSurface(state, surface), order: [...state.order, surfaceId] }, reply)
    }

    case "updateComponents": {
      if (!existing) {
        errors.push(err(surfaceId, `surface "${surfaceId}" 尚未通过 createSurface 创建`, undefined, "SURFACE_NOT_FOUND"))
        return done(state, reply)
      }
      if (!Array.isArray(body.components) || (protocol === "v1.0" && body.components.length === 0)) {
        errors.push(err(surfaceId, "components 必须是非空数组", "/updateComponents/components"))
        return done(state, reply)
      }
      const r = validateComponents(existing, body.components, "/updateComponents/components")
      errors.push(...r.errors)
      if (r.fatal) {
        errors.push(r.fatal)
        return done(state, reply)
      }
      const surface = { ...existing, components: r.components }
      if (protocol === "v1.0") errors.push(...compositionErrors(surface))
      return done(withSurface(state, surface), reply)
    }

    case "updateDataModel": {
      if (!existing) {
        errors.push(err(surfaceId, `surface "${surfaceId}" 尚未创建`, undefined, "SURFACE_NOT_FOUND"))
        return done(state, reply)
      }
      const path = typeof body.path === "string" ? body.path : "/"
      if (!path.startsWith("/")) {
        errors.push(err(surfaceId, "updateDataModel.path 必须是以 / 开头的 JSON Pointer", "/updateDataModel/path"))
        return done(state, reply)
      }
      if (protocol === "v1.0" && !("value" in body)) {
        errors.push(err(surfaceId, "v1.0 中 value 为必填；要删除该路径，请显式设为 null", "/updateDataModel/value"))
        return done(state, reply)
      }
      // v0.9：省略 value 即删除；v1.0：value 为 null 即删除
      const value = protocol === "v1.0" && body.value === null ? undefined : body.value
      return done(withSurface(state, { ...existing, dataModel: setAt(existing.dataModel, path, value) }), reply)
    }

    case "deleteSurface": {
      // 删除不存在的 surface 视为无操作
      if (!existing) return done(state, reply)
      const surfaces = { ...state.surfaces }
      delete surfaces[surfaceId]
      const pendingCalls = Object.fromEntries(Object.entries(state.pendingCalls).filter(([, p]) => p.surfaceId !== surfaceId))
      return done({ surfaces, order: state.order.filter((id) => id !== surfaceId), pendingCalls }, reply)
    }
  }
  return done(state, reply)
}

/** 把 JSONL 文本 / JSON 数组 / { messages: [...] } / 单个 JSON 对象解析为消息列表 */
export function parseMessages(text: string): { messages: unknown[]; error?: string } {
  const trimmed = text.trim()
  if (!trimmed) return { messages: [] }
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return { messages: parsed }
    if (parsed && Array.isArray(parsed.messages)) return { messages: parsed.messages }
    return { messages: [parsed] }
  } catch {
    // 尝试 JSONL
    const messages: unknown[] = []
    const lines = trimmed.split(/\n+/).filter((l) => l.trim())
    for (let i = 0; i < lines.length; i++) {
      try {
        messages.push(JSON.parse(lines[i]))
      } catch (e) {
        return { messages, error: `第 ${i + 1} 行不是合法 JSON：${(e as Error).message}` }
      }
    }
    return { messages }
  }
}
