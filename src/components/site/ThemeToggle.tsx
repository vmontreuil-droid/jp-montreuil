'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'dark' | 'light'

type Props = {
  labelLight: string  // "Mode clair" / "Lichte modus"
  labelDark: string   // "Mode sombre" / "Donkere modus"
}

export default function ThemeToggle({ labelLight, labelDark }: Props) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Sync met huidige html-class (gezet door inline-script in layout vóór paint)
    const isLight = document.documentElement.classList.contains('light')
    setTheme(isLight ? 'light' : 'dark')
    setMounted(true)
  }, [])

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
    try {
      localStorage.setItem('theme', next)
    } catch {
      // localStorage niet beschikbaar — voorkeur geldt enkel deze sessie
    }
  }

  // Tijdens SSR/eerste render: render niets om hydration mismatch te vermijden
  if (!mounted) {
    return (
      <span
        aria-hidden="true"
        className="inline-block w-[34px] h-[34px] border border-(--color-frame) rounded-sm"
      />
    )
  }

  const Icon = theme === 'dark' ? Sun : Moon
  const label = theme === 'dark' ? labelLight : labelDark

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-[34px] h-[34px] border border-(--color-frame) text-(--color-stone) hover:text-(--color-ink) transition-colors rounded-sm"
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}
