import { useState } from "react"
import { cn } from "cn"

import { interpolate } from "@/a2ui"
import { Input } from "@/components/ui/input"
import { CodeBlock, C } from "@/components/learn/code-block"
import { Inspector, SurfacePreview } from "@/components/learn/inspector"
import { DemoCard, LessonShell } from "@/components/learn/lesson-shell"
import { JsonTextarea, useDemo } from "@/components/learn/message-editor"
import { Callout, DataTable, P, Section } from "@/components/learn/prose"

import { bind, comps, create, data, fmt, text } from "./msg"

// ---------------------------------------------------------------------------
// formatString 实验台
// ---------------------------------------------------------------------------

const PRESETS = [
  "你好，${/user/firstName}！欢迎回到 ${/appName}。",
  "今天是 ${formatDate(value:${/today}, format:'EEEE, MMM d, yyyy')}",
  "账户余额：${formatCurrency(value:${/balance}, currency:'CNY')}",
  "访问量 ${formatNumber(value:${/visits}, decimals:0)}",
  "你有 ${/unread} 条${pluralize(value:${/unread}, one:'新消息', other:'新消息们')}",
  "对象会被转成 JSON：${/user}",
  "转义：\\${/user/firstName} 不会被替换",
]

const SAMPLE = {
  appName: "A2UI 学堂",
  user: { firstName: "晓", lastName: "林" },
  today: "2026-10-01T09:30:00",
  balance: 12888.5,
  visits: 1234567,
  unread: 3,
}

function FormatPlayground() {
  const [tpl, setTpl] = useState(PRESETS[1])
  const [src, setSrc] = useState(JSON.stringify(SAMPLE, null, 2))
  let model: Record<string, unknown> = {}
  let err = ""
  try {
    model = JSON.parse(src)
  } catch (e) {
    err = (e as Error).message
  }
  const out = err ? "" : interpolate(tpl, { data: model, scope: "" })

  return (
    <DemoCard title="formatString 实验台" description="${…} 中可以写 JSON Pointer 路径，也可以调用 catalog 中的函数（参数必须具名）">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">模板字符串</span>
          <Input value={tpl} onChange={(e) => setTpl(e.target.value)} className="font-mono text-xs" />
          <div className="flex flex-col gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTpl(p)}
                className={cn("truncate rounded-md border px-2 py-1 text-left font-mono text-[11px] hover:bg-muted", p === tpl && "border-primary bg-primary/10")}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="mt-1 rounded-lg border-2 border-dashed border-primary/30 px-4 py-3">
            <span className="text-xs text-muted-foreground">输出</span>
            <p className="text-base font-medium break-words">{out || <span className="text-muted-foreground">（空）</span>}</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className="text-xs font-medium text-muted-foreground">数据模型（可编辑）</span>
          <JsonTextarea value={src} onChange={setSrc} minHeight={250} />
          {err && <span className="text-xs text-destructive">{err}</span>}
        </div>
      </div>
    </DemoCard>
  )
}

// ---------------------------------------------------------------------------
// checks 表单
// ---------------------------------------------------------------------------

const S = "register"
const req = (path: string) => ({ call: "required", args: { value: bind(path) } })

