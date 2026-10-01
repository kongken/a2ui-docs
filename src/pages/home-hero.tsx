import { useEffect, useRef, useState } from "react"
import { cn } from "cn"

import { A2UISurface, messageType } from "@/a2ui"
import { SurfaceFrame } from "@/components/learn/inspector"
import { useConverted, useVersionedA2UI } from "@/components/learn/use-versioned"
import { bind, comps, create, data, fmt, text } from "@/lessons/msg"

const S = "hero"
const HERO = [
  create(S, { theme: { agentDisplayName: "旅行助手" } }),
  comps(S, [{ id: "root", component: "Card", child: "col" }, { id: "col", component: "Column", children: ["head", "info", "div", "actions"] }]),
  comps(S, [
    { id: "head", component: "Row", children: ["icon", "title"], align: "center" },
    { id: "icon", component: "Icon", name: "event" },
    text("title", bind("/trip/title"), "h4"),
  ]),
  comps(S, [text("info", fmt("${/trip/city} · ${/trip/days} 天 · 预算 ${formatCurrency(value:${/trip/budget}, currency:'CNY', decimals:0)}")), { id: "div", component: "Divider" }]),
  data(S, { trip: { title: "京都 · 红叶季", city: "京都", days: 5, budget: 12000 } }),
  comps(S, [
    { id: "actions", component: "Row", children: ["ok", "edit"] },
    { id: "ok", component: "Button", child: "ok-t", variant: "primary", action: { event: { name: "confirm_trip" } } },
    text("ok-t", "确认行程"),
    { id: "edit", component: "Button", child: "edit-t", variant: "borderless", action: { event: { name: "edit_trip" } } },
    text("edit-t", "修改"),
  ]),
]

export default function HeroDemo() {
  const a2ui = useVersionedA2UI()
  const shown = useConverted(HERO)
  const [cursor, setCursor] = useState(0)
  const cursorRef = useRef(0)
  const { send, reset } = a2ui

  useEffect(() => {
    const tick = () => {
      if (cursorRef.current >= HERO.length + 4) {
        cursorRef.current = 0
        reset()
      } else if (cursorRef.current < HERO.length) {
        send(HERO[cursorRef.current])
      }
      cursorRef.current += 1
      setCursor(cursorRef.current)
    }
    reset()
    const t = window.setInterval(tick, 900)
    return () => clearInterval(t)
  }, [send, reset])

  const surface = a2ui.surfaces[0]
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
      <div className="flex min-w-0 flex-col gap-1 overflow-hidden rounded-xl border bg-muted/30 p-3">
        <span className="mb-1 font-mono text-[10px] text-muted-foreground">agent → client · JSONL</span>
        {shown.map((m, i) => (
          <div
            key={i}
            className={cn(
              "truncate rounded px-1.5 py-1 font-mono text-[10.5px] transition-all duration-300",
              i < cursor ? "bg-background opacity-100 shadow-xs" : "opacity-25",
              i === cursor - 1 && "ring-1 ring-sky-500/60"
            )}
          >
            <span className="font-semibold text-sky-700 dark:text-sky-300">{messageType(m)}</span>{" "}
            <span className="text-muted-foreground">{JSON.stringify(Object.values(m as object)[1])}</span>
          </div>
        ))}
      </div>
      <div className="min-w-0">
        {surface ? (
          <SurfaceFrame surface={surface}>
            <A2UISurface surface={surface} controller={a2ui.controller} />
          </SurfaceFrame>
        ) : (
          <div className="h-full min-h-40 animate-pulse rounded-xl border border-dashed bg-muted/30" />
        )}
      </div>
    </div>
  )
}

