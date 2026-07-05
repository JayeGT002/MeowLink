import { useEffect, useCallback } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { ThemeMode } from '@/lib/types'

const themeCycle: ThemeMode[] = ['light', 'dark']

const themeIcon: Record<ThemeMode, React.ElementType> = {
  light: Sun,
  dark: Moon,
  system: Moon,
}

const themeLabel: Record<ThemeMode, string> = {
  light: '浅色模式',
  dark: '深色模式',
  system: '跟随系统',
}

interface ThemeToggleProps {
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const theme = useStore((s) => s.theme)
  const setTheme = useStore((s) => s.setTheme)

  const cycleTheme = useCallback(() => {
    const currentIndex = themeCycle.indexOf(theme)
    if (currentIndex >= 0) {
      const next = themeCycle[(currentIndex + 1) % themeCycle.length]
      setTheme(next)
    } else {
      // 如果当前是 system，切到 light
      setTheme('light')
    }
  }, [theme, setTheme])

  // 同步主题到 document.documentElement 的 dark class
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      // system: 跟随系统偏好
      const mq = window.matchMedia('(prefers-color-scheme: dark)')

      const apply = (e: MediaQueryListEvent | MediaQueryList) => {
        if (e.matches) {
          root.classList.add('dark')
        } else {
          root.classList.remove('dark')
        }
      }

      apply(mq)

      mq.addEventListener('change', apply)
      return () => {
        mq.removeEventListener('change', apply)
      }
    }
  }, [theme])

  const displayTheme: ThemeMode = theme === 'system' ? 'dark' : theme
  const Icon = themeIcon[displayTheme]
  const label = themeLabel[theme]

  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="icon"
          onClick={cycleTheme}
          className={cn('h-8 w-8', className)}
          aria-label={`切换主题，当前：${label}`}
        >
          <Icon className="h-[1.1rem] w-[1.1rem]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
