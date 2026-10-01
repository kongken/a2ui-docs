import { useEffect, useRef, useState } from "react"
import { ArrowUp, Bot, RotateCcw, Trash2, UserRound } from "lucide-react"
import { cn } from "cn"

import { A2UISurface, type ActionPayload } from "@/a2ui"
import { Button } from "@/components/ui/button"
import { C } from "@/components/learn/code-block"
import { Inspector, SurfaceFrame } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { useDemo } from "@/components/learn/message-editor"
import { Callout, DataTable, P, Section } from "@/components/learn/prose"
import { useProtocolVersion } from "@/hooks/use-protocol-version"

import { bind, comps, create, data, fmt, remove, text } from "./msg"

// ---------------------------------------------------------------------------
// Agent 会发送的界面
// ---------------------------------------------------------------------------

const RESTAURANTS = [
  { id: "r1", name: "蜀九香 · 老火锅", cuisine: "川味火锅", rating: 4.8, distance: "650m", image: "https://picsum.photos/seed/hotpot/160/160" },
  { id: "r2", name: "陈麻婆豆腐", cuisine: "传统川菜", rating: 4.6, distance: "1.2km", image: "https://picsum.photos/seed/tofu/160/160" },
  { id: "r3", name: "巷子里的串串", cuisine: "串串香", rating: 4.5, distance: "1.8km", image: "https://picsum.photos/seed/skewer/160/160" },
]

const restaurantMsgs = () => [
  create("restaurants", { theme: { agentDisplayName: "订餐助手" } }),
  comps("restaurants", [
    { id: "root", component: "Column", children: ["list"] },
    { id: "list", component: "List", children: { componentId: "r-card", path: "/restaurants" } },
  ]),
  comps("restaurants", [
    { id: "r-card", component: "Card", child: "r-row" },
    { id: "r-row", component: "Row", children: ["r-img", "r-info", "r-btn"], align: "center" },
    { id: "r-img", component: "Image", url: bind("image"), variant: "smallFeature", fit: "cover", description: bind("name") },
    { id: "r-info", component: "Column", children: ["r-name", "r-meta"], weight: 1 },
    text("r-name", bind("name"), "h5"),
    text("r-meta", fmt("${cuisine} · ⭐ ${rating} · ${distance}"), "caption"),
    {
      id: "r-btn",
      component: "Button",
      child: "r-btn-t",
      variant: "primary",
      action: { event: { name: "select_restaurant", context: { restaurantId: bind("id"), name: bind("name") } } },
    },
    text("r-btn-t", "预订"),
  ]),
  data("restaurants", { restaurants: RESTAURANTS }),
]

const bookingMsgs = (restaurant: string) => [
  create("booking", { sendDataModel: true, theme: { agentDisplayName: "订餐助手" } }),
  comps("booking", [
    { id: "root", component: "Card", child: "b-col" },
    { id: "b-col", component: "Column", children: ["b-title", "b-when", "b-guests", "b-seating", "b-name", "b-phone", "b-submit"] },
    text("b-title", fmt("预订 · ${/restaurant}"), "h4"),
    { id: "b-when", component: "DateTimeInput", label: "日期与时间", value: bind("/booking/datetime"), enableDate: true, enableTime: true },
    { id: "b-guests", component: "Slider", label: "人数", value: bind("/booking/guests"), min: 1, max: 12 },
    {
      id: "b-seating",
      component: "ChoicePicker",
      label: "座位偏好",
      displayStyle: "chips",
      options: [
        { label: "大厅", value: "hall" },
        { label: "包间", value: "room" },
        { label: "露台", value: "terrace" },
      ],
      value: bind("/booking/seating"),
    },
  ]),
  comps("booking", [
    {
      id: "b-name",
      component: "TextField",
      label: "联系人",
      value: bind("/booking/name"),
      checks: [{ condition: { call: "required", args: { value: bind("/booking/name") } }, message: "请填写联系人" }],
    },
    {
      id: "b-phone",
      component: "TextField",
      label: "手机号",
      value: bind("/booking/phone"),
      checks: [{ condition: { call: "regex", args: { value: bind("/booking/phone"), pattern: "^1\\d{10}$" } }, message: "请输入 11 位手机号" }],
    },
    {
      id: "b-submit",
      component: "Button",
      child: "b-submit-t",
      variant: "primary",
      checks: [
        {
          condition: {
            call: "and",
            args: {
              values: [
                { call: "required", args: { value: bind("/booking/name") } },
                { call: "regex", args: { value: bind("/booking/phone"), pattern: "^1\\d{10}$" } },
              ],
            },
          },
          message: "请填写联系人和正确的手机号",
        },
      ],
      action: {
        event: {
          name: "submit_booking",
          context: {
            restaurant: bind("/restaurant"),
            datetime: bind("/booking/datetime"),
            guests: bind("/booking/guests"),
            seating: bind("/booking/seating"),
            name: bind("/booking/name"),
            phone: bind("/booking/phone"),
          },
        },
      },
    },
    text("b-submit-t", "确认预订"),
  ]),
  data("booking", {
    restaurant,
    booking: { datetime: "2026-10-02T19:00", guests: 2, seating: ["hall"], name: "", phone: "" },
  }),
]

