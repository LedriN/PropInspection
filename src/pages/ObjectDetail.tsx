import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Building2, Plus, Edit, Trash2, Eye, Search, Filter, Upload } from 'lucide-react'
import { Property, PropertyObject, BuildingUnit } from '../types/database'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders, getAssetUrl } from '../config/api'
import { useAuth } from '../contexts/AuthContext'
import { AddPropertyModal } from '../components/Properties/AddPropertyModal'
import { EditPropertyModal } from '../components/Properties/EditPropertyModal'
import { DeletePropertyModal } from '../components/Properties/DeletePropertyModal'
import { ViewPropertyModal } from '../components/Properties/ViewPropertyModal'
import { EditObjectModal } from '../components/Properties/EditObjectModal'
import { DeleteObjectModal } from '../components/Properties/DeleteObjectModal'
import { AddUnitModal } from '../components/Properties/AddUnitModal'
import { DeleteUnitModal } from '../components/Properties/DeleteUnitModal'

const statusColors = {
  Available: 'bg-green-100 text-green-700',
  Occupied: 'bg-green-100 text-green-700',
  Vacant: 'bg-orange-100 text-orange-700',
  Maintenance: 'bg-yellow-100 text-yellow-700',
  Unavailable: 'bg-red-100 text-red-700',
}

