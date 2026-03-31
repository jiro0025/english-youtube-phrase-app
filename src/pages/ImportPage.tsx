import { useState, useRef } from 'react'
import { usePhrases } from '../hooks/usePhrases'

interface Props {
  userId: string
}

interface CsvRow {
  [key: string]: string
}

export default function ImportPage({ userId }: Props) {
  const { importPhrases } = usePhrases(userId)
  const [csvData, setCsvData] = useState<CsvRow[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [phraseCol, setPhraseCol] = useState('')
  const [meaningCol, setMeaningCol] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const parseCsv = (text: string) => {
    const lines = text.split('\n').filter((l) => l.trim())
    if (lines.length < 2) throw new Error('CSVに2行以上のデータが必要です')

    const headers = lines[0].split(',').map((h) => h.trim())
    const rows: CsvRow[] = []

    for (let i = 1; i < lines.length; i++) {
      // Handle quoted CSV fields
      const values: string[] = []
      let current = ''
      let inQuotes = false
      for (const char of lines[i]) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())

      const row: CsvRow = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row)
    }

    return { headers, rows }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const { headers, rows } = parseCsv(text)
        setColumns(headers)
        setCsvData(rows)
        // Auto-select likely columns
        setPhraseCol(headers.find((h) => /phrase|英文|english/i.test(h)) || headers[1] || headers[0])
        setMeaningCol(headers.find((h) => /meaning|日本語|japanese/i.test(h)) || headers[2] || headers[0])
        setMessage({ text: `${rows.length}行のデータを読み込みました`, type: 'info' })
      } catch (err) {
        setMessage({ text: `エラー: ${err}`, type: 'error' })
      }
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!phraseCol || !meaningCol) {
      setMessage({ text: 'カラムを選択してください', type: 'error' })
      return
    }

    setLoading(true)
    try {
      const cleanText = (text: string) =>
        text.replace(/\s*\[\d+(?:,\s*\d+)*\]\s*/g, '').trim()

      const records = csvData.map((row) => ({
        phrase: cleanText(row[phraseCol] || ''),
        meaning: cleanText(row[meaningCol] || ''),
      })).filter((r) => r.phrase)

      await importPhrases(records)
      setMessage({ text: `${records.length}件のフレーズをインポートしました！`, type: 'success' })
      setCsvData([])
      setColumns([])
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      setMessage({ text: `エラー: ${e}`, type: 'error' })
    }
    setLoading(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Data Import</h1>
        <p className="page-subtitle">CSVファイルからフレーズを一括登録</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'} {message.text}
        </div>
      )}

      <div className="card">
        <div className="form-group">
          <label className="form-label">CSVファイルを選択</label>
          <input
            id="csv-upload"
            ref={fileRef}
            className="form-input"
            type="file"
            accept=".csv"
            onChange={handleFile}
            style={{ padding: '10px' }}
          />
        </div>

        {csvData.length > 0 && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Preview ({Math.min(5, csvData.length)}行)
              </strong>
              <div className="table-wrapper" style={{ marginTop: '8px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td key={col}>{row[col]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">English Phrase カラム</label>
              <select
                id="phrase-col"
                className="form-input"
                value={phraseCol}
                onChange={(e) => setPhraseCol(e.target.value)}
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Japanese Meaning カラム</label>
              <select
                id="meaning-col"
                className="form-input"
                value={meaningCol}
                onChange={(e) => setMeaningCol(e.target.value)}
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            <button
              id="import-submit"
              className="btn btn-primary btn-block"
              onClick={handleImport}
              disabled={loading}
            >
              {loading ? 'インポート中…' : `📥 ${csvData.length}件をインポート`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
