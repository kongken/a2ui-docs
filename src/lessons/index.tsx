import { lazy, type ComponentType, type LazyExoticComponent } from "react"

// 各章节按需加载
export const LESSON_PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
  why: lazy(() => import("./01-why")),
  "first-surface": lazy(() => import("./02-first-surface")),
  components: lazy(() => import("./03-components")),
  streaming: lazy(() => import("./04-streaming")),
  "data-binding": lazy(() => import("./05-data-binding")),
  templates: lazy(() => import("./06-templates")),
  actions: lazy(() => import("./07-actions")),
  functions: lazy(() => import("./08-functions")),
  catalog: lazy(() => import("./09-catalog")),
  lifecycle: lazy(() => import("./10-lifecycle")),
  ecosystem: lazy(() => import("./11-ecosystem")),
}
