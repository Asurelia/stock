import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-muted" role="group" aria-label="Sélection du thème">
      <Button
        variant={theme === 'light' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme('light')}
        aria-label="Mode clair"
        aria-pressed={theme === 'light'}
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant={theme === 'dark' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme('dark')}
        aria-label="Mode sombre"
        aria-pressed={theme === 'dark'}
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant={theme === 'system' ? 'default' : 'ghost'}
        size="icon"
        className="h-8 w-8"
        onClick={() => setTheme('system')}
        aria-label="Thème automatique (suit les préférences système)"
        aria-pressed={theme === 'system'}
      >
        <Monitor className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
