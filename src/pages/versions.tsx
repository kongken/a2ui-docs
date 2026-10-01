import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, RotateCcw, Trash2, Wand2 } from "lucide-react"

import {
  BASIC_CATALOG_V1_ID,
  DEVICE_CATALOG_V1_ID,
  TRAVEL_CATALOG_V1_ID,
  convertMessages,
  getAt,
  parseMessages,
  useA2UI,
  type ComponentDef,
} from "@/a2ui"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { C, CodeBlock } from "@/components/learn/code-block"
import { Inspector, MessageLog, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard } from "@/components/learn/lesson-shell"
import { JsonTextarea, pretty } from "@/components/learn/message-editor"
import { Bullets, Callout, DataTable, P, Section } from "@/components/learn/prose"
import { VersionBadge } from "@/components/learn/version-note"
import { bind, comps, create, data, fmt, text } from "@/lessons/msg"

// ---------------------------------------------------------------------------
// v1.0 消息构造（本页的演示固定使用 v1.0）
// ---------------------------------------------------------------------------

const V1 = "v1.0"
const cs1 = (surfaceId: string, extra: Record<string, unknown> = {}) => ({
  version: V1,
  createSurface: { surfaceId, catalogId: BASIC_CATALOG_V1_ID, ...extra },
})
const ud1 = (surfaceId: string, body: Record<string, unknown>) => ({ version: V1, updateDataModel: { surfaceId, ...body } })

const DIFFS: [string, React.ReactNode, React.ReactNode][] = [
  ["version", <C>"v0.9" / "v0.9.1"</C>, <C>"v1.0"</C>],
  ["术语", "client（客户端）/ server", "renderer（渲染器）/ agent"],
  ["basic catalogId", <C>…/v0_9/catalogs/basic/…</C>, <C>…/v1_0/catalogs/basic/…</C>],
  ["createSurface", "catalogId 必填；可带 theme", "catalogId 可选（默认 catalog）；可内联 components 与 dataModel；移除 theme"],
  ["删除数据", <>省略 <C>value</C></>, <><C>value</C> 必填，设为 <C>null</C> 即删除</>],
  ["Text 标题", <><C>variant</C>: h1–h5</>, <>只有 caption / body，标题用 Markdown <C>#</C></>],
  ["校验函数返回", "boolean", <><C>ValidationResult</C>：valid / code / message / severity</>],
  ["函数调用", "只在本地执行", <>双向 RPC：<C>callRendererFunction</C> ↔ <C>callAgentFunction</C></>],
  ["FunctionCall.returnType", "可写在消息里", "移除，由 catalog 声明"],
  ["catalog", "每个 surface 一份", <>可混用（组件级 <C>catalogId</C>）；<C>allowedParents</C> / <C>allowedChildren</C> 组合约束</>],
  ["内置函数", "—", <C>@index</C>],
  ["新增属性", "—", <><C>TextField.placeholder</C>、<C>Video.posterUrl</C>、<C>Slider.steps</C>、<C>action.event.userMessage</C></>],
  ["数据模型元数据", <C>a2uiClientDataModel</C>, <C>a2uiRendererDataModel</C>],
  ["能力声明", <C>a2uiClientCapabilities</C>, <C>{`a2uiRendererCapabilities: { "v1.0": {...} }`}</C>],
]

// ---------------------------------------------------------------------------
// 迁移助手
// ---------------------------------------------------------------------------

const MIGRATE_SAMPLE = [
  create("order", { theme: { primaryColor: "#2563eb", agentDisplayName: "咖啡助手" } }),
  comps("order", [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["title", "size", "note", "total", "submit"] },
    text("title", fmt("${/shop} · 下单"), "h3"),
    { id: "size", component: "ChoicePicker", label: "杯型", displayStyle: "chips", options: [{ label: "中杯", value: "m" }, { label: "大杯", value: "l" }], value: bind("/size") },
    { id: "note", component: "TextField", label: "备注", value: bind("/note"), validationRegexp: "^.{0,20}$" },
    text("total", { call: "formatCurrency", args: { value: bind("/price"), currency: "CNY" }, returnType: "string" }, "h4"),
    { id: "submit", component: "Button", child: "submit-t", variant: "primary", action: { event: { name: "place_order", context: { size: bind("/size") } } } },
    text("submit-t", "下单"),
  ]),
  data("order", { shop: "山丘咖啡", size: ["m"], note: "", price: 28, coupon: "SAVE5" }),
  { version: "v0.9", updateDataModel: { surfaceId: "order", path: "/coupon" } },
]

