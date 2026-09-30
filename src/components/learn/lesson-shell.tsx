import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ArrowRight, CircleCheck, Clock, ListChecks } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useProgress } from "@/hooks/use-progress"
import { LESSONS, LEVEL_STYLE } from "@/lessons/meta"

import { Quiz, Section, type QuizQuestion } from "./prose"

export function LessonShell({
  slug,
  intro,
  children,
  takeaways,
  quiz,
}: {
  slug: string
  intro: ReactNode
  children: ReactNode
  takeaways: ReactNode[]
  quiz?: QuizQuestion[]
}) {
  const idx = LESSONS.findIndex((l) => l.slug === slug)
  const meta = LESSONS[idx]
  const prev = LESSONS[idx - 1]
  const next = LESSONS[idx + 1]
  const { done, setDone } = useProgress()
  const isDone = done.has(slug)

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-4 pt-8 pb-20 md:px-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">
            第 {idx + 1} 章 / {LESSONS.length}
          </span>
          <Badge variant="secondary" className={cn("border-0", LEVEL_STYLE[meta.level])}>
            {meta.level}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> 约 {meta.minutes} 分钟
          </span>
          {isDone && (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <CircleCheck className="size-3" /> 已完成
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{meta.title}</h1>
          <p className="text-lg text-muted-foreground">{meta.subtitle}</p>
        </div>
        <div className="max-w-3xl text-[15px] leading-7 text-foreground/90">{intro}</div>
      </header>

      {children}

      <Section title="本章要点" kicker="RECAP">
        <div className="grid gap-2 sm:grid-cols-2">
          {takeaways.map((t, i) => (
            <div key={i} className="flex gap-2.5 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm leading-6">
              <ListChecks className="mt-1 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </Section>

      {quiz && (
        <Section title="检验一下" kicker="QUIZ">
          <Quiz questions={quiz} />
        </Section>
      )}

      <footer className="flex flex-col gap-4 border-t pt-8">
        <div className="flex justify-center">
          <Button variant={isDone ? "outline" : "default"} onClick={() => setDone(slug, !isDone)}>
            <CircleCheck />
            {isDone ? "已完成（点击取消）" : "我学会了，标记本章完成"}
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link to={`/learn/${prev.slug}`} className="group flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted/50">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5" /> 上一章
              </span>
              <span className="text-sm font-medium">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              to={`/learn/${next.slug}`}
              onClick={() => !isDone && setDone(slug, true)}
              className="group flex flex-col items-end gap-1 rounded-lg border p-4 text-right transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                下一章 <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="text-sm font-medium">{next.title}</span>
            </Link>
          )}
        </div>
      </footer>
    </article>
  )
}

/** 演示区域容器 */
export function DemoCard({ title, description, children, toolbar, className }: { title?: ReactNode; description?: ReactNode; children: ReactNode; toolbar?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 md:p-5", className)}>
      {(title || toolbar) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            {title && (
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className="rounded bg-primary px-1.5 py-0.5 font-mono text-[10px] font-medium text-primary-foreground">LIVE</span>
                {title}
              </span>
            )}
            {description && <span className="text-xs leading-5 text-muted-foreground">{description}</span>}
          </div>
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
