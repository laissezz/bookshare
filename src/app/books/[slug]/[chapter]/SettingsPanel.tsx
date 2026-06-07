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

  const row = 'flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0'
  const label = 'text-sm text-gray-600 w-20 shrink-0'

  const panel = (
    <div
      ref={ref}
      className="fixed top-12 right-4 bg-white border border-gray-200 rounded-2xl shadow-xl w-80 p-4"
      style={{ zIndex: 9999 }}
    >
      {/* 테마 */}
      <div className={row}>
        <span className={label}>테마</span>
        <div className="flex gap-2">
          {(['light', 'sepia', 'dark'] as const).map(t => (
            <button
              key={t}
              onClick={() => update({ theme: t, brightness: THEMES[t].defaultBrightness })}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                settings.theme === t
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t === 'light' ? '라이트' : t === 'sepia' ? '세피아' : '다크'}
            </button>
          ))}
        </div>
      </div>

      {/* 밝기 */}
      <div className={row}>
        <span className={label}>밝기</span>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs text-gray-300">🌙</span>
          <input
            type="range"
            min={60}
            max={100}
            value={settings.brightness}
            onChange={e => update({ brightness: Number(e.target.value) })}
            className="flex-1 accent-amber-400"
          />
          <span className="text-xs text-gray-300">☀</span>
          <span className="text-xs text-gray-400 w-7 text-right">{settings.brightness}</span>
        </div>
      </div>

      {/* 글자 크기 */}
      <div className={row}>
        <span className={label}>글자 크기</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ fontSize: Math.max(14, settings.fontSize - 2) })}
            className="w-7 h-7 rounded border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center"
          >A-</button>
          <span className="text-sm w-10 text-center text-gray-700">{settings.fontSize}px</span>
          <button
            onClick={() => update({ fontSize: Math.min(24, settings.fontSize + 2) })}
            className="w-7 h-7 rounded border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center"
          >A+</button>
        </div>
      </div>

      {/* 줄 간격 */}
      <div className={row}>
        <span className={label}>줄 간격</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ lineHeight: Math.max(1.6, Math.round((settings.lineHeight - 0.1) * 10) / 10) })}
            className="w-7 h-7 rounded border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center"
          >−</button>
          <span className="text-sm w-10 text-center text-gray-700">{settings.lineHeight.toFixed(1)}</span>
          <button
            onClick={() => update({ lineHeight: Math.min(2.4, Math.round((settings.lineHeight + 0.1) * 10) / 10) })}
            className="w-7 h-7 rounded border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center"
          >+</button>
        </div>
      </div>

      {/* 글자 간격 */}
      <div className={row}>
        <span className={label}>글자 간격</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => update({ letterSpacing: Math.max(-0.5, Math.round((settings.letterSpacing - 0.5) * 10) / 10) })}
            className="w-7 h-7 rounded border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center"
          >−</button>
          <span className="text-sm w-10 text-center text-gray-700">{settings.letterSpacing}px</span>
          <button
            onClick={() => update({ letterSpacing: Math.min(2, Math.round((settings.letterSpacing + 0.5) * 10) / 10) })}
            className="w-7 h-7 rounded border border-gray-200 text-sm hover:bg-gray-50 flex items-center justify-center"
          >+</button>
        </div>
      </div>

      {/* 본문 너비 */}
      <div className={row}>
        <span className={label}>본문 너비</span>
        <div className="flex gap-2">
          {(['narrow', 'normal', 'wide'] as const).map(w => (
            <button
              key={w}
              onClick={() => update({ contentWidth: w })}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                settings.contentWidth === w
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {w === 'narrow' ? '좁게' : w === 'normal' ? '보통' : '넓게'}
            </button>
          ))}
        </div>
      </div>

      {/* 폰트 */}
      <div className={row}>
        <span className={label}>폰트</span>
        <div className="flex gap-2">
          {(['serif', 'sans'] as const).map(f => (
            <button
              key={f}
              onClick={() => update({ fontFamily: f })}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                settings.fontFamily === f
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f === 'serif' ? '명조' : '고딕'}
            </button>
          ))}
        </div>
      </div>

      {/* 읽기 방식 */}
      <div className={row}>
        <span className={label}>읽기 방식</span>
        <div className="flex gap-2">
          {(['scroll', 'page'] as const).map(v => (
            <button key={v} onClick={() => update({ viewMode: v })}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                settings.viewMode === v ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {v === 'scroll' ? '스크롤' : '페이지'}
            </button>
          ))}
        </div>
      </div>

      {/* 페이지 뷰 (페이지 모드일 때만) */}
      {settings.viewMode === 'page' && (
        <div className={row}>
          <span className={label}>페이지 수</span>
          <div className="flex gap-2">
            {([1, 2] as const).map(n => (
              <button key={n} onClick={() => update({ pageSpread: n })}
                className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                  settings.pageSpread === n ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                {n === 1 ? '1페이지' : '2페이지'}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={reset}
        className="w-full mt-3 text-xs text-gray-400 hover:text-gray-700 py-1.5 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
      >
        초기화
      </button>
    </div>
  )

  // Portal로 document.body에 직접 마운트 → 모든 stacking context / overflow 문제 우회
  return createPortal(panel, document.body)
}
