import { createContext, useContext } from "react"

import type { EvalContext } from "../evaluate"
import type { Surface } from "../types"
import type { A2UIController } from "../use-a2ui"

export interface SurfaceContextValue {
  surface: Surface
  controller?: A2UIController
  /** 调试模式：为每个组件画出边框并标注 id */
  inspect: boolean
  highlight?: string | null
  onHover?: (id: string | null) => void
}

export const SurfaceContext = createContext<SurfaceContextValue | null>(null)

/** 渲染在 Button 等行内容器中时，Text 使用 <span> */
export const InlineContext = createContext(false)

export function useSurfaceContext() {
  const ctx = useContext(SurfaceContext)
  if (!ctx) throw new Error("A2UI 组件必须渲染在 <A2UISurface> 内")
  return ctx
}

export function useEvalContext(scope: string): EvalContext {
  const { surface } = useSurfaceContext()
  return { data: surface.dataModel, scope }
}
