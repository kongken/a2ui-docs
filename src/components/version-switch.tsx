import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useProtocolVersion } from "@/hooks/use-protocol-version"

export function VersionSwitch() {
  const { version, setVersion } = useProtocolVersion()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={version}
            onValueChange={(v) => v && setVersion(v as typeof version)}
            aria-label="A2UI 协议版本"
          >
            <ToggleGroupItem
              value="v0.9"
              className="px-2 font-mono text-xs data-[state=on]:bg-sky-500/15 data-[state=on]:font-semibold data-[state=on]:text-sky-700 dark:data-[state=on]:text-sky-300"
            >
              v0.9
            </ToggleGroupItem>
            <ToggleGroupItem
              value="v1.0"
              className="px-2 font-mono text-xs data-[state=on]:bg-violet-500/15 data-[state=on]:font-semibold data-[state=on]:text-violet-700 dark:data-[state=on]:text-violet-300"
            >
              v1.0
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-64">
        切换 A2UI 协议版本：所有演示消息、渲染器校验和相关说明都会随之切换。v0.9.1 为当前稳定版，v1.0 为候选版。
      </TooltipContent>
    </Tooltip>
  )
}
