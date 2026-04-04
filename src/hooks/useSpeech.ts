import { useState, useEffect, useCallback, useRef } from 'react'

// --- IndexedDB Cache Helper ---
const DB_NAME = 'EnglishAppAudioCache'
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

export type SpeechStatus = 'idle' | 'fetching' | 'playing' | 'error' | 'key_missing'

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  const [errorDetail, setErrorDetail] = useState<string>('')
  
  // Single audio instance for consistent authorization on iOS
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null)
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

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
      // Authorizing audio context on user gesture
      audioInstanceRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      audioInstanceRef.current.play().then(() => {
        audioInstanceRef.current?.pause()
        console.log('Audio Device Initialized')
      }).catch(e => {
        console.warn('Audio init failed:', e)
        setErrorDetail('Init Error: ' + e.message)
      })
    }
  }, [])

  const fetchAudioBlob = async (text: string, speed: number, lang: string): Promise<Blob | null> => {
    if (!OPENAI_API_KEY) {
      setStatus('key_missing')
      setErrorDetail('VITE_OPENAI_API_KEY is not set in environment.')
      return null
    }

    const cacheKey = `tts_${lang}_${speed}_${text}`
    const cached = await dbGet(cacheKey)
    if (cached) return cached

    try {
      setStatus('fetching')
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: lang.startsWith('en') ? 'alloy' : 'nova',
          speed: speed,
        }),
      })
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}))
        throw new Error(`OpenAI Error: ${response.status} ${errJson.error?.message || ''}`)
      }
      const blob = await response.blob()
      await dbSet(cacheKey, blob)
      return blob
    } catch (e: any) {
      console.error('Audio fetch failed:', e)
      setStatus('error')
      setErrorDetail(e.message)
      return null
    }
  }

  const prefetch = useCallback(async (text: string, lang: string, speed: number = 1.0) => {
    await fetchAudioBlob(text, speed, lang)
  }, [OPENAI_API_KEY])

  const speak = useCallback(async (text: string, lang: string, speed: number = 1.0, title?: string): Promise<void> => {
    if (!audioInstanceRef.current) return

    setStatus('fetching')
    const blob = await fetchAudioBlob(text, speed, lang)
    if (!blob) return

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || text,
        artist: 'English YouTube Phrase App',
        album: lang.startsWith('en') ? 'English' : 'Japanese',
      })
    }

    const url = URL.createObjectURL(blob)
    const audio = audioInstanceRef.current
    audio.src = url

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setStatus('idle')
        resolve()
      }
      audio.onerror = () => {
        setStatus('error')
        setErrorDetail('Playback Error: invalid source')
        resolve()
      }
      audio.onplay = () => setStatus('playing')
      
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setStatus('playing')
        }).catch(e => {
          console.error('Play blocked:', e)
          setStatus('error')
          setErrorDetail('Playback Blocked: iOS Gesture restriction')
          resolve()
        })
      }
    })
  }, [OPENAI_API_KEY])

  return { speak, prefetch, init, status, errorDetail, voicesReady: !!OPENAI_API_KEY }
}
