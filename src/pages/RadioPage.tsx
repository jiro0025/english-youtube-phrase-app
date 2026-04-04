import { useEffect, useState, useCallback, useRef } from 'react'
import { usePhrases } from '../hooks/usePhrases'
import type { Phrase } from '../hooks/usePhrases'
import { useSpeech } from '../hooks/useSpeech'

interface Props {
  userId: string
}

type PlayState = 'idle' | 'playing' | 'paused'

export default function RadioPage({ userId }: Props) {
  const { phrases, loading, fetchUnlearned, markAsLearned } = usePhrases(userId)
  const { speak } = useSpeech()
  
  const [mode, setMode] = useState<'radio' | 'list'>('radio')
  const [speed, setSpeed] = useState(1.0)
  const [limit, setLimit] = useState(10)
  const [playState, setPlayState] = useState<PlayState>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPhraseId, setCurrentPhraseId] = useState<string | null>(null)
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
      }, ms / speed) // Adjust delay based on speed

      const check = setInterval(() => {
        if (cancelRef.current) {
          clearTimeout(timer)
          clearInterval(check)
          reject(new Error('cancelled'))
        }
      }, 50)
      setTimeout(() => clearInterval(check), (ms / speed) + 50)
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
      setCurrentPhraseId(p.id)
      setDisplayPhrase(phrase)
      setDisplayMeaning('')

      try {
        // English #1
        setCurrentStep('en1')
        await speak(phrase, 'en-US', speed)
        await delay(500)

        if (cancelRef.current) break

        // English #2
        setCurrentStep('en2')
        await speak(phrase, 'en-US', speed)
        await delay(700)

        if (cancelRef.current) break

        // Japanese
        setCurrentStep('ja')
        setDisplayMeaning(meaning)
        await speak(meaning, 'ja-JP', speed)
        await delay(1200)
      } catch (e) {
        if (e instanceof Error && e.message === 'cancelled') break
      }
    }

    setPlayState('idle')
    setCurrentPhraseId(null)
    setDisplayPhrase('')
    setDisplayMeaning('')
  }, [speak, speed])

  const handlePlay = () => {
    if (playState === 'playing') {
      speechSynthesis.pause()
      setPlayState('paused')
      return
    }
    if (playState === 'paused') {
      speechSynthesis.resume()
      setPlayState('playing')
      return
    }
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
    setCurrentPhraseId(null)
    setDisplayPhrase('')
    setDisplayMeaning('')
  }

  const handleQuickCheck = async (id: string) => {
    await markAsLearned(id)
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
        <div className="mode-tabs">
          <button 
            className={`mode-tab ${mode === 'radio' ? 'active' : ''}`} 
            onClick={() => { handleStop(); setMode('radio') }}
          >
            Radio
          </button>
          <button 
            className={`mode-tab ${mode === 'list' ? 'active' : ''}`} 
            onClick={() => { handleStop(); setMode('list') }}
          >
            Check List
          </button>
        </div>
      </div>

      {phrases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-title">対象フレーズがありません</div>
          <div className="empty-text">すべて学習済みです</div>
        </div>
      ) : mode === 'radio' ? (
        <>
          {playState === 'idle' && (
            <div className="settings-panel">
              <div className="stats-badge">📚 {phrases.length}件の対象</div>
              
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

              <div className="slider-wrapper">
                <div className="slider-label">
                  <span>再生速度</span>
                  <span>{speed.toFixed(1)}x</span>
                </div>
                <input
                  className="slider-input"
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                />
              </div>
            </div>
          )}

          <div className="radio-player">
            {playState !== 'idle' && (
              <div className="radio-current">
                <button 
                  className="quick-check-btn" 
                  onClick={() => currentPhraseId && handleQuickCheck(currentPhraseId)}
                >
                  ✅ Learned
                </button>
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
      ) : (
        <div className="check-list-mode">
          <div className="settings-panel">
            <div className="slider-wrapper">
              <div className="slider-label">
                <span>再生速度</span>
                <span>{speed.toFixed(1)}x</span>
              </div>
              <input
                className="slider-input"
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="list-container">
            {phrases.map((p) => (
              <div key={p.id} className="list-card">
                <div className="list-card-content">
                  <div className="list-card-phrase">{p.phrase}</div>
                  <div className="list-card-meaning">{p.meaning}</div>
                </div>
                <div className="list-card-actions">
                  <button className="icon-btn" onClick={() => speak(p.phrase, 'en-US', speed)}>
                    🔊
                  </button>
                  <button className="icon-btn check" onClick={() => markAsLearned(p.id)}>
                    ✅
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