const SEATING: Record<string, string> = { hall: "大厅", room: "包间", terrace: "露台" }

const confirmMsgs = (ctx: Record<string, unknown>) => [
  create("confirm", { theme: { agentDisplayName: "订餐助手", primaryColor: "#16a34a" } }),
  comps("confirm", [
    { id: "root", component: "Card", child: "c-col" },
    { id: "c-col", component: "Column", children: ["c-head", "c-div", "c-when", "c-guests", "c-who", "c-actions", "c-status"] },
    { id: "c-head", component: "Row", children: ["c-icon", "c-title"], align: "center" },
    { id: "c-icon", component: "Icon", name: "check" },
    text("c-title", fmt("${/restaurant} · 已确认"), "h4"),
    { id: "c-div", component: "Divider" },
    text("c-when", fmt("🗓 ${formatDate(value:${/datetime}, format:'MMM d (EEE) · HH:mm')}")),
    text("c-guests", fmt("👥 ${/guests} 位 · ${/seatingLabel}")),
    text("c-who", fmt("📞 ${/name} · ${/phone} · 预订号 ${/code}"), "caption"),
    { id: "c-actions", component: "Row", children: ["c-cancel", "c-map"] },
    { id: "c-cancel", component: "Button", child: "c-cancel-t", variant: "borderless", action: { event: { name: "cancel_booking", context: { code: bind("/code") } } } },
    text("c-cancel-t", "取消预订"),
    {
      id: "c-map",
      component: "Button",
      child: "c-map-t",
      action: { functionCall: { call: "openUrl", args: { url: `https://www.openstreetmap.org/search?query=${encodeURIComponent(String(ctx.restaurant))}` } } },
    },
    text("c-map-t", "查看地图（本地动作）"),
    text("c-status", bind("/status"), "caption"),
  ]),
  data("confirm", {
    restaurant: ctx.restaurant,
    datetime: ctx.datetime,
    guests: ctx.guests,
    // 展示值由 Agent 预先计算
    seatingLabel: SEATING[String((ctx.seating as string[] | undefined)?.[0])] ?? "不限",
    name: ctx.name,
    phone: ctx.phone,
    code: "A2UI-8K2F",
    status: "",
  }),
]

// ---------------------------------------------------------------------------
// 聊天与 Agent 脚本
// ---------------------------------------------------------------------------

type ChatItem =
  | { kind: "user"; text: string }
  | { kind: "agent"; text: string }
  | { kind: "surface"; surfaceId: string }
  | { kind: "action"; text: string }
  | { kind: "typing" }

const PHASES = [
  { title: "创建 Surface", body: "createSurface" },
  { title: "流式发送组件", body: "updateComponents × N" },
  { title: "填充数据", body: "updateDataModel" },
  { title: "用户本地交互", body: "双向绑定，无网络请求" },
  { title: "Action 回传", body: "→ Agent" },
  { title: "Agent 更新 / 删除", body: "updateDataModel · deleteSurface" },
]

const GREETING: ChatItem[] = [{ kind: "agent", text: "你好！我是订餐助手 🍜 想吃点什么？" }]

