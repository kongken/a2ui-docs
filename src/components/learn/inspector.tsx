/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronRight, Eye, Layers, ScrollText, Database, Network } from "lucide-react"
import { cn } from "cn"

import { A2UISurface, type A2UIHandle, type ComponentDef, type LogEntry, type Surface } from "@/a2ui"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import { CodeBlock, toJson } from "./code-block"

// ---------------------------------------------------------------------------
// Surface 预览
// ---------------------------------------------------------------------------

export function SurfaceFrame({ surface, children, className }: { surface: Surface; children: ReactNode; className?: string }) {
  const theme = surface.theme
  return (
    <div className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-xs", className)}>
      <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-1.5">
        <span className="flex gap-1">
          <span className="size-2 rounded-full bg-foreground/15" />
          <span className="size-2 rounded-full bg-foreground/15" />
          <span className="size-2 rounded-full bg-foreground/15" />
        </span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">surface: {surface.id}</span>
        {theme?.agentDisplayName && (
          <Badge variant="secondary" className="ml-auto gap-1 text-[10px]">
            {theme.primaryColor && <span className="size-2 rounded-full" style={{ background: theme.primaryColor }} />}
            {theme.agentDisplayName}
          </Badge>
        )}
      </div>
      <div className="min-w-0 p-4">{children}</div>
    </div>
  )
}

export function SurfacePreview({
  a2ui,
  inspect,
  highlight,
  onHover,
  empty,
  className,
}: {
  a2ui: A2UIHandle
  inspect?: boolean
  highlight?: string | null
  onHover?: (id: string | null) => void
  empty?: ReactNode
  className?: string
}) {
  if (a2ui.surfaces.length === 0) {
    return (
      <div className={cn("flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground", className)}>
        <Layers className="size-5 opacity-60" />
        {empty ?? "还没有 Surface —— 发送 createSurface 开始"}
      </div>
    )
  }
  return (
    <div className={cn("flex min-w-0 flex-col gap-3", className)}>
      {a2ui.surfaces.map((s) => (
        <SurfaceFrame key={s.id} surface={s}>
          <A2UISurface surface={s} controller={a2ui.controller} inspect={inspect} highlight={highlight} onHover={onHover} />
        </SurfaceFrame>
      ))}
    </div>
  )
}

export function InspectToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Switch id="inspect" checked={value} onCheckedChange={onChange} size="sm" />
      <Label htmlFor="inspect" className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
        <Eye className="size-3.5" />
        显示组件边界
      </Label>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 消息日志
// ---------------------------------------------------------------------------

function short(v: unknown, n = 36) {
  const s = toJson(v, true)
  return s.length > n ? s.slice(0, n) + "…" : s
}

export function summarize(entry: LogEntry): string {
  const p = entry.payload as Record<string, Record<string, unknown>>
  switch (entry.kind) {
    case "createSurface":
      return `${p.createSurface.surfaceId}`
    case "updateComponents": {
      const list = p.updateComponents.components
      return `${p.updateComponents.surfaceId} · ${Array.isArray(list) ? list.length : 0} 个组件`
    }
    case "updateDataModel": {
      const u = p.updateDataModel
      return `${u.path ?? "/"} ${"value" in u ? "= " + short(u.value) : "(删除)"}`
    }
    case "deleteSurface":
      return `${p.deleteSurface.surfaceId}`
    case "action":
      return `${p.action.name} · ${short(p.action.context, 40)}`
    case "error":
      return `${p.error.code}: ${p.error.message}`
    default:
      return short(entry.payload)
  }
}

export function MessageLog({ log, className, empty }: { log: LogEntry[]; className?: string; empty?: ReactNode }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // 只滚动日志自身的滚动容器，避免带动整个页面
    let el = endRef.current?.parentElement ?? null
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement
    if (el && el !== document.documentElement && el !== document.body) el.scrollTop = el.scrollHeight
  }, [log.length])

  if (!log.length) {
    return <div className={cn("py-8 text-center text-xs text-muted-foreground", className)}>{empty ?? "暂无消息"}</div>
  }
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {log.map((e) => (
        <LogRow key={e.id} entry={e} />
      ))}
      <div ref={endRef} />
    </div>
  )
}

function LogRow({ entry }: { entry: LogEntry }) {
  const [open, setOpen] = useState(false)
  const up = entry.dir === "up"
  const isError = entry.kind === "error" || entry.kind === "invalid"
  return (
    <div
      className={cn(
        "animate-in rounded-md border text-xs duration-300 fade-in slide-in-from-bottom-1",
        isError ? "border-destructive/40 bg-destructive/5" : up ? "border-orange-500/30 bg-orange-500/5" : "bg-background"
      )}
    >
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-2 py-1.5 text-left">
        <ChevronRight className={cn("size-3 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        {up ? (
          <ArrowUp className={cn("size-3.5 shrink-0", isError ? "text-destructive" : "text-orange-600 dark:text-orange-400")} />
        ) : (
          <ArrowDown className="size-3.5 shrink-0 text-sky-600 dark:text-sky-400" />
        )}
        <span className={cn("shrink-0 font-mono font-medium", isError && "text-destructive")}>{entry.kind}</span>
        <span className="min-w-0 truncate font-mono text-muted-foreground">{summarize(entry)}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 px-2 pb-2">
          <CodeBlock code={entry.payload} maxHeight={260} />
          {entry.metadata !== undefined && <CodeBlock title="transport metadata" code={entry.metadata} maxHeight={200} />}
        </div>
      )}
    </div>
  )
}

