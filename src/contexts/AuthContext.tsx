import React, { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../config/api'

// User interface for our custom auth
interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  username: string
  databaseName: string
  role: string
  lastLogin?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// API_BASE_URL is now imported from config

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isConfigured] = useState(true) // Always configured for demo

  useEffect(() => {
    // Check for existing token on app load
    const token = localStorage.getItem('token')
    if (token) {
      verifyToken(token)
    } else {
      setLoading(false)
    }
  }, [])

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(getApiUrl('/auth/me'), {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        // Check if user has admin role
        if (data.data.user.role !== 'admin') {
          localStorage.removeItem('token')
          setUser(null)
          return
        }
        setUser(data.data.user)
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Check if user has admin role
        if (data.data.user.role !== 'admin') {
          toast.error('Access denied. Only administrators can access this dashboard.')
          throw new Error('Access denied. Only administrators can access this dashboard.')
        }
        
        setUser(data.data.user)
        localStorage.setItem('token', data.data.token)
        toast.success('Successfully signed in!')
      } else {
        toast.error(data.message || 'Login failed')
        throw new Error(data.message || 'Login failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed')
      throw error
    }
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await fetch(getApiUrl('/auth/register'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password, firstName, lastName })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setUser(data.data.user)
        localStorage.setItem('token', data.data.token)
        toast.success('Account created successfully!')
      } else {
        toast.error(data.message || 'Registration failed')
        throw new Error(data.message || 'Registration failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
      throw error
    }
  }

  const signOut = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        await fetch(getApiUrl('/auth/logout'), {
          method: 'POST',
          headers: getAuthHeaders()
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('token')
      toast.success('Successfully signed out!')
    }
  }

  const value = {
    user,
    loading,
    isConfigured,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}