import { useState, useEffect, useCallback, useRef } from 'react'

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // API Key from environment variable
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices()
      if (v.length > 0) {
        setVoices(v)
      }
    }
    
    loadVoices()
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const getBestVoiceFallback = useCallback((lang: string) => {
    const availableVoices = voices.filter(v => v.lang.startsWith(lang))
    if (availableVoices.length === 0) return null
    if (lang.startsWith('en')) {
      return availableVoices.find(v => v.name.includes('Google US English')) ||
             availableVoices.find(v => v.name.includes('Samantha')) ||
             availableVoices[0]
    }
    if (lang.startsWith('ja')) {
      // Kyoko (Premium) is the most natural for Japanese on Mac/iOS
      return availableVoices.find(v => v.name.includes('Kyoko')) ||
             availableVoices.find(v => v.name.includes('O-ren')) ||
             availableVoices.find(v => v.name.includes('Google 日本語')) ||
             availableVoices[0]
    }
    return availableVoices[0]
  }, [voices])

  const speakOpenAI = async (text: string, speed: number = 1.0): Promise<boolean> => {
    if (!OPENAI_API_KEY) return false

    try {
      if (audioRef.current) {
        audioRef.current.pause()
      }

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy', // Alloy is great for EN
          speed: speed,
        }),
      })

      if (!response.ok) throw new Error('OpenAI API Error')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const audio = new Audio(url)
      audioRef.current = audio
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(url)
          resolve(true)
        }
        audio.onerror = () => resolve(false)
        audio.play().catch(() => resolve(false))
      })
    } catch (e) {
      console.error('OpenAI TTS failed:', e)
      return false
    }
  }

  const speakBrowser = useCallback((text: string, lang: string, speed: number = 1.0): Promise<void> => {
    return new Promise((resolve) => {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      const voice = getBestVoiceFallback(lang)
      if (voice) utterance.voice = voice
      
      // Fine-tune browser rate: 
      // 0.95-1.1 is natural for Japanese Kyoko
      utterance.rate = speed * (lang.startsWith('en') ? 0.95 : 1.05)
      
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      speechSynthesis.speak(utterance)
    })
  }, [getBestVoiceFallback])

  const speak = useCallback(async (text: string, lang: string, speed: number = 1.0): Promise<void> => {
    // Japanese: Always use browser (Kyoko is better than OpenAI's multilingual shimmer)
    if (lang.startsWith('ja')) {
      await speakBrowser(text, lang, speed)
      return
    }

    // English: Try OpenAI first
    const success = await speakOpenAI(text, speed)
    
    // Fallback to browser if OpenAI fails or key is missing
    if (!success) {
      await speakBrowser(text, lang, speed)
    }
  }, [speakBrowser, OPENAI_API_KEY])

  return { speak, voicesReady: voices.length > 0 || !!OPENAI_API_KEY }
}

