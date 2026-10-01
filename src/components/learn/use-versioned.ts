import { useMemo } from "react"

import { convertMessages, useA2UI, type UseA2UIOptions } from "@/a2ui"
import { useProtocolVersion } from "@/hooks/use-protocol-version"

/** 课程演示用：按当前协议版本自动转换按 v0.9 编写的消息 */
export function useVersionedA2UI(options?: UseA2UIOptions) {
  const { version } = useProtocolVersion()
  return useA2UI({ ...options, convertTo: version })
}

/** 把按 v0.9 编写的消息转换为当前版本（用于展示） */
export function useConverted(messages: unknown[]) {
  const { version } = useProtocolVersion()
  return useMemo(() => convertMessages(messages, version), [messages, version])
}
