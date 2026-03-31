import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export interface Phrase {
  id: string
  user_id: string
  phrase: string
  meaning: string
  youtube_url: string
  timestamp: number
  is_learned: boolean
  created_at: string
}

export function usePhrases(userId: string | null) {
  const [phrases, setPhrases] = useState<Phrase[]>([])
  const [loading, setLoading] = useState(false)

  const fetchUnlearned = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('phrases')
        .select('*')
        .eq('user_id', userId)
        .eq('is_learned', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      setPhrases(data || [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('phrases')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPhrases(data || [])
    } finally {
      setLoading(false)
    }
  }, [userId])

  const addPhrase = useCallback(async (phrase: string, meaning: string, youtubeUrl: string, timestamp: number) => {
    if (!userId) return
    const { error } = await supabase
      .from('phrases')
      .insert({
        user_id: userId,
        phrase,
        meaning,
        youtube_url: youtubeUrl || '',
        timestamp,
      })
    if (error) throw error
  }, [userId])

  const markAsLearned = useCallback(async (phraseId: string) => {
    if (!userId) return
    const { error } = await supabase
      .from('phrases')
      .update({ is_learned: true })
      .eq('id', phraseId)
      .eq('user_id', userId)

    if (error) throw error
    setPhrases((prev) => prev.filter((p) => p.id !== phraseId))
  }, [userId])

  const importPhrases = useCallback(async (records: { phrase: string; meaning: string }[]) => {
    if (!userId || records.length === 0) return
    const rows = records.map((r) => ({
      user_id: userId,
      phrase: r.phrase,
      meaning: r.meaning,
      youtube_url: '',
      timestamp: 0,
    }))
    const { error } = await supabase.from('phrases').insert(rows)
    if (error) throw error
  }, [userId])

  const clearAll = useCallback(async () => {
    if (!userId) return
    const { error } = await supabase
      .from('phrases')
      .delete()
      .eq('user_id', userId)
    if (error) throw error
    setPhrases([])
  }, [userId])

  const resetProgress = useCallback(async () => {
    if (!userId) return
    const { error } = await supabase
      .from('phrases')
      .update({ is_learned: false })
      .eq('user_id', userId)
    if (error) throw error
  }, [userId])

  const deleteLearned = useCallback(async () => {
    if (!userId) return
    const { error } = await supabase
      .from('phrases')
      .delete()
      .eq('is_learned', true)
      .eq('user_id', userId)
    if (error) throw error
  }, [userId])

  return {
    phrases,
    loading,
    fetchUnlearned,
    fetchAll,
    addPhrase,
    markAsLearned,
    importPhrases,
    clearAll,
    resetProgress,
    deleteLearned,
  }
}
