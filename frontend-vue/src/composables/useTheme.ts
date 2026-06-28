import { ref, readonly } from 'vue'

type Theme = 'light' | 'dark'

const theme = ref<Theme>('light')

function apply(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  try {
    localStorage.setItem('gj2-theme', t)
  } catch {
    // ignore em contextos sem storage
  }
  theme.value = t
}

function init() {
  let saved: Theme | null = null
  try {
    const stored = localStorage.getItem('gj2-theme')
    if (stored === 'dark' || stored === 'light') saved = stored
  } catch {
    // ignore
  }

  if (saved) {
    apply(saved)
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    apply('dark')
  } else {
    apply('light')
  }
}

// inicializa uma vez na primeira importação
init()

export function useTheme() {
  function toggle() {
    apply(theme.value === 'dark' ? 'light' : 'dark')
  }

  function setTheme(t: Theme) {
    apply(t)
  }

  return {
    theme: readonly(theme),
    toggle,
    setTheme,
  }
}
