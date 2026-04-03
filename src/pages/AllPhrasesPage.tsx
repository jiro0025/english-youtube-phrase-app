import { useEffect } from 'react'
import { usePhrases } from '../hooks/usePhrases'
import { useSpeech } from '../hooks/useSpeech'

interface Props {
  userId: string
}

export default function AllPhrasesPage({ userId }: Props) {
  const { phrases, loading, fetchAll } = usePhrases(userId)
  const { speak } = useSpeech()

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation()
    speak(text, 'en-US')
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
        <h1 className="page-title">All Phrases</h1>
        <p className="page-subtitle">登録済みフレーズ一覧</p>
      </div>

      {phrases.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <div className="empty-title">フレーズがありません</div>
          <div className="empty-text">Add Phrase や Data Import で登録してください</div>
        </div>
      ) : (
        <>
          <div className="stats-badge">📊 全 {phrases.length}件</div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Audio</th>
                  <th>Phrase</th>
                  <th>Meaning</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {phrases.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <button 
                        className="icon-btn" 
                        onClick={(e) => handleSpeak(e, p.phrase)}
                        title="再生"
                      >
                        🔊
                      </button>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.phrase}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{p.meaning}</td>
                    <td>{p.is_learned ? '✅' : '📖'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
