import { useState, useEffect, useCallback, useRef } from 'react'

// --- IndexedDB Cache Helper ---
const DB_NAME = 'EnglishAppAudioCacheV4'
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
        console.log('Audio Bridge Initialized')
      }).catch(e => {
        console.warn('Audio init failed:', e)
        setErrorDetail('Init Error: ' + e.message)
      })
    }
  }, [])

  const fetchAudioBlob = async (text: string, lang: string): Promise<Blob | null> => {
    const langCode = lang.split('-')[0]
    const cacheKey = `bridge_tts_${langCode}_${text}`
    
    const cached = await dbGet(cacheKey)
    if (cached) return cached

    try {
      setStatus('fetching')
      // Vercel Proxy API Endpoint
      const url = `/api/tts?q=${encodeURIComponent(text)}&l=${langCode}`
      
      const response = await fetch(url)
      if (!response.ok) throw new Error(`Server Error: ${response.status}`)
      
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

  const prefetch = useCallback(async (text: string, lang: string) => {
    await fetchAudioBlob(text, lang)
  }, [])

  const speak = useCallback(async (text: string, lang: string, speed: number = 1.0, title?: string): Promise<void> => {
    if (!audioInstanceRef.current) return

    setStatus('fetching')
    const blob = await fetchAudioBlob(text, lang)
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
    audio.playbackRate = speed

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url)
        setStatus('idle')
        resolve()
      }
      audio.onerror = () => {
        setStatus('error')
        setErrorDetail('Playback Error: source file check')
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

  const stop = useCallback(() => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause()
      setStatus('idle')
    }
  }, [])

  return { speak, prefetch, init, stop, status, errorDetail, voicesReady: true }
}
