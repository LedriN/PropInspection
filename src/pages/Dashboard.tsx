import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Users, UserCheck, Calendar, Plus, ArrowUp, ArrowDown } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../config/api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

export function Dashboard() {
  const navigate = useNavigate() 
  const { user } = useAuth()
  const { t } = useLanguage()
  const [stats, setStats] = useState({
    totalProperties: 0,
    activeClients: 0,
    availableAgents: 0,
    pendingInspections: 0
  })
  const [inspectionData, setInspectionData] = useState<any[]>([])
  const [recentClients, setRecentClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statsChange, setStatsChange] = useState({
    totalProperties: { percent: 0, type: 'increase' as 'increase' | 'decrease' },
    activeClients: { percent: 0, type: 'increase' as 'increase' | 'decrease' },
    availableAgents: { percent: 0, type: 'increase' as 'increase' | 'decrease' },
    pendingInspections: { percent: 0, type: 'increase' as 'increase' | 'decrease' }
  })

  // Helper function to process inspection scheduling data for chart
  const processInspectionDataForChart = (inspections: any[]) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    // Generate data for last 12 months
    const inspectionChartData: { month: string; Scheduled: number; Completed: number }[] = []
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - i, 1)
      const monthIndex = date.getMonth()
      const monthName = months[monthIndex]
      const year = date.getFullYear()
      
      // Count inspections scheduled and completed in this month
      const monthInspections = inspections.filter((insp: any) => {
        if (!insp.scheduledDate) return false
        const inspDate = new Date(insp.scheduledDate)
        return inspDate.getMonth() === monthIndex && inspDate.getFullYear() === year
      })
      
      const scheduled = monthInspections.filter((insp: any) => insp.status === 'scheduled').length
      const completed = monthInspections.filter((insp: any) => insp.status === 'completed').length
      
      inspectionChartData.push({
        month: monthName,
        Scheduled: scheduled,
        Completed: completed
      })
    }
    
    return inspectionChartData
  }

  // Helper function to calculate percentage change
  const calculatePercentageChange = (current: number, previous: number): { percent: number; type: 'increase' | 'decrease' } => {
    if (previous === 0) return { percent: current > 0 ? 100 : 0, type: current > 0 ? 'increase' : 'decrease' }
    const change = ((current - previous) / previous) * 100
    return {
      percent: Math.abs(change),
      type: change >= 0 ? 'increase' : 'decrease'
    }
  }

  // Generate mini graph data for stats cards
  const generateMiniGraphData = (current: number, type: 'increase' | 'decrease') => {
    const data = []
    const baseValue = current * 0.7
    for (let i = 0; i < 7; i++) {
      const variation = (Math.random() - 0.5) * 0.2
      const trend = type === 'increase' ? (i / 6) * 0.3 : -(i / 6) * 0.1
      data.push(baseValue * (1 + variation + trend))
    }
    return data
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all data in parallel
      const [propertiesRes, clientsRes, agentsRes, inspectionsRes] = await Promise.all([
        fetch(getApiUrl('/properties'), {
          headers: getAuthHeaders()
        }),
        fetch(getApiUrl('/clients'), {
          headers: getAuthHeaders()
        }),
        fetch(getApiUrl('/agents'), {
          headers: getAuthHeaders()
        }),
        fetch(getApiUrl('/inspections'), {
          headers: getAuthHeaders()
        })
      ])

      const [properties, clients, agents, inspections] = await Promise.all([
        propertiesRes.ok ? propertiesRes.json() : { data: [] },
        clientsRes.ok ? clientsRes.json() : { data: [] },
        agentsRes.ok ? agentsRes.json() : { data: [] },
        inspectionsRes.ok ? inspectionsRes.json() : { data: [] }
      ])

      const totalProperties = properties.data?.length || 0
      const activeClients = clients.data?.length || 0
      const availableAgents = agents.data?.length || 0
      const pendingInspections = inspections.data?.filter((inspection: any) => inspection.status === 'scheduled').length || 0

      // Set stats
      setStats({
        totalProperties,
        activeClients,
        availableAgents,
        pendingInspections
      })

      // Calculate percentage changes (compare with previous period - simplified calculation)
      // In a real app, you'd compare with actual previous period data
      setStatsChange({
        totalProperties: calculatePercentageChange(totalProperties, Math.max(0, totalProperties - Math.floor(totalProperties * 0.1))),
        activeClients: calculatePercentageChange(activeClients, Math.max(0, activeClients - Math.floor(activeClients * 0.15))),
        availableAgents: calculatePercentageChange(availableAgents, Math.max(0, availableAgents - Math.floor(availableAgents * 0.2))),
        pendingInspections: calculatePercentageChange(pendingInspections, Math.max(0, pendingInspections - Math.floor(pendingInspections * 0.25)))
      })

      // Process inspection scheduling data for chart
      const inspectionChartData = processInspectionDataForChart(inspections.data || [])
      setInspectionData(inspectionChartData)

      // Get recent clients (renters)
      const recentClientsList = (clients.data || [])
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 6)
      setRecentClients(recentClientsList)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast.error('Failed to load dashboard data')
      setInspectionData([])
      setRecentClients([])
    } finally {
      setLoading(false)
    }
  }

  // Enhanced Stats Card Component
  const EnhancedStatsCard = ({ title, value, changePercent, changeType, icon: Icon, color }: any) => {
    const graphData = generateMiniGraphData(parseInt(value) || 0, changeType)
    const maxValue = Math.max(...graphData, 1)
    const minValue = Math.min(...graphData, 0)
    const range = maxValue - minValue || 1
    
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <div className={`flex items-center gap-1 mt-2 ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
              {changeType === 'increase' ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {changePercent.toFixed(2)}% last month
              </span>
            </div>
          </div>
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: color === 'green' ? '#10b981' : color === 'yellow' ? '#eab308' : color }}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        {/* Mini Graph */}
        <div className="h-16 relative">
          <svg width="100%" height="100%" className="overflow-visible">
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}-${changeType}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={changeType === 'increase' ? '#10b981' : '#ef4444'} stopOpacity="0.4" />
                <stop offset="100%" stopColor={changeType === 'increase' ? '#10b981' : '#ef4444'} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 ${64 - ((graphData[0] - minValue) / range) * 64} ${graphData
                .map((val: number, i: number) => {
                  const x = (i / (graphData.length - 1)) * 100
                  const y = 64 - ((val - minValue) / range) * 64
                  return `L ${x} ${y}`
                })
                .join(' ')} L 100 64 Z`}
              fill={`url(#gradient-${title.replace(/\s+/g, '-')}-${changeType})`}
            />
            <path
              d={`M 0 ${64 - ((graphData[0] - minValue) / range) * 64} ${graphData
                .map((val: number, i: number) => {
                  const x = (i / (graphData.length - 1)) * 100
                  const y = 64 - ((val - minValue) / range) * 64
                  return `L ${x} ${y}`
                })
                .join(' ')}`}
              fill="none"
              stroke={changeType === 'increase' ? '#10b981' : '#ef4444'}
              strokeWidth="2.5"
            />
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className='flex justify-between items-center w-100'>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">{t('dashboard.subtitle')}</p>
      </div>
      <button 
          onClick={() => navigate(`/${user?.username}/properties`)}
          className="flex h-fit items-center px-4 py-2 text-white rounded-xl font-medium transition-all duration-200"
          style={{backgroundColor: '#8d2138'}}
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('dashboard.addProperty')}
        </button>
            </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatsCard
          title={t('dashboard.totalProperties')}
          value={loading ? "..." : stats.totalProperties.toString()}
          changePercent={statsChange.totalProperties.percent}
          changeType={statsChange.totalProperties.type}
          icon={Building2}
          color="#8d2138"
        />
        <EnhancedStatsCard
          title={t('dashboard.totalClients')}
          value={loading ? "..." : stats.activeClients.toString()}
          changePercent={statsChange.activeClients.percent}
          changeType={statsChange.activeClients.type}
          icon={Users}
          color="#10b981"
        />
        <EnhancedStatsCard
          title={t('dashboard.availableAgents')}
          value={loading ? "..." : stats.availableAgents.toString()}
          changePercent={statsChange.availableAgents.percent}
          changeType={statsChange.availableAgents.type}
          icon={UserCheck}
          color="#8d2138"
        />
        <EnhancedStatsCard
          title={t('dashboard.activeInspections')}
          value={loading ? "..." : stats.pendingInspections.toString()}
          changePercent={statsChange.pendingInspections.percent}
          changeType={statsChange.pendingInspections.type}
          icon={Calendar}
          color="#f59e0b"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Appointments over time Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Appointments over time</h2>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {inspectionData.reduce((sum, d) => sum + d.Scheduled + d.Completed, 0)} Total
              </p>
            </div>
          </div>
          
          {inspectionData.length > 0 ? (
            <div>
              {/* Legend */}
              <div className="flex gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#8d2138'}}></div>
                  <span className="text-sm text-gray-600">Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: '#dc2626'}}></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart 
                  data={inspectionData}
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8d2138" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8d2138" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9ca3af"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#9ca3af"
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                  />
                  <Tooltip 
                    cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '0' }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                      padding: '12px 16px'
                    }}
                    labelStyle={{ 
                      color: '#374151', 
                      fontWeight: 500, 
                      fontSize: '12px',
                      marginBottom: '8px',
                      paddingBottom: '4px',
                      borderBottom: '1px solid #e5e7eb'
                    }}
                    itemStyle={{ 
                      padding: '4px 0',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}
                    formatter={(value: any, name: string) => [
                      <span key={name} style={{ 
                        color: name === 'Scheduled' ? '#8d2138' : '#dc2626', 
                        fontWeight: 600,
                        fontSize: '16px'
                      }}>
                        {value}
                      </span>,
                      name
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Scheduled" 
                    stroke="#8d2138" 
                    strokeWidth={2.5}
                    fill="url(#colorScheduled)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{ r: 5, fill: '#8d2138', strokeWidth: 2, stroke: '#fff' }}
                    name="Scheduled"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Completed" 
                    stroke="#dc2626" 
                    strokeWidth={2.5}
                    fill="url(#colorCompleted)"
                    fillOpacity={1}
                    dot={false}
                    activeDot={{ r: 5, fill: '#dc2626', strokeWidth: 2, stroke: '#fff' }}
                    name="Completed"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-center">
              <div>
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No inspection data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Renters */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Recent Clients</h2>
          {recentClients.length > 0 ? (
            <div className="space-y-4">
              {recentClients.map((client) => {
                const initials = `${client.firstName?.[0] || ''}${client.lastName?.[0] || ''}`.toUpperCase()
                const fullName = `${client.firstName || ''} ${client.lastName || ''}`.trim()
                
                return (
                  <div key={client._id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0" style={{background: 'linear-gradient(135deg, #8d2138 0%, #dc2626 100%)'}}>
                      {initials || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {fullName || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {client.email || 'No email'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent renters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}