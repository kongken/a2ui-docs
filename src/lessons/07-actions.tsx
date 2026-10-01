import { useState } from "react"
import { RotateCcw, Wifi, WifiOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { CodeBlock, C } from "@/components/learn/code-block"
import { MessageLog, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { useDemo } from "@/components/learn/message-editor"
import { Bullets, Callout, P, Section, Steps } from "@/components/learn/prose"
import { VersionNote } from "@/components/learn/version-note"
import { useProtocolVersion } from "@/hooks/use-protocol-version"

import { bind, comps, create, data, fmt, text } from "./msg"

const S = "signup"

const FORM = (sendDataModel: boolean) => [
  create(S, { sendDataModel, theme: { agentDisplayName: "活动报名 Agent" } }),
  comps(S, [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["title", "name", "email", "topics", "seats", "subscribe", "preview", "submit", "status"] },
    text("title", "A2UI 线下分享会 · 报名", "h4"),
    { id: "name", component: "TextField", label: "姓名", value: bind("/form/name") },
    { id: "email", component: "TextField", label: "邮箱", value: bind("/form/email") },
    {
      id: "topics",
      component: "ChoicePicker",
      label: "感兴趣的话题（多选）",
      variant: "multipleSelection",
      displayStyle: "chips",
      options: [
        { label: "协议设计", value: "protocol" },
        { label: "渲染器", value: "renderer" },
        { label: "Agent 开发", value: "agent" },
        { label: "安全", value: "security" },
      ],
      value: bind("/form/topics"),
    },
    { id: "seats", component: "Slider", label: "同行人数", value: bind("/form/seats"), min: 1, max: 5 },
    { id: "subscribe", component: "CheckBox", label: "订阅后续活动通知", value: bind("/form/subscribe") },
    text("preview", fmt("预览：${/form/name} · ${/form/seats} 人 · 订阅=${/form/subscribe}"), "caption"),
    {
      id: "submit",
      component: "Button",
      child: "submit-text",
      variant: "primary",
      action: {
        event: {
          name: "submit_signup",
          context: { name: bind("/form/name"), email: bind("/form/email"), seats: bind("/form/seats"), source: "lesson-7" },
        },
      },
    },
    text("submit-text", "提交报名"),
    text("status", bind("/status"), "caption"),
  ]),
  data(S, { form: { name: "", email: "", topics: ["protocol"], seats: 1, subscribe: true }, status: "" }),
]

function ActionDemo() {
  const [sendDataModel, setSendDataModel] = useState(false)
  const a2ui = useDemo(FORM(false), {
    // 模拟 Agent：收到 action 后，用 updateDataModel 回应
    onAction: (action) => {
      window.setTimeout(() => {
        const who = String(action.context.name || "朋友")
        a2ui.send(data(S, `✅ Agent 已收到 ${who} 的报名（${action.context.seats} 人），确认邮件稍后发送`, "/status"))
      }, 700)
    },
  })
  const upCount = a2ui.log.filter((e) => e.dir === "up").length

  const rebuild = (v: boolean) => {
    setSendDataModel(v)
    a2ui.reset()
    a2ui.send(FORM(v))
  }

  return (
    <DemoCard
      title="本地双向绑定 + action 回传"
      description="输入时只修改本地数据模型；点击按钮才会产生一条发往 Agent 的 action"
      toolbar={
        <>
          <div className="flex items-center gap-2">
            <Switch id="sdm" size="sm" checked={sendDataModel} onCheckedChange={rebuild} />
            <Label htmlFor="sdm" className="font-mono text-xs font-normal">
              sendDataModel
            </Label>
          </div>
          <Button size="sm" variant="ghost" onClick={() => rebuild(sendDataModel)}>
            <RotateCcw /> 重置
          </Button>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <SurfacePreview a2ui={a2ui} />
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs">
            {upCount ? <Wifi className="size-4 text-orange-600" /> : <WifiOff className="size-4 text-muted-foreground" />}
            发往 Agent 的请求：<span className="font-mono font-semibold">{upCount}</span>
            <span className="text-muted-foreground">（打字、勾选、拖动都不会增加它）</span>
          </div>
          <CodeBlock title="本地数据模型（实时）" code={a2ui.surfaces[0]?.dataModel ?? {}} maxHeight={220} />
          <div className="max-h-72 overflow-y-auto rounded-lg border bg-muted/20 p-2">
            <MessageLog log={a2ui.log.filter((e) => e.kind === "action" || e.kind === "updateDataModel").slice(1)} empty="填写表单并点击“提交报名”，然后展开日志查看 action 的内容" />
          </div>
        </div>
      </div>
    </DemoCard>
  )
}

export default function ActionsLesson() {
  const { version } = useProtocolVersion()
  const v1 = version === "v1.0"
  return (
    <LessonShell
      slug="actions"
      intro={
        <>
          界面不只是给人看的。用户会输入文字、勾选选项、点击按钮。A2UI 把交互分成两层：<strong>双向绑定</strong>让输入组件直接读写本地数据模型；
          <strong>action</strong> 则在用户明确“提交”时，把事件和所需数据发回 Agent。
        </>
      }
      takeaways={[
        "TextField、CheckBox、Slider、ChoicePicker、DateTimeInput 与绑定路径建立双向绑定。",
        "用户输入立即写入客户端本地数据模型，其他绑定同一路径的组件实时刷新，但不会产生网络请求。",
        <>按钮的 <C>action.event</C> 定义事件名与 context；点击时 context 中的路径被解析成当时的值，随 action 发送。</>,
        <><C>sendDataModel: true</C> 时，客户端会在 action 的传输元数据中附带整个 surface 的数据模型。</>,
      ]}
      quiz={[
        {
          q: "用户在绑定到 /form/email 的 TextField 中输入了一个字符，会发生什么？",
          options: ["立刻向 Agent 发送一条 action", "客户端本地数据模型的 /form/email 被更新，不产生网络请求", "Agent 发送 updateDataModel", "什么都不会发生，直到失去焦点"],
          answer: 1,
          explain: "双向绑定是纯本地的。数据只会在用户触发 action 时（通过 context 或 sendDataModel）带给 Agent。",
        },
        {
          q: <>action context 写成 <C>{`{"email": {"path": "/form/email"}}`}</C>，Agent 收到的 context 是？</>,
          options: [<C>{`{"email": {"path": "/form/email"}}`}</C>, <C>{`{"email": "用户当时输入的值"}`}</C>, "空对象", "整个数据模型"],
          answer: 1,
          explain: "客户端在发送前会解析 context 中所有绑定，Agent 收到的是解析后的具体值。",
        },
      ]}
    >
      <Section title="两层交互模型" kicker="01 · 概念">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-xl border p-4">
            <span className="text-sm font-semibold">① 双向绑定（本地）</span>
            <Steps
              items={[
                { title: "读：模型 → 视图", body: "组件渲染时从绑定路径读取值；Agent 更新数据时组件随之刷新。" },
                { title: "写：视图 → 模型", body: "用户每次输入，客户端立即把新值写回同一路径。" },
                { title: "响应式", body: "其他绑定同一路径的组件（例如预览文字）实时变化。" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-orange-500/30 p-4">
            <span className="text-sm font-semibold">② Action（发回 Agent）</span>
            <Steps
              items={[
                { title: "用户点击按钮", body: "按钮定义了 action.event.name 与 context。" },
                { title: "解析 context", body: "把 context 中的 {path} 替换为当前数据模型里的值。" },
                { title: "发送 action 消息", body: "附带 surfaceId、sourceComponentId、timestamp。" },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title="亲手试一试" kicker="02 · 动手">
        <P>
          填写下面的报名表：观察右侧数据模型如何随输入实时变化，而“发往 Agent 的请求”始终为 0。点击“提交报名”后，日志中会出现一条
          <span className="text-orange-600 dark:text-orange-400"> ↑ action</span>；模拟的 Agent 随即回复一条 updateDataModel。再打开
          <C>sendDataModel</C> 开关提交一次，对比 action 的传输元数据。
        </P>
        <ActionDemo />
      </Section>

      <Section title="定义与结果对照" kicker="03 · 格式">
        <div className="grid gap-4 md:grid-cols-2">
          <CodeBlock
            title="组件里的 action 定义"
            code={{
              component: "Button",
              child: "submit-text",
              action: { event: { name: "submit_signup", context: { email: { path: "/form/email" }, source: "lesson-7" } } },
            }}
          />
          <CodeBlock
            title="客户端 → Agent 的 action 消息"
            code={{
              version: v1 ? "v1.0" : "v0.9",
              action: {
                name: "submit_signup",
                surfaceId: "signup",
                sourceComponentId: "submit",
                timestamp: "2026-10-01T09:30:00.000Z",
                context: { email: "jane@example.com", source: "lesson-7" },
              },
            }}
          />
        </div>
        <VersionNote when="v1.0" summary="action 可以带 userMessage；数据模型元数据改名为 a2uiRendererDataModel">
          <Bullets
            items={[
              <><C>action.event.userMessage</C>（DynamicString）：一句描述用户做了什么的文字，解析后随 action 发送，方便 Agent 写进对话历史。</>,
              <>打开 <C>sendDataModel</C> 后，传输元数据里的键在 v0.9 叫 <C>a2uiClientDataModel</C>，在 v1.0 叫 <C>a2uiRendererDataModel</C>，内部的 version 也随之变化。</>,
            ]}
          />
        </VersionNote>
        <Callout tone="info" title="context 里什么时候用 path？">
          只有需要“用户当时的值”时才用 <C>{`{"path": …}`}</C>。像 <C>source</C>、商品 ID 这类固定值直接写字面量即可——规范特别提醒不要为静态 ID 使用路径。
        </Callout>
      </Section>

      <Section title="本地动作：functionCall" kicker="04 · 不经过 Agent">
        <P>
          有些交互不需要 Agent 参与，比如打开一个链接。<C>action</C> 的另一种形式是 <C>functionCall</C>，它调用 catalog 中注册的客户端函数：
        </P>
        <CodeBlock
          code={{
            id: "docs-btn",
            component: "Button",
            child: "docs-text",
            action: { functionCall: { call: "openUrl", args: { url: "https://a2ui.org" } } },
          }}
        />
        <Bullets
          items={[
            <><C>event</C>：生成 action 消息发给 Agent，由 Agent 决定下一步。</>,
            <><C>functionCall</C>：在客户端本地执行，只能调用 catalog 声明过的函数（如 <C>openUrl</C>）。</>,
          ]}
        />
        <VersionNote when="v1.0" summary="functionCall 不再局限于本地">
          v1.0 中，如果 functionCall 调用的函数不在渲染器的 catalog 里，渲染器会把它作为 <C>callAgentFunction</C> 发给 Agent 执行，再等待 <C>agentFunctionResponse</C>。
          另外 <C>openUrl</C> 在 v1.0 catalog 中声明了 <C>requiresUserActivation: true</C>，只能由用户操作触发。
        </VersionNote>
      </Section>
    </LessonShell>
  )
}
