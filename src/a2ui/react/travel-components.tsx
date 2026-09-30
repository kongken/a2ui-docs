// 自定义 Catalog 示例组件：客户端决定"原生"长什么样，Agent 只描述数据
import { Plane, Star } from "lucide-react"
import { cn } from "cn"

import { resolveString, resolveValue } from "../evaluate"
import { useEvalContext } from "./context"
import type { ComponentRenderer } from "./registry"

const RatingView: ComponentRenderer = ({ comp, scope }) => {
  const value = Number(resolveValue(comp.value, useEvalContext(scope))) || 0
  const max = typeof comp.max === "number" ? comp.max : 5
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} / ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "size-4",
            i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
          )}
        />
      ))}
      <span className="ml-1.5 font-mono text-xs text-muted-foreground">{value.toFixed(1)}</span>
    </div>
  )
}

const FlightSegmentView: ComponentRenderer = ({ comp, scope }) => {
  const ctx = useEvalContext(scope)
  const s = (k: string) => resolveString(comp[k], ctx)
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-xl font-bold tracking-tight">{s("from")}</span>
        <span className="text-xs text-muted-foreground">{s("departs")}</span>
      </div>
      <div className="flex flex-1 items-center gap-2 text-muted-foreground">
        <span className="h-px flex-1 border-t border-dashed" />
        <Plane className="size-4 text-primary" />
        <span className="h-px flex-1 border-t border-dashed" />
      </div>
      <div className="flex flex-col items-end">
        <span className="text-xl font-bold tracking-tight">{s("to")}</span>
        <span className="text-xs text-muted-foreground">{s("arrives")}</span>
      </div>
    </div>
  )
}

export const TRAVEL_RENDERERS = { Rating: RatingView, FlightSegment: FlightSegmentView }
