import type { ComponentType } from "react"

import type { ComponentDef } from "../types"

export interface RendererProps {
  comp: ComponentDef
  /** 当前数据作用域（模板迭代项路径），根作用域为 "" */
  scope: string
  /** 祖先组件 ID 链，用于检测循环引用 */
  ancestors: string[]
}

export type ComponentRenderer = ComponentType<RendererProps>

/** catalogId → 组件名 → 渲染实现。客户端只会渲染这里注册过的组件 */
export const RENDERERS: Record<string, Record<string, ComponentRenderer>> = {}

export function registerCatalogRenderers(
  catalogId: string,
  renderers: Record<string, ComponentRenderer>
) {
  RENDERERS[catalogId] = { ...(RENDERERS[catalogId] ?? {}), ...renderers }
}