function BookingAssistant() {
  const [chat, setChat] = useState<ChatItem[]>(GREETING)
  const [phase, setPhase] = useState(-1)
  const [deleted, setDeleted] = useState<string[]>([])
  const [started, setStarted] = useState(false)
  const timers = useRef<number[]>([])
  const scroller = useRef<HTMLDivElement>(null)

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const push = (...items: ChatItem[]) => setChat((c) => [...c.filter((i) => i.kind !== "typing"), ...items])

  const onAction = (action: ActionPayload) => {
    setPhase(4)
    push({ kind: "action", text: `action: ${action.name} ${JSON.stringify(action.context)}` }, { kind: "typing" })

    if (action.name === "select_restaurant") {
      later(700, () => {
        push({ kind: "agent", text: `好的，就订「${action.context.name}」！请填写预订信息：` }, { kind: "surface", surfaceId: "booking" })
        setPhase(0)
        a2ui.stream(bookingMsgs(String(action.context.name)), 450, () => setPhase(3))
        later(500, () => setPhase(1))
        later(1400, () => setPhase(2))
      })
    }
    if (action.name === "submit_booking") {
      later(800, () => {
        setPhase(5)
        a2ui.send([remove("booking"), remove("restaurants")])
        setDeleted((d) => [...d, "booking", "restaurants"])
        push({ kind: "agent", text: "预订成功！🎉 表单已收起，这是你的确认单：" }, { kind: "surface", surfaceId: "confirm" })
        a2ui.stream(confirmMsgs(action.context), 300)
      })
    }
    if (action.name === "cancel_booking") {
      later(700, () => {
        setPhase(5)
        a2ui.send([
          comps("confirm", [{ id: "c-icon", component: "Icon", name: "close" }, text("c-title", fmt("${/restaurant} · 已取消"), "h4")]),
          data("confirm", "已为你取消，期待下次光临。", "/status"),
        ])
        push({ kind: "agent", text: "已经帮你取消了。注意：我只发了一条 updateComponents 和一条 updateDataModel。" })
      })
    }
  }

  const a2ui = useDemo([], { onAction })

  const ask = () => {
    setStarted(true)
    push({ kind: "user", text: "附近有什么好吃的川菜？帮我订个位子" }, { kind: "typing" })
    later(800, () => {
      push({ kind: "agent", text: "为你找到 3 家附近评分最高的川菜馆：" }, { kind: "surface", surfaceId: "restaurants" })
      setPhase(0)
      later(500, () => setPhase(1))
      later(1500, () => setPhase(2))
      a2ui.stream(restaurantMsgs(), 500, () => setPhase(3))
    })
  }

  const reset = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    a2ui.reset()
    setChat(GREETING)
    setPhase(-1)
    setDeleted([])
    setStarted(false)
  }

  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
  }, [chat.length, a2ui.log.length])

  return (
    <DemoCard
      title="订餐助手"
      description="一段完整的对话：Agent 流式生成界面 → 用户操作 → action 回传 → Agent 更新或删除界面"
      toolbar={
        <Button size="sm" variant="ghost" onClick={reset}>
          <RotateCcw /> 重新开始
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border bg-muted/20">
          <div ref={scroller} className="flex h-[600px] flex-col gap-3 overflow-y-auto p-4">
            {chat.map((item, i) => (
              <ChatRow key={i} item={item} a2ui={a2ui} deleted={deleted} />
            ))}
          </div>
          <div className="flex items-center gap-2 border-t bg-background p-3">
            <div className="flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {started ? "（本演示中，后续对话通过界面交互完成）" : "附近有什么好吃的川菜？帮我订个位子"}
            </div>
            <Button onClick={ask} disabled={started} size="icon" aria-label="发送">
              <ArrowUp />
            </Button>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">生命周期阶段</span>
            {PHASES.map((p, i) => (
              <div
                key={p.title}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs transition-colors",
                  phase === i ? "border-primary bg-primary text-primary-foreground" : phase > i ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="font-mono">{i + 1}</span>
                <span className="font-medium">{p.title}</span>
                <span className={cn("ml-auto truncate font-mono text-[10px]", phase === i ? "opacity-80" : "opacity-60")}>{p.body}</span>
              </div>
            ))}
          </div>
          <Inspector a2ui={a2ui} tabs={["log", "data", "tree"]} height={330} />
        </div>
      </div>
    </DemoCard>
  )
}

