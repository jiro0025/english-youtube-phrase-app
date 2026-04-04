import { useState, useEffect, useCallback, useRef } from 'react'

// --- IndexedDB Cache Helper ---
// 無料版でも、何度も同じ通信をしないようにキャッシュは残しておきます。
const DB_NAME = 'EnglishAppAudioCacheFree'
const STORE_NAME = 'audio_blobs'

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

const dbGet = async (key: string): Promise<Blob | null> => {
  const db = await openDB()
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => resolve(null)
  })
}

const dbSet = async (key: string, blob: Blob): Promise<void> => {
  const db = await openDB()
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(blob, key)
    transaction.oncomplete = () => resolve()
  })
}

export type SpeechStatus = 'idle' | 'fetching' | 'playing' | 'error'

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [errorDetail, setErrorDetail] = useState<string>('')
  
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioInstanceRef.current) {
      audioInstanceRef.current = new Audio()
    }
    return () => {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause()
        audioInstanceRef.current = null
      }
    }
  }, [])

  const init = useCallback(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      audioInstanceRef.current.play().then(() => {
        audioInstanceRef.current?.pause()
        console.log('Free Audio Engine Initialized')
      }).catch(e => {
        console.warn('Audio init failed:', e)
        setErrorDetail('Init Error: ' + e.message)
      })
    }
  }, [])

  const fetchAudioBlob = async (text: string, lang: string): Promise<Blob | null> => {
    const langCode = lang.split('-')[0] // en-US -> en, ja-JP -> ja
    const cacheKey = `g_tts_${langCode}_${text}`
    
    const cached = await dbGet(cacheKey)
    if (cached) return cached

    try {
      setStatus('fetching')
      // Google TTS 非公式APIエンドポイント
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error('Google TTS Failed')
      
      const blob = await response.blob()
      await dbSet(cacheKey, blob)
      return blob
    } catch (e: any) {
      console.error('Google Audio fetch failed:', e)
      // fetchがCORS等で失敗した場合はnullを返し、speak側で直接URLを指定する
      return null
    }
  }

  const prefetch = useCallback(async (text: string, lang: string) => {
    await fetchAudioBlob(text, lang)
  }, [])

  const speak = useCallback(async (text: string, lang: string, speed: number = 1.0, title?: string): Promise<void> => {
    if (!audioInstanceRef.current) return

    setStatus('fetching')
    const langCode = lang.split('-')[0]
    let url: string
    
    // キャッシュを試みる
    const blob = await fetchAudioBlob(text, lang)
    if (blob) {
      url = URL.createObjectURL(blob)
    } else {
      // Fetchが失敗（CORSなど）した場合は、直接GoogleのURLをsrcに入れる
      // これにより、キャッシュは効かないが再生は可能になる
      url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${langCode}&client=tw-ob`
    }

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || text,
        artist: 'English YouTube Phrase App (Free Mode)',
        album: lang.startsWith('en') ? 'English' : 'Japanese',
      })
    }

    const audio = audioInstanceRef.current
    audio.src = url
    audio.playbackRate = speed // 再生速度の設定

    return new Promise((resolve) => {
      audio.onended = () => {
        if (blob) URL.revokeObjectURL(url)
        setStatus('idle')
        resolve()
      }
      audio.onerror = () => {
        setStatus('error')
        setErrorDetail('Playback Error: invalid source')
        resolve()
      }
      audio.onplay = () => setStatus('playing')
      
      audio.play().catch(e => {
        console.error('Play blocked:', e)
        setStatus('error')
        setErrorDetail('Playback Blocked: iOS Gesture restriction')
        resolve()
      })
    })
  }, [])

  return { speak, prefetch, init, status, errorDetail, voicesReady: true }
}
