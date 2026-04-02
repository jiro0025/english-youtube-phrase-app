import { useState } from 'react'

interface LoginPageProps {
  login: (u: string, p: string) => Promise<{ success: boolean; message: string }>
  signup: (u: string, p: string) => Promise<{ success: boolean; message: string }>
}

export default function LoginPage({ login, signup }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setMessage({ text: 'ユーザー名とパスワードを入力してください', type: 'error' })
      return
    }
    setLoading(true)
    const result = await login(username, password)
    if (!result.success) {
      setMessage({ text: result.message, type: 'error' })
    }
    setLoading(false)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password || !confirmPassword) {
      setMessage({ text: '全ての項目を入力してください', type: 'error' })
      return
    }
    if (password !== confirmPassword) {
      setMessage({ text: 'パスワードが一致しません', type: 'error' })
      return
    }
    if (password.length < 4) {
      setMessage({ text: 'パスワードは4文字以上にしてください', type: 'error' })
      return
    }
    setLoading(true)
    const result = await signup(username, password)
    setMessage({
      text: result.message,
      type: result.success ? 'success' : 'error',
    })
    if (result.success) {
      setActiveTab('login')
      setPassword('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-logo">📖</div>
      <h1 className="login-title">Phrase Manager</h1>
      <p className="login-subtitle">YouTubeで学んだ英語フレーズを管理</p>

      <div className="login-card">
        <div className="tabs">
          <button
            className={`tab${activeTab === 'login' ? ' active' : ''}`}
            onClick={() => { setActiveTab('login'); setMessage(null) }}
          >
            ログイン
          </button>
          <button
            className={`tab${activeTab === 'signup' ? ' active' : ''}`}
            onClick={() => { setActiveTab('signup'); setMessage(null) }}
          >
            新規登録
          </button>
        </div>

        {message && (
          <div className={`alert alert-${message.type}`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">ユーザー名</label>
              <input
                id="login-username"
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">パスワード</label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                autoComplete="current-password"
              />
            </div>
            <button
              id="login-submit"
              className="btn btn-primary btn-block"
              type="submit"
              disabled={loading}
            >
              {loading ? 'ログイン中…' : 'ログイン'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">ユーザー名（半角英数字）</label>
              <input
                id="signup-username"
                className="form-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ユーザー名を入力"
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">パスワード</label>
              <input
                id="signup-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="4文字以上"
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label">パスワード（確認）</label>
              <input
                id="signup-confirm"
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                autoComplete="new-password"
              />
            </div>
            <button
              id="signup-submit"
              className="btn btn-primary btn-block"
              type="submit"
              disabled={loading}
            >
              {loading ? '作成中…' : 'アカウント作成'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
