import { useState, useEffect, useCallback } from 'react';
import StatsService, { UserStats } from '../services/statsService';

export const useStats = () => {
  const [userStats, setUserStats] = useState<UserStats>({
    inspections: 0,
    properties: 0,
    reports: 0,
    todayCount: 0,
    completedCount: 0,
    recentReports: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const statsService = StatsService.getInstance();
      const stats = await statsService.getAllStats();
      setUserStats(stats);
    } catch (err) {
      console.error('Error loading user stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
      // Keep default values (0, 0, 0) if loading fails
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    await loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    userStats,
    isLoading,
    error,
    refreshStats,
    loadStats
  };
};

export default useStats;
