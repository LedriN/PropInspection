import React, { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight, Building2, User, FileText, CheckCircle, AlertTriangle, Home, Wrench, Zap, Droplets, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { Client, Agent, Property } from '../../types/database'

interface GenerateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onReportGenerated: () => void
  reportType: string
}

interface InspectionArea {
  id: string
  name: string
  icon: React.ReactNode
  fields: {
    id: string
    label: string
    type: 'text' | 'select' | 'textarea' | 'number'
    options?: string[]
    required?: boolean
  }[]
}

const inspectionAreas: InspectionArea[] = [
  {
    id: 'exterior',
    name: 'Exterior',
    icon: <Home className="w-5 h-5" />,
    fields: [
      { id: 'roof_condition', label: 'Roof Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'], required: true },
      { id: 'siding_condition', label: 'Siding Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'], required: true },
      { id: 'windows_doors', label: 'Windows & Doors', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'], required: true },
      { id: 'foundation', label: 'Foundation', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'], required: true },
      { id: 'exterior_notes', label: 'Exterior Notes', type: 'textarea', required: false }
    ]
  },
  {
    id: 'interior',
    name: 'Interior',
    icon: <Home className="w-5 h-5" />,
    fields: [
      { id: 'walls_condition', label: 'Walls Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'floors_condition', label: 'Floors Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'ceilings_condition', label: 'Ceilings Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'interior_notes', label: 'Interior Notes', type: 'textarea', required: false }
    ]
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: <Zap className="w-5 h-5" />,
    fields: [
      { id: 'electrical_system', label: 'Electrical System', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Upgrade'], required: true },
      { id: 'outlets_switches', label: 'Outlets & Switches', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'lighting', label: 'Lighting', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'electrical_notes', label: 'Electrical Notes', type: 'textarea', required: false }
    ]
  },
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: <Droplets className="w-5 h-5" />,
    fields: [
      { id: 'water_supply', label: 'Water Supply', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'drainage', label: 'Drainage', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'fixtures', label: 'Fixtures', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'plumbing_notes', label: 'Plumbing Notes', type: 'textarea', required: false }
    ]
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: <Wrench className="w-5 h-5" />,
    fields: [
      { id: 'heating_system', label: 'Heating System', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'], required: true },
      { id: 'cooling_system', label: 'Cooling System', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Replacement'], required: true },
      { id: 'ventilation', label: 'Ventilation', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'], required: true },
      { id: 'hvac_notes', label: 'HVAC Notes', type: 'textarea', required: false }
    ]
  },
  {
    id: 'safety',
    name: 'Safety',
    icon: <Shield className="w-5 h-5" />,
    fields: [
      { id: 'smoke_detectors', label: 'Smoke Detectors', type: 'select', options: ['Present & Working', 'Present - Needs Battery', 'Missing', 'Not Tested'], required: true },
      { id: 'carbon_monoxide', label: 'Carbon Monoxide Detectors', type: 'select', options: ['Present & Working', 'Present - Needs Battery', 'Missing', 'Not Tested'], required: true },
      { id: 'fire_extinguisher', label: 'Fire Extinguisher', type: 'select', options: ['Present & Current', 'Present - Expired', 'Missing'], required: true },
      { id: 'safety_notes', label: 'Safety Notes', type: 'textarea', required: false }
    ]
  }
]

export function GenerateReportModal({ isOpen, onClose, onReportGenerated, reportType }: GenerateReportModalProps) {
  console.log('GenerateReportModal initialized with reportType:', reportType) // Debug log
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  
  // Data states
  const [properties, setProperties] = useState<Property[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  
  // Loading states
  const [propertiesLoading, setPropertiesLoading] = useState(false)
  const [clientsLoading, setClientsLoading] = useState(false)
  const [agentsLoading, setAgentsLoading] = useState(false)
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Property Selection
    propertyId: '',
    propertyName: '',
    
    // Step 2: Agent & Client Selection
    agentId: '',
    agentName: '',
    clientId: '',
    clientName: '',
    
    // Step 3: Report Details
    title: '',
    reportType: reportType || 'inspection',
    
    // Step 4+: Inspection Areas
    inspectionData: {} as Record<string, Record<string, any>>
  })

  const totalSteps = 3 + inspectionAreas.length

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProperties()
      loadClients()
      loadAgents()
    }
  }, [isOpen])

  // Update reportType when prop changes
  useEffect(() => {
    console.log('ReportType prop changed:', reportType) // Debug log
    setFormData(prev => ({
      ...prev,
      reportType: reportType || 'inspection'
    }))
  }, [reportType])

  const loadProperties = async () => {
    try {
      setPropertiesLoading(true)
      const response = await fetch(getApiUrl('/properties'), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        setProperties(result.data || [])
      }
    } catch (error) {
      console.error('Error loading properties:', error)
      toast.error('Failed to load properties')
    } finally {
      setPropertiesLoading(false)
    }
  }

  const loadClients = async () => {
    try {
      setClientsLoading(true)
      const response = await fetch(getApiUrl('/clients'), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        setClients(result.data || [])
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
      const response = await fetch(getApiUrl('/agents'), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        setAgents(result.data || [])
      }
    } catch (error) {
      console.error('Error loading agents:', error)
      toast.error('Failed to load agents')
    } finally {
      setAgentsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleInspectionFieldChange = (areaId: string, fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      inspectionData: {
        ...prev.inspectionData,
        [areaId]: {
          ...prev.inspectionData[areaId],
          [fieldId]: value
        }
      }
    }))
  }

  const handlePropertySelect = (property: Property) => {
    setFormData(prev => ({
      ...prev,
      propertyId: property._id || '',
      propertyName: property.address?.street || 'Property'
    }))
  }

  const handleAgentSelect = (agent: Agent) => {
    setFormData(prev => ({
      ...prev,
      agentId: agent._id || '',
      agentName: `${agent.firstName} ${agent.lastName}`
    }))
  }

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client._id || '',
      clientName: `${client.firstName} ${client.lastName}`
    }))
  }

  const nextStep = () => {
    // Validate current step before proceeding
    if (currentStep === 1 && !formData.propertyId) {
      toast.error('Please select a property before proceeding')
      return
    }
    if (currentStep === 2 && (!formData.agentId || !formData.clientId)) {
      toast.error('Please select both an agent and a client before proceeding')
      return
    }
    if (currentStep === 3 && !formData.title) {
      toast.error('Please enter a report title before proceeding')
      return
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    // Validate required fields
    if (!formData.title || !formData.propertyId || !formData.agentId || !formData.clientId) {
      toast.error('Please complete all required fields before generating the report')
      return
    }

    try {
      setLoading(true)
      
      const reportData = {
        title: formData.title,
        report_type: formData.reportType,
        property_id: formData.propertyId,
        agent_id: formData.agentId,
        client_id: formData.clientId,
        content: formData.inspectionData,
        status: 'Draft',
        generated_at: new Date(),
        generated_by: 'current-user' // You might want to get this from auth context
      }

      console.log('Sending report data:', reportData) // Debug log
      console.log('Form data reportType:', formData.reportType) // Debug log

      const response = await fetch(getApiUrl('/reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(reportData)
      })

      if (response.ok) {
        toast.success('Report generated successfully!')
        onReportGenerated()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to generate report')
      }
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setFormData({
      propertyId: '',
      propertyName: '',
      agentId: '',
      agentName: '',
      clientId: '',
      clientName: '',
      title: '',
      reportType: reportType || 'inspection',
      inspectionData: {}
    })
  }

  const getStepTitle = () => {
    if (currentStep === 1) return 'Select Property'
    if (currentStep === 2) return 'Select Agent & Client'
    if (currentStep === 3) return 'Report Details'
    const areaIndex = currentStep - 4
    return inspectionAreas[areaIndex]?.name || 'Inspection Area'
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600" />
              Select Property
            </h3>
            {propertiesLoading ? (
              <div className="text-center py-8">Loading properties...</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {properties.map((property) => (
                  <button
                    key={property._id}
                    onClick={() => handlePropertySelect(property)}
                    className={`p-4 text-left border rounded-xl transition-all duration-200 ${
                      formData.propertyId === property._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {property.address?.street || 'Property Address'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {property.address?.city}, {property.address?.state} {property.address?.zipCode}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-green-600" />
              Select Agent & Client
            </h3>
            
            {/* Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Agent *
              </label>
              {agentsLoading ? (
                <div className="text-center py-4">Loading agents...</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {agents.map((agent) => (
                    <button
                      key={agent._id}
                      onClick={() => handleAgentSelect(agent)}
                      className={`p-3 text-left border rounded-xl transition-all duration-200 ${
                        formData.agentId === agent._id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {agent.firstName} {agent.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{agent.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Client Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client *
              </label>
              {clientsLoading ? (
                <div className="text-center py-4">Loading clients...</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {clients.map((client) => (
                    <button
                      key={client._id}
                      onClick={() => handleClientSelect(client)}
                      className={`p-3 text-left border rounded-xl transition-all duration-200 ${
                        formData.clientId === client._id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {client.firstName} {client.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{client.email}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-purple-600" />
              Report Details
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter report title..."
                required
              />
            </div>
          </div>
        )

      default:
        const areaIndex = currentStep - 4
        const area = inspectionAreas[areaIndex]
        if (!area) return null

        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              {area.icon}
              <span className="ml-2">{area.name} Inspection</span>
            </h3>
            <div className="space-y-4">
              {area.fields.map((field) => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      value={formData.inspectionData[area.id]?.[field.id] || ''}
                      onChange={(e) => handleInspectionFieldChange(area.id, field.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required={field.required}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options?.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={formData.inspectionData[area.id]?.[field.id] || ''}
                      onChange={(e) => handleInspectionFieldChange(area.id, field.id, e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData.inspectionData[area.id]?.[field.id] || ''}
                      onChange={(e) => handleInspectionFieldChange(area.id, field.id, e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      required={field.required}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center mr-3">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Generate Report</h2>
              <p className="text-sm text-gray-600">{getStepTitle()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-teal-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex items-center px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            {currentStep === totalSteps ? (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.title || !formData.propertyId || !formData.agentId || !formData.clientId}
                className="flex items-center px-6 py-2 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl font-medium hover:from-blue-600 hover:to-teal-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Report'}
              </button>
            ) : (
              <button
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && !formData.propertyId) ||
                  (currentStep === 2 && (!formData.agentId || !formData.clientId)) ||
                  (currentStep === 3 && !formData.title)
                }
                className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl font-medium hover:from-blue-600 hover:to-teal-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
