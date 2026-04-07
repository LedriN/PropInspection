import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { LoginForm } from './components/Auth/LoginForm'
import { SignupForm } from './components/Auth/SignupForm'
import { Layout } from './components/Layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Properties } from './pages/Properties'
import { PropertyDetail } from './pages/PropertyDetail'
import { ObjectDetail } from './pages/ObjectDetail'
import { UnitDetail } from './pages/UnitDetail'
import { Clients } from './pages/Clients'
import { Agents } from './pages/Agents'
import { Scheduling } from './pages/Scheduling'
import { Reports } from './pages/Reports'
import { Notifications } from './pages/Notifications'

function AppContent() {
  const { user, loading } = useAuth()
  const { t } = useLanguage()
  
  // All hooks must be called at the top level - no conditional hooks
  const [screenWidth, setScreenWidth] = React.useState(window.innerWidth)

  React.useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{borderColor: '#8d2138'}}></div>
      </div>
    )
  }

  // Check if user is admin or agent FIRST (before screen width check)
  const isAdmin = user && user.role === 'admin'
  const isAgent = user && user.role === 'agent'

  // Debug logging
  console.log('User data:', user)
  console.log('User role:', user?.role)
  console.log('Is admin:', isAdmin)
  console.log('Is agent:', isAgent)

  // Show message for agents - they should use the mobile app
  if (isAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('common.agentAccessRestricted')}</h2>
          <p className="text-gray-600 mb-4">
            {t('common.agentAccessMessage')}
          </p>
          <p className="text-sm text-gray-500">
            {t('common.agentAccessInstruction')}
          </p>
          <button
            onClick={() => {
              // Sign out the agent user
              if (user) {
                // You can add sign out logic here if needed
                window.location.href = '/login'
              }
            }}
            className="mt-4 px-4 py-2 text-white rounded-lg transition-colors"
            style={{backgroundColor: '#8d2138'}}
          >
            {t('common.signOut')}
          </button>
        </div>
      </div>
    )
  }

  // Show message for screens smaller than 1024px (only for admin users)
  if (screenWidth < 1024) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="mb-4">
            <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('common.screenSizeNotSupported')}</h2>
          <p className="text-gray-600 mb-4">
            {t('common.screenSizeMessage')}
          </p>
          <p className="text-sm text-gray-500">
            {t('common.screenSizeInstruction')}
          </p>
        </div>
      </div>
    )
  }

  // If user exists but is not admin, redirect to login
  if (user && !isAdmin) {
    return <Navigate to="/login" replace />
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={!user ? <LoginForm /> : <Navigate to={isAdmin ? `/${user.username}/dashboard` : "/login"} replace />} />
      <Route path="/signup" element={!user ? <SignupForm /> : <Navigate to={isAdmin ? `/${user.username}/dashboard` : "/login"} replace />} />
      
      {/* Protected routes with dynamic user routing - Admin only */}
      {isAdmin ? (
        <Route path={`/${user.username}/*`} element={<Layout />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="objects/:id" element={<ObjectDetail />} />
          <Route path="objects/:objectId/units/:unitId" element={<UnitDetail />} />
          <Route path="clients" element={<Clients />} />
          <Route path="agents" element={<Agents />} />
          <Route path="scheduling" element={<Scheduling />} />
          <Route path="reports" element={<Reports />} />
          <Route path="notifications" element={<Notifications />} />
        </Route>
      ) : null}
      
      {/* Default redirects */}
      <Route path="/" element={<Navigate to={isAdmin ? `/${user.username}/dashboard` : "/login"} replace />} />
      <Route path="*" element={<Navigate to={isAdmin ? `/${user.username}/dashboard` : "/login"} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppContent />
          <Toaster position="top-right" />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
