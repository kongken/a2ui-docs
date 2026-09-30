// 构造 A2UI v0.9 消息的小工具（仅用于演示数据，便于阅读）
import { BASIC_CATALOG_ID, type ComponentDef } from "@/a2ui"

export const V = "v0.9"

export const create = (surfaceId: string, extra: Record<string, unknown> = {}) => ({
  version: V,
  createSurface: { surfaceId, catalogId: BASIC_CATALOG_ID, ...extra },
})

export const comps = (surfaceId: string, components: ComponentDef[]) => ({
  version: V,
  updateComponents: { surfaceId, components },
})

export const data = (surfaceId: string, value: unknown, path?: string) => ({
  version: V,
  updateDataModel: { surfaceId, ...(path ? { path } : {}), value },
})

export const unset = (surfaceId: string, path: string) => ({
  version: V,
  updateDataModel: { surfaceId, path },
})

export const remove = (surfaceId: string) => ({ version: V, deleteSurface: { surfaceId } })

/** 文本组件的简写 */
export const text = (id: string, t: unknown, variant?: string): ComponentDef => ({
  id,
  component: "Text",
  text: t,
  ...(variant ? { variant } : {}),
})

export const bind = (path: string) => ({ path })
export const fmt = (value: string) => ({ call: "formatString", args: { value }, returnType: "string" })
