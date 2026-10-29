import React, { createContext, useContext, useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState { theme: Theme; setTheme: (t: Theme) => void; isDark: boolean }
const ThemeContext = createContext<ThemeState>({ theme: 'system', setTheme: () => {}, isDark: false })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() =>
    (localStorage.getItem('pantry-theme') as Theme) ?? 'system'
  )

  const isDark = theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('pantry-theme', theme)
  }, [theme, isDark])

  const setTheme = (t: Theme) => setThemeState(t)

  return <ThemeContext.Provider value={{ theme, setTheme, isDark }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
