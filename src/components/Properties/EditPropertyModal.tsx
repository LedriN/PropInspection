import React, { useState, useEffect } from 'react'
import { X, Building2, MapPin, DollarSign, Square, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { Property } from '../../types/database'

interface EditPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onPropertyUpdated: () => void
  property: Property | null
}

export function EditPropertyModal({ isOpen, onClose, onPropertyUpdated, property }: EditPropertyModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    propertyType: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    size: {
      bedrooms: '',
      bathrooms: '',
      squareFeet: ''
    },
    rent_price: '',
    status: 'Available',
    description: '',
    features: '',
    yearBuilt: '',
    parking: '',
    petFriendly: false,
    furnished: false
  })
  const [featureInput, setFeatureInput] = useState('')
  const [featureList, setFeatureList] = useState<string[]>([])

  // Removed file states; Edit does not handle file uploads here

  // Populate form data when property changes
  useEffect(() => {
    if (property) {
      setFormData({
        name: property.name || property.title || '',
        propertyType: property.propertyType || property.property_type || '',
        address: typeof property.address === 'object'
          ? {
              street: property.address?.street || '',
              city: property.address?.city || '',
              state: property.address?.state || '',
              zipCode: property.address?.zipCode || '',
              country: property.address?.country || ''
            }
          : {
              street: property.address || '',
              city: '',
              state: '',
              zipCode: '',
              country: ''
            },
        size: {
          bedrooms: property.size?.bedrooms?.toString() || property.bedrooms?.toString() || '',
          bathrooms: property.size?.bathrooms?.toString() || property.bathrooms?.toString() || '',
          squareFeet: property.size?.squareFeet?.toString() || property.square_feet?.toString() || ''
        },
        rent_price: property.rent_price?.toString() || '',
        status: property.status || 'Available',
        description: property.description || '',
        features: property.features || '',
        yearBuilt: property.yearBuilt?.toString() || '',
        parking: property.parking || '',
        petFriendly: property.petFriendly || false,
        furnished: property.furnished || false
      })
      const initialFeatures = Array.isArray((property as any).features)
        ? ((property as any).features as string[])
        : typeof (property as any).features === 'string'
          ? ((property as any).features as string)
              .split(',')
              .map(f => f.trim())
              .filter(Boolean)
          : []
      setFeatureList(initialFeatures)
    }
  }, [property])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: value
        }
      }))
    } else if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  // Removed unused file handlers

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.address.street || !formData.address.city) {
      toast.error('Please fill in all required fields')
      return
    }

    if (!property?._id) {
      toast.error('Property ID not found')
      return
    }

    try {
      setLoading(true)
      
      // For now, send as JSON (file uploads will be handled later)
      const submitData = {
        ...formData,
        // Convert string numbers to actual numbers
        rent_price: parseFloat(formData.rent_price) || 0,
        yearBuilt: parseInt(formData.yearBuilt) || null,
        size: {
          bedrooms: parseInt(formData.size.bedrooms) || 0,
          bathrooms: parseFloat(formData.size.bathrooms) || 0,
          squareFeet: parseFloat(formData.size.squareFeet) || 0
        },
        features: featureList.length ? featureList.join(', ') : formData.features
      }

      // Do not send status; preserve existing backend/default
      delete (submitData as any).status

      console.log('Updating property data:', submitData)

      const response = await fetch(getApiUrl(`/properties/${property._id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeaders().Authorization || ''
        },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        toast.success('Property updated successfully!')
        onPropertyUpdated()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to update property')
      }
    } catch (error) {
      console.error('Error updating property:', error)
      toast.error('Failed to update property')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !property) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center mr-3">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Property</h2>
              <p className="text-sm text-gray-600">Update the property details below</p>
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
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="e.g., Modern Zürich Apartment"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type *
              </label>
              <div className="relative">
                <select
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white cursor-pointer"
                  required
                >
                  <option value="">Select property type</option>
                  <option value="Apartment">Apartment</option>
                  <option value="House">House</option>
                  <option value="Condo">Condo</option>
                  <option value="Townhouse">Townhouse</option>
                  <option value="Studio">Studio</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Chalet">Chalet</option>
                  <option value="Penthouse">Penthouse</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
              Address Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Address *
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="Bahnhofstrasse 123"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City *
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="Zürich"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="ZH"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="8001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Switzerland"
                />
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Square className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
              Property Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  name="size.bedrooms"
                  value={formData.size.bedrooms}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="2"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  name="size.bathrooms"
                  value={formData.size.bathrooms}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="1"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Square Meters (m²)
                </label>
                <input
                  type="number"
                  name="size.squareFeet"
                  value={formData.size.squareFeet}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="120"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
              Pricing Information
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Rent (CHF)
              </label>
              <input
                type="number"
                name="rent_price"
                value={formData.rent_price}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                placeholder="2500"
                min="0"
              />
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
              Additional Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Built
                </label>
                <input
                  type="number"
                  name="yearBuilt"
                  value={formData.yearBuilt}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="2020"
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking
                </label>
                <input
                  type="text"
                  name="parking"
                  value={formData.parking}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                  placeholder="Tiefgarage, Aussenparkplatz, etc."
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus;border-transparent transition-all duration-200"
                placeholder="Describe the property, its features, and what makes it special..."
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features
              </label>
              <div className="w-full px-3 py-2 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-[#8d2138] focus-within:border-transparent transition-all duration-200">
                <div className="flex flex-wrap gap-2">
                  {featureList.map((feat, idx) => (
                  <span key={`${feat}-${idx}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium" style={{backgroundColor: '#f3e6e9', color: '#8d2138'}}>
                      {feat}
                      <button type="button" className="ml-2" style={{color: '#8d2138'}} onClick={() => setFeatureList(prev => prev.filter((_, i) => i !== idx))}>
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const value = featureInput.trim().replace(/,$/, '')
                        if (value && !featureList.includes(value)) {
                          setFeatureList(prev => [...prev, value])
                          setFeatureInput('')
                        }
                      } else if (e.key === 'Backspace' && !featureInput && featureList.length) {
                        setFeatureList(prev => prev.slice(0, -1))
                      }
                    }}
                    placeholder="Type a feature and press Enter"
                    className="flex-1 min-w-[160px] outline-none text-sm text-gray-700 py-1"
                  />
                </div>
              </div>
              {featureList.length === 0 && (
                <p className="mt-1 text-xs text-gray-500">Examples: Air conditioning, Balcony, Parking</p>
              )}
            </div>

            <div className="mt-4 flex space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="petFriendly"
                  checked={formData.petFriendly}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Pet Friendly</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="furnished"
                  checked={formData.furnished}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Furnished</span>
              </label>
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
              className="px-6 py-3 custom-btn text-white rounded-xl font-medium hover:from-blue-600 hover:to-teal-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Updating Property...' : 'Update Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
