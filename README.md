# A2UI 渐进学习

一个帮助你**渐进式**理解 [A2UI（Agent-to-UI）协议](https://a2ui.org/) 的交互式学习站点。
技术栈：React 19 + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui。

## 运行

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 产物输出到 dist/
```

## 内容

- **11 个章节**（入门 → 进阶 → 深入），每章都有实时演示、要点回顾和小测验，学习进度保存在浏览器本地：
  1. 为什么需要 A2UI · 2. 第一个 Surface · 3. 组件与邻接表 · 4. 流式渐进渲染
  5. 数据模型与绑定 · 6. 模板与动态列表 · 7. 双向绑定与 Action · 8. 函数与校验
  9. Catalog 与安全边界 · 10. 完整生命周期（订餐助手） · 11. 传输、版本与生态
- **Playground**：内置 43 个官方 v0.9.1 示例，可编辑、流式发送或在当前状态上追加消息。
- **组件画廊**：basic catalog 全部 18 个组件的属性表与实时示例。

## 目录结构

```
src/
  a2ui/                 独立实现的 A2UI v0.9 / v0.9.1 渲染器
    processor.ts        消息处理与校验（createSurface / updateComponents / updateDataModel / deleteSurface）
    pointer.ts          JSON Pointer + 模板相对路径
    evaluate.ts         动态值、basic catalog 函数、formatString、checks
    catalog.ts          basic catalog 元数据 + 自定义 travel catalog 示例
    use-a2ui.ts         React hook：客户端状态、消息日志、action 回传
    react/              组件渲染（用 shadcn/ui 作为“原生组件”）
  components/learn/     教学用组件（代码块、消息编辑器、检查器、测验……）
  lessons/              各章节内容
  pages/                首页、Playground、组件画廊
  data/                 官方示例（来自 a2ui-project/a2ui，Apache 2.0）
```

## 说明

内容依据 a2ui.org 公开文档与 [A2UI v0.9.1 规范](https://github.com/a2ui-project/a2ui/tree/main/specification/v0_9_1) 整理；
组件属性以官方 `catalog.json` 为准。本站为非官方学习项目，渲染器是独立实现，仅用于教学。
