// Catalog 元数据：Agent 只能使用这里声明过的组件（白名单）
// v0.9 依据 specification/v0_9_1/catalogs/basic/catalog.json
// v1.0 依据 catalogs/basic/v1/catalog.json

import { BASIC_CATALOG_ID, BASIC_CATALOG_V1_ID, type ProtocolVersion } from "./types"

export type ComponentCategory = "layout" | "display" | "input" | "container"

export interface PropMeta {
  name: string
  type: string
  desc: string
  required?: boolean
}

export interface ComponentMeta {
  category: ComponentCategory
  summary: string
  props: PropMeta[]
  /** v1.0 组合约束："Surface" 表示可作为 root */
  allowedParents?: string[]
  allowedChildren?: string[]
}

export type AllowedCallers = "rendererOnly" | "agentOnly" | "rendererOrAgent"

export interface FunctionMeta {
  returnType: string
  /** v1.0：谁可以调用（默认 rendererOnly） */
  allowedCallers?: AllowedCallers
  requiresUserActivation?: boolean
}

export interface CatalogDef {
  catalogId: string
  title: string
  protocol: ProtocolVersion
  components: Record<string, ComponentMeta>
  functions: Record<string, FunctionMeta>
}

const children: PropMeta = {
  name: "children",
  type: "ChildList",
  desc: "子组件 ID 数组，或 { componentId, path } 模板",
  required: true,
}

const BASIC_FUNCTIONS_V09: Record<string, FunctionMeta> = Object.fromEntries([
  ...["required", "regex", "length", "numeric", "email", "and", "or", "not"].map((n) => [n, { returnType: "boolean" }]),
  ...["formatString", "formatNumber", "formatCurrency", "formatDate", "pluralize"].map((n) => [n, { returnType: "string" }]),
  ["openUrl", { returnType: "void" }],
])

