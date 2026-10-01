import { useState } from "react"
import { Braces } from "lucide-react"
import { cn } from "cn"

import {
  A2UISurface,
  BASIC_CATALOG,
  BASIC_CATALOG_V1,
  CATEGORY_LABEL,
  convertSnippet,
  type ComponentCategory,
  type ComponentDef,
} from "@/a2ui"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { CodeBlock } from "@/components/learn/code-block"
import { useDemo } from "@/components/learn/message-editor"
import { VersionBadge } from "@/components/learn/version-note"
import { useProtocolVersion } from "@/hooks/use-protocol-version"
import { bind, comps, create, data, fmt, text } from "@/lessons/msg"

interface GalleryExample {
  components: ComponentDef[]
  data?: Record<string, unknown>
}

const btn = (id: string, label: string, variant?: string): ComponentDef[] => [
  { id, component: "Button", child: `${id}-t`, ...(variant ? { variant } : {}), action: { event: { name: id } } },
  text(`${id}-t`, label),
]

const EXAMPLES: Record<string, GalleryExample> = {
  Row: {
    components: [
      { id: "root", component: "Row", children: ["a", "b", "c"], justify: "spaceBetween", align: "center" },
      text("a", "左"),
      text("b", "中间", "h5"),
      text("c", "右"),
    ],
  },
  Column: {
    components: [{ id: "root", component: "Column", children: ["a", "b", "c"], align: "center" }, text("a", "第一行", "h5"), text("b", "第二行"), text("c", "第三行", "caption")],
  },
  List: {
    components: [
      { id: "root", component: "List", children: { componentId: "item", path: "/fruits" } },
      { id: "item", component: "Row", children: ["icon", "name"], align: "center" },
      { id: "icon", component: "Icon", name: "check" },
      text("name", bind("name")),
    ],
    data: { fruits: [{ name: "苹果" }, { name: "香蕉" }, { name: "樱桃" }] },
  },
  Text: {
    components: [
      { id: "root", component: "Column", children: ["h", "b", "c"] },
      text("h", "标题 h3", "h3"),
      text("b", "正文支持 **粗体**、*斜体*、`代码` 与 [链接](https://a2ui.org)。"),
      text("c", "caption：辅助说明文字", "caption"),
    ],
  },
  Image: {
    components: [
      { id: "root", component: "Row", children: ["a", "b"], align: "center" },
      { id: "a", component: "Image", url: "https://i.pravatar.cc/100?img=12", variant: "avatar" },
      { id: "b", component: "Image", url: "https://picsum.photos/seed/a2ui/400/240", variant: "mediumFeature", fit: "cover" },
    ],
  },
  Icon: {
    components: [
      { id: "root", component: "Row", children: ["i1", "i2", "i3", "i4", "i5", "i6"] },
      ...["home", "search", "favorite", "shoppingCart", "notifications", "settings"].map((name, i) => ({ id: `i${i + 1}`, component: "Icon", name })),
    ],
  },
  Video: {
    components: [{ id: "root", component: "Video", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" }],
  },
  AudioPlayer: {
    components: [{ id: "root", component: "AudioPlayer", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3", description: "示例音频" }],
  },
  Divider: {
    components: [{ id: "root", component: "Column", children: ["a", "d", "b"] }, text("a", "上方内容"), { id: "d", component: "Divider" }, text("b", "下方内容")],
  },
  Card: {
    components: [{ id: "root", component: "Card", child: "col" }, { id: "col", component: "Column", children: ["t", "b"] }, text("t", "卡片标题", "h5"), text("b", "Card 只有一个 child，多个元素需用 Column/Row 包裹。", "caption")],
  },
  Tabs: {
    components: [
      { id: "root", component: "Tabs", tabs: [{ title: "概览", child: "t1" }, { title: "详情", child: "t2" }] },
      text("t1", "这是概览选项卡"),
      text("t2", "这是详情选项卡"),
    ],
  },
  Modal: {
    components: [
      { id: "root", component: "Modal", trigger: "open", content: "content" },
      ...btn("open", "打开弹窗", "primary"),
      { id: "content", component: "Column", children: ["mt", "mb"] },
      text("mt", "弹窗内容", "h4"),
      text("mb", "trigger 被点击时打开 content。"),
    ],
  },
  Button: {
    components: [{ id: "root", component: "Row", children: ["p", "d", "b"] }, ...btn("p", "primary", "primary"), ...btn("d", "default"), ...btn("b", "borderless", "borderless")],
  },
  TextField: {
    components: [
      { id: "root", component: "Column", children: ["a", "b", "echo"] },
      { id: "a", component: "TextField", label: "shortText", value: bind("/name") },
      { id: "b", component: "TextField", label: "obscured", variant: "obscured", value: bind("/pwd") },
      text("echo", fmt("name = ${/name}"), "caption"),
    ],
    data: { name: "A2UI", pwd: "" },
  },
  CheckBox: {
    components: [{ id: "root", component: "Column", children: ["c", "echo"] }, { id: "c", component: "CheckBox", label: "记住我", value: bind("/remember") }, text("echo", fmt("remember = ${/remember}"), "caption")],
    data: { remember: true },
  },
  ChoicePicker: {
    components: [
      { id: "root", component: "Column", children: ["a", "b"] },
      { id: "a", component: "ChoicePicker", label: "单选（checkbox 风格）", options: [{ label: "小杯", value: "s" }, { label: "中杯", value: "m" }, { label: "大杯", value: "l" }], value: bind("/size") },
      {
        id: "b",
        component: "ChoicePicker",
        label: "多选（chips 风格）",
        variant: "multipleSelection",
        displayStyle: "chips",
        options: [{ label: "燕麦奶", value: "oat" }, { label: "少冰", value: "ice" }, { label: "加浓", value: "shot" }],
        value: bind("/extras"),
      },
    ],
    data: { size: ["m"], extras: ["oat"] },
  },
  Slider: {
    components: [{ id: "root", component: "Slider", label: "音量", value: bind("/volume"), min: 0, max: 100 }],
    data: { volume: 40 },
  },
  DateTimeInput: {
    components: [
      { id: "root", component: "Column", children: ["d", "t"] },
      { id: "d", component: "DateTimeInput", label: "日期", enableDate: true, value: bind("/date") },
      { id: "t", component: "DateTimeInput", label: "时间", enableTime: true, value: bind("/time") },
    ],
    data: { date: "2026-10-01", time: "19:30" },
  },
}

/** v1.0 新增的属性，只在 v1.0 的示例中展示 */
const V1_EXTRAS: Record<string, Record<string, Record<string, unknown>>> = {
  TextField: { a: { placeholder: "请输入名字" } },
  Slider: { root: { steps: 10 } },
  Video: { root: { posterUrl: "https://picsum.photos/seed/poster/640/360" } },
}

function GalleryCard({ name }: { name: string }) {
  const { version } = useProtocolVersion()
  const v1 = version === "v1.0"
  const meta = (v1 ? BASIC_CATALOG_V1 : BASIC_CATALOG).components[name]
  const base = EXAMPLES[name]
  const ex = v1 && V1_EXTRAS[name] ? { ...base, components: base.components.map((c) => ({ ...c, ...V1_EXTRAS[name][c.id] })) } : base
  const sid = `g-${name}`
  const a2ui = useDemo([create(sid), comps(sid, ex.components), ...(ex.data ? [data(sid, ex.data)] : [])])
  const [showJson, setShowJson] = useState(false)
  const surface = a2ui.state.surfaces[sid]

  return (
    <div id={name} className="flex min-w-0 scroll-mt-20 flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2">
            <span className="font-mono text-base font-semibold">{name}</span>
            <Badge variant="secondary" className="text-[10px]">
              {CATEGORY_LABEL[meta.category]}
            </Badge>
          </span>
          <span className="text-xs text-muted-foreground">{meta.summary}</span>
        </div>
        <Button size="icon-sm" variant={showJson ? "secondary" : "ghost"} onClick={() => setShowJson(!showJson)} aria-label="查看 JSON">
          <Braces />
        </Button>
      </div>
      <div className="min-h-24 rounded-lg border border-dashed p-3">{surface && <A2UISurface surface={surface} controller={a2ui.controller} />}</div>
      {showJson && <CodeBlock code={ex.components.map((c) => convertSnippet(c, version))} maxHeight={260} />}
      <div className="flex flex-col divide-y rounded-lg border text-xs">
        {meta.props.map((p) => (
          <div key={p.name} className="flex flex-col gap-0.5 px-2.5 py-1.5">
            <span className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-mono font-medium">
                {p.name}
                {p.required && <span className="text-destructive">*</span>}
              </span>
              <span className="font-mono text-[10.5px] break-all text-sky-700 dark:text-sky-300">{p.type}</span>
            </span>
            <span className="text-muted-foreground">{p.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GalleryPage() {
  const { version } = useProtocolVersion()
  const [filter, setFilter] = useState<"all" | ComponentCategory>("all")
  const names = Object.keys(BASIC_CATALOG.components).filter((n) => filter === "all" || BASIC_CATALOG.components[n].category === filter)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-8 pb-20 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
          组件画廊 <VersionBadge version={version} className="h-6 text-xs" />
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          basic catalog（{version}）中的全部组件。每张卡片都由真实的 A2UI 消息渲染；属性依据官方 catalog.json 整理，<span className="text-destructive">*</span> 表示必填。
          所有组件还共享 <span className="font-mono">id</span>、<span className="font-mono">accessibility</span>，以及在 Row/Column 中可用的 <span className="font-mono">weight</span>
          {version === "v1.0" && (
            <>
              ；v1.0 中还可以带 <span className="font-mono">catalogId</span>（混用 catalog）与 <span className="font-mono">metadata</span>
            </>
          )}
          。
        </p>
      </header>
      <ToggleGroup type="single" variant="outline" size="sm" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)} className="flex-wrap">
        <ToggleGroupItem value="all">全部</ToggleGroupItem>
        {(Object.keys(CATEGORY_LABEL) as ComponentCategory[]).map((c) => (
          <ToggleGroupItem key={c} value={c}>
            {CATEGORY_LABEL[c]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")}>
        {names.map((n) => (
          <GalleryCard key={n} name={n} />
        ))}
      </div>
    </div>
  )
}
