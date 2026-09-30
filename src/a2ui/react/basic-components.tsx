// Basic Catalog 的 React 实现 —— 用 shadcn/ui 作为"原生组件"

import { useContext, useId, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  Calendar,
  CalendarDays,
  Camera,
  Check,
  CircleAlert,
  CircleHelp,
  CircleUser,
  CreditCard,
  Download,
  Ellipsis,
  EllipsisVertical,
  Eye,
  EyeOff,
  FastForward,
  Folder,
  Heart,
  HeartOff,
  House,
  Image as ImageIcon,
  Info,
  Lock,
  LockOpen,
  Mail,
  MapPin,
  Menu,
  Paperclip,
  Pause,
  Pencil,
  Phone,
  Play,
  Plus,
  Printer,
  RefreshCw,
  Rewind,
  Search,
  Send,
  Settings,
  Share2,
  ShoppingCart,
  SkipBack,
  SkipForward,
  Smartphone,
  Square,
  Star,
  StarHalf,
  StarOff,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  Volume1,
  Volume2,
  VolumeOff,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import {
  callFunction,
  failedChecks,
  resolveString,
  resolveValue,
  stringify,
} from "../evaluate"
import { getAt, resolvePath } from "../pointer"
import { isDataBinding, isFunctionCall } from "../types"
import { InlineContext, useEvalContext, useSurfaceContext } from "./context"
import { isBlockMarkdown, MarkdownBlocks, renderInline } from "./markdown"
import { Children, Node } from "./node"
import type { ComponentRenderer, RendererProps } from "./registry"

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

/** 双向绑定：读取绑定路径的值，写入时更新本地数据模型 */
function useBinding<T>(prop: unknown, scope: string, fallback: T) {
  const { surface, controller } = useSurfaceContext()
  const ctx = useEvalContext(scope)
  const boundPath = isDataBinding(prop) ? resolvePath(prop.path, scope) : null
  const [local, setLocal] = useState<unknown>(() =>
    boundPath ? undefined : resolveValue(prop, ctx)
  )
  const raw = boundPath ? getAt(surface.dataModel, boundPath) : local
  const value = (raw === undefined ? fallback : raw) as T
  const setValue = (v: T) => {
    if (boundPath) controller?.setData(surface.id, boundPath, v)
    else setLocal(v)
  }
  return [value, setValue, boundPath] as const
}

const JUSTIFY: Record<string, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  spaceBetween: "justify-between",
  spaceAround: "justify-around",
  spaceEvenly: "justify-evenly",
  stretch: "*:flex-1",
}
const ALIGN: Record<string, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
}

function FieldLabel({ htmlFor, text }: { htmlFor?: string; text: string }) {
  if (!text) return null
  return (
    <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
      {text}
    </Label>
  )
}

// ---------------------------------------------------------------------------
// 布局
// ---------------------------------------------------------------------------

function Flex({ comp, scope, ancestors, dir }: RendererProps & { dir: "row" | "col" }) {
  const justify = String(comp.justify ?? "start")
  const align = String(comp.align ?? "stretch")
  return (
    <div
      className={cn(
        "flex min-w-0 gap-3",
        dir === "row" ? "flex-row" : "flex-col",
        JUSTIFY[justify],
        ALIGN[align]
      )}
    >
      <Children list={comp.children} scope={scope} ancestors={ancestors} />
    </div>
  )
}

const RowView: ComponentRenderer = (p) => <Flex {...p} dir="row" />
const ColumnView: ComponentRenderer = (p) => <Flex {...p} dir="col" />