export function LogLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <ArrowDown className="size-3 text-sky-600" /> Agent → 客户端
      </span>
      <span className="flex items-center gap-1">
        <ArrowUp className="size-3 text-orange-600" /> 客户端 → Agent
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 组件树（由邻接表推导）
// ---------------------------------------------------------------------------

type Ref = { label?: string; id: string; template?: string }

export function childRefs(c: ComponentDef): Ref[] {
  const refs: Ref[] = []
  if (Array.isArray(c.children)) c.children.forEach((id) => refs.push({ id: String(id) }))
  else if (c.children && typeof c.children === "object") {
    const t = c.children as { componentId: string; path: string }
    refs.push({ id: t.componentId, template: t.path })
  }
  for (const k of ["child", "trigger", "content"]) {
    if (typeof c[k] === "string") refs.push({ id: c[k] as string, label: k === "child" ? undefined : k })
  }
  if (Array.isArray(c.tabs)) {
    ;(c.tabs as { child: string; title: unknown }[]).forEach((t) =>
      refs.push({ id: t.child, label: `tab: ${typeof t.title === "string" ? t.title : "…"}` })
    )
  }
  return refs
}

export function ComponentTree({
  surface,
  highlight,
  onHover,
}: {
  surface: Surface
  highlight?: string | null
  onHover?: (id: string | null) => void
}) {
  const reachable = new Set<string>()
  const walk = (id: string, seen: string[]) => {
    if (seen.includes(id)) return
    reachable.add(id)
    const c = surface.components[id]
    if (c) childRefs(c).forEach((r) => walk(r.id, [...seen, id]))
  }
  walk("root", [])
  const orphans = Object.keys(surface.components).filter((id) => !reachable.has(id))

  const renderNode = (ref: Ref, depth: number, seen: string[]): ReactNode => {
    const c = surface.components[ref.id]
    const cyclic = seen.includes(ref.id)
    return (
      <div key={`${seen.join(">")}>${ref.id}`}>
        <div
          onMouseEnter={() => onHover?.(ref.id)}
          onMouseLeave={() => onHover?.(null)}
          className={cn(
            "flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-xs",
            highlight === ref.id && "bg-amber-400/20",
            !c && "text-muted-foreground italic"
          )}
          style={{ paddingLeft: depth * 16 + 6 }}
        >
          <span className="text-muted-foreground/60">{depth > 0 ? "└" : "●"}</span>
          {ref.label && <span className="text-muted-foreground">{ref.label} →</span>}
          <span className="font-medium">{ref.id}</span>
          {c ? <span className="text-sky-600 dark:text-sky-400">{c.component}</span> : <span>（未到达）</span>}
          {ref.template && (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              模板 × {ref.template}
            </Badge>
          )}
          {cyclic && <span className="text-destructive">循环!</span>}
        </div>
        {c && !cyclic && childRefs(c).map((r) => renderNode(r, depth + 1, [...seen, ref.id]))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">{renderNode({ id: "root" }, 0, [])}</div>
      {orphans.length > 0 && (
        <div className="flex flex-col gap-1 border-t pt-2">
          <span className="text-[11px] text-muted-foreground">未挂载到 root 的组件（已缓冲）：</span>
          <div className="flex flex-wrap gap-1">
            {orphans.map((id) => (
              <Badge key={id} variant="outline" className="font-mono text-[10px]">
                {id}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 组合面板：消息日志 / 数据模型 / 组件树
// ---------------------------------------------------------------------------

type InspectorTab = "log" | "data" | "tree"

export function Inspector({
  a2ui,
  tabs = ["log", "data", "tree"],
  defaultTab,
  highlight,
  onHover,
  className,
  height = 360,
}: {
  a2ui: A2UIHandle
  tabs?: InspectorTab[]
  defaultTab?: InspectorTab
  highlight?: string | null
  onHover?: (id: string | null) => void
  className?: string
  height?: number
}) {
  const meta = {
    log: { label: "消息日志", icon: ScrollText },
    data: { label: "数据模型", icon: Database },
    tree: { label: "组件树", icon: Network },
  }
  return (
    <Tabs defaultValue={defaultTab ?? tabs[0]} className={cn("min-w-0 gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TabsList>
          {tabs.map((t) => {
            const Icon = meta[t].icon
            return (
              <TabsTrigger key={t} value={t} className="gap-1.5 text-xs">
                <Icon className="size-3.5" />
                {meta[t].label}
                {t === "log" && a2ui.log.length > 0 && (
                  <span className="font-mono text-[10px] text-muted-foreground">{a2ui.log.length}</span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>
        {tabs.includes("log") && <LogLegend />}
      </div>
      <TabsContent value="log" className="overflow-y-auto rounded-lg border bg-muted/20 p-2" style={{ height }}>
        <MessageLog log={a2ui.log} />
      </TabsContent>
      <TabsContent value="data" className="overflow-y-auto" style={{ height }}>
        {a2ui.surfaces.length ? (
          <div className="flex flex-col gap-2">
            {a2ui.surfaces.map((s) => (
              <CodeBlock key={s.id} title={`dataModel · ${s.id}`} code={s.dataModel} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">暂无 Surface</div>
        )}
      </TabsContent>
      <TabsContent value="tree" className="overflow-y-auto rounded-lg border p-2" style={{ height }}>
        {a2ui.surfaces.length ? (
          a2ui.surfaces.map((s) => (
            <div key={s.id} className="flex flex-col gap-1">
              <span className="font-mono text-[11px] text-muted-foreground">surface: {s.id}</span>
              <ComponentTree surface={s} highlight={highlight} onHover={onHover} />
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-xs text-muted-foreground">暂无 Surface</div>
        )}
      </TabsContent>
    </Tabs>
  )
}
