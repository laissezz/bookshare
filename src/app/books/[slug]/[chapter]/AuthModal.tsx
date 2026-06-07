'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onSuccess: (userId: string, nickname: string) => void
  onClose: () => void
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [step, setStep] = useState<'email' | 'nickname'>('email')
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
      const { data: reader } = await supabase
        .from('readers')
        .select('nickname')
        .eq('id', data.user.id)
        .single()
      onSuccess(data.user.id, reader?.nickname ?? '독자')
      return
    }

    // 새 계정 → 닉네임 입력 단계로
    setStep('nickname')
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!nickname.trim()) return
    setLoading(true)
    setError('')

    const normalizedEmail = email.trim().toLowerCase()

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedEmail,
    })

    if (signUpErr || !data.user) {
      setError('가입에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setLoading(false)
      return
    }

    const { error: readerErr } = await supabase.from('readers').insert({
      id: data.user.id,
      nickname: nickname.trim(),
      email: normalizedEmail,
    })

    if (readerErr) {
      setError('계정 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
      setLoading(false)
      return
    }

    onSuccess(data.user.id, nickname.trim())
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
        {step === 'email' ? (
          <>
            <div className="text-2xl mb-2">🖊️</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">하이라이트하려면 가입이 필요해요</h2>
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              닉네임과 이메일만 입력하면 됩니다.<br />
              어느 기기에서든 내 기록이 유지됩니다.
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
                className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '확인 중...' : '계속하기'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="text-2xl mb-2">👋</div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">처음 오셨군요!</h2>
            <p className="text-sm text-gray-500 mb-5">
              <span className="text-gray-700 font-medium">{email}</span><br />
              사용하실 닉네임을 정해주세요.
            </p>
            <form onSubmit={handleSignUp} className="space-y-3">
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
                disabled={loading || !nickname.trim()}
                className="w-full bg-amber-400 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-500 disabled:opacity-50 transition-colors"
              >
                {loading ? '가입 중...' : '가입하기'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('email'); setError('') }}
                className="w-full text-sm text-gray-400 hover:text-gray-600 py-1 transition-colors"
              >
                ← 이메일 다시 입력
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
