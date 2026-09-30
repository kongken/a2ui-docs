import { useState, type ReactNode } from "react"
import { CircleCheck, CircleX, Info, Lightbulb, TriangleAlert } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

export function Section({ id, title, kicker, children }: { id?: string; title: ReactNode; kicker?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-20 flex-col gap-4">
      <div className="flex flex-col gap-1">
        {kicker && <span className="font-mono text-xs text-muted-foreground">{kicker}</span>}
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[15px] leading-7 text-foreground/90", className)}>{children}</p>
}

const CALLOUT = {
  info: { icon: Info, cls: "border-sky-500/30 bg-sky-500/5 [&_svg]:text-sky-600 dark:[&_svg]:text-sky-400" },
  tip: { icon: Lightbulb, cls: "border-emerald-500/30 bg-emerald-500/5 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400" },
  warn: { icon: TriangleAlert, cls: "border-amber-500/40 bg-amber-500/5 [&_svg]:text-amber-600 dark:[&_svg]:text-amber-400" },
}

export function Callout({ tone = "info", title, children }: { tone?: keyof typeof CALLOUT; title?: ReactNode; children: ReactNode }) {
  const { icon: Icon, cls } = CALLOUT[tone]
  return (
    <div className={cn("flex gap-3 rounded-lg border px-4 py-3 text-sm leading-6", cls)}>
      <Icon className="mt-1 size-4 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        {title && <span className="font-medium">{title}</span>}
        <div className="text-foreground/85">{children}</div>
      </div>
    </div>
  )
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-2 text-[15px] leading-7">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-foreground/40" />
          <span className="min-w-0">{it}</span>
        </li>
      ))}
    </ul>
  )
}

/** 带编号的步骤 */
export function Steps({ items }: { items: { title: ReactNode; body?: ReactNode }[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-background font-mono text-xs">
            {i + 1}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
            <span className="text-sm font-medium">{it.title}</span>
            {it.body && <span className="text-sm leading-6 text-muted-foreground">{it.body}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}

export interface QuizQuestion {
  q: ReactNode
  options: ReactNode[]
  answer: number
  explain: ReactNode
}

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, i) => (
        <QuizItem key={i} index={i} {...q} />
      ))}
    </div>
  )
}

function QuizItem({ index, q, options, answer, explain }: QuizQuestion & { index: number }) {
  const [picked, setPicked] = useState<number | null>(null)
  const done = picked !== null
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex gap-2 text-sm font-medium">
        <span className="font-mono text-muted-foreground">Q{index + 1}.</span>
        <span>{q}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {options.map((o, i) => {
          const correct = i === answer
          const chosen = picked === i
          return (
            <button
              key={i}
              type="button"
              disabled={done}
              onClick={() => setPicked(i)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                !done && "hover:bg-muted",
                done && correct && "border-emerald-500/50 bg-emerald-500/10",
                done && chosen && !correct && "border-destructive/50 bg-destructive/10"
              )}
            >
              <span className="font-mono text-xs text-muted-foreground">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{o}</span>
              {done && correct && <CircleCheck className="size-4 text-emerald-600" />}
              {done && chosen && !correct && <CircleX className="size-4 text-destructive" />}
            </button>
          )
        })}
      </div>
      {done && (
        <div className="flex items-start justify-between gap-3 rounded-md bg-muted/60 px-3 py-2 text-sm leading-6">
          <span>{explain}</span>
          <Button size="xs" variant="ghost" onClick={() => setPicked(null)}>
            重试
          </Button>
        </div>
      )}
    </div>
  )
}

export function DataTable({ head, rows, mono = [0] }: { head: ReactNode[]; rows: ReactNode[][]; mono?: number[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-3 py-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-t align-top">
              {r.map((c, i) => (
                <td
                  key={i}
                  className={cn(
                    "px-3 py-2",
                    mono.includes(i) ? "font-mono text-xs font-medium whitespace-nowrap" : "leading-6 text-muted-foreground"
                  )}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
