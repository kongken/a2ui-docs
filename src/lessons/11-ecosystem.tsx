import { Link } from "react-router-dom"
import { ArrowUpRight, FlaskConical, LayoutGrid } from "lucide-react"
import { cn } from "cn"

import { convertMessages } from "@/a2ui"
import { Badge } from "@/components/ui/badge"
import { CodeBlock, C } from "@/components/learn/code-block"
import { LessonShell } from "@/components/learn/lesson-shell"
import { Bullets, Callout, DataTable, P, Section } from "@/components/learn/prose"
import { ByVersion } from "@/components/learn/version-note"

const TRANSPORTS = [
  { name: "A2A", desc: "Agent2Agent 协议。每个 A2UI 信封对应一个 A2A 消息 Part；能力与数据模型放在 message metadata 中；会话对应 contextId。" },
  { name: "AG-UI", desc: "Agent–User Interaction 协议，提供低延迟、共享状态的前后端通道，已集成到许多 Agent 框架与前端。" },
  { name: "MCP", desc: "作为工具输出或资源订阅交付 A2UI；官方文档也介绍了 A2UI 与 MCP Apps 的互相嵌入。" },
  { name: "SSE + JSON-RPC", desc: "服务器推送事件承载 UI 流，JSON-RPC 回传 action，适合 Web 集成。" },
  { name: "WebSocket", desc: "双向实时会话，UI 流和 action 共用一条连接。" },
  { name: "REST", desc: "最简单的方式，但缺少流式能力。" },
]

const VERSIONS = [
  {
    v: "v0.8",
    tag: "Legacy",
    tone: "bg-muted text-muted-foreground",
    points: [
      "面向结构化输出（structured output）的 LLM 设计",
      <>消息：<C>surfaceUpdate</C> · <C>dataModelUpdate</C> · <C>beginRendering</C> · <C>deleteSurface</C></>,
      <>字面量需要包装：<C>{`{"literalString": "…"}`}</C></>,
    ],
  },
  {
    v: "v0.9",
    tag: "Stable",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    points: [
      "“prompt-first”：schema 写进提示词，生成后校验与纠错",
      <>消息改为 <C>createSurface</C> · <C>updateComponents</C> · <C>updateDataModel</C> · <C>deleteSurface</C></>,
      "组件写法扁平化（component 为字符串），引入函数、checks、自定义 catalog",
    ],
  },
  {
    v: "v0.9.1",
    tag: "Current",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    points: [
      <>MIME 类型统一为 <C>application/a2ui+json</C></>,
      "surfaceId 只需在活跃 surface 中唯一（不再要求整个生命周期唯一）",
      "与 v0.9 负载完全兼容",
    ],
  },
  {
    v: "v1.0",
    tag: "Candidate",
    tone: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    points: [
      <>双向 RPC：<C>callRendererFunction</C> / <C>callAgentFunction</C></>,
      "单个 surface 可混用多个 catalog；createSurface 可直接内联组件与初始数据",
      <>移除 theme / primaryColor；术语改为 <em>agent</em> 与 <em>renderer</em></>,
    ],
  },
]

const V08 = {
  surfaceUpdate: {
    surfaceId: "main",
    components: [{ id: "greeting", component: { Text: { text: { literalString: "Hello, World!" }, usageHint: "h1" } } }],
  },
}
const V09 = {
  version: "v0.9",
  updateComponents: {
    surfaceId: "main",
    components: [{ id: "greeting", component: "Text", text: "Hello, World!", variant: "h1" }],
  },
}

const V10 = convertMessages([V09], "v1.0")[0]

const LINKS = [
  { label: "a2ui.org 官方文档", href: "https://a2ui.org/", desc: "概念、指南、规范与生态" },
  { label: "Quickstart：餐厅查找 Demo", href: "https://a2ui.org/quickstart/", desc: "官方端到端示例" },
  { label: "规范源码（GitHub）", href: "https://github.com/a2ui-project/a2ui", desc: "JSON Schema、basic catalog 与示例" },
  { label: "A2UI Composer", href: "https://a2ui-composer.ag-ui.com/", desc: "可视化编辑 A2UI 界面" },
  { label: "A2UI Theater", href: "https://a2ui-composer.ag-ui.com/theater", desc: "交互式演练场" },
  { label: "渲染器列表", href: "https://a2ui.org/reference/renderers/", desc: "Lit、Angular、Flutter、React 等实现" },
]

