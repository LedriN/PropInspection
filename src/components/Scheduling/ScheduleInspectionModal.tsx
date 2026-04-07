import React, { useState, useEffect } from 'react'
import { X, Calendar, Clock, User, Building2, FileText, ChevronDown, Mail, Check } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { Client, Agent, Property } from '../../types/database'

interface InspectionDisplay {
  id: string
  date: Date
  time: string
  property: string
  client: string
  agent: string
  type: string
  status: string
  // Additional fields for editing
  clientId?: string
  agentId?: string
  propertyId?: string
  notes?: string
}

interface ScheduleInspectionModalProps {
  isOpen: boolean
  onClose: () => void
  onInspectionScheduled: () => void
  editingInspection?: InspectionDisplay | null
}

const inspectionTypes = [
  'pre-purchase',
  'pre-sale', 
  'routine',
  'insurance',
  'maintenance'
]

export function ScheduleInspectionModal({ isOpen, onClose, onInspectionScheduled, editingInspection }: ScheduleInspectionModalProps) {
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [clientsLoading, setClientsLoading] = useState(false)
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [showAgentDropdown, setShowAgentDropdown] = useState(false)
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false)
  const [clientSearchTerm, setClientSearchTerm] = useState('')
  const [agentSearchTerm, setAgentSearchTerm] = useState('')
  const [propertySearchTerm, setPropertySearchTerm] = useState('')
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([])
  const [emailInput, setEmailInput] = useState('')
  const [sendEmail, setSendEmail] = useState(false)
  
  const [formData, setFormData] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    propertyId: '',
    propertyAddress: '',
    agentId: '',
    agentName: '',
    agentEmail: '',
    scheduledDate: '',
    scheduledTime: '',
    inspectionType: '',
    notes: ''
  })

  // Load clients, agents, and properties when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClients()
      loadAgents()
      loadProperties()
    }
  }, [isOpen])

  // Populate form when editing and data is loaded
  useEffect(() => {
    if (editingInspection && isOpen && !clientsLoading && !agentsLoading && !propertiesLoading) {
      console.log('=== FORM POPULATION DEBUG ===')
      console.log('Editing inspection:', editingInspection)
      console.log('Clients loaded:', clients.length, clients)
      console.log('Agents loaded:', agents.length, agents)
      console.log('Looking for clientId:', editingInspection.clientId)
      console.log('Looking for agentId:', editingInspection.agentId)
      
      // Find the selected client and agent
      const selectedClient = clients.find(client => client._id === editingInspection.clientId)
      const selectedAgent = agents.find(agent => agent._id === editingInspection.agentId)
      
      console.log('Found selected client:', selectedClient)
      console.log('Found selected agent:', selectedAgent)
      
      // Use the actual IDs and data from the editing inspection
      const newFormData = {
        clientId: editingInspection.clientId || '',
        clientName: selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName}` : editingInspection.client,
        clientEmail: selectedClient?.email || '',
        propertyId: editingInspection.propertyId || '',
        propertyAddress: editingInspection.property,
        agentId: editingInspection.agentId || '',
        agentName: selectedAgent ? `${selectedAgent.firstName} ${selectedAgent.lastName}` : editingInspection.agent,
        agentEmail: selectedAgent?.email || '',
        scheduledDate: format(editingInspection.date, 'yyyy-MM-dd'),
        scheduledTime: editingInspection.time,
        inspectionType: editingInspection.type,
        notes: editingInspection.notes || ''
      }
      
      console.log('Setting form data:', newFormData)
      setFormData(newFormData)
      
      // Set search terms for display
      setClientSearchTerm(newFormData.clientName)
      setAgentSearchTerm(newFormData.agentName)
      setPropertySearchTerm(newFormData.propertyAddress)
    } else if (isOpen && !editingInspection) {
      // Reset form for new inspection
      setFormData({
        clientId: '',
        clientName: '',
        clientEmail: '',
        propertyId: '',
        propertyAddress: '',
        agentId: '',
        agentName: '',
        agentEmail: '',
        scheduledDate: '',
        scheduledTime: '',
        inspectionType: '',
        notes: ''
      })
      
      // Reset search terms
      setClientSearchTerm('')
      setAgentSearchTerm('')
      setPropertySearchTerm('')
      setAdditionalEmails([])
      setEmailInput('')
      setSendEmail(false)
    }
  }, [editingInspection, isOpen, clients, agents, properties, clientsLoading, agentsLoading, propertiesLoading])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.dropdown-container')) {
        setShowClientDropdown(false)
        setShowAgentDropdown(false)
        setShowPropertyDropdown(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const loadClients = async () => {
    try {
      setClientsLoading(true)
      const response = await fetch(getApiUrl('/clients'), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('Clients API response:', result)
        setClients(result.data || [])
      } else {
        throw new Error('Failed to fetch clients')
      }
    } catch (error) {
      console.error('Error loading clients:', error)
      toast.error('Failed to load clients')
    } finally {
      setClientsLoading(false)
    }
  }

  const loadAgents = async () => {
    try {
      setAgentsLoading(true)
      console.log('Loading agents...')
      console.log('Agents API URL:', getApiUrl('/agents'))
      console.log('Auth headers:', getAuthHeaders())
      
      const response = await fetch(getApiUrl('/agents'), {
        headers: getAuthHeaders()
      })
      
      console.log('Agents response status:', response.status)
      console.log('Agents response ok:', response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Agents response error:', response.status, response.statusText, errorText)
        throw new Error(`Failed to fetch agents: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('Agents API response:', result)
      
      // Handle different response structures
      let agentsData = []
      if (result.data && Array.isArray(result.data)) {
        agentsData = result.data
      } else if (Array.isArray(result)) {
        agentsData = result
      } else {
        console.warn('Unexpected agents response structure:', result)
        agentsData = []
      }
      
      console.log('Agents data:', agentsData)
      console.log('Number of agents:', agentsData.length)
      setAgents(agentsData)
    } catch (error) {
      console.error('Error loading agents:', error)
      toast.error('Failed to load agents')
      setAgents([]) // Set empty array on error to prevent UI issues
    } finally {
      setAgentsLoading(false)
    }
  }

  const loadProperties = async () => {
    try {
      setPropertiesLoading(true)
      
      // Fetch both direct properties and nested properties from objects
      // Use Promise.allSettled to handle failures gracefully
      const [propertiesResult, objectsResult] = await Promise.allSettled([
        fetch(getApiUrl('/properties'), {
          headers: getAuthHeaders()
        }),
        fetch(getApiUrl('/objects'), {
          headers: getAuthHeaders()
        })
      ])
      
      const propertiesResponse = propertiesResult.status === 'fulfilled' ? propertiesResult.value : null
      const objectsResponse = objectsResult.status === 'fulfilled' ? objectsResult.value : null
      
      if (propertiesResult.status === 'rejected') {
        console.warn('Failed to fetch properties:', propertiesResult.reason)
      }
      if (objectsResult.status === 'rejected') {
        console.warn('Failed to fetch objects:', objectsResult.reason)
      }
      
      const allProperties: Property[] = []
      
      // Get direct properties
      if (propertiesResponse && propertiesResponse.ok) {
        try {
          const result = await propertiesResponse.json()
          console.log('Properties API response:', result)
          const directProperties = result.data || []
          console.log('Direct properties loaded:', directProperties.length)
          allProperties.push(...directProperties)
        } catch (error) {
          console.error('Error parsing properties response:', error)
        }
      } else {
        console.warn('Failed to fetch direct properties')
      }
      
      // Get nested properties from objects → units → properties
      if (objectsResponse && objectsResponse.ok) {
        try {
          const objectsResult = await objectsResponse.json()
          const objects = objectsResult.data || []
        console.log('Objects loaded:', objects.length)
        
        // Flatten nested properties from objects
        objects.forEach((obj: any) => {
          // Add direct properties from object (not in units)
          if (obj.properties && Array.isArray(obj.properties)) {
            obj.properties.forEach((prop: Property) => {
              // Add object context to property
              const enrichedProp = {
                ...prop,
                objectId: obj._id,
                objectName: obj.name
              }
              allProperties.push(enrichedProp)
            })
          }
          
          // Add properties from units
          if (obj.units && Array.isArray(obj.units)) {
            obj.units.forEach((unit: any) => {
              if (unit.properties && Array.isArray(unit.properties)) {
                unit.properties.forEach((prop: Property) => {
                  // Add object and unit context to property
                  const enrichedProp = {
                    ...prop,
                    objectId: obj._id,
                    objectName: obj.name,
                    unitId: unit._id,
                    unitNumber: unit.unitNumber
                  }
                  allProperties.push(enrichedProp)
                })
              }
            })
          }
        })
        
          const nestedCount = objects.reduce((count: number, obj: any) => {
            let propCount = (obj.properties?.length || 0)
            if (obj.units) {
              obj.units.forEach((unit: any) => {
                propCount += (unit.properties?.length || 0)
              })
            }
            return count + propCount
          }, 0)
          console.log('Nested properties from objects:', nestedCount)
        } catch (error) {
          console.error('Error parsing objects response:', error)
        }
      } else {
        console.warn('Failed to fetch objects')
      }
      
      // Remove duplicates based on _id
      const uniqueProperties = Array.from(
        new Map(allProperties.map(prop => [prop._id, prop])).values()
      )
      
      console.log('Total unique properties loaded:', uniqueProperties.length)
      console.log('Properties sample:', uniqueProperties.slice(0, 5).map((p: Property) => ({
        id: p._id,
        name: p.name || p.title,
        address: p.address,
        city: p.city,
        objectId: (p as any).objectId,
        unitId: (p as any).unitId
      })))
      
      setProperties(uniqueProperties)
    } catch (error) {
      console.error('Error loading properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setPropertiesLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client._id || '',
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email || '',
      propertyId: '', // Reset property when client changes
      propertyAddress: ''
    }))
    setClientSearchTerm(`${client.firstName} ${client.lastName}`)
    setShowClientDropdown(false)
  }

  const handleAgentSelect = (agent: Agent) => {
    console.log('Agent selected:', agent)
    console.log('Agent ID:', agent._id)
    console.log('Agent name:', `${agent.firstName} ${agent.lastName}`)
    
    setFormData(prev => ({
      ...prev,
      agentId: agent._id || '',
      agentName: `${agent.firstName} ${agent.lastName}`,
      agentEmail: agent.email || ''
    }))
    setAgentSearchTerm(`${agent.firstName} ${agent.lastName}`)
    setShowAgentDropdown(false)
    
    console.log('Form data updated with agent:', {
      agentId: agent._id || '',
      agentName: `${agent.firstName} ${agent.lastName}`
    })
  }

  const handleClientSearch = (term: string) => {
    setClientSearchTerm(term)
    setShowClientDropdown(true)
    
    // Clear form data when user starts typing (unless it's the same as current selection)
    if (term !== formData.clientName) {
      setFormData(prev => ({
        ...prev,
        clientId: '',
        clientName: '',
        clientEmail: '',
        propertyId: '',
        propertyAddress: ''
      }))
    }
  }

  const handleAgentSearch = (term: string) => {
    setAgentSearchTerm(term)
    setShowAgentDropdown(true)
    
    // Clear form data when user starts typing (unless it's the same as current selection)
    if (term !== formData.agentName) {
      setFormData(prev => ({
        ...prev,
        agentId: '',
        agentName: '',
        agentEmail: ''
      }))
    }
  }

  const handlePropertySearch = (term: string) => {
    setPropertySearchTerm(term)
    setShowPropertyDropdown(true)
    
    // Clear form data when user starts typing (unless it's the same as current selection)
    if (term !== formData.propertyAddress) {
      setFormData(prev => ({
        ...prev,
        propertyId: '',
        propertyAddress: ''
      }))
    }
  }

  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearchTerm.toLowerCase())
  )

  const filteredAgents = agents.filter(agent =>
    `${agent.firstName} ${agent.lastName}`.toLowerCase().includes(agentSearchTerm.toLowerCase()) ||
    agent.email.toLowerCase().includes(agentSearchTerm.toLowerCase())
  )

  // Helper function to get property display text
  const getPropertyDisplay = (property: Property): string => {
    // Try to get name or title
    const name = property.name || property.title || ''
    
    // Handle address - can be object or string
    let addressText = ''
    if (property.address) {
      if (typeof property.address === 'string') {
        addressText = property.address
      } else if (typeof property.address === 'object') {
        // Build address from object fields
        const parts: string[] = []
        if (property.address.street) parts.push(property.address.street)
        if (property.address.city) parts.push(property.address.city)
        if (property.address.state) parts.push(property.address.state)
        if (property.address.zipCode) parts.push(property.address.zipCode)
        addressText = parts.join(', ')
      }
    }
    
    // Fallback to city if available
    if (!addressText && property.city) {
      addressText = property.city
    }
    
    // Add object/unit context for nested properties
    const propAny = property as any
    const contextParts: string[] = []
    if (propAny.objectName) {
      contextParts.push(propAny.objectName)
    }
    if (propAny.unitNumber) {
      contextParts.push(`Unit ${propAny.unitNumber}`)
    }
    const context = contextParts.length > 0 ? ` (${contextParts.join(' - ')})` : ''
    
    // Combine name, address, and context
    if (name && addressText) {
      return `${name} - ${addressText}${context}`
    } else if (name) {
      return `${name}${context}`
    } else if (addressText) {
      return `${addressText}${context}`
    }
    return `Property ${property._id || ''}${context}`
  }

  const filteredProperties = properties.filter(property => {
    // If no search term, show all properties
    if (!propertySearchTerm.trim()) {
      return true
    }
    
    const propertyDisplay = getPropertyDisplay(property)
    const searchTerm = propertySearchTerm.toLowerCase()
    
    const propAny = property as any
    
    // Search in display text, name, title, address fields, and object/unit context
    return (
      propertyDisplay.toLowerCase().includes(searchTerm) ||
      property.name?.toLowerCase().includes(searchTerm) ||
      property.title?.toLowerCase().includes(searchTerm) ||
      (typeof property.address === 'string' && property.address.toLowerCase().includes(searchTerm)) ||
      (typeof property.address === 'object' && (
        property.address?.street?.toLowerCase().includes(searchTerm) ||
        property.address?.city?.toLowerCase().includes(searchTerm) ||
        property.address?.state?.toLowerCase().includes(searchTerm) ||
        property.address?.zipCode?.toLowerCase().includes(searchTerm)
      )) ||
      property.city?.toLowerCase().includes(searchTerm) ||
      property._id?.toLowerCase().includes(searchTerm) ||
      propAny.objectName?.toLowerCase().includes(searchTerm) ||
      propAny.unitNumber?.toLowerCase().includes(searchTerm) ||
      (propAny.unitNumber && `unit ${propAny.unitNumber}`.toLowerCase().includes(searchTerm))
    )
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('=== FORM SUBMISSION DEBUG ===')
    console.log('Form data:', formData)
    console.log('Client ID:', formData.clientId)
    console.log('Agent ID:', formData.agentId)
    console.log('Scheduled Date:', formData.scheduledDate)
    console.log('Scheduled Time:', formData.scheduledTime)
    console.log('Inspection Type:', formData.inspectionType)
    
    if (!formData.clientId || !formData.agentId || !formData.scheduledDate || !formData.scheduledTime || !formData.inspectionType) {
      console.error('Missing required fields:', {
        clientId: !formData.clientId,
        agentId: !formData.agentId,
        scheduledDate: !formData.scheduledDate,
        scheduledTime: !formData.scheduledTime,
        inspectionType: !formData.inspectionType
      })
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      
      // Combine date and time into a single datetime
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)
      
      const inspectionData = {
        clientId: formData.clientId,
        propertyId: formData.propertyId || null, // Will be handled by backend
        inspectorId: formData.agentId,
        scheduledDate: scheduledDateTime,
        inspectionType: formData.inspectionType,
        status: 'scheduled',
        summary: formData.notes
      }
      
      console.log('Inspection data to be sent:', inspectionData)

      const isEditing = !!editingInspection
      const url = isEditing ? getApiUrl(`/inspections/${editingInspection.id}`) : getApiUrl('/inspections')
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders()
        },
        body: JSON.stringify(inspectionData)
      })

      if (response.ok) {
        toast.success(isEditing ? 'Inspection updated successfully!' : 'Inspection scheduled successfully!')
        onInspectionScheduled()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.message || `Failed to ${isEditing ? 'update' : 'schedule'} inspection`)
      }
    } catch (error) {
      console.error('Error scheduling inspection:', error)
      toast.error('Failed to schedule inspection')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      clientId: '',
      clientName: '',
      clientEmail: '',
      propertyId: '',
      propertyAddress: '',
      agentId: '',
      agentName: '',
      agentEmail: '',
      scheduledDate: '',
      scheduledTime: '',
      inspectionType: '',
      notes: ''
    })
    setClientSearchTerm('')
    setAgentSearchTerm('')
    setAdditionalEmails([])
    setEmailInput('')
    setSendEmail(false)
    setShowClientDropdown(false)
    setShowAgentDropdown(false)
  }

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailInput.trim()) {
      e.preventDefault()
      const email = emailInput.trim().toLowerCase()
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        toast.error('Please enter a valid email address')
        return
      }
      
      // Check if email already exists
      const allEmails = [
        formData.clientEmail,
        formData.agentEmail,
        ...additionalEmails
      ].filter(Boolean)
      
      if (allEmails.includes(email)) {
        toast.error('This email is already added')
        return
      }
      
      setAdditionalEmails(prev => [...prev, email])
      setEmailInput('')
    }
  }

  const handleRemoveEmail = (emailToRemove: string) => {
    setAdditionalEmails(prev => prev.filter(email => email !== emailToRemove))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center mr-3">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {editingInspection ? 'Edit Inspection' : 'Schedule Inspection'}
              </h2>
              <p className="text-sm text-gray-600">
                {editingInspection ? 'Update the inspection details' : 'Create a new inspection appointment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client and Agent Selection in Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Client Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Client Information
              </h3>
              <div className="relative dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Client *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.clientName || clientSearchTerm}
                    onChange={(e) => handleClientSearch(e.target.value)}
                    onFocus={() => setShowClientDropdown(true)}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Search for a client..."
                    required
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                
                {showClientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {clientsLoading ? (
                      <div className="p-4 text-center text-gray-500">Loading clients...</div>
                    ) : filteredClients.length > 0 ? (
                      filteredClients.map((client) => (
                        <button
                          key={client._id}
                          type="button"
                          onClick={() => handleClientSelect(client)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {client.firstName} {client.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{client.email}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500">No clients found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Agent Selection */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-purple-600" />
                Agent Assignment
              </h3>
              <div className="relative dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Agent *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.agentName || agentSearchTerm}
                    onChange={(e) => handleAgentSearch(e.target.value)}
                    onFocus={() => setShowAgentDropdown(true)}
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Search for an agent..."
                    required
                  />
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                
                {showAgentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {agentsLoading ? (
                      <div className="p-4 text-center text-gray-500">Loading agents...</div>
                    ) : filteredAgents.length > 0 ? (
                      filteredAgents.map((agent) => {
                        console.log('Rendering agent in dropdown:', agent)
                        return (
                        <button
                          key={agent._id}
                          type="button"
                          onClick={() => handleAgentSelect(agent)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {agent.firstName} {agent.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{agent.email}</div>
                          {agent.specialties && agent.specialties.length > 0 && (
                            <div className="text-xs text-gray-400 mt-1">
                              Specialties: {agent.specialties.join(', ')}
                            </div>
                          )}
                        </button>
                        )
                      })
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No agents found
                        <div className="text-xs text-gray-400 mt-1">
                          Total agents loaded: {agents.length}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Property Information */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-green-600" />
              Property Information
            </h3>
            <div className="dropdown-container relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={editingInspection ? formData.propertyAddress : propertySearchTerm}
                  onChange={(e) => editingInspection ? null : handlePropertySearch(e.target.value)}
                  onFocus={() => !editingInspection && setShowPropertyDropdown(true)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder={editingInspection ? "Property Address" : "Search for a property..."}
                  readOnly={!!editingInspection}
                />
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              
              {showPropertyDropdown && !editingInspection && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {propertiesLoading ? (
                    <div className="p-4 text-center text-gray-500">Loading properties...</div>
                  ) : filteredProperties.length > 0 ? (
                    filteredProperties.map((property) => {
                      const propertyDisplay = getPropertyDisplay(property)
                      const name = property.name || property.title || ''
                      const address = property.address
                      const addressText = typeof address === 'string' 
                        ? address 
                        : (typeof address === 'object' && address?.street) 
                          ? `${address.street}${address.city ? `, ${address.city}` : ''}`
                          : ''
                      
                      return (
                        <button
                          key={property._id}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              propertyId: property._id || '',
                              propertyAddress: propertyDisplay
                            }))
                            setPropertySearchTerm(propertyDisplay)
                            setShowPropertyDropdown(false)
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900">{propertyDisplay}</div>
                          {name && addressText && name !== addressText && (
                            <div className="text-xs text-gray-500">
                              {name !== propertyDisplay ? name : addressText}
                            </div>
                          )}
                        </button>
                      )
                    })
                  ) : (
                    <div className="p-4 text-center text-gray-500">
                      {propertySearchTerm.trim() 
                        ? `No properties found matching "${propertySearchTerm}"`
                        : 'No properties available'
                      }
                      <div className="text-xs text-gray-400 mt-1">
                        Total properties loaded: {properties.length}
                        {propertySearchTerm.trim() && properties.length > 0 && (
                          <div className="mt-1">
                            Try searching by name, address, or city
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Date and Time */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-purple-600" />
              Schedule Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  name="scheduledTime"
                  value={formData.scheduledTime}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>
          </div>

          {/* Inspection Type */}
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-orange-600" />
              Inspection Details
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inspection Type *
              </label>
              <div className="relative">
                <select
                  name="inspectionType"
                  value={formData.inspectionType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white cursor-pointer"
                  required
                >
                  <option value="">Select inspection type</option>
                  {inspectionTypes.map((type) => (
                    <option key={type} value={type}>
                      {type === 'pre-purchase' ? 'Pre-purchase Inspection' :
                       type === 'pre-sale' ? 'Pre-sale Inspection' :
                       type === 'routine' ? 'Routine Inspection' :
                       type === 'insurance' ? 'Insurance Inspection' :
                       type === 'maintenance' ? 'Maintenance Inspection' : type}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Add any additional notes for this inspection..."
            />
          </div>

          {/* Email Recipients */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                Email Recipients
              </h3>
              <button
                type="button"
                onClick={() => setSendEmail(!sendEmail)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
                  sendEmail 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Check className={`w-4 h-4 mr-2 ${sendEmail ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">Send Email</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Email Pills */}
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {formData.clientEmail && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {formData.clientEmail}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, clientEmail: '' }))}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {formData.agentEmail && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                    {formData.agentEmail}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, agentEmail: '' }))}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {additionalEmails.map((email, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-gray-200 text-gray-800"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-2 text-gray-600 hover:text-gray-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              
              {/* Add Email Input */}
              <div className="relative">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={handleAddEmail}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Type email and press Enter to add..."
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl font-medium hover:from-blue-600 hover:to-teal-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading 
                ? (editingInspection ? 'Updating...' : 'Scheduling...') 
                : (editingInspection ? 'Update Inspection' : 'Schedule Inspection')
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
