import { useEffect, useRef, useState } from "react"
import { Pause, Play, RotateCcw, StepForward } from "lucide-react"
import { cn } from "cn"

import { messageType, useA2UI, type A2UIHandle } from "@/a2ui"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CodeBlock, C } from "@/components/learn/code-block"
import { InspectToggle, SurfacePreview, summarize } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { Bullets, Callout, P, Section } from "@/components/learn/prose"

import { bind, comps, create, data, fmt, text } from "./msg"

const S = "weather"

const MSG = {
  create: create(S, { theme: { agentDisplayName: "天气助手" } }),
  root: comps(S, [{ id: "root", component: "Card", child: "main" }, { id: "main", component: "Column", children: ["header", "now", "divider", "forecast"] }]),
  header: comps(S, [
    { id: "header", component: "Row", children: ["pin", "city"], align: "center" },
    { id: "pin", component: "Icon", name: "locationOn" },
    text("city", bind("/city"), "h4"),
  ]),
  now: comps(S, [
    { id: "now", component: "Row", children: ["temp", "desc"], align: "end" },
    text("temp", fmt("${/now/temp}°"), "h1"),
    text("desc", fmt("${/now/desc} · 体感 ${/now/feels}°"), "caption"),
  ]),
  dataNow: data(S, { city: "杭州 · 西湖区", now: { temp: 23, desc: "多云", feels: 24 } }),
  forecast: comps(S, [
    { id: "divider", component: "Divider" },
    { id: "forecast", component: "Row", children: { componentId: "day", path: "/days" }, justify: "spaceBetween" },
    { id: "day", component: "Column", children: ["day-name", "day-temp"], align: "center" },
    text("day-name", bind("name"), "caption"),
    text("day-temp", fmt("${high}° / ${low}°")),
  ]),
  dataDays: data(
    S,
    [
      { name: "周四", high: 25, low: 17 },
      { name: "周五", high: 22, low: 16 },
      { name: "周六", high: 19, low: 14 },
      { name: "周日", high: 24, low: 15 },
    ],
    "/days"
  ),
}

const ORDERS: Record<string, { label: string; messages: unknown[] }> = {
  topDown: {
    label: "root 优先（推荐）",
    messages: [MSG.create, MSG.root, MSG.header, MSG.dataNow, MSG.now, MSG.forecast, MSG.dataDays],
  },
  leavesFirst: {
    label: "root 最后到达",
    messages: [MSG.create, MSG.header, MSG.now, MSG.forecast, MSG.dataNow, MSG.dataDays, MSG.root],
  },
  dataLate: {
    label: "数据最后到达",
    messages: [MSG.create, MSG.root, MSG.header, MSG.now, MSG.forecast, MSG.dataNow, MSG.dataDays],
  },
}

function usePlayer(a2ui: A2UIHandle, messages: unknown[]) {
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(900)
  const cursorRef = useRef(0)

  const step = () => {
    const i = cursorRef.current
    if (i >= messages.length) {
      setPlaying(false)
      return
    }
    a2ui.send(messages[i])
    cursorRef.current = i + 1
    setCursor(i + 1)
  }

  const reset = () => {
    setPlaying(false)
    a2ui.reset()
    cursorRef.current = 0
    setCursor(0)
  }

  useEffect(() => {
    if (!playing) return
    const t = window.setInterval(() => {
      if (cursorRef.current >= messages.length) {
        setPlaying(false)
        return
      }
      step()
    }, speed)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, speed, messages])

  return { cursor, playing, setPlaying, speed, setSpeed, step, reset }
}

