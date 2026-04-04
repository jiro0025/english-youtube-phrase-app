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
  const { speak, prefetch, init, stop, status } = useSpeech()
  
  const [mode, setMode] = useState<'radio' | 'list'>('radio')
  const [speed, setSpeed] = useState(1.0)
  const [limit, setLimit] = useState(10)
  const [playState, setPlayState] = useState<PlayState>('idle')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPhraseId, setCurrentPhraseId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'en1' | 'en2' | 'ja'>('en1')
  const [displayPhrase, setDisplayPhrase] = useState('')
  const [displayMeaning, setDisplayMeaning] = useState('')

  const phrasesRef = useRef<Phrase[]>([])
  const currentIndexRef = useRef(0)
  const stopRequestedRef = useRef(false)
  const silentAudioRef = useRef<HTMLAudioElement | null>(null)

  // 10秒無音ループ（プロセス維持用）
  useEffect(() => {
    const silentSrc = 'data:audio/mpeg;base64,SUQzBAAAAAABAFRYWFhYAAAADAAAY29udGVudAB0eXBlAGF1ZGlvL21wZWdB/++MYxAAAAANIAAAAAExBTUUzLjk4LjIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+MYxQAAP8AAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+MYxQsAP8AAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+MYxRMAP8AAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/'
    const audio = new Audio(silentSrc)
    audio.loop = true
    silentAudioRef.current = audio
    return () => audio.pause()
  }, [])

  useEffect(() => {
    fetchUnlearned()
  }, [fetchUnlearned])

  useEffect(() => {
    phrasesRef.current = phrases.slice(0, limit)
  }, [phrases, limit])

  const cleanText = (text: string) => {
    return text.replace(/\s*\[\d+(?:,\s*\d+)*\]\s*/g, '').trim()
  }

  // --- 再生ロジックの刷新: 1フレーズごとの「数珠つなぎ」方式 ---

  const playPhrase = useCallback(async (index: number) => {
    if (stopRequestedRef.current || index >= phrasesRef.current.length) {
      setPlayState('idle')
      if (silentAudioRef.current) silentAudioRef.current.pause()
      return
    }

    const p = phrasesRef.current[index]
    const phrase = cleanText(p.phrase)
    const meaning = cleanText(p.meaning || '')

    setCurrentIndex(index)
    setCurrentPhraseId(p.id)
    setDisplayPhrase(phrase)
    setDisplayMeaning('')

    // 次のフレーズをバックグラウンドで先読み（通信切れ対策）
    if (index + 1 < phrasesRef.current.length) {
      const nextP = phrasesRef.current[index + 1]
      prefetch(cleanText(nextP.phrase), 'en-US')
      prefetch(cleanText(nextP.meaning), 'ja-JP')
    }

    try {
      // Step 1: English #1
      setCurrentStep('en1')
      await speak(phrase, 'en-US', speed, `🔊 ${phrase}`)
      if (stopRequestedRef.current) throw 'stopped'
      await new Promise(r => setTimeout(r, 600 / speed))

      // Step 2: English #2
      setCurrentStep('en2')
      await speak(phrase, 'en-US', speed, `🔊 ${phrase} (2nd)`)
      if (stopRequestedRef.current) throw 'stopped'
      await new Promise(r => setTimeout(r, 800 / speed))

      // Step 3: Japanese
      setCurrentStep('ja')
      setDisplayMeaning(meaning)
      await speak(meaning, 'ja-JP', speed, `🇯🇵 ${meaning}`)
      if (stopRequestedRef.current) throw 'stopped'
      await new Promise(r => setTimeout(r, 1200 / speed))

      // --- NEXT PHRASE ---
      if (!stopRequestedRef.current) {
        playPhrase(index + 1)
      }
    } catch (e) {
      console.log('Playback interrupted or error:', e)
    }
  }, [speak, prefetch, speed])

  const handlePlay = useCallback(() => {
    init() // iOSオーディオ初期化
    if (silentAudioRef.current) silentAudioRef.current.play().catch(() => {})

    if (playState === 'playing') {
      stopRequestedRef.current = true
      setPlayState('paused')
      stop()
      return
    }

    stopRequestedRef.current = false
    setPlayState('playing')
    
    const startIndex = (playState === 'paused') ? currentIndexRef.current : 0
    playPhrase(startIndex)
  }, [init, playState, playPhrase, stop])

  const handleStop = useCallback(() => {
    stopRequestedRef.current = true
    stop()
    if (silentAudioRef.current) silentAudioRef.current.pause()
    setPlayState('idle')
    setCurrentPhraseId(null)
    setDisplayPhrase('')
    setDisplayMeaning('')
  }, [stop])

  const handleQuickCheck = async (id: string) => {
    await markAsLearned(id)
  }

  const targetCount = phrasesRef.current.length

  return (
    <div className="radio-container">
      <div className="page-header">
        <h1 className="page-title">Radio Mode 📻</h1>
        <div className="mode-tabs">
          <button className={`mode-tab ${mode === 'radio' ? 'active' : ''}`} onClick={() => { handleStop(); setMode('radio') }}>Radio</button>
          <button className={`mode-tab ${mode === 'list' ? 'active' : ''}`} onClick={() => { handleStop(); setMode('list') }}>Check List</button>
        </div>
      </div>

      {phrases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-title">対象フレーズがありません</div>
        </div>
      ) : mode === 'radio' ? (
        <>
          {playState === 'idle' && (
            <div className="settings-panel">
              <div className="stats-badge">📚 {phrases.length}件の対象</div>
              <div className="slider-wrapper">
                <div className="slider-label"><span>再生件数</span><span>{limit}件</span></div>
                <input className="slider-input" type="range" min={1} max={phrases.length} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
              </div>
              <div className="slider-wrapper">
                <div className="slider-label"><span>再生速度</span><span>{speed.toFixed(1)}x</span></div>
                <input className="slider-input" type="range" min={0.5} max={2.0} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              </div>
            </div>
          )}

          <div className="radio-player">
            {playState !== 'idle' && (
              <div className="radio-current">
                <button className="quick-check-btn" onClick={() => currentPhraseId && handleQuickCheck(currentPhraseId)}>✅ Learned</button>
                <div className="radio-phrase" style={{ color: currentStep === 'ja' ? 'var(--accent-secondary)' : 'var(--text-primary)' }}>{displayPhrase}</div>
                <div className="radio-meaning">{displayMeaning}</div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${((currentIndex + 1) / targetCount) * 100}%` }} /></div>
                <div className="radio-counter">
                  {currentIndex + 1} / {targetCount}
                  {status !== 'idle' && (
                    <span className={`status-tag status-${status}`}>
                      {status === 'fetching' && '⏳ Fetching'}
                      {status === 'playing' && '🔊 Playing'}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="radio-controls">
              {playState !== 'idle' && <button className="radio-btn radio-btn-secondary" onClick={handleStop}>⏹</button>}
              <button className="radio-btn radio-btn-play" onClick={handlePlay}>{playState === 'playing' ? '⏸' : '▶'}</button>
            </div>
          </div>
        </>
      ) : (
        <div className="check-list-mode">
          <div className="list-container">
            {phrases.map((p) => (
              <div key={p.id} className="list-card">
                <div className="list-card-content">
                  <div className="list-card-phrase">{p.phrase}</div>
                  <div className="list-card-meaning">{p.meaning}</div>
                </div>
                <div className="list-card-actions">
                  <button className="icon-btn" onClick={() => { init(); speak(p.phrase, 'en-US', speed); }}>🔊</button>
                  <button className="icon-btn check" onClick={() => markAsLearned(p.id)}>✅</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="debug-dashboard">
        <h3 className="debug-title">⚙️ Playback Logic: Daisy Chain</h3>
        <p className="debug-hint">💡 フレーズを数珠つなぎで再生する新方式に切り替えました。バックグラウンドでの安定性が向上しています。</p>
      </div>
    </div>
  )
}
