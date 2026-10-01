import { useEffect, type CSSProperties } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "cn"

import type { RemoteBridge } from "../evaluate"
import type { Surface } from "../types"
import type { A2UIController } from "../use-a2ui"
import { SurfaceContext } from "./context"
import { Node } from "./node"

interface Props {
  surface: Surface
  controller?: A2UIController
  inspect?: boolean
  highlight?: string | null
  onHover?: (id: string | null) => void
  className?: string
}

/** 渲染一个 Surface：从 id 为 "root" 的组件开始构建组件树 */
export function A2UISurface({ surface, controller, inspect = false, highlight, onHover, className }: Props) {
  const color = surface.theme?.primaryColor
  const style = (
    color && /^#[0-9a-f]{6}$/i.test(color)
      ? { "--primary": color, "--ring": color, "--primary-foreground": "#ffffff" }
      : undefined
  ) as CSSProperties | undefined
  const buffered = Object.keys(surface.components).length

  // v1.0：渲染时遇到非本地函数只登记，渲染完成且输入停顿后再发送 callAgentFunction
  // 每轮渲染新建一个收集器，子组件在同一轮渲染中写入，effect 读取
  const requests = new Map<string, Parameters<RemoteBridge["request"]>[1]>()
  const requestRemote: RemoteBridge["request"] = (key, call) => {
    requests.set(key, call)
  }
  useEffect(() => {
    if (!requests.size || !controller) return
    const t = window.setTimeout(() => {
      for (const [key, call] of requests) controller.callAgentFunction(surface.id, key, call)
    }, 400)
    return () => clearTimeout(t)
  })

  return (
    <SurfaceContext.Provider value={{ surface, controller, inspect, highlight, onHover, requestRemote }}>
      <div className={cn("a2ui-surface min-w-0 text-foreground", className)} style={style} data-surface-id={surface.id}>
        {surface.components.root ? (
          <Node id="root" scope="" ancestors={[]} />
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-6 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
            等待 <code>root</code> 组件…
            {buffered > 0 && <span>（已缓冲 {buffered} 个组件）</span>}
          </div>
        )}
      </div>
    </SurfaceContext.Provider>
  )
}