function StreamDemo() {
  const a2ui = useA2UI()
  const [order, setOrder] = useState("topDown")
  const [inspect, setInspect] = useState(true)
  const messages = ORDERS[order].messages
  const p = usePlayer(a2ui, messages)
  const done = p.cursor >= messages.length

  return (
    <DemoCard
      title="逐条接收 JSONL"
      description="每条消息一到达就立即处理：先出现骨架与占位，再被组件和数据逐步填满"
      toolbar={<InspectToggle value={inspect} onChange={setInspect} />}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={order}
          onValueChange={(v) => {
            if (!v) return
            setOrder(v)
            p.reset()
          }}
        >
          {Object.entries(ORDERS).map(([k, o]) => (
            <ToggleGroupItem key={k} value={k} className="text-xs">
              {o.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className="ml-auto flex items-center gap-1.5">
          <ToggleGroup type="single" size="sm" value={String(p.speed)} onValueChange={(v) => v && p.setSpeed(Number(v))}>
            <ToggleGroupItem value="1500" className="text-xs">慢</ToggleGroupItem>
            <ToggleGroupItem value="900" className="text-xs">中</ToggleGroupItem>
            <ToggleGroupItem value="350" className="text-xs">快</ToggleGroupItem>
          </ToggleGroup>
          <Button size="sm" variant="ghost" onClick={p.reset}>
            <RotateCcw /> 重置
          </Button>
          <Button size="sm" variant="outline" onClick={p.step} disabled={done || p.playing}>
            <StepForward /> 单步
          </Button>
          <Button
            size="sm"
            onClick={() => {
              if (done) p.reset()
              p.setPlaying(!p.playing)
            }}
          >
            {p.playing ? <Pause /> : <Play />} {p.playing ? "暂停" : done ? "重播" : "播放"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="mb-1 text-xs font-medium text-muted-foreground">stream.jsonl</span>
          {messages.map((m, i) => {
            const delivered = i < p.cursor
            const current = i === p.cursor - 1
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2 py-1.5 font-mono text-[11px] transition-all",
                  delivered ? "bg-background" : "border-dashed opacity-45",
                  current && "border-sky-500 ring-2 ring-sky-500/20"
                )}
              >
                <span className="w-4 text-right text-muted-foreground">{i + 1}</span>
                <span className={cn("font-medium", delivered && "text-sky-700 dark:text-sky-300")}>{messageType(m)}</span>
                <span className="truncate text-muted-foreground">{summarize({ id: i, dir: "down", kind: messageType(m) ?? "", payload: m, time: 0 })}</span>
              </div>
            )
          })}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">客户端渲染</span>
          <SurfacePreview a2ui={a2ui} inspect={inspect} empty="点击 ▶ 播放 或 单步，开始接收消息" />
        </div>
      </div>
    </DemoCard>
  )
}

export default function StreamingLesson() {
  return (
    <LessonShell
      slug="streaming"
      intro={
        <>
          LLM 是一个 token 一个 token 输出的。如果客户端必须等到一个完整的大 JSON 生成完毕才能渲染，用户就只能盯着转圈。A2UI 把界面拆成一串<strong>小而完整</strong>的消息，
          客户端每收到一条就立刻处理，于是界面可以<strong>一边生成、一边出现</strong>。
        </>
      }
      takeaways={[
        "A2UI 消息以 JSONL 等方式分帧：每条消息都是完整、可独立解析的 JSON。",
        "只要 root 到达就可以开始渲染；引用了尚未到达的组件时显示占位。",
        "root 未到达前，其他组件只是被缓冲，不会显示。",
        "数据路径暂时解析为 undefined 时应优雅降级（当作空字符串或显示加载态）。",
      ]}
      quiz={[
        {
          q: "如果 Agent 先发送了所有子组件，最后才发送 root，用户会看到什么？",
          options: ["报错", "一开始什么都没有（组件被缓冲），root 到达时整棵树一次性出现", "子组件先各自单独显示", "只显示 root"],
          answer: 1,
          explain: "在上面的演示中选择“root 最后到达”即可观察：客户端显示“已缓冲 N 个组件”，直到 root 到达。",
        },
        {
          q: "为什么 A2UI 要求传输层保证消息有序？",
          options: ["为了压缩", "因为消息是有状态的更新，例如必须先 createSurface 再更新它", "因为 JSON 必须排序", "为了加密"],
          answer: 1,
          explain: "乱序可能导致更新落在尚未创建的 surface 上，或新数据被旧数据覆盖。",
        },
      ]}
    >
      <Section title="JSONL：一行一条消息" kicker="01 · 格式">
        <P>
          最常见的分帧方式是 JSON Lines——每一行都是一条完整的 A2UI 消息。也可以用 SSE 事件、WebSocket 帧或 A2A 消息 Part 来分帧，本质相同：
          <strong>客户端总能拿到一条条完整的消息</strong>，不必解析“半个 JSON”。
        </P>
        <CodeBlock
          language="text"
          code={`{"version":"v0.9","createSurface":{"surfaceId":"weather","catalogId":"…/basic/catalog.json"}}
{"version":"v0.9","updateComponents":{"surfaceId":"weather","components":[{"id":"root","component":"Card","child":"main"}, …]}}
{"version":"v0.9","updateDataModel":{"surfaceId":"weather","value":{"city":"杭州","now":{"temp":23}}}}
…`}
        />
      </Section>

      <Section title="看着界面长出来" kicker="02 · 动手">
        <P>
          下面是一个天气卡片的消息流。切换三种<strong>到达顺序</strong>，用“单步”逐条发送，观察占位符（等待组件）、缓冲（等待 root）以及数据未到时的空值是如何表现的。
        </P>
        <StreamDemo />
      </Section>

      <Section title="渐进渲染的规则" kicker="03 · 规则">
        <Bullets
          items={[
            <><strong>root 是开关：</strong>在 id 为 <C>root</C> 的组件出现之前，其他组件只会被存进缓冲区。</>,
            <><strong>缺失的引用用占位：</strong>父组件引用了还没到的子组件 ID 时，客户端先显示占位，等它到达再补上。</>,
            <><strong>缺失的数据当作空：</strong>绑定的路径在数据模型里还不存在时，值为 undefined，文本显示为空字符串。</>,
            <><strong>任何时候都能继续更新：</strong>之后的 updateComponents / updateDataModel 会在已有界面上增量生效。</>,
          ]}
        />
        <Callout tone="tip" title="给 Agent 开发者的建议">
          优先发送 root 和整体骨架，再发送细节与数据。这样用户最快看到“界面的形状”，体感等待时间最短。
        </Callout>
      </Section>
    </LessonShell>
  )
}
