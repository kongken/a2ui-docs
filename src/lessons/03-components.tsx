import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { cn } from "cn"

import type { ComponentDef } from "@/a2ui"
import { Button } from "@/components/ui/button"
import { CodeBlock, C, highlightJson } from "@/components/learn/code-block"
import { ComponentTree, InspectToggle, MessageLog, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { useDemo } from "@/components/learn/message-editor"
import { Bullets, Callout, DataTable, P, Section } from "@/components/learn/prose"

import { comps, create, text } from "./msg"

const SID = "profile"

const PROFILE: ComponentDef[] = [
  { id: "root", component: "Card", child: "layout" },
  { id: "layout", component: "Column", children: ["header", "bio", "actions"] },
  { id: "header", component: "Row", children: ["avatar", "names"], align: "center" },
  { id: "avatar", component: "Image", url: "https://i.pravatar.cc/120?img=47", variant: "avatar" },
  { id: "names", component: "Column", children: ["name", "role"] },
  text("name", "林晓", "h4"),
  text("role", "产品设计师 · 上海", "caption"),
  text("bio", "热爱把复杂的东西做简单。最近在研究 **Agent 驱动的界面**。"),
  { id: "actions", component: "Row", children: ["follow", "message"] },
  { id: "follow", component: "Button", child: "follow-text", variant: "primary", action: { event: { name: "follow" } } },
  text("follow-text", "关注"),
  { id: "message", component: "Button", child: "message-text", action: { event: { name: "message" } } },
  text("message-text", "发消息"),
]

const INITIAL = [create(SID), comps(SID, PROFILE)]

const NESTED = `{
  "type": "Card",
  "child": {
    "type": "Column",
    "children": [
      { "type": "Row", "children": [
          { "type": "Image", "url": "…" },
          { "type": "Column", "children": [
              { "type": "Text", "text": "林晓" },
              { "type": "Text", "text": "产品设计师" }
          ]}
      ]},
      …  ← 深层嵌套，括号必须一次配对正确
    ]
  }
}`

const FLAT = `[
  {"id": "root",   "component": "Card",   "child": "layout"},
  {"id": "layout", "component": "Column", "children": ["header", "bio", "actions"]},
  {"id": "header", "component": "Row",    "children": ["avatar", "names"]},
  {"id": "avatar", "component": "Image",  "url": "…"},
  {"id": "name",   "component": "Text",   "text": "林晓"},
  …  ← 每行独立，按 ID 相互引用
]`

const UPDATES: { label: string; hint: string; components: ComponentDef[] }[] = [
  {
    label: "修改名字",
    hint: "只重发 name 这一个组件",
    components: [text("name", "林晓（已认证 ✓）", "h4")],
  },
  {
    label: "按钮改为 borderless",
    hint: "按 ID 替换 message 组件的定义",
    components: [{ id: "message", component: "Button", child: "message-text", variant: "borderless", action: { event: { name: "message" } } }],
  },
  {
    label: "新增一个标签",
    hint: "发送新组件 tag + 更新父组件 names 的 children",
    components: [
      { id: "names", component: "Column", children: ["name", "role", "tag"] },
      text("tag", "`#设计系统` `#A2UI`", "caption"),
    ],
  },
  {
    label: "移除简介",
    hint: "从父组件 layout 的 children 中去掉 bio",
    components: [{ id: "layout", component: "Column", children: ["header", "actions"] }],
  },
]

function ComponentList({ components, highlight, onHover }: { components: ComponentDef[]; highlight: string | null; onHover: (id: string | null) => void }) {
  return (
    <div className="flex flex-col gap-1">
      {components.map((c) => {
        const { id, ...rest } = c
        return (
          <div
            key={id}
            onMouseEnter={() => onHover(id)}
            onMouseLeave={() => onHover(null)}
            className={cn(
              "cursor-default truncate rounded-md border px-2 py-1 font-mono text-[11px] transition-colors",
              highlight === id ? "border-amber-500 bg-amber-400/15" : "bg-muted/30 hover:bg-muted/60"
            )}
          >
            <span className="font-semibold">{id}</span> <span className="text-muted-foreground">→</span>{" "}
            {highlightJson(JSON.stringify(rest))}
          </div>
        )
      })}
    </div>
  )
}

export default function ComponentsLesson() {
  const a2ui = useDemo(INITIAL)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [inspect, setInspect] = useState(false)
  const surface = a2ui.state.surfaces[SID]
  const current = surface ? Object.values(surface.components) : []

  return (
    <LessonShell
      slug="components"
      intro={
        <>
          一个界面天然是一棵树：卡片里有列，列里有行，行里有图片和文字。但 A2UI 并不直接传一棵嵌套的树，而是把所有组件<strong>平铺</strong>成一个列表，
          父组件通过 <strong>ID</strong> 引用子组件——这就是<strong>邻接表（adjacency list）</strong>模型。
        </>
      }
      takeaways={[
        <>每个组件都是 <C>{`{ id, component, ...属性 }`}</C>；ID 在 surface 内唯一。</>,
        <>容器用 <C>child</C>（单个）或 <C>children</C>（数组）引用子组件的 ID，而不是内嵌子组件。</>,
        "客户端把组件存进 Map，渲染时再从 root 出发把树“拼”出来。",
        "更新就是按 ID 重新发送组件定义；增删子节点 = 更新父组件的 children。",
      ]}
      quiz={[
        {
          q: "想在一个 Column 里新增一个 Text，最少需要在 updateComponents 中发送什么？",
          options: ["整棵组件树", "只发送新的 Text 组件", "新的 Text 组件 + 更新后的 Column（children 包含新 ID）", "一条 deleteSurface 然后重建"],
          answer: 2,
          explain: "子组件本身不知道自己的父亲是谁，父子关系只记录在父组件的 children 里。所以需要新组件 + 更新父组件。",
        },
        {
          q: "为什么说邻接表对 LLM 更友好？",
          options: ["因为 JSON 更短", "每个组件是独立的一段，可以任意顺序、分批生成，不需要维持深层括号嵌套", "因为 LLM 只能生成数组", "因为可以省略 id"],
          answer: 1,
          explain: "扁平结构让模型一次只需关注一个组件，也让流式传输和局部更新变得自然。",
        },
      ]}
    >
      <Section title="嵌套树 vs 邻接表" kicker="01 · 对比">
        <div className="grid gap-4 md:grid-cols-2">
          <CodeBlock title="❌ 嵌套树（A2UI 不这样做）" code={NESTED} language="text" />
          <CodeBlock title="✅ 邻接表（A2UI 的做法）" code={FLAT} language="text" />
        </div>
        <Bullets
          items={[
            <><strong>易于生成：</strong>模型不必记住自己处在第几层括号里，每个组件都是一个完整、独立的对象。</>,
            <><strong>可增量发送：</strong>组件可以任意顺序到达，客户端先存起来，等引用凑齐再显示。</>,
            <><strong>可精准更新：</strong>想改哪个组件，就按 ID 重新发它，不用重发整棵树。</>,
            <><strong>结构与数据分离：</strong>组件只描述结构，数据放在 data model 中（第 5 章）。</>,
          ]}
        />
      </Section>

      <Section title="组件如何引用子组件" kicker="02 · 引用">
        <DataTable
          head={["属性", "用于", "取值"]}
          rows={[
            ["child", "Card、Button", "单个组件 ID"],
            ["children", "Row、Column、List", <>ID 数组 <C>["a","b"]</C>，或模板 <C>{`{componentId, path}`}</C>（第 6 章）</>],
            ["trigger / content", "Modal", "触发器和弹窗内容的 ID"],
            ["tabs[].child", "Tabs", "每个选项卡内容的 ID"],
          ]}
        />
      </Section>

      <Section title="把列表“拼”成树" kicker="03 · 动手">
        <P>
          左侧是 surface 当前持有的扁平组件列表；中间是客户端从 <C>root</C> 出发推导出的树；右侧是渲染结果。
          <strong>把鼠标悬停在任意一处</strong>，三者会同步高亮同一个组件。
        </P>
        <DemoCard title="组件邻接表" toolbar={<InspectToggle value={inspect} onChange={setInspect} />}>
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr_1fr]">
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">components（{current.length}）</span>
              <ComponentList components={current} highlight={highlight} onHover={setHighlight} />
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">推导出的组件树</span>
              <div className="rounded-lg border p-2">{surface && <ComponentTree surface={surface} highlight={highlight} onHover={setHighlight} />}</div>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground">渲染结果</span>
              <SurfacePreview a2ui={a2ui} inspect={inspect} highlight={highlight} onHover={setHighlight} />
            </div>
          </div>
        </DemoCard>
      </Section>

      <Section title="按 ID 更新" kicker="04 · 更新">
        <P>
          <C>updateComponents</C> 是“upsert”：ID 已存在就替换定义，不存在就新增。点击下面的按钮，每次只发送一小段消息，看看界面和组件树如何变化。
        </P>
        <DemoCard
          title="局部更新"
          toolbar={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                a2ui.reset()
                a2ui.send(INITIAL)
              }}
            >
              <RotateCcw /> 重置
            </Button>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="flex flex-col gap-2">
              {UPDATES.map((u) => (
                <button
                  key={u.label}
                  type="button"
                  onClick={() => a2ui.send(comps(SID, u.components))}
                  className="flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="text-sm font-medium">{u.label}</span>
                  <span className="text-xs text-muted-foreground">{u.hint}</span>
                </button>
              ))}
              <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border bg-muted/20 p-2">
                <MessageLog log={a2ui.log.slice(2)} empty="点击上面的按钮发送更新" />
              </div>
            </div>
            <SurfacePreview a2ui={a2ui} inspect={inspect} highlight={highlight} onHover={setHighlight} />
          </div>
        </DemoCard>
        <Callout tone="info" title="孤儿组件">
          被移出 children 的组件（比如 <C>bio</C>）仍留在客户端的 Map 里，只是不再被 root 引用，所以不会渲染。组件树面板底部会列出这些“未挂载”的组件。
        </Callout>
      </Section>
    </LessonShell>
  )
}
