import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface LayoutProps {
  children: React.ReactNode
  auth: ReturnType<typeof useAuth>
}

const navItems = [
  { to: '/', icon: '📖', label: 'Review' },
  { to: '/radio', icon: '📻', label: 'Radio' },
  { to: '/add', icon: '➕', label: 'Add' },
  { to: '/import', icon: '📥', label: 'Import' },
  { to: '/all', icon: '📋', label: 'All' },
  { to: '/manage', icon: '⚙️', label: 'Manage' },
]

export default function Layout({ children, auth }: LayoutProps) {
  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-inner">
          <div className="app-title">Phrase Manager 📖</div>
          <div className="header-user">
            <span className="header-username">👤 {auth.username}</span>
            <button className="btn-logout" onClick={auth.logout}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="app-content">{children}</main>

      <nav className="bottom-nav">
        <div className="nav-inner">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `nav-item${isActive ? ' active' : ''}`
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