const REGISTER = [
  create(S),
  comps(S, [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["title", "email", "password", "age", "terms", "submit", "hint"] },
    text("title", "创建账号", "h4"),
    {
      id: "email",
      component: "TextField",
      label: "邮箱",
      value: bind("/form/email"),
      checks: [
        { condition: req("/form/email"), message: "邮箱不能为空" },
        { condition: { call: "email", args: { value: bind("/form/email") } }, message: "邮箱格式不正确" },
      ],
    },
    {
      id: "password",
      component: "TextField",
      label: "密码（至少 8 位）",
      variant: "obscured",
      value: bind("/form/password"),
      checks: [{ condition: { call: "length", args: { value: bind("/form/password"), min: 8 } }, message: "密码至少 8 位" }],
    },
    {
      id: "age",
      component: "TextField",
      label: "年龄",
      variant: "number",
      value: bind("/form/age"),
      checks: [{ condition: { call: "numeric", args: { value: bind("/form/age"), min: 18, max: 120 } }, message: "年龄需在 18–120 之间" }],
    },
    { id: "terms", component: "CheckBox", label: "我已阅读并同意服务条款", value: bind("/form/terms") },
    {
      id: "submit",
      component: "Button",
      child: "submit-text",
      variant: "primary",
      action: { event: { name: "register", context: { email: bind("/form/email") } } },
      checks: [
        {
          condition: {
            call: "and",
            args: {
              values: [
                req("/form/terms"),
                { call: "email", args: { value: bind("/form/email") } },
                { call: "length", args: { value: bind("/form/password"), min: 8 } },
                { call: "numeric", args: { value: bind("/form/age"), min: 18, max: 120 } },
              ],
            },
          },
          message: "请完整、正确地填写表单并同意条款",
        },
      ],
    },
    text("submit-text", "注册"),
    text("hint", fmt("当前 terms = ${/form/terms}"), "caption"),
  ]),
  data(S, { form: { email: "", password: "", age: "", terms: false } }),
]

const RECEIPT_S = "receipt"
const RECEIPT = [
  create(RECEIPT_S),
  comps(RECEIPT_S, [
    { id: "root", component: "Card", child: "col" },
    { id: "col", component: "Column", children: ["event", "date", "qty", "count", "price"] },
    text("event", "A2UI Summit 2026", "h4"),
    text("date", fmt("🗓 ${formatDate(value:${/date}, format:'MMM dd, yyyy · h:mm a')}"), "caption"),
    { id: "qty", component: "Slider", label: "门票数量", value: bind("/qty"), min: 0, max: 5 },
    text("count", { call: "pluralize", args: { value: bind("/qty"), zero: "zero → 还没有选择门票", one: "one → 1 ticket", other: "other → tickets" }, returnType: "string" }, "h5"),
    text("price", fmt("单价 ${formatCurrency(value:${/unitPrice}, currency:'USD')} · 余票 ${formatNumber(value:${/left})}")),
  ]),
  data(RECEIPT_S, { date: "2026-11-18T14:30:00", qty: 1, unitPrice: 1299, left: 12500 }),
]

function ChecksDemo() {
  const a2ui = useDemo(REGISTER)
  return (
    <DemoCard title="checks：声明式校验" description="所有规则都是函数调用；任一检查失败，按钮自动禁用（悬停可看原因）">
      <div className="grid gap-4 lg:grid-cols-2">
        <SurfacePreview a2ui={a2ui} />
        <Inspector a2ui={a2ui} tabs={["data", "log"]} height={330} />
      </div>
    </DemoCard>
  )
}

function FormatDemo() {
  const a2ui = useDemo(RECEIPT)
  return (
    <DemoCard title="格式化函数" description="拖动滑块，观察 pluralize 如何按 CLDR 复数类别选择文案">
      <div className="grid gap-4 lg:grid-cols-2">
        <SurfacePreview a2ui={a2ui} />
        <CodeBlock title="count 组件" code={(RECEIPT[1] as { updateComponents: { components: unknown[] } }).updateComponents.components[5]} />
      </div>
    </DemoCard>
  )
}