export const BASIC_CATALOG: CatalogDef = {
  catalogId: BASIC_CATALOG_ID,
  title: "Basic Catalog (v0.9)",
  protocol: "v0.9",
  functions: BASIC_FUNCTIONS_V09,
  components: {
    Row: {
      category: "layout",
      summary: "水平排列子组件",
      props: [
        children,
        {
          name: "justify",
          type: "start | center | end | spaceBetween | spaceAround | spaceEvenly | stretch",
          desc: "主轴（水平）分布",
        },
        { name: "align", type: "start | center | end | stretch", desc: "交叉轴对齐" },
      ],
    },
    Column: {
      category: "layout",
      summary: "垂直排列子组件",
      props: [
        children,
        {
          name: "justify",
          type: "start | center | end | spaceBetween | spaceAround | spaceEvenly | stretch",
          desc: "主轴（垂直）分布",
        },
        { name: "align", type: "start | center | end | stretch", desc: "交叉轴对齐" },
      ],
    },
    List: {
      category: "layout",
      summary: "可滚动的列表，常与模板配合渲染数组",
      props: [
        children,
        { name: "direction", type: "vertical | horizontal", desc: "排列方向" },
        { name: "align", type: "start | center | end | stretch", desc: "交叉轴对齐" },
      ],
    },
    Text: {
      category: "display",
      summary: "文本，支持简单 Markdown",
      props: [
        { name: "text", type: "DynamicString", desc: "文本内容", required: true },
        { name: "variant", type: "h1 | h2 | h3 | h4 | h5 | caption | body", desc: "字体样式提示" },
      ],
    },
    Image: {
      category: "display",
      summary: "图片",
      props: [
        { name: "url", type: "DynamicString", desc: "图片地址", required: true },
        { name: "description", type: "DynamicString", desc: "无障碍描述 (alt)" },
        { name: "fit", type: "contain | cover | fill | none | scaleDown", desc: "等同 CSS object-fit" },
        {
          name: "variant",
          type: "icon | avatar | smallFeature | mediumFeature | largeFeature | header",
          desc: "尺寸与风格提示",
        },
      ],
    },
    Icon: {
      category: "display",
      summary: "预定义图标名，或 { svgPath }",
      props: [
        { name: "name", type: "IconName | { svgPath } | { path }", desc: "图标", required: true },
      ],
    },
    Video: {
      category: "display",
      summary: "视频播放器",
      props: [{ name: "url", type: "DynamicString", desc: "视频地址", required: true }],
    },
    AudioPlayer: {
      category: "display",
      summary: "音频播放器",
      props: [
        { name: "url", type: "DynamicString", desc: "音频地址", required: true },
        { name: "description", type: "DynamicString", desc: "描述" },
      ],
    },
    Divider: {
      category: "display",
      summary: "分隔线",
      props: [{ name: "axis", type: "horizontal | vertical", desc: "方向" }],
    },
    Card: {
      category: "container",
      summary: "卡片容器，只有一个 child",
      props: [{ name: "child", type: "ComponentId", desc: "唯一子组件 ID", required: true }],
    },
    Tabs: {
      category: "container",
      summary: "选项卡",
      props: [
        {
          name: "tabs",
          type: "{ title: DynamicString, child: ComponentId }[]",
          desc: "每个选项卡的标题与内容",
          required: true,
        },
      ],
    },
    Modal: {
      category: "container",
      summary: "弹窗：点击 trigger 打开 content",
      props: [
        { name: "trigger", type: "ComponentId", desc: "触发器组件 ID", required: true },
        { name: "content", type: "ComponentId", desc: "弹窗内容组件 ID", required: true },
      ],
    },
    Button: {
      category: "input",
      summary: "按钮，点击触发 action；checks 不通过时自动禁用",
      props: [
        { name: "child", type: "ComponentId", desc: "按钮内容（通常是 Text）", required: true },
        { name: "action", type: "Action", desc: "{ event } 发给 Agent，或 { functionCall } 本地执行", required: true },
        { name: "variant", type: "default | primary | borderless", desc: "样式提示" },
        { name: "checks", type: "CheckRule[]", desc: "任一失败则禁用" },
      ],
    },
    TextField: {
      category: "input",
      summary: "文本输入框（双向绑定）",
      props: [
        { name: "label", type: "DynamicString", desc: "标签", required: true },
        { name: "value", type: "DynamicString", desc: "通常绑定到 { path }" },
        { name: "variant", type: "shortText | longText | number | obscured", desc: "输入类型" },
        { name: "validationRegexp", type: "string", desc: "正则校验" },
        { name: "checks", type: "CheckRule[]", desc: "校验规则" },
      ],
    },
    CheckBox: {
      category: "input",
      summary: "复选框（双向绑定布尔值）",
      props: [
        { name: "label", type: "DynamicString", desc: "标签", required: true },
        { name: "value", type: "DynamicBoolean", desc: "是否选中", required: true },
      ],
    },
    ChoicePicker: {
      category: "input",
      summary: "单选 / 多选，值为字符串数组",
      props: [
        { name: "options", type: "{ label, value }[]", desc: "可选项", required: true },
        { name: "value", type: "DynamicStringList", desc: "已选值数组", required: true },
        { name: "label", type: "DynamicString", desc: "标签" },
        { name: "variant", type: "multipleSelection | mutuallyExclusive", desc: "多选或单选" },
        { name: "displayStyle", type: "checkbox | chips", desc: "展示风格" },
        { name: "filterable", type: "boolean", desc: "显示搜索框" },
      ],
    },
    Slider: {
      category: "input",
      summary: "滑块（双向绑定数值）",
      props: [
        { name: "value", type: "DynamicNumber", desc: "当前值", required: true },
        { name: "max", type: "number", desc: "最大值", required: true },
        { name: "min", type: "number", desc: "最小值，默认 0" },
        { name: "label", type: "DynamicString", desc: "标签" },
      ],
    },
    DateTimeInput: {
      category: "input",
      summary: "日期 / 时间选择（ISO 8601 字符串）",
      props: [
        { name: "value", type: "DynamicString", desc: "ISO 8601 值", required: true },
        { name: "enableDate", type: "boolean", desc: "允许选择日期" },
        { name: "enableTime", type: "boolean", desc: "允许选择时间" },
        { name: "label", type: "DynamicString", desc: "标签" },
        { name: "min / max", type: "DynamicString", desc: "可选范围" },
      ],
    },
  },
}

// ---------------------------------------------------------------------------
// v1.0 basic catalog：在 v0.9 基础上的差异
// ---------------------------------------------------------------------------

const withProps = (meta: ComponentMeta, patch: (props: PropMeta[]) => PropMeta[], summary?: string): ComponentMeta => ({
  ...meta,
  summary: summary ?? meta.summary,
  props: patch(meta.props),
})

const v09 = BASIC_CATALOG.components

export const BASIC_CATALOG_V1: CatalogDef = {
  catalogId: BASIC_CATALOG_V1_ID,
  title: "Basic Catalog (v1.0)",
  protocol: "v1.0",
  functions: {
    ...Object.fromEntries(["required", "regex", "length", "numeric", "email"].map((n) => [n, { returnType: "validationResult" }])),
    ...Object.fromEntries(["formatString", "formatNumber", "formatCurrency", "formatDate", "pluralize"].map((n) => [n, { returnType: "string" }])),
    ...Object.fromEntries(["and", "or", "not"].map((n) => [n, { returnType: "boolean" }])),
    openUrl: { returnType: "void", requiresUserActivation: true },
  },
  components: {
    ...v09,
    Text: withProps(
      v09.Text,
      (ps) => ps.map((p) => (p.name === "variant" ? { ...p, type: "caption | body", desc: "样式提示；标题改用 Markdown（# / ## …）" } : p)),
      "文本，支持简单 Markdown（标题用 #）"
    ),
    TextField: withProps(v09.TextField, (ps) => [
      ...ps.filter((p) => p.name !== "validationRegexp"),
      { name: "placeholder", type: "DynamicString", desc: "占位提示（v1.0 新增）" },
    ]),
    Video: withProps(v09.Video, (ps) => [...ps, { name: "posterUrl", type: "DynamicString", desc: "播放前显示的封面（v1.0 新增）" }]),
    Slider: withProps(v09.Slider, (ps) => [...ps, { name: "steps", type: "integer", desc: "等分数，设置后吸附到离散值（v1.0 新增）" }]),
  },
}

