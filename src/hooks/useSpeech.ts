import { useState, useEffect, useCallback } from 'react'

export function useSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

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
  }, [])

  const getBestVoice = useCallback((lang: string) => {
    const availableVoices = voices.filter(v => v.lang.startsWith(lang))
    if (availableVoices.length === 0) return null

    // For English: Prefer "Google" voices, then "Samantha" (iOS), then "Siri" or "Alex"
    if (lang.startsWith('en')) {
      return availableVoices.find(v => v.name.includes('Google US English')) ||
             availableVoices.find(v => v.name.includes('Samantha')) ||
             availableVoices.find(v => v.name.includes('Siri')) ||
             availableVoices.find(v => v.name.includes('Alex')) ||
             availableVoices[0]
    }
    
    // For Japanese: Prefer "Google", then "Kyoko", then "Otoya"
    if (lang.startsWith('ja')) {
      return availableVoices.find(v => v.name.includes('Google 日本語')) ||
             availableVoices.find(v => v.name.includes('Kyoko')) ||
             availableVoices.find(v => v.name.includes('Otoya')) ||
             availableVoices[0]
    }

    return availableVoices[0]
  }, [voices])

  const speak = useCallback((text: string, lang: string): Promise<void> => {
    return new Promise((resolve) => {
      // Cancel any ongoing speech to avoid overlapping
      speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      
      const voice = getBestVoice(lang)
      if (voice) {
        utterance.voice = voice
      }

      // Voice tuning
      if (lang.startsWith('en')) {
        utterance.rate = 0.95
        utterance.pitch = 1.0
      } else {
        utterance.rate = 1.1 // Japanese is often clearer slightly faster
        utterance.pitch = 1.0
      }

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve() // Continue even on error

      speechSynthesis.speak(utterance)
    })
  }, [getBestVoice])

  return { speak, voicesReady: voices.length > 0 }
}
