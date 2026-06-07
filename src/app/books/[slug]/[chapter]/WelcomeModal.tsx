'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const STORAGE_KEY = 'dalkkak_welcome_shown'

export default function WelcomeModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const shown = localStorage.getItem(STORAGE_KEY)
    if (!shown) setOpen(true)
  }, [])

  function close() {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open) return null

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 99999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={close}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="text-2xl mb-1">📖</div>
          <h2 className="text-lg font-bold text-gray-900">읽기 전에 잠깐요!</h2>
          <p className="text-sm text-gray-500 mt-1">이 플랫폼의 기능을 소개해 드릴게요.</p>
        </div>

        {/* 기능 목록 */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">

          <div className="flex gap-3">
            <span className="text-xl shrink-0">✨</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">간편 가입</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                닉네임과 이메일만 입력하면 됩니다. 비밀번호 없이 이메일로 언제든 다시 로그인할 수 있어요.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl shrink-0">📱</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">어디서든 내 기록</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                같은 이메일로 로그인하면 모바일·PC 어느 기기에서든 내 하이라이트가 그대로 유지됩니다.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl shrink-0">🖊️</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">문장 하이라이트</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                마음에 드는 문장을 클릭하면 하이라이트됩니다. 처음 클릭 시 <strong>닉네임·이메일 가입</strong>이 필요하며, 이후 어느 기기에서든 내 기록이 유지됩니다. 다른 독자들이 많이 표시한 문장도 볼 수 있어요.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl shrink-0">📄</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">페이지 보기 모드</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                오른쪽 상단 ⚙ 설정에서 <strong>읽기 방식 → 페이지</strong>로 바꾸면 책처럼 넘겨 읽을 수 있습니다. 1페이지·2페이지 레이아웃을 선택할 수 있어요.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl shrink-0">💬</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">문장에 공감글 남기기</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                하이라이트한 문장을 다시 클릭하면 팝업이 뜹니다. <strong>이 문장에 공감글 남기기</strong>로 짧은 생각을 기록하면 다른 독자들도 볼 수 있어요.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl shrink-0">✏️</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">독서 후기 게시판</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                책 소개 페이지의 <strong>독서 후기 보기·남기기</strong>에서 다른 독자들의 감상을 보고 내 후기도 남길 수 있습니다.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="text-xl shrink-0">⚙️</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">다양한 읽기 설정</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                글자 크기, 줄 간격, 테마(라이트·세피아·다크), 폰트 등을 자유롭게 조절할 수 있습니다.
              </p>
            </div>
          </div>

        </div>

        {/* 하단 버튼 */}
        <div className="px-6 pb-6 pt-2">
          <button
            onClick={close}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
          >
            읽기 시작 →
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