function MigrationAssistant() {
  const [src, setSrc] = useState(pretty(MIGRATE_SAMPLE))
  const [error, setError] = useState<string | null>(null)
  const [converted, setConverted] = useState<unknown[]>(() => convertMessages(MIGRATE_SAMPLE, "v1.0"))
  const left = useA2UI()
  const right = useA2UI()

  const run = (text: string) => {
    const { messages, error } = parseMessages(text)
    setError(error ?? null)
    const out = convertMessages(messages, "v1.0")
    setConverted(out)
    left.reset()
    left.sendRaw(messages)
    right.reset()
    right.sendRaw(out)
  }
  useEffect(() => {
    left.reset()
    left.sendRaw(MIGRATE_SAMPLE)
    right.reset()
    right.sendRaw(convertMessages(MIGRATE_SAMPLE, "v1.0"))
    // 仅挂载时渲染示例
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <DemoCard
      title="v0.9 → v1.0 迁移助手"
      description="左侧编辑 v0.9 消息，右侧是本站转换器生成的 v1.0 消息；下方用两个版本的渲染器分别渲染"
      toolbar={
        <>
          <Button size="sm" variant="ghost" onClick={() => { setSrc(pretty(MIGRATE_SAMPLE)); run(pretty(MIGRATE_SAMPLE)) }}>
            <RotateCcw /> 还原
          </Button>
          <Button size="sm" onClick={() => run(src)}>
            <Wand2 /> 转换并渲染
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <VersionBadge version="v0.9" /> 输入
          </span>
          <JsonTextarea value={src} onChange={setSrc} minHeight={380} className="max-h-[440px]" />
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <VersionBadge version="v1.0" /> 输出
          </span>
          <CodeBlock code={converted} maxHeight={440} />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          { v: "v0.9" as const, h: left },
          { v: "v1.0" as const, h: right },
        ].map(({ v, h }) => (
          <div key={v} className="flex min-w-0 flex-col gap-2">
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <VersionBadge version={v} /> 渲染器
            </span>
            <SurfacePreview a2ui={h} />
            <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/20 p-2">
              <MessageLog log={h.log.filter((e) => e.dir === "up")} empty="没有发回 Agent 的错误 ✓" />
            </div>
          </div>
        ))}
      </div>
      <Bullets
        items={[
          <><C>theme</C> 被移除（v1.0 中外观完全由渲染器决定）。</>,
          <><C>variant: "h3" / "h4"</C> 变成 Markdown 标题；绑定值会被包进 <C>formatString</C>。</>,
          <><C>returnType</C> 从 FunctionCall 中去掉；<C>validationRegexp</C> 改写为 <C>checks</C> + <C>regex</C>。</>,
          <>省略 value 的删除操作变为 <C>"value": null</C>。</>,
        ]}
      />
    </DemoCard>
  )
}

// ---------------------------------------------------------------------------
// v1.0 新能力演示
// ---------------------------------------------------------------------------

const INLINE = [
  cs1("inline", {
    components: [
      { id: "root", component: "Card", child: "col" },
      { id: "col", component: "Column", children: ["t", "b"] },
      text("t", fmt("## 你好，${/name}")),
      text("b", "这个界面只用了**一条** createSurface 消息。"),
    ],
    dataModel: { name: "v1.0" },
  }),
]

function InlineDemo() {
  const a2ui = useA2UI()
  const { reset, sendRaw } = a2ui
  useEffect(() => {
    reset()
    sendRaw(INLINE)
  }, [reset, sendRaw])
  return (
    <DemoCard title="一条消息建好整个界面" description="createSurface 可以直接携带 components 与 dataModel">
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock code={INLINE[0]} maxHeight={320} />
        <SurfacePreview a2ui={a2ui} />
      </div>
    </DemoCard>
  )
}

const INDEX_NO: ComponentDef = text("no", { call: "formatString", args: { value: "**#${@index(offset: 1)}**" } })
const INDEX = [
  cs1("rank", {
    components: [
      { id: "root", component: "List", children: { componentId: "row", path: "/songs" } },
      { id: "row", component: "Row", children: ["no", "name"], align: "center" },
      INDEX_NO,
      text("name", bind("title")),
    ],
    dataModel: { songs: [{ title: "晴天" }, { title: "夜曲" }, { title: "稻香" }] },
  }),
]
const MORE_SONGS = ["七里香", "告白气球", "青花瓷", "简单爱"]

