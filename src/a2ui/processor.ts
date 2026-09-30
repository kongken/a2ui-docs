// 消息处理器：把 Agent 发来的 A2UI 消息应用到客户端状态（纯函数）

import { CATALOGS, requiredProps } from "./catalog"
import { setAt } from "./pointer"
import {
  messageType,
  type ComponentDef,
  type ErrorPayload,
  type SurfacesState,
} from "./types"

export const SUPPORTED_VERSIONS = ["v0.9", "v0.9.1"]

export interface ProcessResult {
  state: SurfacesState
  errors: ErrorPayload[]
}

const err = (
  surfaceId: string,
  message: string,
  path?: string,
  code = path ? "VALIDATION_FAILED" : "INVALID_MESSAGE"
): ErrorPayload => ({ code, surfaceId, message, ...(path ? { path } : {}) })

export function processMessage(
  state: SurfacesState,
  raw: unknown
): ProcessResult {
  const type = messageType(raw)
  if (!type) {
    return {
      state,
      errors: [err("", "无法识别的消息：缺少 createSurface / updateComponents / updateDataModel / deleteSurface")],
    }
  }
  const msg = raw as Record<string, unknown>
  const body = (msg[type] ?? {}) as Record<string, unknown>
  const surfaceId = typeof body.surfaceId === "string" ? body.surfaceId : ""
  const errors: ErrorPayload[] = []

  if (!SUPPORTED_VERSIONS.includes(String(msg.version))) {
    errors.push(
      err(surfaceId, `不支持的版本 ${JSON.stringify(msg.version)}，本渲染器支持 v0.9 / v0.9.1`, "/version")
    )
    return { state, errors }
  }
  if (!surfaceId) {
    errors.push(err("", "缺少 surfaceId", `/${type}/surfaceId`))
    return { state, errors }
  }

  const existing = state.surfaces[surfaceId]

  switch (type) {
    case "createSurface": {
      if (existing) {
        errors.push(err(surfaceId, `surface "${surfaceId}" 已存在`, undefined, "SURFACE_EXISTS"))
        return { state, errors }
      }
      const catalogId = String(body.catalogId ?? "")
      if (!CATALOGS[catalogId]) {
        errors.push(
          err(surfaceId, `客户端不支持 catalog "${catalogId}"`, "/createSurface/catalogId", "CATALOG_NOT_SUPPORTED")
        )
        return { state, errors }
      }
      return {
        state: {
          order: [...state.order, surfaceId],
          surfaces: {
            ...state.surfaces,
            [surfaceId]: {
              id: surfaceId,
              catalogId,
              theme: body.theme as never,
              sendDataModel: Boolean(body.sendDataModel),
              components: {},
              dataModel: {},
            },
          },
        },
        errors,
      }
    }

    case "updateComponents": {
      if (!existing) {
        errors.push(err(surfaceId, `surface "${surfaceId}" 尚未通过 createSurface 创建`, undefined, "SURFACE_NOT_FOUND"))
        return { state, errors }
      }
      if (!Array.isArray(body.components)) {
        errors.push(err(surfaceId, "components 必须是数组", "/updateComponents/components"))
        return { state, errors }
      }
      const catalog = CATALOGS[existing.catalogId]
      const components = { ...existing.components }
      body.components.forEach((c: unknown, i: number) => {
        const base = `/updateComponents/components/${i}`
        if (!c || typeof c !== "object") {
          errors.push(err(surfaceId, "组件必须是对象", base))
          return
        }
        const comp = c as ComponentDef
        if (typeof comp.id !== "string" || !comp.id) {
          errors.push(err(surfaceId, "组件缺少 id", `${base}/id`))
          return
        }
        if (typeof comp.component !== "string") {
          errors.push(err(surfaceId, `组件 "${comp.id}" 缺少 component 类型`, `${base}/component`))
          return
        }
        if (!catalog.components[comp.component]) {
          errors.push(
            err(surfaceId, `"${comp.component}" 不在 catalog 中，客户端拒绝渲染`, `${base}/component`)
          )
        } else {
          for (const p of requiredProps(catalog, comp.component)) {
            if (!(p in comp)) {
              errors.push(err(surfaceId, `${comp.component} "${comp.id}" 缺少必填属性 ${p}`, `${base}/${p}`))
            }
          }
        }
        components[comp.id] = comp
      })
      return {
        state: {
          ...state,
          surfaces: { ...state.surfaces, [surfaceId]: { ...existing, components } },
        },
        errors,
      }
    }

    case "updateDataModel": {
      if (!existing) {
        errors.push(err(surfaceId, `surface "${surfaceId}" 尚未创建`, undefined, "SURFACE_NOT_FOUND"))
        return { state, errors }
      }
      const path = typeof body.path === "string" ? body.path : "/"
      if (!path.startsWith("/")) {
        errors.push(err(surfaceId, "updateDataModel.path 必须是以 / 开头的 JSON Pointer", "/updateDataModel/path"))
        return { state, errors }
      }
      const dataModel = setAt(existing.dataModel, path, body.value)
      return {
        state: {
          ...state,
          surfaces: { ...state.surfaces, [surfaceId]: { ...existing, dataModel } },
        },
        errors,
      }
    }

    case "deleteSurface": {
      if (!existing) {
        errors.push(err(surfaceId, `surface "${surfaceId}" 不存在`, undefined, "SURFACE_NOT_FOUND"))
        return { state, errors }
      }
      const surfaces = { ...state.surfaces }
      delete surfaces[surfaceId]
      return {
        state: { surfaces, order: state.order.filter((id) => id !== surfaceId) },
        errors,
      }
    }
  }
}

/** 把 JSONL 文本 / JSON 数组 / 单个 JSON 对象解析为消息列表 */
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
        return {
          messages,
          error: `第 ${i + 1} 行不是合法 JSON：${(e as Error).message}`,
        }
      }
    }
    return { messages }
  }
}