export function ObjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [object, setObject] = useState<PropertyObject | null>(null)
  const [units, setUnits] = useState<BuildingUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddUnitModal, setShowAddUnitModal] = useState(false)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [showEditPropertyModal, setShowEditPropertyModal] = useState(false)
  const [showDeletePropertyModal, setShowDeletePropertyModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditObjectModal, setShowEditObjectModal] = useState(false)
  const [showDeleteObjectModal, setShowDeleteObjectModal] = useState(false)
  const [showDeleteUnitModal, setShowDeleteUnitModal] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedUnit, setSelectedUnit] = useState<BuildingUnit | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('Units')
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (id) {
      loadObject()
    }
  }, [id])

  const loadObject = async () => {
    if (!id) return
    
    try {
      setLoading(true)
      const response = await fetch(getApiUrl(`/objects/${id}`), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        const fetchedObject = result.data
        console.log('Fetched object:', fetchedObject)
        setObject(fetchedObject)
        
        // Use units from the object if available, otherwise fetch separately
        if (fetchedObject.units) {
          console.log('Fetched units from object:', fetchedObject.units)
          setUnits(fetchedObject.units)
        } else if (fetchedObject._id) {
          // Fallback: fetch units separately if not included in object
          const unitsResponse = await fetch(getApiUrl(`/units?objectId=${fetchedObject._id}`), {
            headers: getAuthHeaders()
          })
          
          if (unitsResponse.ok) {
            const unitsResult = await unitsResponse.json()
            const fetchedUnits = unitsResult.data || []
            console.log('Fetched units separately:', fetchedUnits)
            setUnits(fetchedUnits)
          } else {
            setUnits([])
          }
        } else {
          setUnits([])
        }
      } else {
        toast.error('Failed to load object')
        navigate(-1)
      }
    } catch (error) {
      console.error('Error loading object:', error)
      toast.error('Failed to load object')
      navigate(-1)
    } finally {
      setLoading(false)
    }
  }

  const handleUnitAdded = () => {
    loadObject()
  }

  const handlePropertyAdded = () => {
    loadObject()
  }

  const handlePropertyUpdated = () => {
    loadObject()
  }

  const handlePropertyDeleted = () => {
    loadObject()
  }

  const handleObjectUpdated = () => {
    loadObject()
  }

  const handleObjectDeleted = () => {
    navigate(-1)
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

  // Flatten units and properties into table rows (for Properties tab)
  const tableRows = useMemo(() => {
    const rows: Array<{
      property: Property
      unit: BuildingUnit
      unitNumber: string
    }> = []
    
    units.forEach((unit) => {
      const unitProperties = unit.properties || []
      unitProperties.forEach((property) => {
        rows.push({
          property,
          unit,
          unitNumber: unit.unitNumber || ''
        })
      })
    })
    
    return rows
  }, [units])

  // Filter units for Units tab
  const filteredUnits = useMemo(() => {
    return units.filter((unit) => {
      const unitNumber = unit.unitNumber || ''
      const matchesSearch = !searchTerm || 
        unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (unit.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [units, searchTerm])

  // Get properties for a specific unit
  const getUnitProperties = (unit: BuildingUnit) => {
    const unitProperties = unit.properties || []
    return unitProperties.filter((property) => {
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
  }

  const toggleUnitExpansion = (unitId: string) => {
    setExpandedUnits(prev => {
      const newSet = new Set(prev)
      if (newSet.has(unitId)) {
        newSet.delete(unitId)
      } else {
        newSet.add(unitId)
      }
      return newSet
    })
  }


  // Filter table rows
  const filteredRows = useMemo(() => {
    return tableRows.filter((row) => {
      const property = row.property
      const propertyName = property.name || property.title || ''
      const address = typeof property.address === 'object' 
        ? `${property.address?.street || ''} ${property.address?.city || ''}`.trim()
        : property.address || ''
      
      const matchesSearch = !searchTerm || 
        propertyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.unitNumber.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesType = !propertyTypeFilter || 
        (property.propertyType || property.property_type || '').toLowerCase() === propertyTypeFilter.toLowerCase()
      
      const matchesStatus = !statusFilter || 
        (property.status || '').toLowerCase() === statusFilter.toLowerCase()
      
      return matchesSearch && matchesType && matchesStatus
    })
  }, [tableRows, searchTerm, propertyTypeFilter, statusFilter])

  // Get unique property types and statuses for filters
  const propertyTypes = useMemo(() => {
    const types = new Set<string>()
    tableRows.forEach(row => {
      const type = row.property.propertyType || row.property.property_type
      if (type) types.add(type)
    })
    return Array.from(types).sort()
  }, [tableRows])

  const statuses = useMemo(() => {
    const statusSet = new Set<string>()
    tableRows.forEach(row => {
      if (row.property.status) statusSet.add(row.property.status)
    })
    return Array.from(statusSet).sort()
  }, [tableRows])

  // Get tenant name from property (mock or real data)
  const getTenantName = (property: Property): string => {
    // Try to get tenant from property data
    const propAny = property as any
    if (propAny.tenantName) return propAny.tenantName
    if (propAny.tenant?.firstName && propAny.tenant?.lastName) {
      return `${propAny.tenant.firstName} ${propAny.tenant.lastName}`
    }
    // Mock tenant names based on property status
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

  if (!object) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Object not found</p>
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Portfolio</h1>
        <button
          className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Upload className="w-4 h-4 mr-2 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Import</span>
        </button>
      </div>

      {/* Top Bar with Search and Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Unit Total {tableRows.length}
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search properties"
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-2">
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
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddUnitModal(true)}
            className="flex items-center px-4 py-2 text-white rounded-lg font-medium transition-all duration-200"
            style={{backgroundColor: '#8d2138'}}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Unit
          </button>
          <button
            onClick={() => setShowEditObjectModal(true)}
            className="flex items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200"
          >
            <Edit className="w-4 h-4 mr-2 text-gray-500" />
            Edit
          </button>
        </div>
      </div>

      {/* Units Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {activeTab === 'Units' ? (
          <>
            {/* Units Table Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="col-span-2">Unit</div>
                <div className="col-span-2">Properties</div>
                <div className="col-span-2">Floor</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
            </div>

            {/* Units Table Body */}
            <div className="divide-y divide-gray-100">
              {filteredUnits.length > 0 ? (
                filteredUnits.map((unit) => {
                  const unitId = unit._id ? String(unit._id) : `unit-${Math.random()}`
                  const unitProperties = getUnitProperties(unit)
                  
                  return (
                    <div key={unitId}>
                      {/* Unit Row */}
                      <div 
                        className="px-6 py-5 hover:bg-gray-50/50 transition-all duration-200 cursor-pointer rounded-lg mx-2 my-1"
                        onClick={() => toggleUnitExpansion(unitId)}
                      >
                        <div className="grid grid-cols-12 gap-4 items-center">
                          {/* Unit */}
                          <div className="col-span-2 flex items-center">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mr-3 shadow-sm">
                              <Building2 className="w-5 h-5 text-gray-500" />
                            </div>
                            <span className="text-sm font-semibold text-gray-800">{unit.unitNumber}</span>
                          </div>

                          {/* Properties Count */}
                          <div className="col-span-2">
                            <span className="text-sm text-gray-600">{unitProperties.length} propert{unitProperties.length === 1 ? 'y' : 'ies'}</span>
                          </div>

                          {/* Floor */}
                          <div className="col-span-2">
                            <span className="text-sm text-gray-600">{unit.floor || '-'}</span>
                          </div>

                          {/* Description */}
                          <div className="col-span-4">
                            <span className="text-sm text-gray-500 truncate">{unit.description || '-'}</span>
                          </div>

                          {/* Actions */}
                          <div className="col-span-2 flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedUnit(unit)
                                setShowAddPropertyModal(true)
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-105"
                              title="Add Property"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedUnit(unit)
                                setShowDeleteUnitModal(true)
                              }}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105"
                              title="Delete Unit"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Properties */}
                      {expandedUnits.has(unitId) && unitProperties.length > 0 && (
                        <div 
                          className="expanding-properties bg-gradient-to-br from-gray-50/50 to-white border-t border-gray-100 mx-2 mb-2 rounded-b-xl overflow-hidden"
                        >
                          {/* Properties Header */}
                          <div className="px-6 py-3 border-b border-gray-100">
                            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              <div className="col-span-5">Property</div>
                              <div className="col-span-2">Type</div>
                              <div className="col-span-2">Market Rent</div>
                              <div className="col-span-3 text-right">Actions</div>
                            </div>
                          </div>

                          {/* Properties Rows */}
                          <div className="divide-y divide-gray-100/50">
                            {unitProperties.map((property, index) => {
                              const propertyName = property.name || property.title || (typeof property.address === 'object' ? property.address?.street : property.address) || 'Untitled Property'
                              const address = typeof property.address === 'object' 
                                ? `${property.address?.street || ''}, ${property.address?.city || ''}, ${property.address?.state || ''}, ${property.address?.zipCode || ''}, ${property.address?.country || 'US'}`.replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '')
                                : property.address || ''
                              const propertyType = property.propertyType || property.property_type || 'N/A'
                              const propertyImage = property.images && property.images.length > 0 ? property.images[0] : null
                              
                              return (
                                <div key={`${unit._id}-${property._id}-${index}`} className="px-6 py-4 hover:bg-white/60 transition-all duration-200 rounded-lg mx-2 my-1">
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    {/* Property */}
                                    <div className="col-span-5 flex items-center">
                                      {propertyImage ? (
                                        <img
                                          src={getAssetUrl(propertyImage)}
                                          alt={propertyName}
                                          className="w-16 h-16 rounded-xl object-cover mr-3 shadow-sm ring-1 ring-gray-100"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none'
                                          }}
                                        />
                                      ) : (
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mr-3 shadow-sm ring-1 ring-gray-100">
                                          <Building2 className="w-6 h-6 text-gray-400" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-800 text-sm truncate">{propertyName}</h4>
                                        <p className="text-xs text-gray-500 truncate mt-0.5">{address}</p>
                                      </div>
                                    </div>

                                    {/* Type */}
                                    <div className="col-span-2">
                                      <span className="text-sm text-gray-600">{propertyType}</span>
                                    </div>

                                    {/* Market Rent */}
                                    <div className="col-span-2">
                                      <span className="text-sm font-semibold text-gray-800">
                                        €{(property.rent_price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                      </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-3 flex items-center justify-end space-x-1">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleViewProperty(property)
                                        }}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                                        title="View Property"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEditProperty(property)
                                        }}
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                                        title="Edit Property"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteProperty(property)
                                        }}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105"
                                        title="Delete Property"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="px-6 py-12 text-center text-gray-500">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p>No units found. Add units to get started.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Properties Table Header */}
            <div className="bg-gradient-to-r from-gray-50 to-gray-50/50 px-6 py-4 border-b border-gray-100">
              <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="col-span-4">Property</div>
                <div className="col-span-1">Unit</div>
                <div className="col-span-1">Type</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">Tenant Name</div>
                <div className="col-span-2">Market Rent</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
            </div>

            {/* Properties Table Body */}
            <div className="divide-y divide-gray-100">
              {filteredRows.length > 0 ? (
                filteredRows.map((row, index) => {
                  const property = row.property
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
                    <div key={`${row.unit._id}-${property._id}-${index}`} className="px-6 py-5 hover:bg-gray-50/50 transition-all duration-200 rounded-lg mx-2 my-1">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Property */}
                        <div className="col-span-4 flex items-center">
                          {propertyImage ? (
                            <img
                              src={getAssetUrl(propertyImage)}
                              alt={propertyName}
                              className="w-16 h-16 rounded-xl object-cover mr-3 shadow-sm ring-1 ring-gray-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center mr-3 shadow-sm ring-1 ring-gray-100">
                              <Building2 className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 text-sm truncate">{propertyName}</h4>
                            <p className="text-xs text-gray-500 truncate mt-0.5">{address}</p>
                          </div>
                        </div>

                        {/* Unit */}
                        <div className="col-span-1">
                          <span className="text-sm font-medium text-gray-700">{row.unitNumber}</span>
                        </div>

                        {/* Type */}
                        <div className="col-span-1">
                          <span className="text-sm text-gray-600">{propertyType}</span>
                        </div>

                        {/* Status */}
                        <div className="col-span-1">
                          <span className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full shadow-sm ${
                            status === 'Occupied' ? 'bg-green-50 text-green-700 ring-1 ring-green-100' :
                            status === 'Available' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-100' :
                            statusColors[status as keyof typeof statusColors] || 'bg-gray-50 text-gray-700 ring-1 ring-gray-100'
                          }`}>
                            {status === 'Available' ? 'Vacant' : status}
                          </span>
                        </div>

                        {/* Tenant Name */}
                        <div className="col-span-2 flex items-center">
                          {tenantName !== '-' ? (
                            <>
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xs font-medium mr-2.5 shadow-sm ring-2 ring-red-100">
                                {tenantInitials}
                              </div>
                              <span className="text-sm text-gray-700">{tenantName}</span>
                            </>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </div>

                        {/* Market Rent */}
                        <div className="col-span-2">
                          <span className="text-sm font-semibold text-gray-800">
                            €{(property.rent_price || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => handleViewProperty(property)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                            title="View Property"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditProperty(property)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-105"
                            title="Edit Property"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteProperty(property)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-105"
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
                  <p>No properties found. {tableRows.length === 0 ? 'Add units and properties to get started.' : 'Try adjusting your search or filters.'}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <AddUnitModal
        isOpen={showAddUnitModal}
        onClose={() => setShowAddUnitModal(false)}
        onUnitAdded={handleUnitAdded}
        objectId={object._id ? String(object._id) : ''}
      />

      <AddPropertyModal
        isOpen={showAddPropertyModal}
        onClose={() => {
          setShowAddPropertyModal(false)
          setSelectedUnit(null)
        }}
        onPropertyAdded={handlePropertyAdded}
        objectId={object._id ? String(object._id) : undefined}
        objectName={object.name}
        objectAddress={typeof object.address === 'object' ? object.address : undefined}
        unitId={selectedUnit?._id ? String(selectedUnit._id) : undefined}
        unitName={selectedUnit?.unitNumber}
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

      <EditObjectModal
        isOpen={showEditObjectModal}
        onClose={() => setShowEditObjectModal(false)}
        onObjectUpdated={handleObjectUpdated}
        object={object}
      />

      <DeleteObjectModal
        isOpen={showDeleteObjectModal}
        onClose={() => setShowDeleteObjectModal(false)}
        onObjectDeleted={handleObjectDeleted}
        object={object}
      />

      <DeleteUnitModal
        isOpen={showDeleteUnitModal}
        onClose={() => {
          setShowDeleteUnitModal(false)
          setSelectedUnit(null)
        }}
        onUnitDeleted={() => {
          loadObject()
          setSelectedUnit(null)
        }}
        unit={selectedUnit}
      />
    </div>
  )
}