function IndexDemo() {
  const a2ui = useA2UI()
  const { reset, sendRaw } = a2ui
  useEffect(() => {
    reset()
    sendRaw(INDEX)
  }, [reset, sendRaw])
  const songs = (getAt(a2ui.state.surfaces.rank?.dataModel ?? {}, "/songs") as { title: string }[] | undefined) ?? []
  return (
    <DemoCard title="@index：模板中的序号" description="内置函数 @index 返回当前元素的下标（offset: 1 表示从 1 开始），只能在模板作用域中使用">
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock code={INDEX_NO} />
        <div className="flex flex-col gap-2">
          <SurfacePreview a2ui={a2ui} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => a2ui.sendRaw(ud1("rank", { path: "/songs", value: [{ title: MORE_SONGS[songs.length % MORE_SONGS.length] }, ...songs] }))}>
              <Plus /> 插入到最前
            </Button>
            <Button size="sm" variant="outline" disabled={!songs.length} onClick={() => a2ui.sendRaw(ud1("rank", { path: "/songs", value: songs.slice(1) }))}>
              <Trash2 /> 删除第一首
            </Button>
          </div>
        </div>
      </div>
    </DemoCard>
  )
}

function RendererRpcDemo() {
  const a2ui = useA2UI()
  const calls = [
    { label: "getDeviceInfo", hint: "agentOnly", catalogId: DEVICE_CATALOG_V1_ID },
    { label: "getColorScheme", hint: "rendererOrAgent", catalogId: DEVICE_CATALOG_V1_ID },
    { label: "formatDate", hint: "rendererOnly（basic）", catalogId: BASIC_CATALOG_V1_ID },
  ]
  const [seq, setSeq] = useState(1)
  return (
    <DemoCard title="Agent → 渲染器：callRendererFunction" description="Agent 请求渲染器执行一个函数；能否调用由 catalog 中的 allowedCallers 决定">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <CodeBlock
            title="device catalog（节选）"
            code={{
              catalogId: DEVICE_CATALOG_V1_ID,
              protocolVersion: "1.0",
              functions: {
                getDeviceInfo: { returnType: "object", allowedCallers: "agentOnly" },
                getColorScheme: { returnType: "string", allowedCallers: "rendererOrAgent" },
              },
            }}
          />
          <div className="flex flex-wrap gap-2">
            {calls.map((c) => (
              <Button
                key={c.label}
                size="sm"
                variant="outline"
                onClick={() => {
                  setSeq(seq + 1)
                  a2ui.sendRaw({
                    version: V1,
                    callRendererFunction: {
                      functionCallId: `rpc-${seq}`,
                      callFunction: { call: c.label, catalogId: c.catalogId, ...(c.label === "formatDate" ? { args: { value: "2026-10-01", format: "yyyy" } } : {}) },
                    },
                  })
                }}
              >
                {c.label}
                <span className="font-mono text-[10px] text-muted-foreground">{c.hint}</span>
              </Button>
            ))}
          </div>
          <Callout tone="info">
            basic catalog 中的函数默认都是 <C>rendererOnly</C>，所以 Agent 调用 <C>formatDate</C> 会得到 <C>INVALID_FUNCTION_CALL</C>。
          </Callout>
        </div>
        <div className="max-h-96 overflow-y-auto rounded-lg border bg-muted/20 p-2">
          <MessageLog log={a2ui.log} empty="点击左侧按钮，模拟 Agent 发送 callRendererFunction" />
        </div>
      </div>
    </DemoCard>
  )
}

const COUPONS: Record<string, { valid: boolean; code?: string; message?: string }> = {
  A2UI10: { valid: true, message: "已减 10%" },
  OLD2024: { valid: false, code: "EXPIRED", message: "优惠码已过期" },
}
const SHIPPING: Record<string, string> = { sh: "¥0（同城）", bj: "¥12", cd: "¥15" }

const CHECKOUT = [
  cs1("checkout", {
    components: [
      { id: "root", component: "Card", child: "col" },
      { id: "col", component: "Column", children: ["title", "city", "ship", "coupon", "pay"] },
      text("title", "## 结算"),
      {
        id: "city",
        component: "ChoicePicker",
        label: "配送城市",
        displayStyle: "chips",
        options: [
          { label: "上海", value: "sh" },
          { label: "北京", value: "bj" },
          { label: "成都", value: "cd" },
        ],
        value: bind("/city"),
      },
      text("ship", { call: "formatString", args: { value: "运费：${getShippingQuote(city: ${/city})}" } }),
      {
        id: "coupon",
        component: "TextField",
        label: "优惠码（试试 A2UI10 或 OLD2024）",
        placeholder: "输入优惠码",
        value: bind("/coupon"),
        checks: [{ condition: { call: "verifyCoupon", args: { code: bind("/coupon") } }, message: "优惠码无效" }],
      },
      {
        id: "pay",
        component: "Button",
        child: "pay-t",
        variant: "primary",
        checks: [{ condition: { call: "verifyCoupon", args: { code: bind("/coupon") } } }],
        action: { event: { name: "pay", userMessage: { call: "formatString", args: { value: "我使用优惠码 ${/coupon} 下单" } }, context: { coupon: bind("/coupon") } } },
      },
      text("pay-t", "使用优惠码支付"),
    ],
    dataModel: { city: ["sh"], coupon: "" },
  }),
]