// ---------------------------------------------------------------------------
// 自定义 Catalog 示例
// ---------------------------------------------------------------------------

const RATING: ComponentMeta = {
  category: "display",
  summary: "星级评分（自定义组件）",
  props: [
    { name: "value", type: "DynamicNumber", desc: "分数", required: true },
    { name: "max", type: "number", desc: "满分，默认 5" },
  ],
}

const FLIGHT_SEGMENT: ComponentMeta = {
  category: "display",
  summary: "航段信息（自定义组件）",
  props: [
    { name: "from", type: "DynamicString", desc: "出发机场", required: true },
    { name: "to", type: "DynamicString", desc: "到达机场", required: true },
    { name: "departs", type: "DynamicString", desc: "起飞时间" },
    { name: "arrives", type: "DynamicString", desc: "到达时间" },
  ],
}

/** v0.9：一个 surface 只能用一份 catalog，所以自定义 catalog 需要包含 basic 组件 */
export const TRAVEL_CATALOG_ID = "https://example.com/a2ui/v0_9/travel.json"

export const TRAVEL_CATALOG: CatalogDef = {
  catalogId: TRAVEL_CATALOG_ID,
  title: "Travel Catalog（v0.9 自定义示例）",
  protocol: "v0.9",
  functions: BASIC_FUNCTIONS_V09,
  components: { ...BASIC_CATALOG.components, Rating: RATING, FlightSegment: FLIGHT_SEGMENT },
}

/** v1.0：catalog 可以混用，自定义 catalog 只需声明领域组件 */
export const TRAVEL_CATALOG_V1_ID = "https://example.com/a2ui/v1_0/travel.json"

export const TRAVEL_CATALOG_V1: CatalogDef = {
  catalogId: TRAVEL_CATALOG_V1_ID,
  title: "Travel Catalog（v1.0 自定义示例）",
  protocol: "v1.0",
  functions: {},
  components: {
    Rating: RATING,
    // 组合约束：航段只能放在 Card / Column / List 中
    FlightSegment: { ...FLIGHT_SEGMENT, allowedParents: ["Card", "Column", "List"] },
  },
}

/** v1.0：只包含函数的 catalog，演示 Agent 调用渲染器函数（callRendererFunction） */
export const DEVICE_CATALOG_V1_ID = "https://example.com/a2ui/v1_0/device.json"

export const DEVICE_CATALOG_V1: CatalogDef = {
  catalogId: DEVICE_CATALOG_V1_ID,
  title: "Device Catalog（v1.0 自定义示例）",
  protocol: "v1.0",
  components: {},
  functions: {
    getDeviceInfo: { returnType: "object", allowedCallers: "agentOnly" },
    getColorScheme: { returnType: "string", allowedCallers: "rendererOrAgent" },
  },
}

export const CATALOGS: Record<string, CatalogDef> = {
  [BASIC_CATALOG_ID]: BASIC_CATALOG,
  // 允许 v0_9_1 路径写法
  "https://a2ui.org/specification/v0_9_1/catalogs/basic/catalog.json": BASIC_CATALOG,
  [BASIC_CATALOG_V1_ID]: BASIC_CATALOG_V1,
  [TRAVEL_CATALOG_ID]: TRAVEL_CATALOG,
  [TRAVEL_CATALOG_V1_ID]: TRAVEL_CATALOG_V1,
  [DEVICE_CATALOG_V1_ID]: DEVICE_CATALOG_V1,
}

export function requiredProps(catalog: CatalogDef, component: string) {
  return (catalog.components[component]?.props ?? [])
    .filter((p) => p.required)
    .map((p) => p.name)
}

/** 从 "a | b | c" 形式的类型描述中取出枚举值 */
export function enumValues(p: PropMeta): string[] | null {
  return /^[A-Za-z0-9]+( \| [A-Za-z0-9]+)+$/.test(p.type) ? p.type.split(" | ") : null
}

export const CATEGORY_LABEL: Record<ComponentCategory, string> = {
  layout: "布局",
  display: "展示",
  container: "容器",
  input: "交互",
}
