import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"

import { resolveValue } from "./evaluate"
import { processMessage } from "./processor"
import { setAt } from "./pointer"
import {
  EMPTY_STATE,
  messageType,
  type ActionPayload,
  type ClientMessage,
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
}

export interface A2UIController {
  setData(surfaceId: string, path: string, value: unknown): void
  dispatchAction(
    surfaceId: string,
    sourceComponentId: string,
    event: ActionEvent,
    scope: string
  ): void
}

interface State {
  surfaces: SurfacesState
  log: LogEntry[]
  seq: number
}

type Act =
  | { type: "server"; messages: unknown[] }
  | { type: "client"; message: ClientMessage; metadata?: unknown }
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
    case "client":
      return {
        ...state,
        seq: state.seq + 1,
        log: [
          ...state.log,
          {
            id: state.seq,
            dir: "up",
            kind: "action" in act.message ? "action" : "error",
            payload: act.message,
            metadata: act.metadata,
            time: Date.now(),
          },
        ],
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
        for (const error of result.errors) {
          log.push({
            id: seq++,
            dir: "up",
            kind: "error",
            payload: { version: "v0.9", error },
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
}

export function useA2UI(options: UseA2UIOptions = {}) {
  const [state, dispatch] = useReducer(reducer, INITIAL)
  const stateRef = useRef(state)
  const onActionRef = useRef(options.onAction)
  const timers = useRef<number[]>([])

  useLayoutEffect(() => {
    stateRef.current = state
    onActionRef.current = options.onAction
  })

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout)
    },
    []
  )

  const send = useCallback((messages: unknown | unknown[]) => {
    dispatch({
      type: "server",
      messages: Array.isArray(messages) ? messages : [messages],
    })
  }, [])

  const cancelStream = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  /** 模拟流式传输：逐条发送消息 */
  const stream = useCallback(
    (messages: unknown[], interval = 600, onDone?: () => void) => {
      cancelStream()
      messages.forEach((m, i) => {
        timers.current.push(
          window.setTimeout(() => {
            dispatch({ type: "server", messages: [m] })
            if (i === messages.length - 1) onDone?.()
          }, interval * (i + 1))
        )
      })
    },
    [cancelStream]
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
        const action: ActionPayload = {
          name: event.name,
          surfaceId,
          sourceComponentId,
          timestamp: new Date().toISOString(),
          context,
        }
        const metadata = surface.sendDataModel
          ? {
              a2uiClientDataModel: {
                version: "v0.9",
                surfaces: { [surfaceId]: surface.dataModel },
              },
            }
          : undefined
        dispatch({
          type: "client",
          message: { version: "v0.9", action },
          metadata,
        })
        onActionRef.current?.(action, { surface, metadata })
      },
    }),
    []
  )

  return {
    state: state.surfaces,
    surfaces: state.surfaces.order.map((id) => state.surfaces.surfaces[id]),
    log: state.log,
    send,
    stream,
    cancelStream,
    reset,
    controller,
  }
}

export type A2UIHandle = ReturnType<typeof useA2UI>
