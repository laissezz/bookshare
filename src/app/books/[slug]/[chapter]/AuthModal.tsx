'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onSuccess: (userId: string, nickname: string) => void
  onClose: () => void
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<'nickname' | 'email'>('nickname')
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    // 기존 계정 로그인 시도
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedEmail,
    })

    if (!signInErr && data.user) {
      // 기존 계정 → 저장된 닉네임 사용
      const { data: reader } = await supabase
        .from('readers')
        .select('nickname')
        .eq('id', data.user.id)
        .single()
      onSuccess(data.user.id, reader?.nickname ?? (nickname.trim() || '독자'))
      return
    }

    // 새 계정 → 닉네임과 함께 가입
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedEmail,
    })

    if (signUpErr) {
      setError(`[Auth 오류] ${signUpErr.message}`)
      setLoading(false)
      return
    }

    if (!signUpData.user) {
      setError('[Auth 오류] 사용자 정보를 가져오지 못했습니다.')
      setLoading(false)
      return
    }

    // service role API로 readers 저장 (signUp 직후 RLS 세션 적용 전 우회)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: signUpData.user.id, nickname: nickname.trim(), email: normalizedEmail }),
    })

    if (!res.ok) {
      const resData = await res.json()
      setError(`[DB 오류] ${resData.error ?? '알 수 없는 오류'}`)
      setLoading(false)
      return
    }

    onSuccess(signUpData.user.id, nickname.trim())
  }

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        {step === 'nickname' ? (
          <>
            <div className="text-2xl mb-2">🖊️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">하이라이트하려면 가입이 필요해요</h2>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              닉네임과 이메일만 입력하면 됩니다.<br />
              어느 기기에서든 내 기록이 유지됩니다.
            </p>
            <form onSubmit={e => { e.preventDefault(); if (nickname.trim()) { setError(''); setStep('email') } }}
              className="space-y-3">
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="닉네임 (예: 독서광)"
                required
                maxLength={20}
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={!nickname.trim()}
                className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                계속하기
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-2xl mb-2">👋</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">반가워요, {nickname}님!</h2>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              이메일을 입력하면 어느 기기에서든<br />내 기록을 불러올 수 있어요.
            </p>
            <form onSubmit={handleEmail} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="이메일 주소"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-amber-400 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {loading ? '처리 중...' : '시작하기'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('nickname'); setError('') }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                ← 닉네임 다시 입력
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
