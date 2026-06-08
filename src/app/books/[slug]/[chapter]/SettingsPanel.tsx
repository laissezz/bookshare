'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ReaderSettings,
  DEFAULT_SETTINGS,
  THEMES,
  saveSettings,
} from '@/lib/readerSettings'

interface Props {
  settings: ReaderSettings
  onChange: (s: ReaderSettings) => void
  onClose: () => void
}

export default function SettingsPanel({ settings, onChange, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handle), 0)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  function update(patch: Partial<ReaderSettings>) {
    const next = { ...settings, ...patch }
    onChange(next)
    saveSettings(next)
  }

  function reset() {
    onChange(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)
  }

  const isDark = settings.theme === 'dark'
  const panelBg    = isDark ? '#2a2a2a' : '#ffffff'
  const panelBorder = isDark ? '#3a3a3a' : '#e5e7eb'
  const rowBorder  = isDark ? '#333333' : '#f3f4f6'
  const textMain   = isDark ? '#e8e8e8' : '#4b5563'
  const textValue  = isDark ? '#d0d0d0' : '#374151'
  const btnBorder  = isDark ? '#444444' : '#e5e7eb'
  const btnText    = isDark ? '#cccccc' : '#4b5563'
  const btnHoverBg = isDark ? '#3a3a3a' : '#f9fafb'

  const row = 'flex items-center justify-between py-2.5 border-b last:border-0'
  const label = 'text-sm w-20 shrink-0'

  const panel = (
    <div
      ref={ref}
      className="fixed top-14 right-4 rounded-2xl shadow-xl w-80 p-4"
      style={{ zIndex: 9999, background: panelBg, border: `1px solid ${panelBorder}` }}
    >
      {/* 테마 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>테마</span>
        <div className="flex gap-2">
          {(['light', 'sepia', 'dark'] as const).map(t => (
            <button
              key={t}
              onClick={() => update({ theme: t, brightness: THEMES[t].defaultBrightness })}
              className="px-3 py-1 rounded-full text-xs border transition-colors"
              style={settings.theme === t
                ? { background: '#1f2937', color: 'white', borderColor: '#1f2937' }
                : { background: 'transparent', color: btnText, borderColor: btnBorder }}
            >
              {t === 'light' ? '라이트' : t === 'sepia' ? '세피아' : '다크'}
            </button>
          ))}
        </div>
      </div>

      {/* 밝기 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>밝기</span>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs" style={{ color: btnText }}>🌙</span>
          <input
            type="range"
            min={60}
            max={100}
            value={settings.brightness}
            onChange={e => update({ brightness: Number(e.target.value) })}
            className="flex-1 accent-amber-400"
          />
          <span className="text-xs" style={{ color: btnText }}>☀</span>
          <span className="text-xs w-7 text-right" style={{ color: btnText }}>{settings.brightness}</span>
        </div>
      </div>

      {/* 글자 크기 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>글자 크기</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ fontSize: Math.max(14, settings.fontSize - 2) })}
            className="w-7 h-7 rounded text-sm flex items-center justify-center transition-colors"
            style={{ border: `1px solid ${btnBorder}`, color: btnText, background: 'transparent' }}
          >A-</button>
          <span className="text-sm w-10 text-center" style={{ color: textValue }}>{settings.fontSize}px</span>
          <button
            onClick={() => update({ fontSize: Math.min(24, settings.fontSize + 2) })}
            className="w-7 h-7 rounded text-sm flex items-center justify-center transition-colors"
            style={{ border: `1px solid ${btnBorder}`, color: btnText, background: 'transparent' }}
          >A+</button>
        </div>
      </div>

      {/* 줄 간격 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>줄 간격</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ lineHeight: Math.max(1.6, Math.round((settings.lineHeight - 0.1) * 10) / 10) })}
            className="w-7 h-7 rounded text-sm flex items-center justify-center"
            style={{ border: `1px solid ${btnBorder}`, color: btnText, background: 'transparent' }}
          >−</button>
          <span className="text-sm w-10 text-center" style={{ color: textValue }}>{settings.lineHeight.toFixed(1)}</span>
          <button
            onClick={() => update({ lineHeight: Math.min(2.4, Math.round((settings.lineHeight + 0.1) * 10) / 10) })}
            className="w-7 h-7 rounded text-sm flex items-center justify-center"
            style={{ border: `1px solid ${btnBorder}`, color: btnText, background: 'transparent' }}
          >+</button>
        </div>
      </div>

      {/* 글자 간격 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>글자 간격</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ letterSpacing: Math.max(-0.5, Math.round((settings.letterSpacing - 0.5) * 10) / 10) })}
            className="w-7 h-7 rounded text-sm flex items-center justify-center"
            style={{ border: `1px solid ${btnBorder}`, color: btnText, background: 'transparent' }}
          >−</button>
          <span className="text-sm w-10 text-center" style={{ color: textValue }}>{settings.letterSpacing}px</span>
          <button
            onClick={() => update({ letterSpacing: Math.min(2, Math.round((settings.letterSpacing + 0.5) * 10) / 10) })}
            className="w-7 h-7 rounded text-sm flex items-center justify-center"
            style={{ border: `1px solid ${btnBorder}`, color: btnText, background: 'transparent' }}
          >+</button>
        </div>
      </div>

      {/* 본문 너비 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>본문 너비</span>
        <div className="flex gap-2">
          {(['narrow', 'normal', 'wide'] as const).map(w => (
            <button
              key={w}
              onClick={() => update({ contentWidth: w })}
              className="px-3 py-1 rounded-full text-xs border transition-colors"
              style={settings.contentWidth === w
                ? { background: '#1f2937', color: 'white', borderColor: '#1f2937' }
                : { background: 'transparent', color: btnText, borderColor: btnBorder }}
            >
              {w === 'narrow' ? '좁게' : w === 'normal' ? '보통' : '넓게'}
            </button>
          ))}
        </div>
      </div>

      {/* 폰트 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>폰트</span>
        <div className="flex gap-2">
          {(['serif', 'sans'] as const).map(f => (
            <button
              key={f}
              onClick={() => update({ fontFamily: f })}
              className="px-3 py-1 rounded-full text-xs border transition-colors"
              style={settings.fontFamily === f
                ? { background: '#1f2937', color: 'white', borderColor: '#1f2937' }
                : { background: 'transparent', color: btnText, borderColor: btnBorder }}
            >
              {f === 'serif' ? '명조' : '고딕'}
            </button>
          ))}
        </div>
      </div>

      {/* 읽기 방식 */}
      <div className={row} style={{ borderColor: rowBorder }}>
        <span className={label} style={{ color: textMain }}>읽기 방식</span>
        <div className="flex gap-2">
          {(['scroll', 'page'] as const).map(v => (
            <button key={v} onClick={() => update({ viewMode: v })}
              className="px-3 py-1 rounded-full text-xs border transition-colors"
              style={settings.viewMode === v
                ? { background: '#1f2937', color: 'white', borderColor: '#1f2937' }
                : { background: 'transparent', color: btnText, borderColor: btnBorder }}
            >
              {v === 'scroll' ? '스크롤' : '페이지'}
            </button>
          ))}
        </div>
      </div>

      {/* 페이지 뷰 (페이지 모드일 때만) */}
      {settings.viewMode === 'page' && (
        <div className={row} style={{ borderColor: rowBorder }}>
          <span className={label} style={{ color: textMain }}>페이지 수</span>
          <div className="flex gap-2">
            {([1, 2] as const).map(n => (
              <button key={n} onClick={() => update({ pageSpread: n })}
                className="px-3 py-1 rounded-full text-xs border transition-colors"
                style={settings.pageSpread === n
                  ? { background: '#1f2937', color: 'white', borderColor: '#1f2937' }
                  : { background: 'transparent', color: btnText, borderColor: btnBorder }}
              >
                {n === 1 ? '1페이지' : '2페이지'}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={reset}
        className="w-full mt-3 text-xs py-1.5 rounded-lg transition-colors"
        style={{ color: btnText, border: `1px solid ${rowBorder}`, background: 'transparent' }}
      >
        초기화
      </button>
    </div>
  )

  // Portal로 document.body에 직접 마운트 → 모든 stacking context / overflow 문제 우회
  return createPortal(panel, document.body)
}
