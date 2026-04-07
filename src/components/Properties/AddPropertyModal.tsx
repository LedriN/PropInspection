import React, { useState, useEffect } from 'react'
import { X, Upload, FileText, Building2, MapPin, DollarSign, Square, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { LeafletMapSelector } from './LeafletMapSelector'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onPropertyAdded: () => void
  objectId?: string // Optional object ID to associate the property with
  objectName?: string // Optional object name to display
  objectAddress?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  } | string // Optional object address to inherit
  unitId?: string // Optional unit ID to associate the property with
  unitName?: string // Optional unit name to display
}

export function AddPropertyModal({ isOpen, onClose, onPropertyAdded, objectId, objectName, objectAddress, unitId, unitName }: AddPropertyModalProps) {
  const [loading, setLoading] = useState(false)
  
  // Initialize address from object if provided (especially when adding to a unit)
  const getInitialAddress = () => {
    if (objectAddress) {
      if (typeof objectAddress === 'object') {
        return {
          street: objectAddress.street || '',
          city: objectAddress.city || '',
          state: objectAddress.state || '',
          zipCode: objectAddress.zipCode || '',
          country: objectAddress.country || 'Switzerland'
        }
      }
    }
    return {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Switzerland'
    }
  }
  
  const [formData, setFormData] = useState({
    name: '',
    propertyType: '',
    address: getInitialAddress(),
    coordinates: {
      lat: null as number | null,
      lng: null as number | null
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

  const [images, setImages] = useState<File[]>([])
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [featureInput, setFeatureInput] = useState('')
  const [featureList, setFeatureList] = useState<string[]>([])
  const [selectedAddress, setSelectedAddress] = useState<string>('')

  // Update address when objectAddress changes (especially when modal opens with unitId)
  useEffect(() => {
    if (isOpen && objectAddress) {
      const address = typeof objectAddress === 'object' ? objectAddress : {}
      setFormData(prev => ({
        ...prev,
        address: {
          street: address.street || prev.address.street || '',
          city: address.city || prev.address.city || '',
          state: address.state || prev.address.state || '',
          zipCode: address.zipCode || prev.address.zipCode || '',
          country: address.country || prev.address.country || 'Switzerland'
        }
      }))
    }
  }, [isOpen, objectAddress])

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setSelectedAddress(address)
    setFormData(prev => ({
      ...prev,
      coordinates: { lat, lng }
    }))
  }

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setImages(prev => [...prev, ...files].slice(0, 10)) // Limit to 10 images
      toast.success(`${files.length} image(s) selected`)
    }
  }

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setPdfFile(file)
      toast.success('PDF document selected')
    } else {
      toast.error('Please select a valid PDF file')
    }
  }

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // When adding to a unit, address is inherited from parent object, so don't require it
    const requiresAddress = !unitId
    if (!formData.name || (requiresAddress && (!formData.address.street || !formData.address.city))) {
      toast.error('Please fill in all required fields')
      return
    }

    // Require at least one image
    if (images.length === 0) {
      toast.error('Please upload at least one featured image for the property')
      return
    }

    try {
      setLoading(true)
      
      // When adding to a unit, ensure address is inherited from parent object
      let addressToUse = formData.address
      if (unitId && objectAddress) {
        if (typeof objectAddress === 'object') {
          addressToUse = {
            street: objectAddress.street || '',
            city: objectAddress.city || '',
            state: objectAddress.state || '',
            zipCode: objectAddress.zipCode || '',
            country: objectAddress.country || 'Switzerland'
          }
        }
      }
      
      // Create FormData for file uploads
      const formDataToSend = new FormData()
      
      // Add all form fields
      formDataToSend.append('name', formData.name)
      formDataToSend.append('propertyType', formData.propertyType)
      formDataToSend.append('address', JSON.stringify(addressToUse))
      formDataToSend.append('coordinates', JSON.stringify(formData.coordinates))
      formDataToSend.append('size', JSON.stringify({
        bedrooms: parseInt(formData.size.bedrooms) || 0,
        bathrooms: parseFloat(formData.size.bathrooms) || 0,
        squareFeet: parseFloat(formData.size.squareFeet) || 0
      }))
      formDataToSend.append('rent_price', (parseFloat(formData.rent_price) || 0).toString())
      // Do not send status; backend should apply its own default
      formDataToSend.append('description', formData.description)
      formDataToSend.append('features', (featureList.length ? featureList.join(', ') : formData.features))
      formDataToSend.append('yearBuilt', (parseInt(formData.yearBuilt) || null)?.toString() || '')
      formDataToSend.append('parking', formData.parking)
      formDataToSend.append('petFriendly', formData.petFriendly.toString())
      formDataToSend.append('furnished', formData.furnished.toString())
      
      // Add objectId if provided (to link property to an object)
      if (objectId) {
        formDataToSend.append('objectId', objectId)
      }
      
      // Add unitId if provided (to link property to a unit)
      if (unitId) {
        formDataToSend.append('unitId', unitId)
      }
      
      // Add images
      images.forEach((image) => {
        formDataToSend.append('images', image)
      })
      
      // Add PDF if exists
      if (pdfFile) {
        formDataToSend.append('pdf', pdfFile)
      }

      console.log('Sending property data with files:', {
        name: formData.name,
        imagesCount: images.length,
        hasPdf: !!pdfFile
      })

      const response = await fetch(getApiUrl('/properties'), {
        method: 'POST',
        headers: {
          'Authorization': getAuthHeaders().Authorization || ''
          // Don't set Content-Type, let browser set it with boundary for FormData
        },
        body: formDataToSend
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Property created with images:', result)
        toast.success('Property added successfully!')
        onPropertyAdded()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to add property')
      }
    } catch (error) {
      console.error('Error adding property:', error)
      toast.error('Failed to add property')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      propertyType: '',
      address: getInitialAddress(),
      coordinates: {
        lat: null,
        lng: null
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
    setFeatureInput('')
    setFeatureList([])
    setImages([])
    setPdfFile(null)
    setSelectedAddress('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 custom-red rounded-xl flex items-center justify-center mr-3">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Property</h2>
              <p className="text-sm text-gray-600">
                {unitName 
                  ? `Adding property to: ${unitName}${objectName ? ` in ${objectName}` : ''}`
                  : objectName 
                    ? `Adding property to: ${objectName}`
                    : 'Fill in the property details below'
                }
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

          {/* Address - Only show when NOT adding to a unit */}
          {!unitId && (
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
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
                    placeholder="Switzerland"
                  />
                </div>
              </div>
            </div>
          )}


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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus;border-transparent transition-all duration-200"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
                    <span key={`${feat}-${idx}`} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                      {feat}
                      <button type="button" className="ml-2 text-indigo-700/70 hover:text-indigo-900" onClick={() => setFeatureList(prev => prev.filter((_, i) => i !== idx))}>
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
                  className="w-4 h-4 text-[#8d2138] border-gray-300 rounded focus:ring-[#8d2138]"
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

          {/* File Uploads */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-orange-600" />
              Media & Documents
            </h3>
            
            {/* Images */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Images (up to 10) <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors duration-200">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
                <label htmlFor="image-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2" style={{color: '#8d2138'}} />
                  <p className="text-sm text-gray-600">Click to upload images</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB each</p>
                </label>
              </div>
              
              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(image)}
                        alt={`Property ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PDF Document */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Documents (PDF)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors duration-200">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <FileText className="w-8 h-8 mx-auto mb-2" style={{color: '#8d2138'}} />
                  <p className="text-sm text-gray-600">Click to upload PDF document</p>
                  <p className="text-xs text-gray-500 mt-1">Property brochure, floor plans, etc.</p>
                </label>
              </div>
              
              {pdfFile && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-800">{pdfFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setPdfFile(null)}
                      className="ml-auto text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
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
              {loading ? 'Adding Property...' : 'Add Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
