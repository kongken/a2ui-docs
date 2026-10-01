import { Ban, Loader2, Repeat } from "lucide-react"
import { cn } from "cn"

import { CATALOGS } from "../catalog"
import { getAt, resolvePath } from "../pointer"
import { resolveCatalogId } from "../processor"
import { useSurfaceContext } from "./context"
import { RENDERERS } from "./registry"

interface NodeProps {
  id: string
  scope: string
  ancestors: string[]
}

/** 根据 ID 在邻接表中查找组件并渲染 */
export function Node({ id, scope, ancestors }: NodeProps) {
  const { surface, inspect, highlight, onHover } = useSurfaceContext()

  if (ancestors.includes(id)) {
    return (
      <Placeholder tone="error" icon={<Repeat className="size-3.5" />}>
        循环引用：{id}
      </Placeholder>
    )
  }

  const comp = surface.components[id]
  if (!comp) {
    return (
      <Placeholder tone="pending" icon={<Loader2 className="size-3.5 animate-spin" />}>
        等待组件 <code>{id}</code>
      </Placeholder>
    )
  }

  // v1.0 可以混用 catalog：先看组件自己的 catalogId，再看 surface 默认值
  const catalogId = resolveCatalogId(surface, comp)
  const catalog = catalogId ? CATALOGS[catalogId] : undefined
  const allowed = catalog?.protocol === surface.version && catalog.components[comp.component]
  const Renderer = allowed && catalogId ? RENDERERS[catalogId]?.[comp.component] : undefined

  let el = Renderer ? (
    <Renderer comp={comp} scope={scope} ancestors={[...ancestors, id]} />
  ) : (
    <Placeholder tone="error" icon={<Ban className="size-3.5" />}>
      <span>
        <code>{String(comp.component)}</code>{" "}
        {!catalogId ? "没有可用的 catalog（v1.0 需组件或 surface 指定 catalogId）" : "不在 catalog 中，已拒绝渲染"}
      </span>
    </Placeholder>
  )

  if (inspect || highlight === id) {
    el = (
      <div
        className={cn(
          "relative min-w-0 rounded-md p-1.5 pt-5 outline-1 -outline-offset-1 outline-dashed transition-colors",
          highlight === id
            ? "bg-amber-400/10 outline-2 outline-amber-500 outline-solid"
            : "outline-sky-500/50"
        )}
        onMouseEnter={(e) => {
          e.stopPropagation()
          onHover?.(id)
        }}
        onMouseLeave={() => onHover?.(null)}
      >
        <span
          className={cn(
            "pointer-events-none absolute top-0.5 right-1.5 left-1.5 truncate font-mono text-[10px] leading-4",
            highlight === id ? "text-amber-600 dark:text-amber-400" : "text-sky-600 dark:text-sky-400"
          )}
        >
          {id}
          <span className="opacity-60"> · {comp.component}</span>
          {scope && <span className="opacity-60"> @ {scope}</span>}
        </span>
        {el}
      </div>
    )
  }

  const weight = typeof comp.weight === "number" ? comp.weight : undefined
  if (weight !== undefined) {
    return (
      <div className="flex min-w-0 flex-col" style={{ flexGrow: weight, flexBasis: 0 }}>
        {el}
      </div>
    )
  }
  return el
}

/** 渲染 ChildList：静态 ID 数组，或 { componentId, path } 模板 */
export function Children({
  list,
  scope,
  ancestors,
}: {
  list: unknown
  scope: string
  ancestors: string[]
}) {
  const { surface } = useSurfaceContext()

  if (Array.isArray(list)) {
    return list.map((cid, i) => (
      <Node key={`${cid}-${i}`} id={String(cid)} scope={scope} ancestors={ancestors} />
    ))
  }

  if (list && typeof list === "object") {
    const { componentId, path } = list as { componentId?: string; path?: string }
    if (!componentId || typeof path !== "string") return null
    const abs = resolvePath(path, scope)
    const base = abs === "/" ? "" : abs
    const items = getAt(surface.dataModel, abs)
    const keys = Array.isArray(items)
      ? items.map((_, i) => String(i))
      : items && typeof items === "object"
        ? Object.keys(items)
        : []
    return keys.map((k) => (
      <Node key={k} id={componentId} scope={`${base}/${k}`} ancestors={ancestors} />
    ))
  }
  return null
}

export function Placeholder({
  tone,
  icon,
  children,
}: {
  tone: "pending" | "error"
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs",
        tone === "pending"
          ? "animate-pulse border-muted-foreground/30 bg-muted/50 text-muted-foreground"
          : "border-destructive/50 bg-destructive/5 text-destructive"
      )}
    >
      {icon}
      {children}
    </div>
  )
}
