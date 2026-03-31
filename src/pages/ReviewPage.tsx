import { useEffect, useState } from 'react'
import { usePhrases } from '../hooks/usePhrases'

interface Props {
  userId: string
}

export default function ReviewPage({ userId }: Props) {
  const { phrases, loading, fetchUnlearned, markAsLearned } = usePhrases(userId)
  const [celebrateId, setCelebrateId] = useState<string | null>(null)

  useEffect(() => {
    fetchUnlearned()
  }, [fetchUnlearned])

  const handleLearn = async (id: string) => {
    setCelebrateId(id)
    setTimeout(async () => {
      await markAsLearned(id)
      setCelebrateId(null)
    }, 600)
  }

  const buildYoutubeUrl = (url: string, timestamp: number) => {
    if (!url) return null
    let finalUrl = url
    if (timestamp > 0) {
      if (url.includes('youtu.be')) {
        finalUrl += `?t=${timestamp}`
      } else if (url.includes('?')) {
        finalUrl += `&t=${timestamp}`
      } else {
        finalUrl += `?t=${timestamp}`
      }
    }
    return finalUrl
  }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Review Mode</h1>
        <p className="page-subtitle">未学習のフレーズを復習しましょう</p>
      </div>

      {phrases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎉</div>
          <div className="empty-title">すべて学習済み！</div>
          <div className="empty-text">復習するフレーズはありません</div>
        </div>
      ) : (
        <>
          <div className="stats-badge">📚 {phrases.length}件の未学習フレーズ</div>
          {phrases.map((phrase) => (
            <div
              key={phrase.id}
              className="card"
              style={{
                transition: 'all 0.4s ease',
                opacity: celebrateId === phrase.id ? 0 : 1,
                transform: celebrateId === phrase.id ? 'scale(0.9) translateY(-20px)' : 'none',
              }}
            >
              <div className="card-phrase">{phrase.phrase}</div>
              <div className="card-meaning">{phrase.meaning}</div>
              <div className="card-actions">
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleLearn(phrase.id)}
                >
                  ✅ Learned
                </button>
                {phrase.youtube_url && (
                  <a
                    href={buildYoutubeUrl(phrase.youtube_url, phrase.timestamp) || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-link"
                  >
                    ▶ Watch Video
                  </a>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