function ChatRow({ item, a2ui, deleted }: { item: ChatItem; a2ui: ReturnType<typeof useDemo>; deleted: string[] }) {
  if (item.kind === "user") {
    return (
      <div className="flex flex-row-reverse gap-2">
        <Avatar user />
        <span className="max-w-[80%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">{item.text}</span>
      </div>
    )
  }
  if (item.kind === "agent") {
    return (
      <div className="flex gap-2">
        <Avatar />
        <span className="max-w-[80%] rounded-2xl rounded-tl-sm border bg-background px-3 py-2 text-sm">{item.text}</span>
      </div>
    )
  }
  if (item.kind === "typing") {
    return (
      <div className="flex gap-2">
        <Avatar />
        <span className="flex items-center gap-1 rounded-2xl rounded-tl-sm border bg-background px-3 py-3">
          {[0, 1, 2].map((d) => (
            <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d * 120}ms` }} />
          ))}
        </span>
      </div>
    )
  }
  if (item.kind === "action") {
    return (
      <div className="flex justify-end">
        <span className="max-w-[90%] truncate rounded-md border border-orange-500/30 bg-orange-500/5 px-2 py-1 font-mono text-[11px] text-orange-700 dark:text-orange-300">
          ↑ {item.text}
        </span>
      </div>
    )
  }
  const surface = a2ui.state.surfaces[item.surfaceId]
  return (
    <div className="flex gap-2">
      <span className="w-7 shrink-0" />
      <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-bottom-2">
        {surface ? (
          <SurfaceFrame surface={surface}>
            <A2UISurface surface={surface} controller={a2ui.controller} />
          </SurfaceFrame>
        ) : deleted.includes(item.surfaceId) ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 font-mono text-[11px] text-muted-foreground">
            <Trash2 className="size-3.5" /> surface “{item.surfaceId}” 已被 Agent 通过 deleteSurface 移除
          </div>
        ) : (
          <div className="h-20 animate-pulse rounded-xl border border-dashed bg-muted/40" />
        )}
      </div>
    </div>
  )
}

function Avatar({ user }: { user?: boolean }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
      {user ? <UserRound className="size-3.5" /> : <Bot className="size-3.5" />}
    </span>
  )
}

export default function LifecycleLesson() {
  const { version } = useProtocolVersion()
  const v1 = version === "v1.0"
  return (
    <LessonShell
      slug="lifecycle"
      intro={
        <>
          是时候把前面学到的东西串起来了。下面是一个模拟的订餐 Agent：它在聊天流中生成餐厅列表、预订表单和确认单，响应你的每一次点击。
          右侧实时显示每一条 A2UI 消息，以及当前处于生命周期的哪个阶段。
        </>
      }
      takeaways={[
        "一次对话里可以有多个 surface，它们各自独立地被创建、更新和删除。",
        "Agent 通过 action 得知用户意图，再决定发送什么消息作为回应。",
        "表单用 sendDataModel + context 把用户输入带回；按钮 checks 保证提交前数据有效。",
        "界面不再需要时，Agent 用 deleteSurface 主动清理；小改动只需发送最小的更新。",
      ]}
      quiz={[
        {
          q: "在演示中，点击某个餐厅卡片的“预订”时，action 的 context 里为什么能拿到正确的餐厅名？",
          options: [
            "因为每个卡片是单独生成的组件",
            <>因为按钮在模板作用域中，<C>{`{"path": "name"}`}</C> 解析为当前元素的 name</>,
            "因为 Agent 记住了用户点了哪里",
            "因为客户端发送了整个数据模型",
          ],
          answer: 1,
          explain: "三张卡片其实是同一个模板的三个实例。按钮 context 中的相对路径在各自的作用域中解析。",
        },
        {
          q: "“取消预订”之后，Agent 发送了哪些消息？",
          options: ["重新创建整个确认单", "一条 updateComponents（替换图标和标题）+ 一条 updateDataModel（状态文字）", "deleteSurface", "没有发送消息"],
          answer: 1,
          explain: "按 ID 更新少数组件、按路径更新少量数据，是 A2UI 最典型的增量更新方式。可以在消息日志中确认。",
        },
      ]}
    >
      <Section title="开始对话" kicker="01 · 动手">
        <P>
          点击输入框右侧的发送按钮开始。依次：选择一家餐厅 → 填写表单（注意“确认预订”在填好手机号前是禁用的）→ 提交 → 尝试取消。
          每一步都可以在右侧的<strong>消息日志</strong>中展开查看完整 JSON。
        </P>
        <BookingAssistant />
      </Section>

      <Section title="发生了什么" kicker="02 · 复盘">
        <DataTable
          head={["步骤", "消息", "用到的知识点"]}
          mono={[]}
          rows={[
            ["列出餐厅", <C>createSurface → updateComponents × 2 → updateDataModel</C>, "第 2、3、4 章：surface、邻接表、流式渲染"],
            ["卡片列表", <C>{`List.children = { componentId: "r-card", path: "/restaurants" }`}</C>, "第 6 章：模板与相对路径"],
            ["点击预订", <C>↑ action select_restaurant</C>, "第 7 章：action 与 context"],
            ["填写表单", "（无消息）", "第 7 章：本地双向绑定；第 8 章：checks 禁用按钮"],
            ["提交", <C>↑ action submit_booking（附带 {v1 ? "a2uiRendererDataModel" : "a2uiClientDataModel"}）</C>, "第 7 章：sendDataModel"],
            ["确认单", <C>deleteSurface × 2 → createSurface …</C>, "第 2 章：surface 生命周期；第 8 章：formatDate"],
            ["取消", <C>updateComponents + updateDataModel</C>, "第 3、5 章：按 ID / 按路径增量更新"],
          ]}
        />
        <Callout tone="info" title="真实系统中，Agent 是 LLM">
          这里的“Agent”是写死的脚本，便于演示。真实场景中，Agent 由 LLM 驱动：它读到 action 后自行决定回复哪些 A2UI 消息，通常借助 A2A、AG-UI 或 MCP 与客户端通信（下一章）。
        </Callout>
      </Section>
    </LessonShell>
  )
}
