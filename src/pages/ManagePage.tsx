import { useState } from 'react'
import { usePhrases } from '../hooks/usePhrases'

interface Props {
  userId: string
}

export default function ManagePage({ userId }: Props) {
  const { clearAll, resetProgress, deleteLearned } = usePhrases(userId)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleReset = async () => {
    try {
      await resetProgress()
      setMessage({ text: 'すべてのフレーズを「未学習」に戻しました', type: 'success' })
    } catch (e) {
      setMessage({ text: `エラー: ${e}`, type: 'error' })
    }
  }

  const handleDeleteAll = async () => {
    if (!confirmDelete) return
    try {
      await clearAll()
      setMessage({ text: 'すべてのデータを削除しました', type: 'success' })
      setConfirmDelete(false)
    } catch (e) {
      setMessage({ text: `エラー: ${e}`, type: 'error' })
    }
  }

  const handleDeleteLearned = async () => {
    try {
      await deleteLearned()
      setMessage({ text: '学習済みフレーズを削除しました', type: 'success' })
    } catch (e) {
      setMessage({ text: `エラー: ${e}`, type: 'error' })
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Manage Data ⚙️</h1>
        <p className="page-subtitle">データの管理・リセット</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px', fontWeight: 600 }}>📖 学習済みフレーズの削除</div>
        <div className="danger-item-desc">学習済みのフレーズのみを削除します。未学習のデータはそのまま残ります。</div>
        <button className="btn btn-secondary btn-sm" onClick={handleDeleteLearned}>
          Delete Learned Phrases
        </button>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ marginBottom: '8px', fontWeight: 600 }}>🔄 学習進捗のリセット</div>
        <div className="danger-item-desc">全てのフレーズを「未学習」に戻します。データは削除されません。</div>
        <button className="btn btn-secondary btn-sm" onClick={handleReset}>
          Reset Progress
        </button>
      </div>

      <div className="danger-zone">
        <div className="danger-zone-title">⚠️ Danger Zone</div>

        <div className="danger-item">
          <div className="danger-item-title">全データ削除</div>
          <div className="danger-item-desc">
            すべてのデータを削除します。この操作は取り消せません。
          </div>
          <label className="checkbox-wrapper">
            <input
              className="checkbox-input"
              type="checkbox"
              checked={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.checked)}
            />
            I understand the consequences
          </label>
          <button
            className="btn btn-danger btn-sm"
            onClick={handleDeleteAll}
            disabled={!confirmDelete}
          >
            🗑 Delete ALL Phrases
          </button>
        </div>
      </div>
    </div>
  )
}
