import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"

import { convertMessages } from "./convert"
import { resolveValue, stringify } from "./evaluate"
import { processMessage } from "./processor"
import { setAt } from "./pointer"
import {
  EMPTY_STATE,
  clientMessageKind,
  messageType,
  type ActionPayload,
  type CallAgentFunctionPayload,
  type ClientMessage,
  type ProtocolVersion,
  type Surface,
  type SurfacesState,
} from "./types"

/** down: Agent → 客户端；up: 客户端 → Agent */
export type LogDirection = "down" | "up"

export interface LogEntry {
  id: number
  dir: LogDirection
  kind: string
  payload: unknown
  metadata?: unknown
  time: number
}

export interface ActionEvent {
  name: string
  context?: Record<string, unknown>
  /** v1.0 */
  userMessage?: unknown
}

export interface A2UIController {
  setData(surfaceId: string, path: string, value: unknown): void
  dispatchAction(
    surfaceId: string,
    sourceComponentId: string,
    event: ActionEvent,
    scope: string
  ): void
  /** v1.0：渲染器找不到本地函数时请求 Agent 执行 */
  callAgentFunction(surfaceId: string, key: string, callFunction: CallAgentFunctionPayload["callFunction"]): void
}

interface State {
  surfaces: SurfacesState
  log: LogEntry[]
  seq: number
}

type Act =
  | { type: "server"; messages: unknown[] }
  | { type: "client"; message: ClientMessage; metadata?: unknown; remoteKey?: string }
  | { type: "setData"; surfaceId: string; path: string; value: unknown }
  | { type: "reset" }

const INITIAL: State = { surfaces: EMPTY_STATE, log: [], seq: 0 }

function reducer(state: State, act: Act): State {
  switch (act.type) {
    case "reset":
      return INITIAL
    case "setData": {
      const s = state.surfaces.surfaces[act.surfaceId]
      if (!s) return state
      return {
        ...state,
        surfaces: {
          ...state.surfaces,
          surfaces: {
            ...state.surfaces.surfaces,
            [act.surfaceId]: {
              ...s,
              dataModel: setAt(s.dataModel, act.path, act.value),
            },
          },
        },
      }
    }
    case "client": {
      let surfaces = state.surfaces
      if ("callAgentFunction" in act.message && act.remoteKey) {
        const call = act.message.callAgentFunction
        const s = surfaces.surfaces[call.surfaceId]
        if (s) {
          surfaces = {
            ...surfaces,
            pendingCalls: { ...surfaces.pendingCalls, [call.functionCallId]: { surfaceId: call.surfaceId, key: act.remoteKey } },
            surfaces: { ...surfaces.surfaces, [s.id]: { ...s, remote: { ...s.remote, [act.remoteKey]: { status: "pending" } } } },
          }
        }
      }
      return {
        surfaces,
        seq: state.seq + 1,
        log: [
          ...state.log,
          {
            id: state.seq,
            dir: "up",
            kind: clientMessageKind(act.message),
            payload: act.message,
            metadata: act.metadata,
            time: Date.now(),
          },
        ],
      }
    }
    case "server": {
      let surfaces = state.surfaces
      let seq = state.seq
      const log = [...state.log]
      for (const msg of act.messages) {
        const result = processMessage(surfaces, msg)
        surfaces = result.state
        log.push({
          id: seq++,
          dir: "down",
          kind: messageType(msg) ?? "invalid",
          payload: msg,
          time: Date.now(),
        })
        for (const reply of result.replies) {
          log.push({
            id: seq++,
            dir: "up",
            kind: "error" in reply ? "error" : "rendererFunctionResponse",
            payload: reply,
            time: Date.now(),
          })
        }
      }
      return { surfaces, log, seq }
    }
  }
}

export interface UseA2UIOptions {
  /** 用户触发 action 时调用 —— 相当于"发送给 Agent" */
  onAction?: (
    action: ActionPayload,
    info: { surface: Surface; metadata?: unknown }
  ) => void
  /** v1.0：渲染器请求 Agent 执行函数（callAgentFunction）时调用 */
  onCallAgentFunction?: (call: CallAgentFunctionPayload, info: { surface: Surface }) => void
  /** 设置后，send / stream 会把按 v0.9 编写的消息转换为该版本（课程演示用） */
  convertTo?: ProtocolVersion
}

