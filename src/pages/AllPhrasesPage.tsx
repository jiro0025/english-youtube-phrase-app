import { useEffect } from 'react'
import { usePhrases } from '../hooks/usePhrases'

interface Props {
  userId: string
}

export default function AllPhrasesPage({ userId }: Props) {
  const { phrases, loading, fetchAll } = usePhrases(userId)

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

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
                  <th>Phrase</th>
                  <th>Meaning</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {phrases.map((p) => (
                  <tr key={p.id}>
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
