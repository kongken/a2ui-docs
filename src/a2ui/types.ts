// A2UI v0.9 / v0.9.1 核心类型（依据 specification/v0_9_1 JSON Schema）

export type DataBinding = { path: string }

export type FunctionCall = {
  call: string
  args?: Record<string, unknown>
  returnType?: string
}

/** 字面量 / 数据绑定 / 函数调用 三选一 */
export type Dynamic<T> = T | DataBinding | FunctionCall

/** 静态子节点 ID 数组，或基于数据的模板 */
export type ChildList = string[] | { componentId: string; path: string }

export interface ComponentDef {
  id: string
  component: string
  [prop: string]: unknown
}

export interface Theme {
  primaryColor?: string
  iconUrl?: string
  agentDisplayName?: string
  [key: string]: unknown
}

export interface CreateSurface {
  surfaceId: string
  catalogId: string
  theme?: Theme
  sendDataModel?: boolean
}

export interface UpdateComponents {
  surfaceId: string
  components: ComponentDef[]
}

export interface UpdateDataModel {
  surfaceId: string
  path?: string
  value?: unknown
}

export interface DeleteSurface {
  surfaceId: string
}

export type ServerMessage =
  | { version: string; createSurface: CreateSurface }
  | { version: string; updateComponents: UpdateComponents }
  | { version: string; updateDataModel: UpdateDataModel }
  | { version: string; deleteSurface: DeleteSurface }

export type ServerMessageType =
  | "createSurface"
  | "updateComponents"
  | "updateDataModel"
  | "deleteSurface"

export interface ActionPayload {
  name: string
  surfaceId: string
  sourceComponentId: string
  timestamp: string
  context: Record<string, unknown>
}

export interface ErrorPayload {
  code: string
  surfaceId: string
  path?: string
  message: string
}

/** 客户端 → Agent 的消息 */
export type ClientMessage =
  | { version: string; action: ActionPayload }
  | { version: string; error: ErrorPayload }

export interface Surface {
  id: string
  catalogId: string
  theme?: Theme
  sendDataModel?: boolean
  /** 邻接表：id → 组件定义 */
  components: Record<string, ComponentDef>
  dataModel: Record<string, unknown>
}

export interface SurfacesState {
  surfaces: Record<string, Surface>
  order: string[]
}

export const EMPTY_STATE: SurfacesState = { surfaces: {}, order: [] }

export const BASIC_CATALOG_ID =
  "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"

export function messageType(msg: unknown): ServerMessageType | null {
  if (!msg || typeof msg !== "object") return null
  for (const key of [
    "createSurface",
    "updateComponents",
    "updateDataModel",
    "deleteSurface",
  ] as const) {
    if (key in msg) return key
  }
  return null
}

export function isDataBinding(v: unknown): v is DataBinding {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    typeof (v as DataBinding).path === "string" &&
    !("componentId" in v)
  )
}

export function isFunctionCall(v: unknown): v is FunctionCall {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    typeof (v as FunctionCall).call === "string"
  )
}
