import { NavLink } from 'react-router-dom'
import {
  Home,
  Building2,
  Users,
  UserCheck,
  Calendar,
  FileText,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'

// Navigation will be generated dynamically based on user

export function Sidebar() {
  const { signOut, user } = useAuth()
  const { t } = useLanguage()

  // Generate navigation links with user's username
  const menuItems = [
    { name: t('nav.dashboard'), href: `/${user?.username}/dashboard`, icon: Home },
    { name: t('nav.properties'), href: `/${user?.username}/properties`, icon: Building2 },
    { name: t('nav.clients'), href: `/${user?.username}/clients`, icon: Users },
    { name: t('nav.agents'), href: `/${user?.username}/agents`, icon: UserCheck },
    { name: t('nav.scheduling'), href: `/${user?.username}/scheduling`, icon: Calendar },
    { name: t('nav.reports'), href: `/${user?.username}/reports`, icon: FileText },
  ]

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-gray-50 shadow-lg border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 px-6 border-b border-gray-200">
          <span className="text-xl font-bold" style={{color: '#8d2138'}}>IMMOBILIEN</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* MENU Section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3 px-2">
              MENU
            </h3>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-gray-200 text-gray-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="mr-3 w-5 h-5" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg transition-colors duration-200 hover:bg-gray-100"
          >
            <LogOut className="mr-3 w-5 h-5" />
            {t('common.signOut')}
          </button>
        </div>
      </div>
    </div>
  )
}