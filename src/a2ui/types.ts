// A2UI 核心类型（依据 specification/v0_9_1 与 specification/v1_0 的 JSON Schema）

/** 本站支持的协议族：v0.9（含 v0.9.1）与 v1.0 */
export type ProtocolVersion = "v0.9" | "v1.0"

/** 把消息里的 version 字符串映射到协议族；不支持则返回 null */
export function protocolOf(version: unknown): ProtocolVersion | null {
  if (version === "v0.9" || version === "v0.9.1") return "v0.9"
  if (version === "v1.0") return "v1.0"
  return null
}

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
  | "callRendererFunction"
  | "agentFunctionResponse"

export const SERVER_MESSAGE_TYPES: ServerMessageType[] = [
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
  "callRendererFunction",
  "agentFunctionResponse",
]

/** v0.8 的旧消息名，用于给出更友好的错误提示 */
export const LEGACY_V08_TYPES = ["beginRendering", "surfaceUpdate", "dataModelUpdate"]

export interface ActionPayload {
  name: string
  surfaceId: string
  sourceComponentId: string
  timestamp: string
  context: Record<string, unknown>
  /** v1.0：来自 action.event.userMessage */
  userMessage?: string
}

export interface ErrorPayload {
  code: string
  /** v1.0 中与 functionCallId 互斥 */
  surfaceId?: string
  functionCallId?: string
  path?: string
  message: string
}

/** 渲染器发起的远程函数调用（v1.0 callAgentFunction）的结果缓存 */
export interface RemoteResult {
  status: "pending" | "done" | "error"
  value?: unknown
  error?: { code: string; message: string }
}

export interface FunctionResponsePayload {
  functionCallId: string
  value?: unknown
  error?: { code: string; message: string }
}

export interface CallAgentFunctionPayload {
  surfaceId: string
  functionCallId: string
  callFunction: { call: string; catalogId?: string; args?: Record<string, unknown> }
}

/** 客户端（v1.0 称“渲染器”）→ Agent 的消息 */
export type ClientMessage =
  | { version: string; action: ActionPayload }
  | { version: string; error: ErrorPayload }
  | { version: string; callAgentFunction: CallAgentFunctionPayload }
  | { version: string; rendererFunctionResponse: FunctionResponsePayload }

export type ClientMessageKind = "action" | "error" | "callAgentFunction" | "rendererFunctionResponse"

export function clientMessageKind(msg: ClientMessage): ClientMessageKind {
  if ("action" in msg) return "action"
  if ("callAgentFunction" in msg) return "callAgentFunction"
  if ("rendererFunctionResponse" in msg) return "rendererFunctionResponse"
  return "error"
}

export interface Surface {
  id: string
  /** 创建该 surface 的消息所属协议 */
  version: ProtocolVersion
  /** v1.0 中可以为空（组件需自带 catalogId） */
  catalogId?: string
  /** 仅 v0.9 */
  theme?: Theme
  sendDataModel?: boolean
  /** 邻接表：id → 组件定义 */
  components: Record<string, ComponentDef>
  dataModel: Record<string, unknown>
  /** 远程函数调用结果：key 为调用内容的稳定序列化 */
  remote: Record<string, RemoteResult>
}

export interface SurfacesState {
  surfaces: Record<string, Surface>
  order: string[]
  /** 等待 agentFunctionResponse 的调用：functionCallId → 结果缓存位置 */
  pendingCalls: Record<string, { surfaceId: string; key: string }>
}

export const EMPTY_STATE: SurfacesState = { surfaces: {}, order: [], pendingCalls: {} }

export const BASIC_CATALOG_ID =
  "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"

export const BASIC_CATALOG_V1_ID =
  "https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json"

export function messageType(msg: unknown): ServerMessageType | null {
  if (!msg || typeof msg !== "object") return null
  return SERVER_MESSAGE_TYPES.find((key) => key in msg) ?? null
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