const ListView: ComponentRenderer = ({ comp, scope, ancestors }) => {
  const horizontal = comp.direction === "horizontal"
  return (
    <div
      role="list"
      className={cn(
        "flex min-w-0 gap-2",
        horizontal ? "flex-row overflow-x-auto pb-1" : "max-h-[420px] flex-col overflow-y-auto",
        ALIGN[String(comp.align ?? "stretch")]
      )}
    >
      <Children list={comp.children} scope={scope} ancestors={ancestors} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// 展示
// ---------------------------------------------------------------------------

const TEXT_CLASS: Record<string, string> = {
  h1: "text-3xl font-bold tracking-tight",
  h2: "text-2xl font-semibold tracking-tight",
  h3: "text-xl font-semibold",
  h4: "text-lg font-semibold",
  h5: "text-base font-semibold",
  caption: "text-xs text-muted-foreground",
  body: "text-sm leading-relaxed",
}

const TextView: ComponentRenderer = ({ comp, scope }) => {
  const inline = useContext(InlineContext)
  const text = resolveString(comp.text, useEvalContext(scope))
  const variant = String(comp.variant ?? "body")
  const cls = TEXT_CLASS[variant] ?? TEXT_CLASS.body
  if (inline) return <span className={cn(variant.startsWith("h") && "font-semibold")}>{renderInline(text)}</span>
  if (isBlockMarkdown(text)) {
    return (
      <div className={cn(cls, "min-w-0 break-words")}>
        <MarkdownBlocks text={text} />
      </div>
    )
  }
  const Tag = (/^h[1-5]$/.test(variant) ? variant : "p") as "p"
  return <Tag className={cn(cls, "min-w-0 break-words")}>{renderInline(text)}</Tag>
}

const IMAGE_VARIANT: Record<string, string> = {
  icon: "size-6 rounded",
  avatar: "size-10 rounded-full",
  smallFeature: "size-20 rounded-lg",
  mediumFeature: "h-40 w-full max-w-64 rounded-lg",
  largeFeature: "h-56 w-full rounded-lg",
  header: "h-36 w-full rounded-lg",
}
const FIT: Record<string, string> = {
  contain: "object-contain",
  cover: "object-cover",
  fill: "object-fill",
  none: "object-none",
  scaleDown: "object-scale-down",
}

const ImageView: ComponentRenderer = ({ comp, scope }) => {
  const ctx = useEvalContext(scope)
  const url = resolveString(comp.url, ctx)
  const alt = resolveString(comp.description, ctx)
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const cls = cn(
    "shrink-0 bg-muted",
    IMAGE_VARIANT[String(comp.variant ?? "mediumFeature")] ?? IMAGE_VARIANT.mediumFeature,
    FIT[String(comp.fit ?? "fill")]
  )
  if (!url || failedUrl === url) {
    return (
      <div className={cn(cls, "flex items-center justify-center text-muted-foreground")}>
        <ImageIcon className="size-5" />
      </div>
    )
  }
  return <img src={url} alt={alt} className={cls} onError={() => setFailedUrl(url)} />
}

export const ICONS: Record<string, LucideIcon> = {
  accountCircle: CircleUser,
  add: Plus,
  arrowBack: ArrowLeft,
  arrowForward: ArrowRight,
  attachFile: Paperclip,
  calendarToday: Calendar,
  call: Phone,
  camera: Camera,
  check: Check,
  close: X,
  delete: Trash2,
  download: Download,
  edit: Pencil,
  event: CalendarDays,
  error: CircleAlert,
  fastForward: FastForward,
  favorite: Heart,
  favoriteOff: HeartOff,
  folder: Folder,
  help: CircleHelp,
  home: House,
  info: Info,
  locationOn: MapPin,
  lock: Lock,
  lockOpen: LockOpen,
  mail: Mail,
  menu: Menu,
  moreVert: EllipsisVertical,
  moreHoriz: Ellipsis,
  notificationsOff: BellOff,
  notifications: Bell,
  pause: Pause,
  payment: CreditCard,
  person: User,
  phone: Smartphone,
  photo: ImageIcon,
  play: Play,
  print: Printer,
  refresh: RefreshCw,
  rewind: Rewind,
  search: Search,
  send: Send,
  settings: Settings,
  share: Share2,
  shoppingCart: ShoppingCart,
  skipNext: SkipForward,
  skipPrevious: SkipBack,
  star: Star,
  starHalf: StarHalf,
  starOff: StarOff,
  stop: Square,
  upload: Upload,
  visibility: Eye,
  visibilityOff: EyeOff,
  volumeDown: Volume1,
  volumeMute: VolumeX,
  volumeOff: VolumeOff,
  volumeUp: Volume2,
  warning: TriangleAlert,
}

const IconView: ComponentRenderer = ({ comp, scope }) => {
  const ctx = useEvalContext(scope)
  const name = comp.name
  if (name && typeof name === "object" && "svgPath" in name) {
    return (
      <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-current">
        <path d={String((name as { svgPath: string }).svgPath)} />
      </svg>
    )
  }
  const Icon = ICONS[resolveString(name, ctx)] ?? CircleHelp
  return <Icon className="size-5 shrink-0" />
}

const VideoView: ComponentRenderer = ({ comp, scope }) => (
  <video controls src={resolveString(comp.url, useEvalContext(scope))} className="w-full rounded-lg bg-black" />
)

const AudioView: ComponentRenderer = ({ comp, scope }) => {
  const ctx = useEvalContext(scope)
  const desc = resolveString(comp.description, ctx)
  return (
    <div className="flex flex-col gap-1">
      {desc && <span className="text-xs text-muted-foreground">{desc}</span>}
      <audio controls src={resolveString(comp.url, ctx)} className="w-full" />
    </div>
  )
}

const DividerView: ComponentRenderer = ({ comp }) =>
  comp.axis === "vertical" ? (
    <Separator orientation="vertical" className="self-stretch data-[orientation=vertical]:h-auto" />
  ) : (
    <Separator />
  )

// ---------------------------------------------------------------------------
// 容器
// ---------------------------------------------------------------------------

const CardView: ComponentRenderer = ({ comp, scope, ancestors }) => (
  <Card className="min-w-0">
    <CardContent>
      <Node id={String(comp.child)} scope={scope} ancestors={ancestors} />
    </CardContent>
  </Card>
)

const TabsView: ComponentRenderer = ({ comp, scope, ancestors }) => {
  const ctx = useEvalContext(scope)
  const tabs = Array.isArray(comp.tabs) ? (comp.tabs as { title: unknown; child: string }[]) : []
  if (!tabs.length) return null
  return (
    <Tabs defaultValue="0" className="min-w-0">
      <TabsList>
        {tabs.map((t, i) => (
          <TabsTrigger key={i} value={String(i)}>
            {resolveString(t.title, ctx)}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t, i) => (
        <TabsContent key={i} value={String(i)} className="pt-2">
          <Node id={t.child} scope={scope} ancestors={ancestors} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

const ModalView: ComponentRenderer = ({ comp, scope, ancestors }) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div className="contents" onClickCapture={() => setOpen(true)}>
        <Node id={String(comp.trigger)} scope={scope} ancestors={ancestors} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle className="sr-only">{comp.id}</DialogTitle>
          <Node id={String(comp.content)} scope={scope} ancestors={ancestors} />
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// 交互
// ---------------------------------------------------------------------------

const BUTTON_VARIANT = {
  primary: "default",
  default: "outline",
  borderless: "ghost",
} as const

const ButtonView: ComponentRenderer = ({ comp, scope, ancestors }) => {
  const { surface, controller } = useSurfaceContext()
  const ctx = useEvalContext(scope)
  const failed = failedChecks(comp.checks, ctx)
  const action = (comp.action ?? {}) as {
    event?: { name: string; context?: Record<string, unknown> }
    functionCall?: unknown
  }

  const onClick = () => {
    if (action.event) {
      controller?.dispatchAction(surface.id, comp.id, action.event, scope)
    } else if (isFunctionCall(action.functionCall)) {
      callFunction(action.functionCall, ctx)
    }
  }

  const variant =
    BUTTON_VARIANT[String(comp.variant ?? "default") as keyof typeof BUTTON_VARIANT] ?? "outline"

  return (
    <span className="inline-flex min-w-0 flex-col gap-1" title={failed.join("\n") || undefined}>
      <Button variant={variant} disabled={failed.length > 0} onClick={onClick} className="h-auto min-h-8 py-1.5">
        <InlineContext.Provider value={true}>
          <Node id={String(comp.child)} scope={scope} ancestors={ancestors} />
        </InlineContext.Provider>
      </Button>
    </span>
  )
}

const TextFieldView: ComponentRenderer = ({ comp, scope }) => {
  const id = useId()
  const ctx = useEvalContext(scope)
  const variant = String(comp.variant ?? "shortText")
  const [value, setValue] = useBinding<unknown>(comp.value, scope, "")
  const [touched, setTouched] = useState(false)
  const text = stringify(value)

  const errors = failedChecks(comp.checks, ctx)
  if (typeof comp.validationRegexp === "string" && text) {
    try {
      if (!new RegExp(comp.validationRegexp).test(text)) errors.push("格式不正确")
    } catch {
      /* 非法正则忽略 */
    }
  }
  const showErrors = (touched || text !== "") && errors.length > 0

  const onChange = (v: string) => {
    setTouched(true)
    setValue(variant === "number" && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : v)
  }

  const common = {
    id,
    value: text,
    "aria-invalid": showErrors || undefined,
    onBlur: () => setTouched(true),
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel htmlFor={id} text={resolveString(comp.label, ctx)} />
      {variant === "longText" ? (
        <Textarea {...common} rows={4} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input
          {...common}
          type={variant === "obscured" ? "password" : variant === "number" ? "number" : "text"}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {showErrors && (
        <ul className="flex flex-col gap-0.5 text-xs text-destructive">
          {errors.map((e, i) => (
            <li key={i}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

const CheckBoxView: ComponentRenderer = ({ comp, scope }) => {
  const id = useId()
  const [value, setValue] = useBinding<boolean>(comp.value, scope, false)
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={id} checked={Boolean(value)} onCheckedChange={(v) => setValue(v === true)} />
      <Label htmlFor={id} className="text-sm font-normal">
        {resolveString(comp.label, useEvalContext(scope))}
      </Label>
    </div>
  )
}

const ChoicePickerView: ComponentRenderer = ({ comp, scope }) => {
  const ctx = useEvalContext(scope)
  const [raw, setValue] = useBinding<unknown>(comp.value, scope, [])
  const [filter, setFilter] = useState("")
  const selected = Array.isArray(raw) ? raw.map(String) : raw ? [String(raw)] : []
  const exclusive = comp.variant !== "multipleSelection"
  const chips = comp.displayStyle === "chips"
  const options = (Array.isArray(comp.options) ? comp.options : []).map((o: { label: unknown; value: string }) => ({
    label: resolveString(o.label, ctx),
    value: String(o.value),
  }))
  const visible = filter
    ? options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase()))
    : options

  const toggle = (v: string) => {
    if (exclusive) setValue([v])
    else setValue(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <FieldLabel text={resolveString(comp.label, ctx)} />
      {comp.filterable === true && (
        <Input placeholder="搜索…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7" />
      )}
      <div className={cn("flex gap-2", chips ? "flex-wrap" : "flex-col")}>
        {visible.map((o) => {
          const on = selected.includes(o.value)
          return chips ? (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              {o.label}
            </button>
          ) : (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="flex items-center gap-2 text-left text-sm"
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center border border-input shadow-xs transition-colors dark:bg-input/30",
                  exclusive ? "rounded-full" : "rounded-[4px]",
                  on && "border-primary bg-primary text-primary-foreground"
                )}
              >
                {on && (exclusive ? <span className="size-1.5 rounded-full bg-current" /> : <Check className="size-3" />)}
              </span>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

const SliderView: ComponentRenderer = ({ comp, scope }) => {
  const min = typeof comp.min === "number" ? comp.min : 0
  const max = typeof comp.max === "number" ? comp.max : 100
  const [value, setValue] = useBinding<number>(comp.value, scope, min)
  const n = Number(value) || 0
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <FieldLabel text={resolveString(comp.label, useEvalContext(scope))} />
        <span className="font-mono text-xs tabular-nums">{n}</span>
      </div>
      <Slider value={[n]} min={min} max={max} step={1} onValueChange={([v]) => setValue(v)} />
    </div>
  )
}

const DateTimeView: ComponentRenderer = ({ comp, scope }) => {
  const id = useId()
  const ctx = useEvalContext(scope)
  const [value, setValue] = useBinding<string>(comp.value, scope, "")
  const date = comp.enableDate === true
  const time = comp.enableTime === true
  const type = date && time ? "datetime-local" : time ? "time" : "date"
  const v = stringify(value)
  const shown = type === "datetime-local" ? v.slice(0, 16) : type === "date" ? v.slice(0, 10) : v.slice(0, 5)
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <FieldLabel htmlFor={id} text={resolveString(comp.label, ctx)} />
      <Input
        id={id}
        type={type}
        value={shown}
        min={comp.min ? resolveString(comp.min, ctx) : undefined}
        max={comp.max ? resolveString(comp.max, ctx) : undefined}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  )
}

export const BASIC_RENDERERS: Record<string, ComponentRenderer> = {
  Row: RowView,
  Column: ColumnView,
  List: ListView,
  Text: TextView,
  Image: ImageView,
  Icon: IconView,
  Video: VideoView,
  AudioPlayer: AudioView,
  Divider: DividerView,
  Card: CardView,
  Tabs: TabsView,
  Modal: ModalView,
  Button: ButtonView,
  TextField: TextFieldView,
  CheckBox: CheckBoxView,
  ChoicePicker: ChoicePickerView,
  Slider: SliderView,
  DateTimeInput: DateTimeView,
}
