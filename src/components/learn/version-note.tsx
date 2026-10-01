import type { ReactNode } from "react"
import { ArrowRightLeft, GitCompareArrows } from "lucide-react"
import { cn } from "cn"

import type { ProtocolVersion } from "@/a2ui"
import { useProtocolVersion } from "@/hooks/use-protocol-version"

/** 按当前协议版本选择内容 */
export function ByVersion({ v09, v10 }: { v09: ReactNode; v10: ReactNode }) {
  const { version } = useProtocolVersion()
  return <>{version === "v1.0" ? v10 : v09}</>
}

export function VersionBadge({ version, className }: { version: ProtocolVersion; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 font-mono text-[10px] font-semibold",
        version === "v1.0" ? "bg-violet-500/15 text-violet-700 dark:text-violet-300" : "bg-sky-500/15 text-sky-700 dark:text-sky-300",
        className
      )}
    >
      {version}
    </span>
  )
}

/**
 * 版本差异提示：当前版本等于 when 时展开说明；
 * 否则只显示一行提示，点击即可切换到该版本
 */
export function VersionNote({ when, summary, children }: { when: ProtocolVersion; summary: ReactNode; children?: ReactNode }) {
  const { version, setVersion } = useProtocolVersion()
  if (version !== when) {
    return (
      <button
        type="button"
        onClick={() => setVersion(when)}
        className="group flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-violet-500/50 hover:bg-violet-500/5"
      >
        <ArrowRightLeft className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1">
          <VersionBadge version={when} className="mr-1.5" />
          {summary}
        </span>
        <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">切换到 {when} 查看 →</span>
      </button>
    )
  }
  return (
    <div className="flex gap-3 rounded-lg border border-violet-500/30 bg-violet-500/5 px-4 py-3 text-sm leading-6">
      <GitCompareArrows className="mt-1 size-4 shrink-0 text-violet-600 dark:text-violet-400" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2 font-medium">
          <VersionBadge version={when} /> {summary}
        </span>
        {children && <div className="text-foreground/85">{children}</div>}
      </div>
    </div>
  )
}
