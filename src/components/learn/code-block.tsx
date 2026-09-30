/* eslint-disable react-refresh/only-export-components */
import { useState, type ReactNode } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"

const TOKEN =
  /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g

/** 轻量 JSON 语法高亮 */
export function highlightJson(src: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  for (const m of src.matchAll(TOKEN)) {
    const i = m.index ?? 0
    if (i > last) out.push(src.slice(last, i))
    last = i + m[0].length
    const [, str, colon, kw, num, punct] = m
    if (str && colon) {
      out.push(
        <span key={k++} className="text-sky-700 dark:text-sky-300">{str}</span>,
        colon
      )
    } else if (str) {
      out.push(<span key={k++} className="text-emerald-700 dark:text-emerald-300">{str}</span>)
    } else if (kw) {
      out.push(<span key={k++} className="text-violet-700 dark:text-violet-300">{kw}</span>)
    } else if (num) {
      out.push(<span key={k++} className="text-amber-700 dark:text-amber-300">{num}</span>)
    } else if (punct) {
      out.push(<span key={k++} className="text-muted-foreground">{punct}</span>)
    }
  }
  if (last < src.length) out.push(src.slice(last))
  return out
}

export function toJson(value: unknown, compact = false) {
  return typeof value === "string" ? value : JSON.stringify(value, null, compact ? 0 : 2)
}

interface CodeBlockProps {
  code: unknown
  title?: ReactNode
  className?: string
  compact?: boolean
  maxHeight?: number | string
  language?: "json" | "text"
  actions?: ReactNode
}

export function CodeBlock({ code, title, className, compact, maxHeight, language = "json", actions }: CodeBlockProps) {
  const text = toJson(code, compact)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* 剪贴板不可用 */
    }
  }
  return (
    <div className={cn("group/code relative min-w-0 overflow-hidden rounded-lg border bg-muted/40", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-2 border-b bg-muted/60 px-3 py-1.5">
          <span className="truncate font-mono text-[11px] text-muted-foreground">{title}</span>
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      )}
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={copy}
        className="absolute right-1.5 bottom-1.5 opacity-0 transition-opacity group-hover/code:opacity-100"
        aria-label="复制"
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      <pre
        className="overflow-auto p-3 font-mono text-[12px] leading-[1.6]"
        style={{ maxHeight }}
      >
        <code>{language === "json" ? highlightJson(text) : text}</code>
      </pre>
    </div>
  )
}

/** 行内代码 */
export function C({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
}
