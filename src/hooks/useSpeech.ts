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

export function useSpeech() {
  const [voicesReady, setVoicesReady] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  useEffect(() => {
    setVoicesReady(!!OPENAI_API_KEY)
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [OPENAI_API_KEY])

  const fetchAudioBlob = async (text: string, speed: number, lang: string): Promise<Blob | null> => {
    if (!OPENAI_API_KEY) return null
    const cacheKey = `tts_${lang}_${speed}_${text}`
    
    // Check Cache first
    const cached = await dbGet(cacheKey)
    if (cached) return cached

    // Fetch from OpenAI
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: lang.startsWith('en') ? 'alloy' : 'nova', // alloy for EN, nova for JA (more natural)
          speed: speed,
        }),
      })
      if (!response.ok) throw new Error('OpenAI API Error')
      const blob = await response.blob()
      
      // Save to Cache
      await dbSet(cacheKey, blob)
      return blob
    } catch (e) {
      console.error('Audio fetch failed:', e)
      return null
    }
  }

  const prefetch = useCallback(async (text: string, lang: string, speed: number = 1.0) => {
    await fetchAudioBlob(text, speed, lang)
  }, [OPENAI_API_KEY])

  const speak = useCallback(async (text: string, lang: string, speed: number = 1.0, title?: string): Promise<void> => {
    const blob = await fetchAudioBlob(text, speed, lang)
    if (!blob) return

    // Setup Media Session (Lock Screen)
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || text,
        artist: 'English YouTube Phrase App',
        album: lang.startsWith('en') ? 'English Pronunciation' : 'Japanese Translation',
      })
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audioRef.current = audio

    return new Promise((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      audio.onerror = () => resolve()
      audio.play().catch(() => resolve())
    })
  }, [OPENAI_API_KEY])

  return { speak, prefetch, voicesReady }
}