export function useA2UI(options: UseA2UIOptions = {}) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const stateRef = useRef(state)
  const optionsRef = useRef(options)
  const timers = useRef<number[]>([])
  const callSeq = useRef(0)
  const target = options.convertTo

  useLayoutEffect(() => {
    stateRef.current = state
    optionsRef.current = options
  })

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
    },
    []
  )

  /** 原样发送，不做版本转换 */
  const sendRaw = useCallback((messages: unknown | unknown[]) => {
    dispatch({
      type: "server",
      messages: Array.isArray(messages) ? messages : [messages],
    })
  }, [])

  const send = useCallback(
    (messages: unknown | unknown[]) => {
      const list = Array.isArray(messages) ? messages : [messages]
      dispatch({ type: "server", messages: target ? convertMessages(list, target) : list })
    },
    [target]
  )

  const cancelStream = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  /** 模拟流式传输：逐条发送消息 */
  const stream = useCallback(
    (raw: unknown[], interval = 600, onDone?: () => void) => {
      cancelStream()
      const messages = target ? convertMessages(raw, target) : raw
      messages.forEach((m, i) => {
        timers.current.push(
          window.setTimeout(() => {
            dispatch({ type: "server", messages: [m] })
            if (i === messages.length - 1) onDone?.()
          }, interval * (i + 1))
        )
      })
    },
    [cancelStream, target]
  )

  const reset = useCallback(() => {
    cancelStream()
    dispatch({ type: "reset" })
  }, [cancelStream])

  const controller = useMemo<A2UIController>(
    () => ({
      setData(surfaceId, path, value) {
        dispatch({ type: "setData", surfaceId, path, value })
      },
      dispatchAction(surfaceId, sourceComponentId, event, scope) {
        const surface = stateRef.current.surfaces.surfaces[surfaceId]
        if (!surface) return
        const context: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(event.context ?? {})) {
          context[k] = resolveValue(v, { data: surface.dataModel, scope })
        }
        const v1 = surface.version === "v1.0"
        const action: ActionPayload = {
          name: event.name,
          surfaceId,
          sourceComponentId,
          timestamp: new Date().toISOString(),
          context,
          ...(v1 && event.userMessage !== undefined
            ? { userMessage: stringify(resolveValue(event.userMessage, { data: surface.dataModel, scope, version: "v1.0" })) }
            : {}),
        }
        // v0.9 称为 a2uiClientDataModel，v1.0 改名为 a2uiRendererDataModel
        const metadata = surface.sendDataModel
          ? {
              [v1 ? "a2uiRendererDataModel" : "a2uiClientDataModel"]: {
                version: v1 ? "v1.0" : "v0.9",
                surfaces: { [surfaceId]: surface.dataModel },
              },
            }
          : undefined
        dispatch({
          type: "client",
          message: { version: v1 ? "v1.0" : "v0.9", action },
          metadata,
        })
        optionsRef.current.onAction?.(action, { surface, metadata })
      },
      callAgentFunction(surfaceId, key, callFunction) {
        const surface = stateRef.current.surfaces.surfaces[surfaceId]
        if (!surface || surface.remote[key]) return
        const payload: CallAgentFunctionPayload = { surfaceId, functionCallId: `call-${++callSeq.current}`, callFunction }
        dispatch({ type: "client", message: { version: "v1.0", callAgentFunction: payload }, remoteKey: key })
        optionsRef.current.onCallAgentFunction?.(payload, { surface })
      },
    }),
    []
  )

  return {
    state: state.surfaces,
    surfaces: state.surfaces.order.map((id) => state.surfaces.surfaces[id]),
    log: state.log,
    send,
    sendRaw,
    stream,
    cancelStream,
    reset,
    controller,
  }
}

export type A2UIHandle = ReturnType<typeof useA2UI>
