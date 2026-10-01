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
- **Playground**：内置 v0.9.1 与 v1.0 各 43 个官方示例，可编辑、流式发送或在当前状态上追加消息。
- **组件画廊**：basic catalog 全部 18 个组件的属性表与实时示例（随版本切换）。
- **版本对比**：v0.9 ↔ v1.0 差异一览、迁移助手，以及 v1.0 新能力演示（双向 RPC、ValidationResult、@index、混用 catalog 与组合约束）。

## 协议版本

页头的开关可在 **v0.9**（含 v0.9.1，当前稳定版）与 **v1.0**（候选版）之间切换，选择会保存在浏览器本地：

- 渲染器同时实现两个版本，按每条消息的 `version` 字段路由到对应规则；
- 课程示例按 v0.9 编写，切到 v1.0 时由 `src/a2ui/convert.ts` 自动转换为地道的 v1.0 写法
  （标题改用 Markdown、移除 theme、删除改为 `value: null`、领域组件自带 `catalogId` 等）；
- 各章在版本差异处有提示，点击即可切换版本查看。

## 目录结构

```
src/
  a2ui/                 独立实现的 A2UI 渲染器（v0.9 / v0.9.1 / v1.0）
    processor.ts        消息处理与校验：按 version 路由；含 v1.0 的 RPC、混用 catalog、组合约束
    convert.ts          v0.9 → v1.0 消息转换
    pointer.ts          JSON Pointer + 模板相对路径
    evaluate.ts         动态值、basic catalog 函数、formatString、checks、ValidationResult、@index、远程函数
    catalog.ts          两个版本的 basic catalog 元数据 + 自定义 catalog 示例
    use-a2ui.ts         React hook：客户端状态、消息日志、action / callAgentFunction 回传
    react/              组件渲染（用 shadcn/ui 作为“原生组件”）
  components/learn/     教学用组件（代码块、消息编辑器、检查器、测验……）
  lessons/              各章节内容
  pages/                首页、Playground、组件画廊
  data/                 官方示例 v0.9.1 与 v1.0（来自 a2ui-project/a2ui，Apache 2.0）
```

## 说明

内容依据 a2ui.org 公开文档与 A2UI [v0.9.1](https://github.com/a2ui-project/a2ui/tree/main/specification/v0_9_1)、[v1.0](https://github.com/a2ui-project/a2ui/tree/main/specification/v1_0) 规范整理；
组件属性以官方 `catalog.json` 为准。本站为非官方学习项目，渲染器是独立实现，仅用于教学。
