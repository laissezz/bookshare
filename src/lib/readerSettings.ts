export interface ReaderSettings {
  theme: 'light' | 'sepia' | 'dark'
  brightness: number
  fontSize: number
  lineHeight: number
  letterSpacing: number
  contentWidth: 'narrow' | 'normal' | 'wide'
  fontFamily: 'serif' | 'sans'
  viewMode: 'scroll' | 'page'
  pageSpread: 1 | 2
}

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  brightness: 100,
  fontSize: 18,
  lineHeight: 1.9,
  letterSpacing: 0,
  contentWidth: 'normal',
  fontFamily: 'serif',
  viewMode: 'scroll',
  pageSpread: 1,
}

export const THEMES = {
  light: { bg: '#ffffff', text: '#1a1a1a', defaultBrightness: 100 },
  sepia: { bg: '#f5f0e8', text: '#3b2f1e', defaultBrightness: 100 },
  dark:  { bg: '#1a1a1a', text: '#e8e3d8', defaultBrightness: 85 },
}

export const WIDTH_MAP = {
  narrow: '520px',
  normal: '680px',
  wide:   '800px',
}

export function loadSettings(): ReaderSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const saved = localStorage.getItem('reader_settings')
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
  } catch {}
  return DEFAULT_SETTINGS
}

export function saveSettings(s: ReaderSettings) {
  localStorage.setItem('reader_settings', JSON.stringify(s))
}
