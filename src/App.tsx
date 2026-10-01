import { lazy, Suspense, useEffect, type ReactNode } from "react"
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom"
import { ArrowUpRight } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import { VersionSwitch } from "@/components/version-switch"
import { useProtocolVersion } from "@/hooks/use-protocol-version"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LESSON_PAGES } from "@/lessons"
import { LESSONS } from "@/lessons/meta"
import { HomePage } from "@/pages/home"

const PlaygroundPage = lazy(() =>
  import("@/pages/playground").then((m) => ({ default: m.PlaygroundPage }))
)
const GalleryPage = lazy(() =>
  import("@/pages/gallery").then((m) => ({ default: m.GalleryPage }))
)
const VersionsPage = lazy(() =>
  import("@/pages/versions").then((m) => ({ default: m.VersionsPage }))
)

function PageFallback() {
  return (
    <div className="mx-auto h-64 w-full max-w-5xl animate-pulse px-8 pt-10">
      <div className="h-full rounded-xl bg-muted/50" />
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return null
}

function PageTitle() {
  const { pathname } = useLocation()
  if (pathname === "/playground") return <>Playground</>
  if (pathname === "/gallery") return <>组件画廊</>
  if (pathname === "/versions") return <>版本对比 · v0.9 ↔ v1.0</>
  const slug = pathname.match(/^\/learn\/(.+)$/)?.[1]
  const idx = LESSONS.findIndex((l) => l.slug === slug)
  if (idx >= 0)
    return (
      <>
        <span className="text-muted-foreground">第 {idx + 1} 章 ·</span>{" "}
        {LESSONS[idx].title}
      </>
    )
  return <>学习路线</>
}

function LessonRoute() {
  const { slug = "" } = useParams()
  const { version } = useProtocolVersion()
  const Page = LESSON_PAGES[slug]
  if (!Page) return <Navigate to="/" replace />
  // 切换版本时重新挂载，所有演示按新版本重建
  return <Page key={`${slug}:${version}`} />
}

function Versioned({ children }: { children: (version: string) => ReactNode }) {
  const { version } = useProtocolVersion()
  return <>{children(version)}</>
}

export function App() {
  return (
    <HashRouter>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="min-w-0">
            <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur">
              <SidebarTrigger />
              <Separator
                orientation="vertical"
                className="mr-1 data-[orientation=vertical]:h-4"
              />
              <span className="truncate text-sm font-medium">
                <PageTitle />
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hidden sm:inline-flex"
                >
                  <a
                    href="https://a2ui.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    a2ui.org <ArrowUpRight />
                  </a>
                </Button>
                <VersionSwitch />
                <ThemeToggle />
              </div>
            </header>
            <ScrollToTop />
            <main className="min-w-0 flex-1">
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/learn/:slug" element={<LessonRoute />} />
                  <Route path="/playground" element={<Versioned>{(v) => <PlaygroundPage key={v} />}</Versioned>} />
                  <Route path="/gallery" element={<Versioned>{(v) => <GalleryPage key={v} />}</Versioned>} />
                  <Route path="/versions" element={<VersionsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </HashRouter>
  )
}

export default App
