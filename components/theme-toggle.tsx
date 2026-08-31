'use client'

import { useEffect, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'invoice-theme'

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemPrefersDark())
  document.documentElement.classList.toggle('dark', dark)
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

/**
 * localStorage as an external store rather than state synced in an effect.
 *
 * The stored theme is not React state — it lives outside React, the server
 * cannot see it, and setting it from an effect is exactly the
 * render-then-correct pattern `react-hooks/set-state-in-effect` exists to
 * prevent. useSyncExternalStore is the primitive for "a value React
 * doesn't own", and it gives the SSR snapshot ('system') for free.
 */
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  // Keeps two open tabs in agreement.
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Private modes can throw; falling back to system is correct anyway.
  }
  return 'system'
}

function getServerSnapshot(): Theme {
  return 'system'
}

function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Non-fatal: the theme still applies for this page view.
  }
  applyTheme(theme)
  listeners.forEach((l) => l())
}

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: '☀' },
  { value: 'dark', label: 'Dark', icon: '☾' },
  { value: 'system', label: 'System', icon: '⌘' },
]

/**
 * Three-state, so "system" is a real choice rather than an unlabelled
 * default — the same shape as Appearance in macOS settings.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Following the OS while set to "system" means reacting to it changing,
  // not just reading it once. A genuine subscription, not state derivation.
  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex items-center gap-0.5 rounded-full bg-secondary p-0.5"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => setStoredTheme(o.value)}
          className={`flex size-7 items-center justify-center rounded-full text-[13px] transition-colors ${
            theme === o.value
              ? 'bg-surface text-foreground shadow-[var(--elevation-1)]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span aria-hidden>{o.icon}</span>
        </button>
      ))}
    </div>
  )
}