export default function EcosystemLesson() {
  return (
    <LessonShell
      slug="ecosystem"
      intro={
        <>
          最后，把视角拉远：A2UI 消息在真实系统里是如何被传送的？协议经历了哪些版本？有哪些渲染器和工具可以直接用？
        </>
      }
      takeaways={[
        "A2UI 与传输无关；传输层需提供有序可靠投递、消息分帧、元数据通道，以及（可选的）回传通道。",
        "A2A、AG-UI、MCP 是最常见的承载方式；SSE、WebSocket、REST 也可以。",
        "当前生产版本是 v0.9.1；v0.8 为旧版；v1.0 候选版引入双向 RPC 与混合 catalog。",
        "官方与社区提供多种框架的渲染器，也可以按规范自己实现（就像本站这样）。",
      ]}
      quiz={[
        {
          q: "为什么 A2UI 要求传输层提供“元数据”能力？",
          options: ["为了压缩消息", "用于交换客户端能力（supportedCatalogIds）和 sendDataModel 的数据模型", "为了加密", "为了指定 HTTP 方法"],
          answer: 1,
          explain: "能力声明与数据模型都通过传输层的 metadata（如 A2A message metadata、HTTP header）携带：v0.9 中叫 a2uiClientCapabilities / a2uiClientDataModel，v1.0 改名为 a2uiRendererCapabilities / a2uiRendererDataModel。",
        },
        {
          q: "同一个 Text 组件，v0.8 与 v0.9 最明显的写法差异是？",
          options: ["v0.9 必须嵌套", <>v0.8 用 <C>{`{"Text": {...}}`}</C> 包装并用 literalString；v0.9 扁平为 <C>"component": "Text"</C></>, "没有差异", "v0.9 不再需要 id"],
          answer: 1,
          explain: "v0.9 为 prompt-first 重新设计了更易读、更扁平的格式，同时给每条消息加上了 version 字段。",
        },
      ]}
    >
      <Section title="传输契约" kicker="01 · 传输">
        <P>A2UI 只定义消息格式与语义，不规定消息怎么走。任何传输层只要满足以下契约，都可以承载 A2UI：</P>
        <DataTable
          head={["要求", "为什么"]}
          mono={[]}
          rows={[
            [<strong>可靠、有序</strong>, "消息是有状态的更新（先创建再更新），乱序会破坏 UI 状态"],
            [<strong>消息分帧</strong>, "清晰界定每条信封消息：JSONL 换行、WebSocket 帧、SSE 事件……"],
            [<strong>元数据</strong>, "承载客户端能力声明与 sendDataModel 的数据模型"],
            [<strong>回传通道（可选）</strong>, "交互式应用需要把 action 发回 Agent"],
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRANSPORTS.map((t) => (
            <div key={t.name} className="flex flex-col gap-1 rounded-xl border p-4">
              <span className="font-mono text-sm font-semibold">{t.name}</span>
              <span className="text-xs leading-5 text-muted-foreground">{t.desc}</span>
            </div>
          ))}
        </div>
        <ByVersion
          v09={
            <CodeBlock
              title="A2A 中的元数据（v0.9 示意）"
              code={{
                metadata: {
                  a2uiClientCapabilities: { supportedCatalogIds: ["https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"] },
                  a2uiClientDataModel: { version: "v0.9", surfaces: { booking: { booking: { guests: 3 } } } },
                },
              }}
            />
          }
          v10={
            <CodeBlock
              title="A2A 中的元数据（v1.0 示意）"
              code={{
                metadata: {
                  a2uiRendererCapabilities: { "v1.0": { supportedCatalogIds: ["https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json"] } },
                  a2uiRendererDataModel: { version: "v1.0", surfaces: { booking: { booking: { guests: 3 } } } },
                },
              }}
            />
          }
        />
      </Section>

      <Section title="版本演进" kicker="02 · 版本">
        <div className="relative flex flex-col gap-4 border-l pl-6">
          {VERSIONS.map((v) => (
            <div key={v.v} className="relative flex flex-col gap-2">
              <span className="absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-background bg-foreground" />
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-semibold">{v.v}</span>
                <Badge variant="secondary" className={cn("border-0", v.tone)}>
                  {v.tag}
                </Badge>
              </div>
              <Bullets items={v.points} />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <CodeBlock title="v0.8" code={V08} />
          <CodeBlock title="v0.9" code={V09} />
          <CodeBlock title="v1.0" code={V10} />
        </div>
        <Callout tone="info" title="本站使用哪个版本？">
          本站的渲染器同时实现了 v0.9 / v0.9.1 与 v1.0（各自的 basic catalog 以官方 <C>catalog.json</C> 为准），按消息中的 <C>version</C> 路由。
          右上角的开关决定课程演示生成哪个版本的消息；两者的完整对比与 v1.0 新能力演示见{" "}
          <Link to="/versions" className="underline underline-offset-2">版本对比</Link>。
        </Callout>
      </Section>

      <Section title="渲染器与工具" kicker="03 · 生态">
        <P>
          官方与社区已经提供了 Lit、Angular、Flutter、React 等框架的渲染器实现；A2UI 由 Google 发起，CopilotKit 与开源社区共同参与。
          如果你的平台还没有渲染器，按规范自己实现一个也并不复杂——本站的渲染器（src/a2ui，含 catalog 元数据）约 3000 行 TypeScript，同时支持 v0.9 与 v1.0，就是一个完整的例子。
        </P>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="group flex flex-col gap-1 rounded-xl border p-4 transition-colors hover:bg-muted/50">
              <span className="flex items-center gap-1 text-sm font-semibold">
                {l.label}
                <ArrowUpRight className="size-3.5 opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
              </span>
              <span className="text-xs text-muted-foreground">{l.desc}</span>
            </a>
          ))}
        </div>
      </Section>

      <Section title="接下来" kicker="04 · 继续">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/playground" className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50">
            <FlaskConical className="size-5" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Playground</span>
              <span className="text-xs text-muted-foreground">加载官方示例，随意修改、增量发送消息</span>
            </div>
          </Link>
          <Link to="/gallery" className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/50">
            <LayoutGrid className="size-5" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">组件画廊</span>
              <span className="text-xs text-muted-foreground">basic catalog 全部 18 个组件的属性与实时示例</span>
            </div>
          </Link>
        </div>
      </Section>
    </LessonShell>
  )
}
