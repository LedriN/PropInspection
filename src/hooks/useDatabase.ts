import { useState, useEffect } from 'react'
import { connectToDatabase } from '../lib/mongodb'

export function useDatabase() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await connectToDatabase()
        setIsConnected(true)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to database')
        setIsConnected(false)
      } finally {
        setIsLoading(false)
      }
    }

    initializeDatabase()
  }, [])

  return { isConnected, isLoading, error }
}