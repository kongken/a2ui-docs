import { Send, Trash2 } from "lucide-react"

import { BASIC_CATALOG_V1_ID } from "@/a2ui"
import { Button } from "@/components/ui/button"
import { CodeBlock, C } from "@/components/learn/code-block"
import { Inspector, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { MessageEditor, pretty, useConverted, useDemo } from "@/components/learn/message-editor"
import { Bullets, Callout, DataTable as Table, P, Section } from "@/components/learn/prose"
import { ByVersion, VersionNote } from "@/components/learn/version-note"
import { useProtocolVersion } from "@/hooks/use-protocol-version"

import { comps, create, remove, text } from "./msg"

const HELLO = [create("hello"), comps("hello", [text("root", "你好，A2UI！", "h1")])]

const FIELDS_V09 = [
  ["surfaceId", "string", "必填", "Surface 的唯一标识。后续所有消息都靠它找到这块 UI。"],
  ["catalogId", "string", "必填", "使用哪一份组件目录（通常是一个 URI）。客户端必须支持它。"],
  ["theme", "object", "可选", "主题参数，如 primaryColor、agentDisplayName。"],
  ["sendDataModel", "boolean", "可选", "为 true 时，客户端会在每次 action 中附带完整数据模型。"],
]

const FIELDS_V10 = [
  ["surfaceId", "string", "必填", "Surface 的唯一标识。后续所有消息都靠它找到这块 UI。"],
  ["catalogId", "string", "可选", "默认 catalog；没有自带 catalogId 的组件与函数都用它解析。"],
  ["components", "array", "可选", "初始组件列表 —— 一条消息即可建好整个界面。"],
  ["dataModel", "object", "可选", "初始数据模型。"],
  ["sendDataModel", "boolean", "可选", "为 true 时，渲染器会在每次 action 中附带完整数据模型。"],
  ["metadata", "object", "可选", "扩展信息（extensions）。注意：v1.0 已移除 theme。"],
]

const MESSAGES_V09 = [
  ["createSurface", "Agent → 客户端", "创建一个新的 UI 区域，指定 catalog。必须最先发送。"],
  ["updateComponents", "Agent → 客户端", "添加或更新组件定义（扁平列表）。"],
  ["updateDataModel", "Agent → 客户端", "按 JSON Pointer 路径写入 / 删除数据。"],
  ["deleteSurface", "Agent → 客户端", "移除整个 surface 及其组件与数据。"],
  ["action", "客户端 → Agent", "用户触发交互（如点击按钮）时上报。"],
  ["error", "客户端 → Agent", "报告校验失败等客户端错误，便于 Agent 自我纠正。"],
]

const MESSAGES_V10 = [
  ["createSurface", "Agent → 渲染器", "创建 UI 区域；可同时携带组件与初始数据。"],
  ["updateComponents", "Agent → 渲染器", "添加或更新组件定义（扁平列表）。"],
  ["updateDataModel", "Agent → 渲染器", "按 JSON Pointer 路径写入数据；value 为 null 即删除。"],
  ["deleteSurface", "Agent → 渲染器", "移除整个 surface 及其组件与数据。"],
  ["callRendererFunction", "Agent → 渲染器", "请求渲染器执行 catalog 中允许 Agent 调用的函数。（新增）"],
  ["agentFunctionResponse", "Agent → 渲染器", "返回渲染器发起的 callAgentFunction 的结果。（新增）"],
  ["action", "渲染器 → Agent", "用户触发交互（如点击按钮）时上报。"],
  ["callAgentFunction", "渲染器 → Agent", "渲染器本地没有的函数，请 Agent 执行。（新增）"],
  ["rendererFunctionResponse", "渲染器 → Agent", "返回 callRendererFunction 的结果。（新增）"],
  ["error", "渲染器 → Agent", "报告校验失败、函数调用失败等错误。"],
]

const ONE_SHOT = {
  version: "v1.0",
  createSurface: {
    surfaceId: "hello",
    catalogId: BASIC_CATALOG_V1_ID,
    components: [{ id: "root", component: "Text", text: "# 一条消息就够了 ✨" }],
  },
}

export default function FirstSurfaceLesson() {
  const a2ui = useDemo(HELLO)
  const hello = useConverted(HELLO)
  const { version } = useProtocolVersion()
  const v1 = version === "v1.0"

  return (
    <LessonShell
      slug="first-surface"
      intro={
        <>
          A2UI 的一切都从 <strong>surface</strong> 开始。Surface 是一块由 Agent 控制的 UI 区域——可以是聊天流里的一张卡片、一个侧边面板，或者一个弹窗。
          一个应用里可以同时存在多个 surface，它们彼此独立。
        </>
      }
      takeaways={[
        <>每条消息都是一个信封：<C>{`{"version": "${v1 ? "v1.0" : "v0.9"}", "<类型>": {...}}`}</C>，且只能有一个类型键。</>,
        <>必须先 <C>createSurface</C>，之后的 updateComponents / updateDataModel 才有目标。</>,
        <>组件树从 id 为 <C>root</C> 的组件开始；没有 root，客户端只会缓冲，不会显示。</>,
        v1
          ? "v1.0 中 Agent → 渲染器有 6 种消息、渲染器 → Agent 有 4 种，新增的都与函数调用（RPC）有关。"
          : "Agent → 客户端有 4 种消息；客户端 → Agent 有 action 和 error 两种。",
      ]}
      quiz={[
        {
          q: "客户端收到 updateComponents，但它引用的 surfaceId 从未被创建，会发生什么？",
          options: ["自动创建一个 surface", "忽略 surfaceId，渲染到默认位置", "报错，因为必须先 createSurface", "等待 5 秒后重试"],
          answer: 2,
          explain: "surface 必须先由 createSurface 创建。本站的渲染器会返回 SURFACE_NOT_FOUND 错误给 Agent（可以在上面的编辑器里删掉第一条消息试试）。",
        },
        {
          q: "组件树的起点由什么决定？",
          options: ["components 数组中的第一个组件", "id 为 root 的组件", "createSurface 中的 root 字段", "类型为 Column 的组件"],
          answer: 1,
          explain: v1
            ? "v1.0 中 createSurface 会隐式创建一个保留的 Surface 容器，它的 child 固定为 \"root\"。（v0.8 中 root 是在 beginRendering 消息里指定的。）"
            : "v0.9 约定：必须恰好有一个 id 为 \"root\" 的组件作为树根。（v0.8 中 root 是在 beginRendering 消息里指定的。）",
        },
      ]}
    >
      <Section title="消息信封" kicker="01 · 形状">
        <P>
          A2UI 的每条消息都是一个 JSON 对象：一个 <C>version</C> 字段，加上<strong>恰好一个</strong>表示消息类型的键。
          类型键的值是这条消息的具体内容。
        </P>
        <CodeBlock
          code={`{
  "version": "${v1 ? "v1.0" : "v0.9"}",
  "createSurface": {            ← 消息类型（${v1 ? "六" : "四"}选一）
    "surfaceId": "hello",
    "catalogId": "https://a2ui.org/specification/${v1 ? "v1_0" : "v0_9"}/catalogs/basic/catalog.json"
  }
}`}
          language="text"
        />
      </Section>

      <Section title="Hello, A2UI" kicker="02 · 动手">
        <P>
          只需要两条消息：第一条创建 surface，第二条添加一个 id 为 <C>root</C> 的 Text 组件。修改左侧 JSON，点击“发送给客户端”看看效果。
        </P>
        <DemoCard
          title="你的第一个 surface"
          description="编辑消息 → 发送 → 观察右侧渲染结果与消息日志"
          toolbar={
            <>
              {v1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    a2ui.reset()
                    a2ui.sendRaw(ONE_SHOT)
                  }}
                >
                  <Send /> 只发一条 createSurface
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => a2ui.send(remove("hello"))}>
                <Trash2 /> 发送 deleteSurface
              </Button>
            </>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <MessageEditor a2ui={a2ui} initial={pretty(hello)} minHeight={300} />
            <div className="flex min-w-0 flex-col gap-4">
              <SurfacePreview a2ui={a2ui} />
              <Inspector a2ui={a2ui} tabs={["log", "tree"]} height={200} />
            </div>
          </div>
        </DemoCard>
        <Callout tone="tip" title="试试这些实验">
          <Bullets
            items={[
              <ByVersion
                v09={<>把 <C>variant</C> 改成 <C>"h3"</C> 或 <C>"caption"</C>。</>}
                v10={<>把 <C>"# "</C> 改成 <C>"### "</C>；或者加上 <C>"variant": "h1"</C> —— v1.0 的 Text 只接受 caption / body，会收到校验错误。</>}
              />,
              <>把 <C>"id": "root"</C> 改成 <C>"hello"</C> —— 客户端会一直显示“等待 root”。</>,
              <>删除第一条 createSurface 消息 —— 日志里会出现一条发往 Agent 的 <C>error</C>。</>,
              <>把 version 改成 <C>"v0.8"</C> —— 本渲染器只支持 v0.9 / v0.9.1 / v1.0。</>,
            ]}
          />
        </Callout>
        <VersionNote when="v1.0" summary="createSurface 可以直接携带 components 与 dataModel">
          在 v1.0 中，上面两条消息可以合并成一条：把 <C>components</C>（和可选的 <C>dataModel</C>）直接放进 createSurface。点击工具栏的“只发一条 createSurface”试试。
          另外，标题不再用 <C>variant: "h1"</C>，而是写成 Markdown 的 <C>#</C>。
        </VersionNote>
      </Section>

      <Section title="createSurface 的字段" kicker="03 · 参考">
        <Table head={["字段", "类型", "", "说明"]} rows={v1 ? FIELDS_V10 : FIELDS_V09} />
      </Section>

      <Section title="全部消息类型一览" kicker="04 · 地图">
        <P>整个协议只有这么几种消息。后面的章节会逐一深入。</P>
        <Table head={["消息", "方向", "作用"]} rows={v1 ? MESSAGES_V10 : MESSAGES_V09} />
        <VersionNote when="v1.0" summary="新增 4 种与函数调用相关的消息，并把“客户端/服务端”改称“渲染器/Agent”">
          v1.0 支持双向 RPC：Agent 可以调用渲染器上允许的函数（callRendererFunction），渲染器也可以把本地没有的函数交给 Agent 执行（callAgentFunction）。
          详见“版本对比”页。
        </VersionNote>
      </Section>
    </LessonShell>
  )
}
