import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// SHA-256 hash (matching Python's hashlib.sha256)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

interface AuthState {
  isLoggedIn: boolean
  userId: string | null
  username: string | null
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem('auth')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { isLoggedIn: false, userId: null, username: null }
      }
    }
    return { isLoggedIn: false, userId: null, username: null }
  })

  useEffect(() => {
    localStorage.setItem('auth', JSON.stringify(auth))
  }, [auth])

  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const passwordHash = await hashPassword(password)
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .eq('password_hash', passwordHash)

      if (error) throw error

      if (data && data.length > 0) {
        setAuth({
          isLoggedIn: true,
          userId: data[0].id,
          username,
        })
        return { success: true, message: `ようこそ、${username}さん！` }
      }
      return { success: false, message: 'ユーザー名またはパスワードが間違っています' }
    } catch (e) {
      return { success: false, message: `エラー: ${e}` }
    }
  }, [])

  const signup = useCallback(async (username: string, password: string): Promise<{ success: boolean; message: string }> => {
    try {
      const passwordHash = await hashPassword(password)
      const { error } = await supabase
        .from('users')
        .insert({ username, password_hash: passwordHash })

      if (error) {
        if (error.message.includes('duplicate') || error.message.includes('unique')) {
          return { success: false, message: 'このユーザー名は既に使われています' }
        }
        throw error
      }
      return { success: true, message: 'アカウントを作成しました！ログインしてください。' }
    } catch (e) {
      return { success: false, message: `エラー: ${e}` }
    }
  }, [])

  const logout = useCallback(() => {
    setAuth({ isLoggedIn: false, userId: null, username: null })
    localStorage.removeItem('auth')
  }, [])

  return { ...auth, login, signup, logout }
}
