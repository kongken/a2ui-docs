import { useState } from "react"
import { RotateCcw } from "lucide-react"

import { getAt } from "@/a2ui"
import { Button } from "@/components/ui/button"
import { CodeBlock, C } from "@/components/learn/code-block"
import { Inspector, InspectToggle, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { useDemo } from "@/components/learn/message-editor"
import { Callout, DataTable, P, Section } from "@/components/learn/prose"

import { bind, comps, create, data, fmt, text } from "./msg"

const S = "cart"

const ITEMS = [
  { name: "埃塞俄比亚咖啡豆", qty: 1, price: 88 },
  { name: "手冲滤纸 100 张", qty: 2, price: 15 },
]

const MORE = [
  { name: "玻璃分享壶", qty: 1, price: 69 },
  { name: "电子秤", qty: 1, price: 129 },
  { name: "磨豆机", qty: 1, price: 399 },
  { name: "温度计", qty: 3, price: 25 },
]

const INITIAL = [
  create(S),
  comps(S, [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["title", "list", "footer"] },
    text("title", fmt("🛒 ${/owner} 的购物车"), "h4"),
    { id: "list", component: "List", children: { componentId: "item", path: "/items" } },
    { id: "item", component: "Row", children: ["item-name", "item-qty", "item-price"], align: "center" },
    { ...text("item-name", bind("name")), weight: 1 },
    text("item-qty", fmt("× ${qty}"), "caption"),
    text("item-price", fmt("${/currency}${price}")),
    text("footer", fmt("共 ${/count} 件商品"), "caption"),
  ]),
  data(S, { owner: "小周", currency: "¥", items: ITEMS, count: ITEMS.length }),
]

const STATIC = {
  id: "toolbar",
  component: "Row",
  children: ["back-btn", "title", "menu-btn"],
}
const TEMPLATE = {
  id: "list",
  component: "List",
  children: { componentId: "item", path: "/items" },
}

function TemplateDemo() {
  const a2ui = useDemo(INITIAL)
  const [inspect, setInspect] = useState(true)
  const model = a2ui.state.surfaces[S]?.dataModel ?? {}
  const items = (getAt(model, "/items") as typeof ITEMS | undefined) ?? []
  const currency = getAt(model, "/currency")

  const addItem = () => {
    const next = MORE[items.length % MORE.length]
    a2ui.send([data(S, next, `/items/${items.length}`), data(S, items.length + 1, "/count")])
  }
  const removeLast = () => {
    if (!items.length) return
    a2ui.send([data(S, items.slice(0, -1), "/items"), data(S, items.length - 1, "/count")])
  }

  return (
    <DemoCard
      title="一个模板 × N 条数据"
      description="List 的 children 指向 /items；每个数组元素都会实例化一次 item 模板"
      toolbar={
        <>
          <InspectToggle value={inspect} onChange={setInspect} />
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
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-3">
          <SurfacePreview a2ui={a2ui} inspect={inspect} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={addItem}>
              添加一项
            </Button>
            <Button size="sm" variant="outline" onClick={removeLast} disabled={!items.length}>
              删除最后一项
            </Button>
            <Button size="sm" variant="outline" disabled={!items.length} onClick={() => a2ui.send(data(S, Number(items[0]?.qty ?? 0) + 1, "/items/0/qty"))}>
              第 1 项数量 +1
            </Button>
            <Button size="sm" variant="outline" onClick={() => a2ui.send(data(S, currency === "¥" ? "$" : "¥", "/currency"))}>
              切换货币符号
            </Button>
          </div>
        </div>
        <Inspector a2ui={a2ui} tabs={["data", "log", "tree"]} height={300} />
      </div>
      <ScopeTable items={items} currency={String(currency ?? "")} />
    </DemoCard>
  )
}

function ScopeTable({ items, currency }: { items: typeof ITEMS; currency: string }) {
  const rows = items.flatMap((it, i) => [
    [`#${i}`, <C>name</C>, `/items/${i}/name`, "相对", it.name],
    [`#${i}`, <C>/currency</C>, "/currency", "绝对", currency],
  ])
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">路径解析过程（随数据实时变化）</span>
      <DataTable head={["实例", "组件里写的路径", "实际解析到", "类型", "值"]} mono={[0, 2]} rows={rows} />
    </div>
  )
}

export default function TemplatesLesson() {
  return (
    <LessonShell
      slug="templates"
      intro={
        <>
          搜索结果、消息列表、购物车……很多界面的“条数”取决于数据。难道要让 Agent 为每一条都生成一组组件吗？不需要。A2UI 的
          <strong>模板</strong>让你只定义一次“每一项长什么样”，再告诉客户端“对这个数组里的每个元素都来一份”。
        </>
      }
      takeaways={[
        <>ChildList 可以是 ID 数组，也可以是模板 <C>{`{ componentId, path }`}</C>。</>,
        "客户端遍历 path 指向的数组，为每个元素实例化一次模板组件，并创建一个子作用域。",
        <>模板内不以 <C>/</C> 开头的路径是<strong>相对路径</strong>，相对于当前元素（如 /items/2）。</>,
        <>以 <C>/</C> 开头的仍是绝对路径，可以读取全局数据（如 /currency）。</>,
      ]}
      quiz={[
        {
          q: <>在遍历 <C>/employees</C> 的模板中，<C>{`{"path": "firstName"}`}</C> 对第 3 个元素解析为？</>,
          options: ["/firstName", "/employees/3/firstName", "/employees/2/firstName", "/employees/firstName"],
          answer: 2,
          explain: "下标从 0 开始，第 3 个元素是 /employees/2，相对路径 firstName 拼接在它后面。",
        },
        {
          q: "往列表里新增一条数据，Agent 需要发送什么？",
          options: ["新的模板组件", "一条针对数组路径（或新下标）的 updateDataModel", "updateComponents 重发 List", "什么都不用发"],
          answer: 1,
          explain: "模板已经在客户端了，只需要改数据。上面“添加一项”按钮发送的就是 path 为 /items/N 的 updateDataModel。",
        },
      ]}
    >
      <Section title="静态 children vs 模板" kicker="01 · 两种 ChildList">
        <div className="grid gap-4 md:grid-cols-2">
          <CodeBlock title="静态：固定的几个子组件" code={STATIC} />
          <CodeBlock title="模板：由数据决定数量" code={TEMPLATE} />
        </div>
        <P>
          模板形式里，<C>componentId</C> 是“每一项”的模板组件，<C>path</C> 指向数据模型中的数组。Row、Column、List 都支持这两种写法。
        </P>
      </Section>

      <Section title="相对路径与作用域" kicker="02 · 动手">
        <P>
          购物车的每一行都是 <C>item</C> 模板的一个实例。模板里的 <C>item-name</C> 绑定的是 <C>{`{"path": "name"}`}</C>——没有斜杠，所以它是相对路径；
          而价格里用到的 <C>{"${/currency}"}</C> 是绝对路径。开启“显示组件边界”，每个实例旁会标出它的作用域（<C>@ /items/0</C>）。
        </P>
        <TemplateDemo />
        <Callout tone="info" title="这是对 JSON Pointer 的扩展">
          RFC 6901 里的指针都必须以 <C>/</C> 开头。A2UI 为了支持模板，额外定义了“不以 / 开头的相对路径”，在集合作用域内解析。
        </Callout>
      </Section>
    </LessonShell>
  )
}
