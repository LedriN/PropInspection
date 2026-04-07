import { useState, useEffect } from 'react'
import { UserCheck, Plus, Search, Filter, Trash2, RefreshCw } from 'lucide-react'
import { Agent } from '../types/database'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../config/api'
import { useLanguage } from '../contexts/LanguageContext'
import { AddAgentModal } from '../components/Agents/AddAgentModal'
import { DeleteAgentModal } from '../components/Agents/DeleteAgentModal'

const statusColors = {    
  Active: 'text-green-600 bg-green-100',
  Busy: 'text-yellow-600 bg-yellow-100',
  Unavailable: 'text-red-600 bg-red-100',
  Inactive: 'text-gray-600 bg-gray-100',
}


export function Agents() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => {
    loadAgents()
    
    // Refetch when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden && agents.length === 0) {
        console.log('Page visible, refetching agents...')
        loadAgents()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const loadAgents = async (retryCount = 0) => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 1000 // 1 second
    
    try {
      setLoading(true)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
      const response = await fetch(getApiUrl('/agents'), {
        headers: getAuthHeaders(),
        signal: controller.signal,
        cache: 'no-cache' // Prevent browser caching
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`Failed to fetch agents: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Agents API Response:', result)
      
      // Handle different response structures
      let agentsData = []
      if (Array.isArray(result)) {
        agentsData = result
      } else if (result.data && Array.isArray(result.data)) {
        agentsData = result.data
      } else if (result.success && Array.isArray(result.data)) {
        agentsData = result.data
      } else {
        console.warn('Unexpected response structure:', result)
        agentsData = []
      }
      
      console.log(`Loaded ${agentsData.length} agents`)
      setAgents(agentsData)
      
    } catch (error: any) {
      console.error('Error loading agents:', error)
      
      // Retry logic for network errors or timeouts
      if (retryCount < MAX_RETRIES && (error.name === 'AbortError' || error.message?.includes('fetch'))) {
        console.log(`Retrying loadAgents (attempt ${retryCount + 1}/${MAX_RETRIES})...`)
        setTimeout(() => {
          loadAgents(retryCount + 1)
        }, RETRY_DELAY * (retryCount + 1)) // Exponential backoff
        return
      }
      
      toast.error('Failed to load agents. Please refresh the page.')
      setAgents([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleAgentAdded = () => {
    loadAgents() // Reload agents after adding a new one
  }

  const handleDeleteAgent = (agent: Agent) => {
    setSelectedAgent(agent)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteAgent = async () => {
    if (!selectedAgent?._id) return

    try {
      setDeleteLoading(true)
      const response = await fetch(getApiUrl(`/agents/${selectedAgent._id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        toast.success('Agent deleted successfully!')
        loadAgents() // Reload the agents list
        setIsDeleteModalOpen(false)
        setSelectedAgent(null)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete agent')
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
      toast.error('Failed to delete agent')
    } finally {
      setDeleteLoading(false)
    }
  }

  const closeModals = () => {
    setIsDeleteModalOpen(false)
    setSelectedAgent(null)
  }

  const filteredAgents = agents.filter(
    (agent) =>
      `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.specialties || []).some((specialty: string) => specialty.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('agents.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => loadAgents()}
            disabled={loading}
            className="flex items-center px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh agents"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 custom-btn text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            {t('agents.addAgent')}
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('agents.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
          <Filter className="w-5 h-5 mr-2 text-gray-500" />
          {t('agents.filter')}
        </button>
      </div>

      {/* Agents Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <div className="col-span-4">AGENT NAME</div>
              <div className="col-span-2">EMAIL</div>
              <div className="col-span-2">COMPLETED</div>
              <div className="col-span-2">STATUS</div>
              <div className="col-span-2 text-right">ACTIONS</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredAgents.map((agent) => (
              <div 
                key={agent._id} 
                className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Agent Name */}
                  <div className="col-span-4 flex items-center">
                    <div className="w-10 h-10 custom-red rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-white font-medium text-sm">
                        {agent.firstName[0]}{agent.lastName[0]}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {agent.firstName} {agent.lastName}
                      </h3>
                      {agent.specialties && agent.specialties.length > 0 && (
                        <p className="text-xs text-gray-500 truncate" title={agent.specialties.join(', ')}>
                          {agent.specialties[0]}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-700 truncate block" title={agent.email}>
                      {agent.email}
                    </span>
                  </div>

                  {/* Completed Inspections */}
                  <div className="col-span-2">
                    <span className="text-sm text-gray-700">
                      {agent.completed_inspections || 0} inspections
                    </span>
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusColors[agent.status as keyof typeof statusColors]}`}>
                      {agent.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center justify-end">
                    <button 
                      onClick={() => handleDeleteAgent(agent)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
                      title="Delete agent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {filteredAgents.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Rows per page:</span>
                <select className="border border-gray-200 rounded px-2 py-1 bg-white">
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                </select>
              </div>
              <div className="text-sm text-gray-600">
                1-{filteredAgents.length} of {filteredAgents.length}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && filteredAgents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {agents.length === 0 
              ? "No agents added yet. Click 'New Agent' to get started." 
              : "No agents found matching your search."
            }
          </p>
        </div>
      )}

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAgentAdded={handleAgentAdded}
      />

      {/* Delete Agent Modal */}
      <DeleteAgentModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        onConfirm={confirmDeleteAgent}
        agent={selectedAgent}
        loading={deleteLoading}
      />
    </div>
  )
}