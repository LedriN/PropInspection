import { useState, useEffect } from 'react'
import { Users, Plus, Search, Filter, Trash2, X, Send, Lock } from 'lucide-react'
import { Client } from '../types/database'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../config/api'
import { useLanguage } from '../contexts/LanguageContext'
import { AddClientModal } from '../components/Clients/AddClientModal'
import { DeleteClientModal } from '../components/Clients/DeleteClientModal'

const statusColors = {
  active: 'text-green-600 bg-green-100',
  inactive: 'text-gray-600 bg-gray-100',
  prospect: 'text-blue-600 bg-blue-100',
}

export function Clients() {
  const { t } = useLanguage()
  const [searchTerm, setSearchTerm] = useState('')
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      setLoading(true)
      const response = await fetch(getApiUrl('/clients'), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        setClients(result.data || [])
      } else {
        throw new Error('Failed to fetch clients')
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      toast.error('Failed to load clients')
      setClients([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    // For now, we'll do client-side filtering since we don't have a search endpoint
    // In the future, you can implement server-side search
  }

  const filteredClients = clients.filter(
    (client) =>
      `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone.includes(searchTerm)
  )

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client)
    setIsDeleteModalOpen(true)
  }

      const confirmDeleteClient = async () => {
    if (!selectedClient?._id) return

    try {
      setDeleteLoading(true)
      const response = await fetch(getApiUrl(`/clients/${selectedClient._id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        toast.success('Client deleted successfully!')
        // Remove from selected if it was selected
        setSelectedClientIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(selectedClient._id!)
          return newSet
        })
        loadClients() // Reload the clients list
        setIsDeleteModalOpen(false)
        setSelectedClient(null)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete client')
      }
    } catch (error) {
      console.error('Error deleting client:', error)
      toast.error('Failed to delete client')
    } finally {
      setDeleteLoading(false)
    }
  }

  const closeModals = () => {
    setIsDeleteModalOpen(false)
    setSelectedClient(null)
  }

  const handleSelectClient = (clientId: string) => {
    setSelectedClientIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(clientId)) {
        newSet.delete(clientId)
      } else {
        newSet.add(clientId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedClientIds.size === filteredClients.length) {
      setSelectedClientIds(new Set())
    } else {
      setSelectedClientIds(new Set(filteredClients.map(c => c._id!).filter(Boolean)))
    }
  }

  const clearSelection = () => {
    setSelectedClientIds(new Set())
  }

  const handleBulkDelete = async () => {
    if (selectedClientIds.size === 0) return
    
    if (!confirm(`Are you sure you want to delete ${selectedClientIds.size} client(s)?`)) {
      return
    }

    const selectedClients = clients.filter(c => c._id && selectedClientIds.has(c._id))
    setDeleteLoading(true)
    
    try {
      // Delete all selected clients
      const deletePromises = selectedClients.map(client => 
        fetch(getApiUrl(`/clients/${client._id}`), {
          method: 'DELETE',
          headers: getAuthHeaders()
        })
      )
      
      const results = await Promise.allSettled(deletePromises)
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length
      
      if (successful > 0) {
        toast.success(`Successfully deleted ${successful} client(s)!`)
        setSelectedClientIds(new Set())
        loadClients()
      } else {
        toast.error('Failed to delete clients')
      }
    } catch (error) {
      console.error('Error deleting clients:', error)
      toast.error('Failed to delete clients')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleBulkNotification = () => {
    if (selectedClientIds.size === 0) return
    const selectedClients = clients.filter(c => c._id && selectedClientIds.has(c._id))
    toast.success(`Sending notifications to ${selectedClients.length} client(s)...`)
    // Implement notification logic here
  }

  const handleBulkBlock = () => {
    if (selectedClientIds.size === 0) return
    toast.success(`Blocking ${selectedClientIds.size} client(s)...`)
    // Implement block logic here
  }

  const getClientTypeLabel = (type?: string) => {
    if (!type) return 'N/A'
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('clients.title')}</h1>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center px-4 py-2 custom-btn text-white rounded-xl font-medium hover:opacity-90 transition-all duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          {t('clients.addClient')}
        </button>
      </div>

      {/* Bulk Actions Bar */}
      {selectedClientIds.size > 0 && (
        <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              {selectedClientIds.size} selected
            </span>
            <button
              onClick={clearSelection}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Clear selection"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkNotification}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Send className="w-4 h-4 mr-2" />
              Notification
            </button>
            <button
              onClick={handleBulkBlock}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Lock className="w-4 h-4 mr-2" />
              Block
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('clients.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <button className="flex items-center px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
          <Filter className="w-5 h-5 mr-2 text-gray-500" />
          {t('clients.filter')}
        </button>
      </div>

      {/* Clients Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={selectedClientIds.size === filteredClients.length && filteredClients.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 text-custom-btn border-gray-300 rounded focus:ring-2 focus:ring-custom-btn"
                />
              </div>
              <div className="col-span-3">CLIENT NAME</div>
              <div className="col-span-2">COUNTRY</div>
              <div className="col-span-2">TYPE</div>
              <div className="col-span-2">STATUS</div>
              <div className="col-span-2 text-right">ACTIONS</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredClients.map((client) => {
              const isSelected = client._id ? selectedClientIds.has(client._id) : false
              return (
                <div 
                  key={client._id} 
                  className={`px-6 py-4 transition-colors duration-200 ${
                    isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Checkbox */}
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => client._id && handleSelectClient(client._id)}
                        className="w-4 h-4 text-custom-btn border-gray-300 rounded focus:ring-2 focus:ring-custom-btn"
                      />
                    </div>

                    {/* Client Name */}
                    <div className="col-span-3 flex items-center">
                      <div className="w-10 h-10 custom-red rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                        <span className="text-white font-medium text-sm">
                          {client.firstName[0]}{client.lastName[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {client.firstName} {client.lastName}
                        </h3>
                        {client.company && (
                          <p className="text-xs text-gray-500 truncate" title={client.company}>
                            {client.company}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Country */}
                    <div className="col-span-2">
                      <span className="text-sm text-gray-700">
                        {client.address?.country || 'N/A'}
                      </span>
                    </div>

                    {/* Type */}
                    <div className="col-span-2">
                      <span className="text-sm text-gray-700">
                        {getClientTypeLabel(client.type)}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusColors[client.status as keyof typeof statusColors]}`}>
                        {client.status || 'active'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end">
                      <button 
                        onClick={() => handleDeleteClient(client)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
                        title="Delete client"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {filteredClients.length > 0 && (
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
                1-{filteredClients.length} of {filteredClients.length}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && filteredClients.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {clients.length === 0 
              ? "No clients added yet. Click 'New Client' to get started." 
              : "No clients found matching your search."
            }
          </p>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onClientAdded={loadClients}
      />

      {/* Delete Client Modal */}
      <DeleteClientModal
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        onConfirm={confirmDeleteClient}
        client={selectedClient}
        loading={deleteLoading}
      />
    </div>
  )
}