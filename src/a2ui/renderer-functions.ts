// v1.0：允许 Agent 通过 callRendererFunction 调用的渲染器函数（见 DEVICE_CATALOG_V1）
// 是否允许调用由 catalog 中的 allowedCallers 决定，这里只负责执行

const IMPLS: Record<string, (args: Record<string, unknown>) => unknown> = {
  getDeviceInfo: () => ({
    viewport: [window.innerWidth, window.innerHeight],
    pixelRatio: window.devicePixelRatio,
    language: navigator.language,
    touch: navigator.maxTouchPoints > 0,
  }),
  getColorScheme: () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
}

export function runRendererFunction(name: string, args: Record<string, unknown>): unknown {
  const impl = IMPLS[name]
  if (!impl) throw new Error(`渲染器没有 ${name} 的实现`)
  return impl(args)
}
