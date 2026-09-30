/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, type ReactNode } from "react"
import { RotateCcw, Send } from "lucide-react"
import { cn } from "cn"

import { parseMessages, useA2UI, type A2UIHandle, type UseA2UIOptions } from "@/a2ui"
import { Button } from "@/components/ui/button"

import { highlightJson } from "./code-block"

/** 带语法高亮覆盖层的 JSON 文本框 */
export function JsonTextarea({
  value,
  onChange,
  className,
  minHeight = 220,
}: {
  value: string
  onChange: (v: string) => void
  className?: string
  minHeight?: number
}) {
  return (
    <div className={cn("relative min-w-0 overflow-auto rounded-lg border bg-muted/40 focus-within:ring-2 focus-within:ring-ring/40", className)} style={{ minHeight }}>
      <div className="relative min-w-full w-max">
        <pre
          aria-hidden
          className="pointer-events-none p-3 font-mono text-[12px] leading-[1.6] whitespace-pre"
        >
          {highlightJson(value)}
          {"\n"}
        </pre>
        <textarea
          value={value}
          spellCheck={false}
          wrap="off"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault()
              const t = e.currentTarget
              const { selectionStart: s, selectionEnd: end } = t
              const next = value.slice(0, s) + "  " + value.slice(end)
              onChange(next)
              requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2))
            }
          }}
          className="absolute inset-0 resize-none overflow-hidden bg-transparent p-3 font-mono text-[12px] leading-[1.6] whitespace-pre text-transparent caret-foreground outline-none selection:bg-sky-400/30"
        />
      </div>
    </div>
  )
}

export function pretty(messages: unknown[]) {
  return JSON.stringify(messages, null, 2)
}

/** 可编辑的消息 → 发送 → 渲染 */
export function MessageEditor({
  a2ui,
  initial,
  title = "Agent 发送的消息（JSON 数组或 JSONL）",
  minHeight,
  extra,
  className,
}: {
  a2ui: A2UIHandle
  initial: string
  title?: ReactNode
  minHeight?: number
  extra?: ReactNode
  className?: string
}) {
  const [text, setText] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  const run = (src: string) => {
    const { messages, error } = parseMessages(src)
    setError(error ?? null)
    a2ui.reset()
    a2ui.send(messages)
  }

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className="flex items-center gap-1.5">
          {extra}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setText(initial)
              run(initial)
            }}
          >
            <RotateCcw /> 还原
          </Button>
          <Button size="sm" onClick={() => run(text)}>
            <Send /> 发送给客户端
          </Button>
        </div>
      </div>
      <JsonTextarea value={text} onChange={setText} minHeight={minHeight} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

/** 课程演示用：挂载时发送初始消息（兼容 StrictMode 的双重执行） */
export function useDemo(initial: unknown[], options?: UseA2UIOptions) {
  const a2ui = useA2UI(options)
  const { reset, send } = a2ui
  useEffect(() => {
    reset()
    send(initial)
    // 仅挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return a2ui
}
