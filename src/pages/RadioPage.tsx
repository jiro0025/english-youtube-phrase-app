import { useEffect, useState, useCallback, useRef } from 'react'
import { usePhrases } from '../hooks/usePhrases'
import type { Phrase } from '../hooks/usePhrases'
import { useSpeech } from '../hooks/useSpeech'

interface Props {
  userId: string
}

type PlayState = 'idle' | 'playing' | 'paused'

export default function RadioPage({ userId }: Props) {
  const { phrases, loading, fetchUnlearned } = usePhrases(userId)
  const { speak } = useSpeech()
  const [limit, setLimit] = useState(10)
  const [playState, setPlayState] = useState<PlayState>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentStep, setCurrentStep] = useState<'en1' | 'en2' | 'ja'>('en1')
  const [displayPhrase, setDisplayPhrase] = useState('')
  const [displayMeaning, setDisplayMeaning] = useState('')

  const playStateRef = useRef(playState)
  const cancelRef = useRef(false)

  useEffect(() => {
    fetchUnlearned()
  }, [fetchUnlearned])

  useEffect(() => {
    playStateRef.current = playState
  }, [playState])

  const cleanText = (text: string) => {
    return text.replace(/\s*\[\d+(?:,\s*\d+)*\]\s*/g, '').trim()
  }

  const delay = (ms: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (cancelRef.current) {
          reject(new Error('cancelled'))
        } else {
          resolve()
        }
      }, ms)

      // Check if cancelled during delay
      const check = setInterval(() => {
        if (cancelRef.current) {
          clearTimeout(timer)
          clearInterval(check)
          reject(new Error('cancelled'))
        }
      }, 100)

      // Clear interval when timer resolves
      setTimeout(() => clearInterval(check), ms + 50)
    })
  }

  const playSequence = useCallback(async (targetPhrases: Phrase[]) => {
    cancelRef.current = false

    for (let i = 0; i < targetPhrases.length; i++) {
      if (cancelRef.current) break

      const p = targetPhrases[i]
      const phrase = cleanText(p.phrase)
      const meaning = cleanText(p.meaning || '意味なし')

      setCurrentIndex(i)
      setDisplayPhrase(phrase)
      setDisplayMeaning('')

      try {
        // English #1
        setCurrentStep('en1')
        await speak(phrase, 'en-US')
        await delay(500)

        if (cancelRef.current) break

        // English #2
        setCurrentStep('en2')
        await speak(phrase, 'en-US')
        await delay(700)

        if (cancelRef.current) break

        // Japanese
        setCurrentStep('ja')
        setDisplayMeaning(meaning)
        await speak(meaning, 'ja-JP')
        await delay(1200)
      } catch (e) {
        if (e instanceof Error && e.message === 'cancelled') break
        // Continue for other errors
      }
    }

    setPlayState('idle')
    setDisplayPhrase('')
    setDisplayMeaning('')
  }, [speak])

  const handlePlay = () => {
    if (playState === 'playing') {
      // Pause
      speechSynthesis.pause()
      setPlayState('paused')
      return
    }

    if (playState === 'paused') {
      // Resume
      speechSynthesis.resume()
      setPlayState('playing')
      return
    }

    // Start
    const target = phrases.slice(0, limit)
    if (target.length === 0) return

    setPlayState('playing')
    setCurrentIndex(0)
    playSequence(target)
  }

  const handleStop = () => {
    cancelRef.current = true
    speechSynthesis.cancel()
    setPlayState('idle')
    setDisplayPhrase('')
    setDisplayMeaning('')
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
      </div>
    )
  }

  const targetCount = Math.min(limit, phrases.length)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Radio Mode 📻</h1>
        <p className="page-subtitle">英語×2 → 日本語×1 で連続再生</p>
      </div>

      {phrases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-title">再生するフレーズがありません</div>
          <div className="empty-text">すべて学習済みです</div>
        </div>
      ) : (
        <>
          {playState === 'idle' && (
            <>
              <div className="stats-badge">📚 {phrases.length}件の対象フレーズ</div>
              {phrases.length > 1 && (
                <div className="slider-wrapper">
                  <div className="slider-label">
                    <span>再生件数</span>
                    <span>{limit}件</span>
                  </div>
                  <input
                    className="slider-input"
                    type="range"
                    min={1}
                    max={phrases.length}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  />
                </div>
              )}
            </>
          )}

          <div className="radio-player">
            {playState !== 'idle' && (
              <div className="radio-current">
                <div className="radio-phrase" style={{
                  color: currentStep === 'ja' ? 'var(--accent-secondary)' : 'var(--text-primary)',
                }}>
                  {displayPhrase}
                </div>
                <div className="radio-meaning">
                  {displayMeaning}
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${((currentIndex + 1) / targetCount) * 100}%` }}
                  />
                </div>
                <div className="radio-counter">
                  {currentIndex + 1} / {targetCount}
                  {' — '}
                  {currentStep === 'en1' && '🔊 English (1st)'}
                  {currentStep === 'en2' && '🔊 English (2nd)'}
                  {currentStep === 'ja' && '🇯🇵 Japanese'}
                </div>
              </div>
            )}

            <div className="radio-controls">
              {playState !== 'idle' && (
                <button className="radio-btn radio-btn-secondary" onClick={handleStop}>
                  ⏹
                </button>
              )}
              <button className="radio-btn radio-btn-play" onClick={handlePlay}>
                {playState === 'playing' ? '⏸' : '▶'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
