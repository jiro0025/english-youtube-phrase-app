import { useState } from 'react'
import { usePhrases } from '../hooks/usePhrases'

interface Props {
  userId: string
}

export default function AddPhrasePage({ userId }: Props) {
  const { addPhrase } = usePhrases(userId)
  const [phrase, setPhrase] = useState('')
  const [meaning, setMeaning] = useState('')
  const [url, setUrl] = useState('')
  const [timestamp, setTimestamp] = useState(0)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phrase.trim()) {
      setMessage({ text: 'フレーズを入力してください', type: 'error' })
      return
    }
    setLoading(true)
    try {
      await addPhrase(phrase.trim(), meaning.trim(), url.trim(), timestamp)
      setMessage({ text: `追加しました: ${phrase}`, type: 'success' })
      setPhrase('')
      setMeaning('')
      setUrl('')
      setTimestamp(0)
    } catch (e) {
      setMessage({ text: `エラー: ${e}`, type: 'error' })
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Add Phrase</h1>
        <p className="page-subtitle">新しいフレーズを登録</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">English Phrase</label>
            <input
              id="add-phrase"
              className="form-input"
              type="text"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="e.g. piece of cake"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Meaning (Japanese)</label>
            <input
              id="add-meaning"
              className="form-input"
              type="text"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              placeholder="e.g. 朝飯前"
            />
          </div>
          <div className="form-group">
            <label className="form-label">YouTube URL</label>
            <input
              id="add-url"
              className="form-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtu.be/..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Timestamp (seconds)</label>
            <input
              id="add-timestamp"
              className="form-input"
              type="number"
              min={0}
              value={timestamp}
              onChange={(e) => setTimestamp(Number(e.target.value))}
            />
          </div>
          <button
            id="add-submit"
            className="btn btn-primary btn-block"
            type="submit"
            disabled={loading}
          >
            {loading ? '追加中…' : '✨ Add Phrase'}
          </button>
        </form>
      </div>
    </div>
  )
}
