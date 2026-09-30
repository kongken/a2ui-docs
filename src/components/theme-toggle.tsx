import { Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme } = useTheme()
  const toggle = () => {
    const dark = document.documentElement.classList.contains("dark")
    setTheme(dark ? "light" : "dark")
  }
  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="切换深色模式">
      <Sun className="hidden dark:block" />
      <Moon className="dark:hidden" />
    </Button>
  )
}
