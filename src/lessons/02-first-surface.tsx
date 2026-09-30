import { Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CodeBlock, C } from "@/components/learn/code-block"
import { Inspector, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { MessageEditor, pretty, useDemo } from "@/components/learn/message-editor"
import { Bullets, Callout, DataTable as Table, P, Section } from "@/components/learn/prose"

import { comps, create, remove, text } from "./msg"

const HELLO = [create("hello"), comps("hello", [text("root", "你好，A2UI！", "h1")])]

const FIELDS = [
  ["surfaceId", "string", "必填", "Surface 的唯一标识。后续所有消息都靠它找到这块 UI。"],
  ["catalogId", "string", "必填", "使用哪一份组件目录（通常是一个 URI）。客户端必须支持它。"],
  ["theme", "object", "可选", "主题参数，如 primaryColor、agentDisplayName。"],
  ["sendDataModel", "boolean", "可选", "为 true 时，客户端会在每次 action 中附带完整数据模型。"],
]

const MESSAGES = [
  ["createSurface", "Agent → 客户端", "创建一个新的 UI 区域，指定 catalog。必须最先发送。"],
  ["updateComponents", "Agent → 客户端", "添加或更新组件定义（扁平列表）。"],
  ["updateDataModel", "Agent → 客户端", "按 JSON Pointer 路径写入 / 删除数据。"],
  ["deleteSurface", "Agent → 客户端", "移除整个 surface 及其组件与数据。"],
  ["action", "客户端 → Agent", "用户触发交互（如点击按钮）时上报。"],
  ["error", "客户端 → Agent", "报告校验失败等客户端错误，便于 Agent 自我纠正。"],
]


export default function FirstSurfaceLesson() {
  const a2ui = useDemo(HELLO)

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
        <>每条消息都是一个信封：<C>{`{"version": "v0.9", "<类型>": {...}}`}</C>，且只能有一个类型键。</>,
        <>必须先 <C>createSurface</C>，之后的 updateComponents / updateDataModel 才有目标。</>,
        <>组件树从 id 为 <C>root</C> 的组件开始；没有 root，客户端只会缓冲，不会显示。</>,
        "Agent → 客户端有 4 种消息；客户端 → Agent 有 action 和 error 两种。",
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
          explain: "v0.9 约定：必须恰好有一个 id 为 \"root\" 的组件作为树根。（v0.8 中 root 是在 beginRendering 消息里指定的。）",
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
  "version": "v0.9",
  "createSurface": {            ← 消息类型（四选一）
    "surfaceId": "hello",
    "catalogId": "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
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
            <Button size="sm" variant="outline" onClick={() => a2ui.send(remove("hello"))}>
              <Trash2 /> 发送 deleteSurface
            </Button>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <MessageEditor a2ui={a2ui} initial={pretty(HELLO)} minHeight={300} />
            <div className="flex min-w-0 flex-col gap-4">
              <SurfacePreview a2ui={a2ui} />
              <Inspector a2ui={a2ui} tabs={["log", "tree"]} height={200} />
            </div>
          </div>
        </DemoCard>
        <Callout tone="tip" title="试试这些实验">
          <Bullets
            items={[
              <>把 <C>variant</C> 改成 <C>"h3"</C> 或 <C>"caption"</C>。</>,
              <>把 <C>"id": "root"</C> 改成 <C>"hello"</C> —— 客户端会一直显示“等待 root”。</>,
              <>删除第一条 createSurface 消息 —— 日志里会出现一条发往 Agent 的 <C>error</C>。</>,
              <>把 version 改成 <C>"v0.8"</C> —— 本渲染器只支持 v0.9 / v0.9.1。</>,
            ]}
          />
        </Callout>
      </Section>

      <Section title="createSurface 的字段" kicker="03 · 参考">
        <Table head={["字段", "类型", "", "说明"]} rows={FIELDS} />
      </Section>

      <Section title="全部消息类型一览" kicker="04 · 地图">
        <P>整个协议只有这么几种消息。后面的章节会逐一深入。</P>
        <Table head={["消息", "方向", "作用"]} rows={MESSAGES} />
      </Section>
    </LessonShell>
  )
}