function AgentRpcDemo() {
  const a2ui = useA2UI({
    // 模拟 Agent：收到 callAgentFunction 后，稍等片刻返回 agentFunctionResponse
    onCallAgentFunction: (call) => {
      const { call: name, args = {} } = call.callFunction
      let response: Record<string, unknown>
      if (name === "verifyCoupon") {
        const code = String(args.code ?? "").trim().toUpperCase()
        response = { value: !code ? { valid: false, code: "EMPTY", message: "请输入优惠码" } : (COUPONS[code] ?? { valid: false, code: "NOT_FOUND", message: `优惠码 ${code} 不存在` }) }
      } else if (name === "getShippingQuote") {
        const city = Array.isArray(args.city) ? String(args.city[0]) : String(args.city)
        response = { value: SHIPPING[city] ?? "暂不配送" }
      } else {
        response = { error: { code: "UNKNOWN_FUNCTION", message: `Agent 不认识函数 ${name}` } }
      }
      window.setTimeout(() => a2ui.sendRaw({ version: V1, agentFunctionResponse: { functionCallId: call.functionCallId, ...response } }), 700)
    },
  })
  const { reset, sendRaw } = a2ui
  useEffect(() => {
    reset()
    sendRaw(CHECKOUT)
  }, [reset, sendRaw])

  return (
    <DemoCard
      title="渲染器 → Agent：callAgentFunction + ValidationResult"
      description="verifyCoupon、getShippingQuote 不在渲染器的 catalog 中，于是渲染器把调用转交 Agent，等待期间显示“验证中…”/“…”"
      toolbar={
        <Button size="sm" variant="ghost" onClick={() => { reset(); sendRaw(CHECKOUT) }}>
          <RotateCcw /> 重置
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SurfacePreview a2ui={a2ui} />
        <Inspector a2ui={a2ui} tabs={["log", "data"]} height={330} />
      </div>
      <Bullets
        items={[
          <>校验函数返回 <C>{`{ valid, code, message }`}</C>；<C>message</C> 直接显示在输入框下方，CheckRule 上的 message 只是兜底。</>,
          <>远程函数也能出现在 <C>formatString</C> 里：<C>{"${getShippingQuote(city: ${/city})}"}</C>。</>,
          <>按钮的 action 带有 <C>userMessage</C>，展开日志中的 action 可以看到解析后的文字。</>,
        ]}
      />
    </DemoCard>
  )
}

const mixed = (parent: "Card" | "Row") => [
  cs1("mix", {
    components: [
      parent === "Card" ? { id: "root", component: "Card", child: "seg" } : { id: "root", component: "Row", children: ["seg"] },
      { id: "seg", component: "FlightSegment", catalogId: TRAVEL_CATALOG_V1_ID, from: "PVG", to: "HND", departs: "08:35", arrives: "12:20" },
    ],
  }),
]

function MixDemo() {
  const [parent, setParent] = useState<"Card" | "Row">("Card")
  const a2ui = useA2UI()
  const { reset, sendRaw } = a2ui
  useEffect(() => {
    reset()
    sendRaw(mixed(parent))
  }, [parent, reset, sendRaw])
  return (
    <DemoCard
      title="混用 catalog + 组合约束"
      description="surface 默认用 basic catalog；FlightSegment 自带 travel catalog 的 catalogId。travel catalog 规定它只能放在 Card / Column / List 中"
      toolbar={
        <ToggleGroup type="single" size="sm" variant="outline" value={parent} onValueChange={(v) => v && setParent(v as typeof parent)}>
          <ToggleGroupItem value="Card" className="text-xs">放进 Card</ToggleGroupItem>
          <ToggleGroupItem value="Row" className="text-xs">放进 Row</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <CodeBlock code={mixed(parent)[0]} maxHeight={300} />
        <div className="flex flex-col gap-2">
          <SurfacePreview a2ui={a2ui} />
          <div className="max-h-40 overflow-y-auto rounded-lg border bg-muted/20 p-2">
            <MessageLog log={a2ui.log.filter((e) => e.dir === "up")} empty="没有校验错误 ✓" />
          </div>
        </div>
      </div>
    </DemoCard>
  )
}

function NullDeleteDemo() {
  const a2ui = useA2UI()
  const { reset, sendRaw } = a2ui
  const init = [cs1("draft", { dataModel: { title: "周报", draft: "未保存的内容…" } })]
  useEffect(() => {
    reset()
    sendRaw(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <DemoCard
      title="删除数据：value: null"
      description="v1.0 中 value 为必填；想删除某个键，就显式发送 null"
      toolbar={
        <Button size="sm" variant="ghost" onClick={() => { reset(); sendRaw(init) }}>
          <RotateCcw /> 重置
        </Button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => sendRaw(ud1("draft", { path: "/draft", value: null }))}>
          发送 <C>{`{"path": "/draft", "value": null}`}</C>
        </Button>
        <Button size="sm" variant="outline" onClick={() => sendRaw(ud1("draft", { path: "/draft" }))}>
          发送 <C>{`{"path": "/draft"}`}</C>（v0.9 写法）
        </Button>
      </div>
      <Inspector a2ui={a2ui} tabs={["data", "log"]} height={220} />
    </DemoCard>
  )
}

export function VersionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pt-8 pb-20 md:px-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          版本对比：<span className="font-mono">v0.9</span> ↔ <span className="font-mono">v1.0</span>
        </h1>
        <p className="max-w-3xl text-[15px] leading-7 text-muted-foreground">
          v0.9.1 是当前的稳定版本，v1.0 是候选版本（Candidate）。右上角的版本开关会让所有课程演示在两个版本之间切换；
          本页则把两者放在一起对比，并演示 v1.0 才有的新能力。
        </p>
      </header>

      <Section title="差异一览" kicker="01 · OVERVIEW">
        <DataTable head={["方面", <VersionBadge version="v0.9" />, <VersionBadge version="v1.0" />]} rows={DIFFS} />
      </Section>

      <Section title="同一个界面，两种写法" kicker="02 · MIGRATE">
        <P>
          大多数界面迁移起来都很机械。下面的转换器就是本站课程在两个版本间切换时使用的那一个——你可以改动左侧的 v0.9 消息，观察它会被翻译成什么。
        </P>
        <MigrationAssistant />
      </Section>

      <Section title="v1.0 的新能力" kicker="03 · NEW IN v1.0">
        <InlineDemo />
        <IndexDemo />
        <AgentRpcDemo />
        <RendererRpcDemo />
        <MixDemo />
        <NullDeleteDemo />
      </Section>

      <Section title="迁移清单" kicker="04 · CHECKLIST">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border p-4">
            <span className="text-sm font-semibold">Agent 侧</span>
            <Bullets
              items={[
                <>所有消息的 <C>version</C> 改为 <C>"v1.0"</C>，MIME 类型使用 <C>application/a2ui+json</C>。</>,
                "去掉 createSurface 中的 theme；可以把初始 components、dataModel 直接放进 createSurface。",
                <>删除数据时显式发送 <C>"value": null</C>。</>,
                "标题改用 Markdown；FunctionCall 不再携带 returnType。",
                "混用 catalog 时，在组件或函数调用上指定 catalogId。",
                <>处理渲染器发来的 <C>callAgentFunction</C>，并用 <C>agentFunctionResponse</C> 回复。</>,
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 rounded-xl border p-4">
            <span className="text-sm font-semibold">渲染器侧</span>
            <Bullets
              items={[
                "按消息中的 version 路由到对应版本的处理逻辑（本站就是这么做的）。",
                "按“组件 catalogId → surface 默认 catalogId → 报错”的顺序解析组件和函数。",
                <>实现 <C>callRendererFunction</C>：按 allowedCallers 校验，不允许时返回 <C>INVALID_FUNCTION_CALL</C>。</>,
                "本地没有的函数转交 Agent（callAgentFunction），等待期间显示加载态。",
                "支持 ValidationResult、@index，以及 allowedParents / allowedChildren 组合约束。",
                <>数据模型元数据改名为 <C>a2uiRendererDataModel</C>。</>,
              ]}
            />
          </div>
        </div>
        <Callout tone="tip" title="继续学习">
          用右上角的开关切到 v1.0，然后回到 <Link to="/learn/first-surface" className="underline underline-offset-2">第 2 章</Link> 重新走一遍——每个演示都会以 v1.0 的消息运行，差异处会出现提示。
        </Callout>
      </Section>
    </div>
  )
}
