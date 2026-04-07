import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Building2, 
  MapPin, 
  FileText, 
  History, 
  ArrowLeft,
  DollarSign,
  Square,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  File
} from 'lucide-react'
import { Property } from '../types/database'
import { useLanguage } from '../contexts/LanguageContext'
import { getApiUrl, getAuthHeaders } from '../config/api'
import toast from 'react-hot-toast'
import { AddDocumentModal } from '../components/Properties/AddDocumentModal'

const statusColors = {
  Available: 'bg-green-100 text-green-700',
  Occupied: 'bg-blue-100 text-blue-700',
  Maintenance: 'bg-yellow-100 text-yellow-700',
  Unavailable: 'bg-red-100 text-red-700',
}

export function PropertyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguage()
  const [property, setProperty] = useState<Property | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddDocumentModal, setShowAddDocumentModal] = useState(false)
  const [parentObject, setParentObject] = useState<any>(null)
  const [parentUnit, setParentUnit] = useState<any>(null)

  useEffect(() => {
    if (id) {
      loadProperty()
    }
  }, [id])

  const loadProperty = async () => {
    try {
      setLoading(true)
      const response = await fetch(getApiUrl(`/properties/${id}`), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        const fetchedProperty = result.data || result
        setProperty(fetchedProperty)
        
        // Load parent object if property belongs to one
        if (fetchedProperty.objectId) {
          try {
            const objectResponse = await fetch(getApiUrl(`/objects/${fetchedProperty.objectId}`), {
              headers: getAuthHeaders()
            })
            if (objectResponse.ok) {
              const objectResult = await objectResponse.json()
              setParentObject(objectResult.data)
            }
          } catch (error) {
            console.error('Error loading parent object:', error)
          }
        }
        
        // Load parent unit if property belongs to one
        if (fetchedProperty.unitId) {
          try {
            const unitResponse = await fetch(getApiUrl(`/units/${fetchedProperty.unitId}`), {
              headers: getAuthHeaders()
            })
            if (unitResponse.ok) {
              const unitResult = await unitResponse.json()
              setParentUnit(unitResult.data)
            }
          } catch (error) {
            console.error('Error loading parent unit:', error)
          }
        }
      } else {
        throw new Error('Failed to fetch property')
      }
    } catch (error) {
      console.error('Error loading property:', error)
      toast.error('Failed to load property')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentAdded = () => {
    loadProperty() // Reload property to get updated documents
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('properties.detail.notFound')}</p>
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

  const getFullAddress = () => {
    if (typeof property.address === 'string') {
      return property.address
    }
    
    if (!property.address) {
      return 'No address provided'
    }
    
    const parts = []
    if (property.address.street) parts.push(property.address.street)
    if (property.address.city) parts.push(property.address.city)
    if (property.address.state) parts.push(property.address.state)
    if (property.address.zipCode) parts.push(property.address.zipCode)
    if (property.address.country) parts.push(property.address.country)
    
    return parts.length > 0 ? parts.join(', ') : 'No address provided'
  }

  const fullAddress = getFullAddress()
  const bedrooms = property.size?.bedrooms || property.bedrooms || 0
  const bathrooms = property.size?.bathrooms || property.bathrooms || 0
  const squareFeet = property.size?.squareFeet || property.square_feet || 0
  const propertyType = property.propertyType || property.property_type || 'Property'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {property.name || property.title || 'Property Details'}
            </h1>
            <p className="text-gray-600 mt-1">{propertyType}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex px-4 py-2 text-sm font-medium rounded-full ${statusColors[property.status]}`}>
            {property.status}
          </span>
        </div>
      </div>

      {/* Summary Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Building2 className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
          Property Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Address</span>
            </div>
            <p className="text-gray-900">{fullAddress}</p>
            {typeof property.address === 'object' && property.address && (
              <div className="text-gray-600 text-sm mt-1">
                {property.address.street && <div>{property.address.street}</div>}
                {(property.address.city || property.address.state || property.address.zipCode) && (
                  <div>
                    {[property.address.city, property.address.state, property.address.zipCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
                {property.address.country && <div>{property.address.country}</div>}
              </div>
            )}
          </div>
          
          {(parentObject || parentUnit) && (
            <div>
              <div className="flex items-center text-gray-600 mb-2">
                <Building2 className="w-4 h-4 mr-2" />
                <span className="text-sm font-medium">Location</span>
              </div>
              {parentObject && (
                <p className="text-gray-900">{parentObject.name}</p>
              )}
              {parentUnit && (
                <p className="text-gray-600 text-sm">Unit {parentUnit.unitNumber}</p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center text-gray-600 mb-2">
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Monthly Rent</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              CHF {property.rent_price ? property.rent_price.toLocaleString() : '0'}
            </p>
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Size & Features */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Square className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
            Property Details
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Bedrooms</p>
                <p className="text-lg font-semibold text-gray-900">{bedrooms}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Bathrooms</p>
                <p className="text-lg font-semibold text-gray-900">{bathrooms}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Size</p>
                <p className="text-lg font-semibold text-gray-900">{squareFeet} m²</p>
              </div>
            </div>

            {property.yearBuilt && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Year Built</p>
                <p className="text-gray-900">{property.yearBuilt}</p>
              </div>
            )}

            {property.parking && (
              <div>
                <p className="text-sm text-gray-600 mb-1">Parking</p>
                <p className="text-gray-900">{property.parking}</p>
              </div>
            )}

            <div className="flex items-center space-x-6 pt-2">
              <div className="flex items-center">
                {property.petFriendly ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 mr-2" />
                )}
                <span className="text-sm text-gray-700">Pet Friendly</span>
              </div>
              <div className="flex items-center">
                {property.furnished ? (
                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 mr-2" />
                )}
                <span className="text-sm text-gray-700">Furnished</span>
              </div>
            </div>

            {property.features && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Features</p>
                <div className="flex flex-wrap gap-2">
                  {property.features.split(',').map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                    >
                      {feature.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
            Description
          </h2>
          {property.description ? (
            <p className="text-gray-700 whitespace-pre-wrap">{property.description}</p>
          ) : (
            <p className="text-gray-400 italic">No description provided</p>
          )}
        </div>
      </div>

      {/* Images */}
      {property.images && property.images.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <ImageIcon className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
            Property Images
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {property.images.map((image, index) => (
              <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={image}
                  alt={`Property image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Document */}
      {property.pdf && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <File className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
            Property Document
          </h2>
          <a
            href={property.pdf}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <FileText className="w-5 h-5 mr-2" />
            View PDF Document
          </a>
        </div>
      )}

      {/* Defects */}
      {property.defects && property.defects.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <XCircle className="w-5 h-5 mr-2 text-red-600" />
            Reported Defects
          </h2>
          <div className="space-y-2">
            {property.defects.map((defect, index) => (
              <div
                key={index}
                className="p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-gray-900">{defect}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents & Contracts */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileText className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
            Documents & Contracts
          </h2>
          <button
            onClick={() => property._id && setShowAddDocumentModal(true)}
            disabled={!property._id}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{backgroundColor: '#8d2138'}}
          >
            Add Document
          </button>
        </div>
        
        {!property.documents || property.documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No documents available</p>
          </div>
        ) : (
          <div className="space-y-2">
            {property.documents.map((doc) => (
              <div
                key={doc._id || doc.name}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileText className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-600">
                      {doc.type} • {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intervention History */}
      {property.interventions && property.interventions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <History className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
            Intervention History
          </h2>
          <div className="space-y-4">
            {property.interventions.map((intervention) => (
              <div
                key={intervention._id || intervention.date.toString()}
                className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-gray-900">{intervention.type}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(intervention.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{intervention.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      {intervention.performedBy && (
                        <span>Performed by: {intervention.performedBy}</span>
                      )}
                      {intervention.cost && (
                        <span>Cost: CHF {intervention.cost.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AddDocumentModal
        isOpen={showAddDocumentModal}
        onClose={() => setShowAddDocumentModal(false)}
        propertyId={property._id || ''}
        onDocumentAdded={handleDocumentAdded}
      />
    </div>
  )
}
