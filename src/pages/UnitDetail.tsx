import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Building2, ArrowLeft, Plus, Edit, Trash2, Eye, Search, Filter } from 'lucide-react'
import { Property, BuildingUnit } from '../types/database'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders, getAssetUrl } from '../config/api'
import { useAuth } from '../contexts/AuthContext'
import { AddPropertyModal } from '../components/Properties/AddPropertyModal'
import { EditPropertyModal } from '../components/Properties/EditPropertyModal'
import { DeletePropertyModal } from '../components/Properties/DeletePropertyModal'
import { ViewPropertyModal } from '../components/Properties/ViewPropertyModal'
import { DeleteUnitModal } from '../components/Properties/DeleteUnitModal'

const statusColors = {
  Available: 'bg-green-100 text-green-700',
  Occupied: 'bg-green-100 text-green-700',
  Vacant: 'bg-orange-100 text-orange-700',
  Maintenance: 'bg-yellow-100 text-yellow-700',
  Unavailable: 'bg-red-100 text-red-700',
}

export function UnitDetail() {
  const { objectId, unitId } = useParams<{ objectId: string; unitId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unit, setUnit] = useState<BuildingUnit | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    if (unitId) {
      loadUnit()
    }
  }, [unitId])

  const loadUnit = async () => {
    if (!unitId) return
    
    try {
      setLoading(true)
      const response = await fetch(getApiUrl(`/units/${unitId}`), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        setUnit(result.data)
      } else {
        toast.error('Failed to load unit')
        navigate(-1)
      }
    } catch (error) {
      console.error('Error loading unit:', error)
      toast.error('Failed to load unit')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const handlePropertyAdded = () => {
    loadUnit()
  }

  const handlePropertyUpdated = () => {
    loadUnit()
  }

  const handlePropertyDeleted = () => {
    loadUnit()
  }

  const handleUnitDeleted = () => {
    if (objectId && user?.username) {
      navigate(`/${user.username}/objects/${objectId}`)
    } else {
      navigate(-1)
    }
  }

  const handleViewProperty = (property: Property) => {
    if (property._id && user?.username) {
      navigate(`/${user.username}/properties/${property._id}`)
    } else {
      setSelectedProperty(property)
      setShowViewModal(true)
    }
  }

  const handleEditProperty = (property: Property) => {
    setSelectedProperty(property)
    setShowEditPropertyModal(true)
  }

  const handleDeleteProperty = (property: Property) => {
    setSelectedProperty(property)
    setShowDeletePropertyModal(true)
  }

  // Filter properties
  const filteredProperties = useMemo(() => {
    if (!unit) return []
    const properties = unit.properties || []
    
    return properties.filter((property) => {
      const propertyName = property.name || property.title || ''
      const address = typeof property.address === 'object' 
        ? `${property.address?.street || ''} ${property.address?.city || ''}`.trim()
        : property.address || ''
      
      const matchesSearch = !searchTerm || 
        propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        address.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = !propertyTypeFilter || 
        (property.propertyType || property.property_type || '').toLowerCase() === propertyTypeFilter.toLowerCase()
      
      const matchesStatus = !statusFilter || 
        (property.status || '').toLowerCase() === statusFilter.toLowerCase()
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [unit, searchTerm, propertyTypeFilter, statusFilter])

  // Get unique property types and statuses for filters
  const propertyTypes = useMemo(() => {
    const types = new Set<string>()
    if (unit?.properties) {
      unit.properties.forEach(property => {
        const type = property.propertyType || property.property_type
        if (type) types.add(type)
      })
    }
    return Array.from(types).sort()
  }, [unit])

  const statuses = useMemo(() => {
    const statusSet = new Set<string>()
    if (unit?.properties) {
      unit.properties.forEach(property => {
        if (property.status) statusSet.add(property.status)
      })
    }
    return Array.from(statusSet).sort()
  }, [unit])

  // Get tenant name from property (mock or real data)
  const getTenantName = (property: Property): string => {
    const propAny = property as any
    if (propAny.tenantName) return propAny.tenantName
    if (propAny.tenant?.firstName && propAny.tenant?.lastName) {
      return `${propAny.tenant.firstName} ${propAny.tenant.lastName}`
    }
    if (property.status === 'Occupied') {
      const mockTenants = ['Guy Hawkins', 'Bessie Cooper', 'Devon Lane', 'Jane Cooper', 'Wade Warren']
      return mockTenants[Math.abs((property._id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % mockTenants.length]
    }
    return '-'
  }

  // Get tenant avatar initials
  const getTenantInitials = (tenantName: string): string => {
    if (tenantName === '-') return ''
    const parts = tenantName.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return tenantName.substring(0, 2).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Unit not found</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 px-4 py-2 text-white rounded-xl"
          style={{backgroundColor: '#8d2138'}}
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => {
              if (objectId && user?.username) {
                navigate(`/${user.username}/objects/${objectId}`)
              } else {
                navigate(-1)
              }
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mr-4" style={{backgroundColor: '#8d2138'}}>
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{unit.unitNumber}</h1>
              <p className="text-gray-600 mt-1">
                {filteredProperties.length} propert{filteredProperties.length === 1 ? 'y' : 'ies'}
                {unit.description && ` • ${unit.description}`}
              </p>
              {unit.floor && (
                <p className="text-sm text-gray-500 mt-1">
                  Floor {unit.floor}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddPropertyModal(true)}
            className="flex items-center px-4 py-2 text-white rounded-xl font-medium transition-all duration-200"
            style={{backgroundColor: '#8d2138'}}
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Property
          </button>
          <button
            onClick={() => setShowDeleteUnitModal(true)}
            className="flex items-center px-4 py-2 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors duration-200"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Unit
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search properties"
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <select
            value={propertyTypeFilter}
            onChange={(e) => setPropertyTypeFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">Property Type</option>
            {propertyTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-4 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            <option value="">Property Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-700 uppercase tracking-wider">
            <div className="col-span-4">Property</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Tenant Name</div>
            <div className="col-span-2">Market Rent</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {filteredProperties.length > 0 ? (
            filteredProperties.map((property, index) => {
              const propertyName = property.name || property.title || (typeof property.address === 'object' ? property.address?.street : property.address) || 'Untitled Property'
              const address = typeof property.address === 'object' 
                ? `${property.address?.street || ''}, ${property.address?.city || ''}, ${property.address?.state || ''}, ${property.address?.zipCode || ''}, ${property.address?.country || 'US'}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
                : property.address || ''
              const propertyType = property.propertyType || property.property_type || 'N/A'
              const status = property.status || 'Available'
              const tenantName = getTenantName(property)
              const tenantInitials = getTenantInitials(tenantName)
              const propertyImage = property.images && property.images.length > 0 ? property.images[0] : null
              
              return (
                <div key={`${property._id}-${index}`} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Property */}
                    <div className="col-span-4 flex items-center">
                      {propertyImage ? (
                        <img
                          src={getAssetUrl(propertyImage)}
                          alt={propertyName}
                          className="w-16 h-16 rounded-lg object-cover mr-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                          <Building2 className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">{propertyName}</h4>
                        <p className="text-xs text-gray-600 truncate">{address}</p>
                      </div>
                    </div>

                    {/* Type */}
                    <div className="col-span-1">
                      <span className="text-sm text-gray-700">{propertyType}</span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        status === 'Occupied' ? 'bg-green-100 text-green-700' :
                        status === 'Available' ? 'bg-orange-100 text-orange-700' :
                        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {status === 'Available' ? 'Vacant' : status}
                      </span>
                    </div>

                    {/* Tenant Name */}
                    <div className="col-span-2 flex items-center">
                      {tenantName !== '-' ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-medium mr-2">
                            {tenantInitials}
                          </div>
                          <span className="text-sm text-gray-900">{tenantName}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </div>

                    {/* Market Rent */}
                    <div className="col-span-2">
                      <span className="text-sm font-semibold text-gray-900">
                        ${(property.rent_price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end space-x-1">
                      <button 
                        onClick={() => handleViewProperty(property)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View Property"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleEditProperty(property)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit Property"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteProperty(property)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete Property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="px-6 py-12 text-center text-gray-500">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p>No properties found. {filteredProperties.length === 0 && (unit.properties || []).length === 0 ? 'Add properties to get started.' : 'Try adjusting your search or filters.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddPropertyModal
        isOpen={showAddPropertyModal}
        onClose={() => setShowAddPropertyModal(false)}
        onPropertyAdded={handlePropertyAdded}
        objectId={objectId}
        unitId={unitId}
        unitName={unit.unitNumber}
      />

      <EditPropertyModal
        isOpen={showEditPropertyModal}
        onClose={() => {
          setShowEditPropertyModal(false)
          setSelectedProperty(null)
        }}
        onPropertyUpdated={handlePropertyUpdated}
        property={selectedProperty}
      />

      <DeletePropertyModal
        isOpen={showDeletePropertyModal}
        onClose={() => {
          setShowDeletePropertyModal(false)
          setSelectedProperty(null)
        }}
        onPropertyDeleted={handlePropertyDeleted}
        property={selectedProperty}
      />

      <ViewPropertyModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setSelectedProperty(null)
        }}
        property={selectedProperty}
      />

      <DeleteUnitModal
        isOpen={showDeleteUnitModal}
        onClose={() => setShowDeleteUnitModal(false)}
        onUnitDeleted={handleUnitDeleted}
        unit={unit}
      />
    </div>
  )
}

