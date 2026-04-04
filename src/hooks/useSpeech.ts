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

export type SpeechStatus = 'idle' | 'fetching' | 'playing' | 'error'

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('idle')
  
  // Single audio instance for consistent authorization on iOS
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null)
  
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  useEffect(() => {
    // Create a single audio instance once
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

  // Call this function inside a User Click event handler
  const init = useCallback(() => {
    if (audioInstanceRef.current) {
      // Play a short silent blip to "unmute" the element on iOS
      audioInstanceRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      audioInstanceRef.current.play().then(() => {
        audioInstanceRef.current?.pause()
      }).catch(e => console.warn('Audio init failed:', e))
    }
  }, [])

  const fetchAudioBlob = async (text: string, speed: number, lang: string): Promise<Blob | null> => {
    if (!OPENAI_API_KEY) {
      setStatus('error')
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
      if (!response.ok) throw new Error('OpenAI API Error')
      const blob = await response.blob()
      await dbSet(cacheKey, blob)
      return blob
    } catch (e) {
      console.error('Audio fetch failed:', e)
      setStatus('error')
      return null
    }
  }

  const prefetch = useCallback(async (text: string, lang: string, speed: number = 1.0) => {
    await fetchAudioBlob(text, speed, lang)
  }, [OPENAI_API_KEY])

  const speak = useCallback(async (text: string, lang: string, speed: number = 1.0, title?: string): Promise<void> => {
    if (!audioInstanceRef.current) return

    // Important for iOS: 
    // We already "primed" audioInstanceRef in init(), 
    // but the following fetch is async. 
    // Usually even with async it works IF we stay on the same element.
    
    setStatus('fetching')
    const blob = await fetchAudioBlob(text, speed, lang)
    if (!blob) {
      setStatus('error')
      return
    }

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
    setStatus('playing')

    return new Promise((resolve) => {
      const handleEnd = () => {
        URL.revokeObjectURL(url)
        setStatus('idle')
        resolve()
      }
      const handleError = () => {
        setStatus('error')
        resolve()
      }
      
      audio.onended = handleEnd
      audio.onerror = handleError
      audio.onplay = () => setStatus('playing')
      
      audio.play().catch((e) => {
        console.error('Playback block:', e)
        setStatus('error')
        resolve()
      })
    })
  }, [OPENAI_API_KEY])

  return { speak, prefetch, init, status, voicesReady: !!OPENAI_API_KEY }
}

