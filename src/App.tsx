import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout from './components/Layout'
import InstallPrompt from './components/InstallPrompt'
import LoginPage from './pages/LoginPage'
import ReviewPage from './pages/ReviewPage'
import RadioPage from './pages/RadioPage'
import AddPhrasePage from './pages/AddPhrasePage'
import ImportPage from './pages/ImportPage'
import AllPhrasesPage from './pages/AllPhrasesPage'
import ManagePage from './pages/ManagePage'

export default function App() {
  const auth = useAuth()

  if (!auth.isLoggedIn) {
    return <LoginPage />
  }

  return (
    <BrowserRouter>
      <Layout auth={auth}>
        <Routes>
          <Route path="/" element={<ReviewPage userId={auth.userId!} />} />
          <Route path="/radio" element={<RadioPage userId={auth.userId!} />} />
          <Route path="/add" element={<AddPhrasePage userId={auth.userId!} />} />
          <Route path="/import" element={<ImportPage userId={auth.userId!} />} />
          <Route path="/all" element={<AllPhrasesPage userId={auth.userId!} />} />
          <Route path="/manage" element={<ManagePage userId={auth.userId!} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
      <InstallPrompt />
    </BrowserRouter>
  )
}
