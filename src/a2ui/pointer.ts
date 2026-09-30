// JSON Pointer (RFC 6901) + A2UI 相对路径扩展

export function parsePointer(pointer: string): string[] {
  if (pointer === "" || pointer === "/") return []
  const body = pointer.startsWith("/") ? pointer.slice(1) : pointer
  return body
    .split("/")
    .map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"))
}

export function joinPointer(segments: (string | number)[]): string {
  if (segments.length === 0) return "/"
  return (
    "/" +
    segments
      .map((s) => String(s).replace(/~/g, "~0").replace(/\//g, "~1"))
      .join("/")
  )
}

/**
 * 以 `/` 开头为绝对路径；否则相对于当前集合作用域（模板迭代项）解析。
 * 例如 scope="/items/0", path="name" → "/items/0/name"
 */
export function resolvePath(path: string, scope: string): string {
  if (path.startsWith("/")) return path
  const base = scope === "/" ? "" : scope
  return path === "" ? scope || "/" : `${base}/${path}`
}

export function getAt(root: unknown, pointer: string): unknown {
  let cur: unknown = root
  for (const seg of parsePointer(pointer)) {
    if (cur == null || typeof cur !== "object") return undefined
    cur = (cur as Record<string, unknown>)[seg]
  }
  return cur
}

/** 不可变地写入；value 为 undefined 时删除该键（数组保留长度） */
export function setAt(
  root: Record<string, unknown>,
  pointer: string,
  value: unknown
): Record<string, unknown> {
  const segs = parsePointer(pointer)
  if (segs.length === 0) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  }
  return setIn(root, segs, value) as Record<string, unknown>
}

function setIn(node: unknown, segs: string[], value: unknown): unknown {
  const [head, ...rest] = segs
  const isIndex = /^\d+$/.test(head)
  const container: Record<string, unknown> | unknown[] = Array.isArray(node)
    ? [...node]
    : node && typeof node === "object"
      ? { ...(node as Record<string, unknown>) }
      : isIndex
        ? []
        : {}

  const current = (container as Record<string, unknown>)[head]
  const next = rest.length === 0 ? value : setIn(current, rest, value)

  if (next === undefined && !Array.isArray(container)) {
    delete (container as Record<string, unknown>)[head]
  } else {
    ;(container as Record<string, unknown>)[head] = next
  }
  return container
}
