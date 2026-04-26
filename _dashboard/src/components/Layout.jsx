import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'

const STORAGE_KEY = 'mybaby-dashboard-theme'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function Layout() {
  const loc = useLocation()
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => (t === 'light' ? 'dark' : 'light'))
  }, [])

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-6 px-6 py-3" style={{ background: 'var(--mantle)' }}>
        <Link to="/" className="text-lg font-bold" style={{ color: 'var(--blue)' }}>
          MyBaby Sprint Dashboard
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link
            to="/"
            className={loc.pathname === '/' ? 'font-semibold underline' : 'opacity-70 hover:opacity-100'}
          >
            Roadmap
          </Link>
        </nav>
        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Dunkles Design aktivieren' : 'Helles Design aktivieren'}
          className="ml-auto flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-base"
          style={{ background: 'var(--surface0)', color: 'var(--subtext0)' }}
          title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
        >
          {theme === 'light' ? '\u263D' : '\u2600'}
        </button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
