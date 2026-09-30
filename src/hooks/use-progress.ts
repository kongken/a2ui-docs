import { useCallback, useSyncExternalStore } from "react"

const KEY = "a2ui-learn-progress"
const listeners = new Set<() => void>()

function read(): string {
  try {
    return localStorage.getItem(KEY) ?? "[]"
  } catch {
    return "[]"
  }
}

let cache = read()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useProgress() {
  const raw = useSyncExternalStore(subscribe, () => cache)
  const done = new Set<string>(JSON.parse(raw) as string[])

  const setDone = useCallback((slug: string, value: boolean) => {
    const next = new Set<string>(JSON.parse(cache) as string[])
    if (value) next.add(slug)
    else next.delete(slug)
    cache = JSON.stringify([...next])
    try {
      localStorage.setItem(KEY, cache)
    } catch {
      /* 存储不可用时仅保存在内存 */
    }
    listeners.forEach((l) => l())
  }, [])

  return { done, setDone }
}
