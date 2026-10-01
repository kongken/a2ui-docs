import { lazy, Suspense } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, CircleCheck, Clock, FlaskConical, GitCompareArrows, LayoutGrid } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useProgress } from "@/hooks/use-progress"
import { LESSONS, LEVEL_STYLE, type Level } from "@/lessons/meta"

// 首页的实时演示依赖整个渲染器，按需加载以减小首屏体积
const HeroDemo = lazy(() => import("./home-hero"))

const CONCEPTS = [
  { term: "Surface", desc: "一块由 Agent 控制的 UI 区域，有自己的组件与数据。", slug: "first-surface" },
  { term: "Component", desc: "{ id, component, …属性 }，平铺在邻接表中。", slug: "components" },
  { term: "Data Model", desc: "每个 surface 的 JSON 状态，用 JSON Pointer 访问。", slug: "data-binding" },
  { term: "Binding", desc: "{ path } 把组件属性连到数据，数据变则界面变。", slug: "data-binding" },
  { term: "Template", desc: "{ componentId, path }：一个模板 × N 条数据。", slug: "templates" },
  { term: "Action", desc: "用户交互时，客户端把事件与上下文发回 Agent。", slug: "actions" },
  { term: "Function", desc: "catalog 注册的客户端函数：校验、格式化、逻辑。", slug: "functions" },
  { term: "Catalog", desc: "组件与函数的白名单，也是安全边界。", slug: "catalog" },
]

const LEVEL_DESC: Record<Level, string> = {
  入门: "建立心智模型：它是什么、消息长什么样、界面如何生成",
  进阶: "让界面“活”起来：数据、列表、交互与客户端逻辑",
  深入: "安全、扩展与完整应用，以及更大的生态",
}

export function HomePage() {
  const { done } = useProgress()
  const completed = LESSONS.filter((l) => done.has(l.slug)).length
  const next = LESSONS.find((l) => !done.has(l.slug)) ?? LESSONS[0]
  const levels: Level[] = ["入门", "进阶", "深入"]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 pt-10 pb-20 md:px-8">
      <section className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col gap-5">
          <Badge variant="outline" className="w-fit font-mono text-[11px]">
            A2UI v0.9 / v1.0 · 非官方中文学习站
          </Badge>
          <h1 className="text-4xl leading-tight font-bold tracking-tight md:text-5xl">
            让 Agent 安全地
            <br />
            “说出”一个界面
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            A2UI 是一个面向 Agent 驱动界面的开放协议：Agent 发送声明式 JSON，客户端用自己的原生组件渲染。本站用 {LESSONS.length} 个可交互章节，
            带你从概念一步步走到完整的 Agent 应用。
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" asChild>
              <Link to={`/learn/${next.slug}`}>
                {completed ? "继续学习" : "开始学习"} <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/playground">
                <FlaskConical /> Playground
              </Link>
            </Button>
          </div>
          {completed > 0 && (
            <div className="flex max-w-xs items-center gap-3 text-xs text-muted-foreground">
              <Progress value={(completed / LESSONS.length) * 100} className="h-1.5" />
              <span className="shrink-0 font-mono">
                {completed}/{LESSONS.length}
              </span>
            </div>
          )}
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl border border-dashed bg-muted/30" />}>
          <HeroDemo />
        </Suspense>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-muted-foreground">LEARNING PATH</span>
          <h2 className="text-2xl font-semibold tracking-tight">渐进式学习路线</h2>
          <p className="text-sm text-muted-foreground">每一章都建立在前一章之上，并配有可以直接操作的实时演示和小测验。</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {levels.map((level) => (
            <div key={level} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Badge variant="secondary" className={cn("w-fit border-0", LEVEL_STYLE[level])}>
                  {level}
                </Badge>
                <span className="text-xs leading-5 text-muted-foreground">{LEVEL_DESC[level]}</span>
              </div>
              {LESSONS.map((l, i) => ({ l, i }))
                .filter(({ l }) => l.level === level)
                .map(({ l, i }) => {
                  const Icon = l.icon
                  const isDone = done.has(l.slug)
                  return (
                    <Link
                      key={l.slug}
                      to={`/learn/${l.slug}`}
                      className="group flex gap-3 rounded-xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Icon className="size-4" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex items-center gap-2 text-sm font-semibold">
                          <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                          {l.title}
                          {isDone && <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
                        </span>
                        <span className="text-xs leading-5 text-muted-foreground">{l.subtitle}</span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="size-3" /> {l.minutes} 分钟
                        </span>
                      </div>
                    </Link>
                  )
                })}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs text-muted-foreground">CONCEPTS</span>
          <h2 className="text-2xl font-semibold tracking-tight">核心概念速览</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CONCEPTS.map((c) => (
            <Link key={c.term} to={`/learn/${c.slug}`} className="flex flex-col gap-1 rounded-xl border p-4 transition-colors hover:bg-muted/50">
              <span className="font-mono text-sm font-semibold">{c.term}</span>
              <span className="text-xs leading-5 text-muted-foreground">{c.desc}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        <Link to="/playground" className="flex items-center gap-4 rounded-xl border p-5 transition-colors hover:bg-muted/50">
          <FlaskConical className="size-6" />
          <div className="flex flex-col">
            <span className="font-semibold">Playground</span>
            <span className="text-sm text-muted-foreground">内置 v0.9.1 与 v1.0 各 43 个官方示例，随意编辑、流式或增量发送</span>
          </div>
        </Link>
        <Link to="/gallery" className="flex items-center gap-4 rounded-xl border p-5 transition-colors hover:bg-muted/50">
          <LayoutGrid className="size-6" />
          <div className="flex flex-col">
            <span className="font-semibold">组件画廊</span>
            <span className="text-sm text-muted-foreground">basic catalog 的 18 个组件：属性表 + 实时示例</span>
          </div>
        </Link>
        <Link to="/versions" className="flex items-center gap-4 rounded-xl border p-5 transition-colors hover:bg-muted/50">
          <GitCompareArrows className="size-6" />
          <div className="flex flex-col">
            <span className="font-semibold">版本对比 v0.9 ↔ v1.0</span>
            <span className="text-sm text-muted-foreground">差异一览、迁移助手，以及双向 RPC 等 v1.0 新能力演示</span>
          </div>
        </Link>
      </section>

      <footer className="border-t pt-6 text-xs leading-6 text-muted-foreground">
        本站内容依据 <a className="underline" href="https://a2ui.org/" target="_blank" rel="noreferrer">a2ui.org</a> 公开文档与{" "}
        <a className="underline" href="https://github.com/a2ui-project/a2ui" target="_blank" rel="noreferrer">A2UI v0.9.1 / v1.0 规范</a>（Apache 2.0）整理，
        演示渲染器为独立实现，仅用于学习。A2UI 由 Google 发起。
      </footer>
    </div>
  )
}
