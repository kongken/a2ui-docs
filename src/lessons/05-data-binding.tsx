import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { cn } from "cn"

import { getAt, parsePointer } from "@/a2ui"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CodeBlock, C, toJson } from "@/components/learn/code-block"
import { Inspector, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { JsonTextarea, useDemo } from "@/components/learn/message-editor"
import { Bullets, Callout, DataTable, P, Section } from "@/components/learn/prose"
import { VersionNote } from "@/components/learn/version-note"
import { useProtocolVersion } from "@/hooks/use-protocol-version"

import { bind, comps, create, data, fmt, text, unset } from "./msg"

const S = "profile-card"

const INITIAL_DATA = {
  user: { name: "Alice", title: "前端工程师", status: "在线" },
  stats: { followers: 1280, projects: 42 },
}

const INITIAL = [
  create(S),
  comps(S, [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["top", "title", "stats"] },
    { id: "top", component: "Row", children: ["name", "status"], justify: "spaceBetween", align: "center" },
    text("name", bind("/user/name"), "h3"),
    text("status", fmt("● ${/user/status}"), "caption"),
    text("title", bind("/user/title")),
    { id: "stats", component: "Row", children: ["followers", "projects"] },
    text("followers", fmt("**${/stats/followers}** 关注者")),
    text("projects", fmt("**${/stats/projects}** 个项目")),
  ]),
  data(S, INITIAL_DATA),
]

function BindingDemo() {
  const a2ui = useDemo(INITIAL)
  const model = a2ui.state.surfaces[S]?.dataModel ?? {}
  const followers = Number(getAt(model, "/stats/followers") ?? 0)
  const status = getAt(model, "/user/status")

  const actions = [
    { label: "改名为 Bob", msg: data(S, "Bob", "/user/name") },
    { label: "关注者 +100", msg: data(S, followers + 100, "/stats/followers") },
    { label: status === "在线" ? "设为离线" : "设为在线", msg: data(S, status === "在线" ? "离线" : "在线", "/user/status") },
    { label: "删除 /user/title", msg: unset(S, "/user/title") },
    {
      label: "替换整个数据模型",
      msg: data(S, { user: { name: "陈一", title: "数据科学家", status: "忙碌" }, stats: { followers: 99, projects: 7 } }),
    },
  ]

  return (
    <DemoCard
      title="只发数据，不发组件"
      description="组件在一开始就发送完毕；之后每个按钮只发送一条 updateDataModel"
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
        <div className="flex min-w-0 flex-col gap-3">
          <SurfacePreview a2ui={a2ui} />
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button key={a.label} size="sm" variant="outline" onClick={() => a2ui.send(a.msg)}>
                {a.label}
              </Button>
            ))}
          </div>
        </div>
        <Inspector a2ui={a2ui} tabs={["data", "log"]} height={280} />
      </div>
    </DemoCard>
  )
}

const SAMPLE = {
  user: { name: "Alice", tags: ["admin", "beta"] },
  cart: { items: [{ name: "咖啡豆", price: 88 }, { name: "滤纸", price: 15 }] },
  "a/b": "键名里带斜杠",
}

const EXAMPLES = ["/user/name", "/user/tags/1", "/cart/items/0/price", "/cart/items", "/a~1b", "/user/age", "/"]

function PointerPlayground() {
  const [src, setSrc] = useState(JSON.stringify(SAMPLE, null, 2))
  const [pointer, setPointer] = useState("/cart/items/0/price")
  let model: unknown = null
  let parseError = ""
  try {
    model = JSON.parse(src)
  } catch (e) {
    parseError = (e as Error).message
  }
  const segments = parsePointer(pointer)
  const value = parseError ? undefined : getAt(model, pointer)

  return (
    <DemoCard title="JSON Pointer 实验台" description="输入路径，实时查看它在数据模型中指向的值">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">数据模型</span>
          <JsonTextarea value={src} onChange={setSrc} minHeight={260} />
          {parseError && <span className="text-xs text-destructive">{parseError}</span>}
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-xs font-medium text-muted-foreground">路径</span>
          <Input value={pointer} onChange={(e) => setPointer(e.target.value)} className="font-mono" />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPointer(p)}
                className={cn("rounded-md border px-2 py-0.5 font-mono text-xs hover:bg-muted", p === pointer && "border-primary bg-primary/10")}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1 font-mono text-xs">
            <span className="text-muted-foreground">拆分为：</span>
            {segments.length === 0 ? (
              <span className="rounded bg-muted px-1.5 py-0.5">（根）</span>
            ) : (
              segments.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground">›</span>}
                  <span className="rounded bg-muted px-1.5 py-0.5">{/^\d+$/.test(s) ? `[${s}]` : s}</span>
                </span>
              ))
            )}
          </div>
          <CodeBlock title="解析结果" code={value === undefined ? "undefined（路径不存在）" : toJson(value)} language={value === undefined ? "text" : "json"} />
        </div>
      </div>
    </DemoCard>
  )
}

