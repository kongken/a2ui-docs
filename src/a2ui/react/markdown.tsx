/* eslint-disable react-refresh/only-export-components */
// Text 组件支持的"简单 Markdown"：粗体、斜体、行内代码、删除线、链接、标题、列表

import type { ReactNode } from "react"

const INLINE =
  /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`|~~[^~]+~~|\[[^\]]+\]\([^)\s]+\))/g

export function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let key = 0
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0]
    const idx = m.index ?? 0
    if (idx > last) out.push(text.slice(last, idx))
    last = idx + tok.length
    const k = key++
    if (tok.startsWith("**") || tok.startsWith("__")) {
      out.push(<strong key={k}>{tok.slice(2, -2)}</strong>)
    } else if (tok.startsWith("~~")) {
      out.push(<del key={k}>{tok.slice(2, -2)}</del>)
    } else if (tok.startsWith("`")) {
      out.push(
        <code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {tok.slice(1, -1)}
        </code>
      )
    } else if (tok.startsWith("[")) {
      const [, label, href] = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok) ?? []
      out.push(
        /^https?:\/\//.test(href ?? "") ? (
          <a key={k} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
            {label}
          </a>
        ) : (
          label
        )
      )
    } else {
      out.push(<em key={k}>{tok.slice(1, -1)}</em>)
    }
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function isBlockMarkdown(text: string) {
  return /\n|^#{1,6}\s|^[-*]\s|^\d+\.\s/m.test(text)
}

// 与 v0.9 的 h1–h5 变体保持一致（v1.0 的标题用 Markdown 表达）
const H = [
  "text-3xl font-bold tracking-tight",
  "text-2xl font-semibold tracking-tight",
  "text-xl font-semibold",
  "text-lg font-semibold",
  "text-base font-semibold",
  "text-sm font-semibold",
]

type ListState = { ordered: boolean; items: string[] }

export function MarkdownBlocks({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  let para: string[] = []
  let list: ListState | null = null

  const flushPara = () => {
    if (!para.length) return
    blocks.push(
      <p key={blocks.length}>
        {para.map((l, i) => (
          <span key={i}>
            {i > 0 && <br />}
            {renderInline(l)}
          </span>
        ))}
      </p>
    )
    para = []
  }
  const flushList = () => {
    if (!list) return
    const { ordered, items } = list
    const Tag = ordered ? "ol" : "ul"
    blocks.push(
      <Tag key={blocks.length} className={ordered ? "list-decimal pl-5" : "list-disc pl-5"}>
        {items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </Tag>
    )
    list = null
  }

  for (const line of text.split("\n")) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    const item = /^\s*(?:([-*])|\d+\.)\s+(.*)$/.exec(line)
    if (h) {
      flushPara()
      flushList()
      blocks.push(
        <div key={blocks.length} className={H[h[1].length - 1]}>
          {renderInline(h[2])}
        </div>
      )
    } else if (item) {
      flushPara()
      const ordered = !item[1]
      if (list && (list as ListState).ordered !== ordered) flushList()
      list ??= { ordered, items: [] }
      list.items.push(item[2])
    } else if (line.trim() === "") {
      flushPara()
      flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return <div className="flex flex-col gap-2">{blocks}</div>
}
