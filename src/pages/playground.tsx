import { useEffect, useState } from "react"
import { ListPlus, Radio, RotateCcw, Send } from "lucide-react"

import { convertMessages, parseMessages, TRAVEL_CATALOG_ID, useA2UI, type ProtocolVersion } from "@/a2ui"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Callout } from "@/components/learn/prose"
import { C } from "@/components/learn/code-block"
import { Inspector, InspectToggle, SurfacePreview } from "@/components/learn/inspector"
import { JsonTextarea, pretty } from "@/components/learn/message-editor"
import { VersionBadge } from "@/components/learn/version-note"
import OFFICIAL from "@/data/official-examples.json"
import OFFICIAL_V1 from "@/data/official-examples-v1.json"
import { useProtocolVersion } from "@/hooks/use-protocol-version"
import { bind, comps, create, data, fmt, text, V } from "@/lessons/msg"

interface Example {
  key: string
  name: string
  description: string
  messages: unknown[]
}

const LOCAL: Example[] = [
  {
    key: "local:blank",
    name: "空白模板",
    description: "从一个最小的 surface 开始",
    messages: [create("main"), comps("main", [text("root", "从这里开始编辑 ✍️", "h3")])],
  },
  {
    key: "local:travel",
    name: "自定义 catalog：旅行卡片",
    description: "使用 travel catalog 中的 FlightSegment 与 Rating",
    messages: [
      { version: V, createSurface: { surfaceId: "trip", catalogId: TRAVEL_CATALOG_ID } },
      comps("trip", [
        { id: "root", component: "Card", child: "col" },
        { id: "col", component: "Column", children: ["seg", "rating"] },
        { id: "seg", component: "FlightSegment", from: "SHA", to: "CTU", departs: "07:50", arrives: "10:55" },
        { id: "rating", component: "Rating", value: bind("/score") },
      ]),
      data("trip", { score: 4.2 }),
    ],
  },
  {
    key: "local:tabs",
    name: "Tabs + 模板 + formatString",
    description: "组合示例",
    messages: [
      create("tabs"),
      comps("tabs", [
        {
          id: "root",
          component: "Tabs",
          tabs: [
            { title: "待办", child: "todo" },
            { title: "已完成", child: "done" },
          ],
        },
        { id: "todo", component: "List", children: { componentId: "todo-item", path: "/todo" } },
        { id: "todo-item", component: "CheckBox", label: bind("title"), value: bind("done") },
        text("done", fmt("本周已完成 ${/doneCount} 项任务 🎉")),
      ]),
      data("tabs", { todo: [{ title: "阅读 A2UI 规范", done: true }, { title: "写一个渲染器", done: false }], doneCount: 7 }),
    ],
  },
]

type RawExample = { file: string; name: string; description: string; messages: unknown[] }

/** 当前版本可用的示例：官方示例按版本分别打包，本站示例按需转换 */
function examplesFor(version: ProtocolVersion) {
  const official = ((version === "v1.0" ? OFFICIAL_V1 : OFFICIAL) as RawExample[]).map((e) => ({
    key: `official:${e.file}`,
    name: e.name,
    description: e.description,
    messages: e.messages,
  }))
  const local = LOCAL.map((e) => ({ ...e, messages: convertMessages(e.messages, version) }))
  return { local, official, all: [...local, ...official] }
}

const surfaceIdOf = (ex: { messages: unknown[] }) =>
  (ex.messages[0] as { createSurface?: { surfaceId: string } })?.createSurface?.surfaceId ?? "main"

export function PlaygroundPage() {
  const { version } = useProtocolVersion()
  const [{ local: LOCAL_EXAMPLES, official: OFFICIAL_EXAMPLES, all: ALL }] = useState(() => examplesFor(version))
  const a2ui = useA2UI()
  const [exampleKey, setExampleKey] = useState("official:05_product-card.json")
  const example = ALL.find((e) => e.key === exampleKey) ?? ALL[0]
  const [text, setText] = useState(() => pretty(example.messages))
  const [appendText, setAppendText] = useState(() => pretty(convertMessages([data(surfaceIdOf(example), "新的值", "/example")], version)))
  const [error, setError] = useState<string | null>(null)
  const [inspect, setInspect] = useState(false)

  const run = (src: string, mode: "reset" | "append" | "stream") => {
    const { messages, error } = parseMessages(src)
    setError(error ?? null)
    if (mode === "append") return a2ui.send(messages)
    a2ui.reset()
    if (mode === "stream") a2ui.stream(messages, 450)
    else a2ui.send(messages)
  }

  const load = (key: string) => {
    const ex = ALL.find((e) => e.key === key)
    if (!ex) return
    setExampleKey(key)
    const src = pretty(ex.messages)
    setText(src)
    setAppendText(pretty(convertMessages([data(surfaceIdOf(ex), "新的值", "/example")], version)))
    run(src, "reset")
  }

  const { reset, send } = a2ui
  useEffect(() => {
    reset()
    send(example.messages)
    // 仅挂载时渲染默认示例
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-8 pb-20 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          Playground <VersionBadge version={version} className="h-6 text-xs" />
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          选择一个示例或自己编写 A2UI 消息（JSON 数组、JSONL 或 <C>{`{ "messages": [...] }`}</C> 均可）。“追加发送”不会重置状态，适合练习增量更新。渲染器同时支持 v0.9 与 v1.0，按每条消息的 version 处理；右上角的开关决定加载哪个版本的示例。
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={exampleKey} onValueChange={load}>
          <SelectTrigger className="w-full sm:w-80">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-96">
            <SelectGroup>
              <SelectLabel>本站示例</SelectLabel>
              {LOCAL_EXAMPLES.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>官方示例（{version === "v1.0" ? "v1.0" : "v0.9.1"} basic catalog）</SelectLabel>
              {OFFICIAL_EXAMPLES.map((e) => (
                <SelectItem key={e.key} value={e.key}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">{example.description}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">消息</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => load(exampleKey)}>
                <RotateCcw /> 还原
              </Button>
              <Button size="sm" variant="outline" onClick={() => run(text, "stream")}>
                <Radio /> 流式发送
              </Button>
              <Button size="sm" onClick={() => run(text, "reset")}>
                <Send /> 重置并发送
              </Button>
            </div>
          </div>
          <JsonTextarea value={text} onChange={setText} minHeight={460} className="max-h-[560px]" />
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <span className="text-xs font-medium text-muted-foreground">增量消息（在当前状态上追加）</span>
            <Button size="sm" variant="outline" onClick={() => run(appendText, "append")}>
              <ListPlus /> 追加发送
            </Button>
          </div>
          <JsonTextarea value={appendText} onChange={setAppendText} minHeight={140} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">渲染结果</span>
            <InspectToggle value={inspect} onChange={setInspect} />
          </div>
          <SurfacePreview a2ui={a2ui} inspect={inspect} />
          <Inspector a2ui={a2ui} height={320} />
          <Callout tone="info">
            点击界面中的按钮会产生 <C>action</C> 消息，可在“消息日志”中查看。本页没有真实的 Agent，所以不会有回应。
          </Callout>
        </div>
      </div>
    </div>
  )
}