export default function DataBindingLesson() {
  const { version } = useProtocolVersion()
  const v1 = version === "v1.0"
  return (
    <LessonShell
      slug="data-binding"
      intro={
        <>
          到目前为止，文字都是直接写在组件里的。但真实的界面里，内容会变化：价格、状态、用户输入……A2UI 把<strong>界面结构</strong>（components）和
          <strong>应用状态</strong>（data model）彻底分开，再用 <strong>JSON Pointer</strong> 路径把两者连起来。数据变了，界面自动更新，组件无需重发。
        </>
      }
      takeaways={[
        <>属性值有三种写法：字面量 <C>"Hi"</C>、数据绑定 <C>{`{"path": "/user/name"}`}</C>、函数调用 <C>{`{"call": …}`}</C>。</>,
        "每个 surface 有自己的数据模型（一个 JSON 对象），用 updateDataModel 修改。",
        "路径遵循 JSON Pointer (RFC 6901)：/ 分隔层级，数字是数组下标，~1 表示 /、~0 表示 ~。",
        v1
          ? "updateDataModel 是 upsert：给 value 即写入；value 为 null 即删除（value 必填）；省略 path 即替换整个模型。"
          : "updateDataModel 是 upsert：给 value 即写入；省略 value 即删除；省略 path 即替换整个模型。",
      ]}
      quiz={[
        {
          q: "想把用户名从 Alice 改成 Bob，Agent 最少需要发送什么？",
          options: [
            "重新发送 name 这个 Text 组件",
            <>一条 <C>updateDataModel</C>，path 为 <C>/user/name</C>，value 为 "Bob"</>,
            "deleteSurface 后重建",
            "一条 action 消息",
          ],
          answer: 1,
          explain: "组件只描述“显示 /user/name 处的值”，所以只需更新那一个数据路径。",
        },
        {
          q: <>路径 <C>/cart/items/1/price</C> 在上面的实验台数据中解析为？</>,
          options: ["88", "15", "undefined", "\"滤纸\""],
          answer: 1,
          explain: "items 是数组，下标从 0 开始，1 指向第二项“滤纸”，其 price 为 15。",
        },
        v1
          ? {
              q: "在 v1.0 中，发送一条只有 surfaceId 和 path、没有 value 的 updateDataModel，会发生什么？",
              options: ["删除该路径上的键", "把该路径的值设为 null", "校验失败：v1.0 的 value 是必填的", "什么都不做"],
              answer: 2,
              explain: "v1.0 把删除改为显式的 \"value\": null，省略 value 会被当作格式错误（v0.9 中省略 value 才表示删除）。",
            }
          : {
              q: "发送一条只有 surfaceId 和 path、没有 value 的 updateDataModel，会发生什么？",
              options: ["报错", "把该路径的值设为 null", "删除该路径上的键", "什么都不做"],
              answer: 2,
              explain: "省略 value 表示删除（数组中则把该下标设为 undefined，保持长度不变）。",
            },
      ]}
    >
      <Section title="属性值的三种写法" kicker="01 · 取值">
        <div className="grid gap-3 md:grid-cols-3">
          <CodeBlock title="字面量：固定内容" code={{ text: "欢迎回来" }} />
          <CodeBlock title="数据绑定：随数据变化" code={{ text: { path: "/user/name" } }} />
          <CodeBlock title="函数调用：客户端计算" code={{ text: { call: "formatString", args: { value: "你好，${/user/name}" } } }} />
        </div>
        <P>
          在 schema 中，这类可绑定的属性类型叫做 <C>DynamicString</C>、<C>DynamicNumber</C>、<C>DynamicBoolean</C> 等。
          函数调用会在第 8 章详细介绍，这一章聚焦 <C>{`{"path": …}`}</C>。
        </P>
      </Section>

      <Section title="结构不动，数据在变" kicker="02 · 动手">
        <P>
          下面的资料卡由 9 个组件组成，它们只在开始时发送一次。点击按钮时，Agent 只发送一条小小的 <C>updateDataModel</C>，
          所有绑定了相应路径的组件都会自动刷新。打开“消息日志”看看每次发送了什么。
        </P>
        <BindingDemo />
      </Section>

      <Section title="JSON Pointer" kicker="03 · 路径">
        <P>
          A2UI 使用 <a className="underline underline-offset-2" href="https://datatracker.ietf.org/doc/html/rfc6901" target="_blank" rel="noreferrer">RFC 6901 JSON Pointer</a>{" "}
          定位数据：以 <C>/</C> 开头，逐级进入对象的键或数组的下标。
        </P>
        <PointerPlayground />
      </Section>

      <Section title="updateDataModel 的语义" kicker="04 · 规则">
        <DataTable
          head={["消息内容", "效果"]}
          mono={[]}
          rows={[
            [<C>{`{ "path": "/user/name", "value": "Bob" }`}</C>, "路径存在则更新，不存在则创建（中间层级自动补齐）"],
            v1
              ? [<C>{`{ "path": "/user/tempData", "value": null }`}</C>, "value 为 null：删除该键（v1.0 中 value 必填）"]
              : [<C>{`{ "path": "/user/tempData" }`}</C>, "省略 value：删除该键"],
            [<C>{`{ "value": { … } }`}</C>, <>省略 path（或 path 为 <C>/</C>）：替换整个数据模型</>],
          ]}
        />
        <VersionNote when="v1.0" summary="删除数据改为显式的 value: null">
          v1.0 中 <C>value</C> 是必填字段：写入时给出新值，删除时发送 <C>"value": null</C>，省略 value 会被渲染器当作格式错误。
          上面“删除 /user/title”按钮在 v1.0 下发送的就是 null —— 打开消息日志对比一下。
        </VersionNote>
        <Callout tone="tip" title="最佳实践">
          <Bullets
            items={[
              "粒度要细：只更新真正变化的路径，而不是每次替换整个模型。",
              <>按领域组织数据：<C>{`{"user": {…}, "cart": {…}}`}</C>，路径更易读、也更不容易冲突。</>,
              "在服务端预先算好展示值（如合计金额），客户端函数只负责格式化。",
            ]}
          />
        </Callout>
      </Section>
    </LessonShell>
  )
}
