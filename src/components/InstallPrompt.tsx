import { useState, useEffect } from 'react'

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone)

    if (isStandalone) return

    // Check if dismissed recently
    const dismissed = localStorage.getItem('install-prompt-dismissed')
    if (dismissed) {
      const dismissedAt = new Date(dismissed)
      const hoursSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60)
      if (hoursSince < 24) return
    }

    // Detect iOS
    const ua = navigator.userAgent
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(isIOSDevice)

    // Show after a brief delay
    const timer = setTimeout(() => setShowPrompt(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  const dismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('install-prompt-dismissed', new Date().toISOString())
  }

  if (!showPrompt) return null

  return (
    <div className="install-prompt">
      <div className="install-prompt-text">
        <strong>📱 アプリとして追加</strong>
        <span>
          {isIOS
            ? 'Safari の 共有ボタン → 「ホーム画面に追加」でアプリ化できます'
            : 'ブラウザメニューから「ホーム画面に追加」でアプリ化できます'
          }
        </span>
      </div>
      <button className="install-prompt-close" onClick={dismiss}>✕</button>
    </div>
  )
}