export default function FunctionsLesson() {
  return (
    <LessonShell
      slug="functions"
      intro={
        <>
          不发代码，客户端还能做计算和校验吗？能。A2UI 把客户端逻辑抽象为一组<strong>注册函数</strong>：它们的实现写在客户端里、声明在 catalog 中，
          Agent 只能<strong>按名字调用</strong>，并通过参数传入字面量或数据路径。
        </>
      }
      takeaways={[
        <>函数调用的形状是 <C>{`{ "call": 名字, "args": {…}, "returnType": … }`}</C>，参数本身也可以是路径或嵌套调用。</>,
        <><C>formatString</C> 用 <C>{"${…}"}</C> 插值：路径、相对路径、具名参数的函数调用都可以；<C>{"\\${"}</C> 用于转义。</>,
        <>输入组件和按钮可以声明 <C>checks</C>：每条规则是一个返回布尔值的条件 + 失败提示。</>,
        "按钮的任一 check 失败即自动禁用——表单逻辑完全在客户端即时生效，无需往返 Agent。",
      ]}
      quiz={[
        {
          q: "Agent 能不能在消息里定义一个新的 JavaScript 函数让客户端执行？",
          options: ["能，放在 args 里", "能，用 functionCall", "不能，只能调用 catalog 中已注册的函数", "只有在 sendDataModel 为 true 时可以"],
          answer: 2,
          explain: "这正是 A2UI 安全模型的一部分：函数的实现属于客户端，Agent 只能按名字引用。",
        },
        {
          q: <>在 formatString 中想调用函数并传入数据，下面哪种写法正确？</>,
          options: [
            <C>{"${formatDate(/today, 'yyyy')}"}</C>,
            <C>{"${formatDate(value:${/today}, format:'yyyy')}"}</C>,
            <C>{"{{formatDate /today}}"}</C>,
            <C>{"${/today | formatDate}"}</C>,
          ],
          answer: 1,
          explain: "函数参数必须具名（name:value），数据路径用嵌套的 ${…} 显式包裹，字符串字面量用单引号。",
        },
      ]}
    >
      <Section title="basic catalog 中的函数" kicker="01 · 清单">
        <DataTable
          head={["类别", "函数", "返回"]}
          mono={[1]}
          rows={[
            ["校验", "required · regex · length · numeric · email", "boolean"],
            ["格式化", "formatString · formatNumber · formatCurrency · formatDate · pluralize", "string"],
            ["逻辑", "and · or · not", "boolean"],
            ["本地动作", "openUrl", "void"],
          ]}
        />
        <CodeBlock
          title="一个函数调用"
          code={{ call: "formatCurrency", args: { value: { path: "/order/total" }, currency: "CNY", decimals: 2 }, returnType: "string" }}
        />
      </Section>

      <Section title="formatString：字符串插值" kicker="02 · 动手">
        <P>
          <C>formatString</C> 是最常用的函数：把静态文字与数据、其他函数的结果拼在一起。试试上面的预设，或者自己改数据模型。
        </P>
        <FormatPlayground />
        <Callout tone="info" title="类型转换">
          插值时：数字和布尔值使用标准字符串形式；<C>null</C>/<C>undefined</C> 变为空字符串；对象和数组会被序列化为 JSON。
        </Callout>
      </Section>

      <Section title="checks：客户端即时校验" kicker="03 · 动手">
        <P>
          每条 check 由 <C>condition</C>（一个返回布尔值的动态值）和 <C>message</C> 组成。按钮上的 check 用 <C>and</C> 组合了多条规则，
          全部通过前按钮保持禁用。
        </P>
        <ChecksDemo />
        <CodeBlock
          title="按钮上的组合校验（节选）"
          code={{
            checks: [
              {
                condition: {
                  call: "and",
                  args: { values: [{ call: "required", args: { value: { path: "/form/terms" } } }, { call: "email", args: { value: { path: "/form/email" } } }, "…"] },
                },
                message: "请完整、正确地填写表单并同意条款",
              },
            ],
          }}
        />
      </Section>

      <Section title="格式化：日期、货币、复数" kicker="04 · 展示">
        <FormatDemo />
        <Callout tone="tip" title="为什么没有加减乘除？">
          basic catalog 刻意保持精简。像“总价 = 单价 × 数量”这样的业务计算，推荐由 Agent 在服务端算好再写入数据模型；客户端函数专注于校验与格式化。
          需要更多函数时，可以在自定义 catalog 中声明（下一章）。
        </Callout>
      </Section>
    </LessonShell>
  )
}
