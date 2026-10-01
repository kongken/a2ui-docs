import { NavLink, useLocation } from "react-router-dom"
import { ArrowUpRight, CircleCheck, FlaskConical, GitCompareArrows, House, LayoutGrid } from "lucide-react"

import { Progress } from "@/components/ui/progress"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { useProgress } from "@/hooks/use-progress"
import { useProtocolVersion } from "@/hooks/use-protocol-version"
import { LESSONS } from "@/lessons/meta"

const EXTERNAL = [
  { label: "a2ui.org 官网", href: "https://a2ui.org/" },
  { label: "GitHub · 规范源码", href: "https://github.com/a2ui-project/a2ui" },
  { label: "A2UI Composer", href: "https://a2ui-composer.ag-ui.com/" },
]

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="2" width="28" height="28" rx="8" className="fill-primary" />
      <rect x="8" y="8" width="7" height="7" rx="2" className="fill-primary-foreground" />
      <rect x="17" y="8" width="7" height="7" rx="2" className="fill-primary-foreground/50" />
      <rect x="8" y="17" width="16" height="7" rx="2" className="fill-primary-foreground/80" />
    </svg>
  )
}

export function AppSidebar() {
  const { done } = useProgress()
  const { version } = useProtocolVersion()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()
  const close = () => setOpenMobile(false)
  const completed = LESSONS.filter((l) => done.has(l.slug)).length

  return (
    <Sidebar>
      <SidebarHeader>
        <NavLink to="/" onClick={close} className="flex items-center gap-2.5 px-2 py-1.5">
          <Logo className="size-7" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">A2UI 渐进学习</span>
            <span className="text-[11px] text-muted-foreground">Agent-to-UI 协议 · {version}</span>
          </div>
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <NavLink to="/" onClick={close}>
                    <House /> 首页 · 学习路线
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>学习路径</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {LESSONS.map((l, i) => {
                const path = `/learn/${l.slug}`
                return (
                  <SidebarMenuItem key={l.slug}>
                    <SidebarMenuButton asChild isActive={pathname === path}>
                      <NavLink to={path} onClick={close}>
                        <span className="w-4 shrink-0 text-center font-mono text-[11px] text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate">{l.title}</span>
                        {done.has(l.slug) && <CircleCheck className="ml-auto text-emerald-600 dark:text-emerald-400" />}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>动手实验</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/playground"}>
                  <NavLink to="/playground" onClick={close}>
                    <FlaskConical /> Playground
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/gallery"}>
                  <NavLink to="/gallery" onClick={close}>
                    <LayoutGrid /> 组件画廊
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/versions"}>
                  <NavLink to="/versions" onClick={close}>
                    <GitCompareArrows /> 版本对比 v0.9 ↔ v1.0
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>官方资源</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {EXTERNAL.map((e) => (
                <SidebarMenuItem key={e.href}>
                  <SidebarMenuButton asChild size="sm">
                    <a href={e.href} target="_blank" rel="noopener noreferrer">
                      <ArrowUpRight /> {e.label}
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex flex-col gap-2 rounded-lg border bg-background/60 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">学习进度</span>
            <span className="font-mono tabular-nums">
              {completed}/{LESSONS.length}
            </span>
          </div>
          <Progress value={(completed / LESSONS.length) * 100} className="h-1.5" />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
