import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Plus, Search, Filter, Edit, Trash2, RefreshCw, ArrowRight } from 'lucide-react'
import { PropertyObject } from '../types/database'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../config/api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import { AddObjectModal } from '../components/Properties/AddObjectModal'
import { EditObjectModal } from '../components/Properties/EditObjectModal'
import { DeleteObjectModal } from '../components/Properties/DeleteObjectModal'
import { AddPropertyModal } from '../components/Properties/AddPropertyModal'

export function Properties() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [objects, setObjects] = useState<PropertyObject[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddObjectModal, setShowAddObjectModal] = useState(false)
  const [showEditObjectModal, setShowEditObjectModal] = useState(false)
  const [showDeleteObjectModal, setShowDeleteObjectModal] = useState(false)
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false)
  const [selectedObject, setSelectedObject] = useState<PropertyObject | null>(null)

  useEffect(() => {
    loadObjects()
  }, [])

  const loadObjects = async (forceRefresh = false) => {
    try {
      setLoading(true)
      
      // Try to fetch objects first (they should include properties from backend)
      try {
        const objectsUrl = forceRefresh ? `${getApiUrl('/objects')}?refresh=true` : getApiUrl('/objects')
        const objectsResponse = await fetch(objectsUrl, {
          headers: getAuthHeaders()
        })
        
        if (objectsResponse.ok) {
          const objectsResult = await objectsResponse.json()
          const fetchedObjects = objectsResult.data || []
          
          console.log('Fetched objects from API:', fetchedObjects)
          console.log('Number of objects:', fetchedObjects.length)
          
          // Ensure all objects have properties array
          const objectsWithProperties = fetchedObjects.map((obj: PropertyObject) => ({
            ...obj,
            properties: obj.properties || []
          }))
          
          console.log('Objects with properties:', objectsWithProperties)
          
          // Use objects directly (they already have properties nested from backend)
          // Even if empty array, set it so we show "No objects" message
          setObjects(objectsWithProperties)
          
          if (forceRefresh) {
            toast.success(fetchedObjects.length > 0 
              ? `Objects refreshed successfully (${fetchedObjects.length} objects)` 
              : 'Objects refreshed successfully')
          }
          return
        } else {
          console.warn('Objects endpoint returned error:', objectsResponse.status)
        }
      } catch (error) {
        console.error('Error fetching objects:', error)
        // Continue to fallback
      }
      
      // Fallback: fetch properties and create a default object
      const url = forceRefresh ? `${getApiUrl('/properties')}?refresh=true` : getApiUrl('/properties')
      const response = await fetch(url, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        const properties = result.data || []
        
        console.log('Fetched properties for fallback:', properties.length)
        
        // Create a default object with all properties
        setObjects([{
          _id: 'default',
          name: 'All Properties',
          properties: properties
        }])
        
        if (forceRefresh) {
          toast.success('Properties refreshed successfully')
        }
      } else {
        throw new Error('Failed to fetch properties')
      }
    } catch (error) {
      console.error('Error loading objects:', error)
      toast.error('Failed to load objects')
      setObjects([])
    } finally {
      setLoading(false)
    }
  }

  const handleObjectAdded = () => {
    loadObjects()
  }

  const handleObjectUpdated = () => {
    loadObjects()
  }

  const handleObjectDeleted = () => {
    loadObjects()
  }

  const handlePropertyAdded = () => {
    loadObjects()
  }

  const handleEditObject = (object: PropertyObject) => {
    setSelectedObject(object)
    setShowEditObjectModal(true)
  }

  const handleDeleteObject = (object: PropertyObject) => {
    setSelectedObject(object)
    setShowDeleteObjectModal(true)
  }

  const handleViewObject = (object: PropertyObject) => {
    if (object._id && user?.username) {
      navigate(`/${user.username}/objects/${object._id}`)
    }
  }

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
  }

  const filteredObjects = objects.map(object => {
    if (!searchTerm) return object
    
    const filteredProperties = (object.properties || []).filter((property) => {
      const title = property.name || property.title || (typeof property.address === 'object' ? property.address?.street : property.address) || 'Untitled Property'
      const address = typeof property.address === 'object' ? property.address?.street : property.address || ''
      const city = typeof property.address === 'object' ? property.address?.city : property.city || ''
      
      return title.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (address && address.toLowerCase().includes(searchTerm.toLowerCase())) ||
             (city && city.toLowerCase().includes(searchTerm.toLowerCase())) ||
             object.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
    
    return {
      ...object,
      properties: filteredProperties
    }
  }).filter(object => {
    // Show object if it matches search or has matching properties
    if (!searchTerm) return true
    return object.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           (object.properties && object.properties.length > 0)
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('properties.title')}</h1>
          <p className="text-gray-600 mt-1">{t('properties.subtitle')}</p>
        </div>
        <button 
          onClick={() => setShowAddObjectModal(true)}
          className="flex items-center px-4 py-2 text-white rounded-xl font-medium transition-all duration-200"
          style={{backgroundColor: '#8d2138'}}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Object
        </button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('properties.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <button 
          onClick={() => loadObjects(true)}
          className="flex items-center px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200"
          title="Refresh Objects"
        >
          <RefreshCw className="w-5 h-5 mr-2 text-gray-500" />
          Refresh
        </button>
        <button className="flex items-center px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
          <Filter className="w-5 h-5 mr-2 text-gray-500" />
          {t('properties.filter')}
        </button>
      </div>

      {/* Objects List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
              <div className="col-span-4">Object</div>
              <div className="col-span-2">Address</div>
              <div className="col-span-2">Description</div>
              <div className="col-span-2">Properties Count</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-200">
            {filteredObjects.map((object) => {
              const objectId = object._id ? String(object._id) : `obj-${Math.random()}`
              const propertyCount = object.properties?.length || 0
              
              return (
                <div key={objectId} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    {/* Object Info */}
                    <div className="col-span-4 flex items-center cursor-pointer" onClick={() => handleViewObject(object)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3" style={{backgroundColor: '#8d2138'}}>
                        <Building2 className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{object.name}</h3>
                        {typeof object.address === 'object' && object.address?.street && (
                          <p className="text-xs text-gray-500 mt-1">
                            {object.address.street}, {object.address.city}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 ml-2" />
                    </div>

                    {/* Address */}
                    <div className="col-span-2">
                      <div className="text-sm text-gray-600">
                        {typeof object.address === 'object' && object.address?.street ? (
                          <>
                            <div className="truncate">{object.address.street}</div>
                            <div className="truncate">{object.address.city}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">No address</span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 truncate">
                        {object.description || 'No description'}
                      </p>
                    </div>

                    {/* Properties Count */}
                    <div className="col-span-2">
                      <span className="inline-flex items-center px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
                        {propertyCount} propert{propertyCount === 1 ? 'y' : 'ies'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditObject(object)
                        }}
                        className="p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                        title="Edit Object"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteObject(object)
                        }}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
                        title="Delete Object"
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

      {!loading && filteredObjects.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {objects.length === 0 
              ? "No objects added yet. Click 'Add Object' to get started." 
              : "No objects found matching your search."
            }
          </p>
        </div>
      )}

      {/* Add Object Modal */}
      <AddObjectModal
        isOpen={showAddObjectModal}
        onClose={() => setShowAddObjectModal(false)}
        onObjectAdded={handleObjectAdded}
      />

      {/* Edit Object Modal */}
      <EditObjectModal
        isOpen={showEditObjectModal}
        onClose={() => {
          setShowEditObjectModal(false)
          setSelectedObject(null)
        }}
        onObjectUpdated={handleObjectUpdated}
        object={selectedObject}
      />

      {/* Delete Object Modal */}
      <DeleteObjectModal
        isOpen={showDeleteObjectModal}
        onClose={() => {
          setShowDeleteObjectModal(false)
          setSelectedObject(null)
        }}
        onObjectDeleted={handleObjectDeleted}
        object={selectedObject}
      />

      {/* Add Property Modal */}
      <AddPropertyModal
        isOpen={showAddPropertyModal}
        onClose={() => {
          setShowAddPropertyModal(false)
          setSelectedObject(null)
        }}
        onPropertyAdded={handlePropertyAdded}
        objectId={selectedObject?._id ? String(selectedObject._id) : undefined}
        objectName={selectedObject?.name}
        objectAddress={selectedObject?.address && typeof selectedObject.address === 'object' ? selectedObject.address : undefined}
      />

    </div>
  )
}