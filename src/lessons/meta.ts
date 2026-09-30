import {
  Database,
  Globe,
  MessageSquare,
  MousePointerClick,
  Network,
  Radio,
  Repeat,
  ShieldCheck,
  Sparkles,
  SquareFunction,
  Workflow,
  type LucideIcon,
} from "lucide-react"

export type Level = "入门" | "进阶" | "深入"

export interface LessonMeta {
  slug: string
  title: string
  subtitle: string
  level: Level
  minutes: number
  icon: LucideIcon
}

export const LESSONS: LessonMeta[] = [
  { slug: "why", title: "为什么需要 A2UI", subtitle: "Agent 想给用户一个界面，却不能发代码", level: "入门", minutes: 5, icon: Sparkles },
  { slug: "first-surface", title: "第一个 Surface", subtitle: "两条消息，渲染出 Hello World", level: "入门", minutes: 6, icon: MessageSquare },
  { slug: "components", title: "组件与邻接表", subtitle: "为什么用扁平列表而不是嵌套树", level: "入门", minutes: 8, icon: Network },
  { slug: "streaming", title: "流式渐进渲染", subtitle: "UI 一边生成一边出现", level: "入门", minutes: 6, icon: Radio },
  { slug: "data-binding", title: "数据模型与绑定", subtitle: "结构与状态分离，JSON Pointer 连接两者", level: "进阶", minutes: 8, icon: Database },
  { slug: "templates", title: "模板与动态列表", subtitle: "一个模板组件 × N 条数据", level: "进阶", minutes: 7, icon: Repeat },
  { slug: "actions", title: "交互：双向绑定与 Action", subtitle: "用户输入如何回到 Agent", level: "进阶", minutes: 8, icon: MousePointerClick },
  { slug: "functions", title: "函数与校验", subtitle: "formatString、checks：不发代码的客户端逻辑", level: "进阶", minutes: 8, icon: SquareFunction },
  { slug: "catalog", title: "Catalog 与安全边界", subtitle: "白名单、自定义组件与自我纠错循环", level: "深入", minutes: 9, icon: ShieldCheck },
  { slug: "lifecycle", title: "完整生命周期：订餐助手", subtitle: "把前面的一切串起来", level: "深入", minutes: 10, icon: Workflow },
  { slug: "ecosystem", title: "传输、版本与生态", subtitle: "A2A / MCP / AG-UI，v0.8 → v1.0", level: "深入", minutes: 7, icon: Globe },
]

export const LEVEL_STYLE: Record<Level, string> = {
  入门: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  进阶: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  深入: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
}
