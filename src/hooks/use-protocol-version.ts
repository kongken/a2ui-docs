import { useCallback, useSyncExternalStore } from "react"

import type { ProtocolVersion } from "@/a2ui"

const KEY = "a2ui-learn-version"
const listeners = new Set<() => void>()

function read(): ProtocolVersion {
  try {
    return localStorage.getItem(KEY) === "v1.0" ? "v1.0" : "v0.9"
  } catch {
    return "v0.9"
  }
}

let current = read()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

/** 全站使用的 A2UI 协议版本：课程演示据此生成消息 */
export function useProtocolVersion() {
  const version = useSyncExternalStore(subscribe, () => current)
  const setVersion = useCallback((v: ProtocolVersion) => {
    current = v
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* 存储不可用时仅保存在内存 */
    }
    listeners.forEach((l) => l())
  }, [])
  return { version, setVersion }
}
