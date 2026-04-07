import { useState } from 'react'
import { X, Building2, MapPin, DollarSign, Bed, Bath, Square, Car, Heart, Home, ChevronLeft, GalleryHorizontal, ChevronRight, FileDown } from 'lucide-react'
import { Property } from '../../types/database'
import { getAssetUrl } from '../../config/api'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface ViewPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  property: Property | null
}

export function ViewPropertyModal({ isOpen, onClose, property }: ViewPropertyModalProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState(0)
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({})
  const [lightboxImageLoaded, setLightboxImageLoaded] = useState(false)

  if (!isOpen || !property) return null

  const statusColors = {
    Available: 'text-green-600 bg-green-100',
    Occupied: 'text-blue-600 bg-blue-100',
    Maintenance: 'text-yellow-600 bg-yellow-100',
    Unavailable: 'text-red-600 bg-red-100',
  }

  const images = property.images || []
  const maxVisibleImages = 1
  const hasMoreImages = images.length > maxVisibleImages

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index)
    setLightboxOpen(true)
    setLightboxImageLoaded(false)
  }

  const closeLightbox = () => {
    setLightboxOpen(false)
  }

  const nextImage = () => {
    setLightboxImageLoaded(false)
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setLightboxImageLoaded(false)
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  const nextCarousel = () => {
    setCurrentCarouselIndex((prev) => Math.min(prev + 1, images.length - maxVisibleImages))
  }

  const prevCarousel = () => {
    setCurrentCarouselIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleTileImageLoad = (index: number) => {
    setLoadedImages((prev) => ({ ...prev, [index]: true }))
  }

  const downloadPDF = () => {
    if (property.pdf) {
      const pdfUrl = getAssetUrl(property.pdf)
      window.open(pdfUrl, '_blank')
    }
  }

  // Get coordinates for map
  const coordinates = (property as any).coordinates
  const hasCoordinates = coordinates && coordinates.lat && coordinates.lng
  const mapCenter: [number, number] = hasCoordinates 
    ? [coordinates.lat, coordinates.lng] 
    : [47.3769, 8.5417] // Default to Zurich

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center mr-3">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {property.name || property.title || (typeof property.address === 'string' ? property.address : property.address?.street) || 'Untitled Property'}
              </h2>
              <p className="text-sm text-gray-600">
                {property.propertyType || property.property_type || 'Property'} • 
                <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[property.status as keyof typeof statusColors]}`}>
                  {property.status}
                </span>
              </p>
            </div>
          </div>
          <div className='flex items-center gap-1'>
          <button
           onClick={downloadPDF}
           className='p-2 text-red-500 hover:bg-red-100 rounded-xl transition-colors duration-200'
          >
            <FileDown className="w-5 h-5 text-red-400" />
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Property Images and Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Property Images */}
            {images.length > 0 && (
              <div className="flex flex-col">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <GalleryHorizontal className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
                Property Images
              </h3>
                <div className="relative flex-1">
                  <div className="overflow-hidden h-64">
                    {images.slice(currentCarouselIndex, currentCarouselIndex + maxVisibleImages).map((image, index) => {
                      const actualIndex = currentCarouselIndex + index
                      return (
                        <div 
                          key={actualIndex} 
                          className="w-full h-full rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative bg-gray-100"
                          onClick={() => openLightbox(actualIndex)}
                        >
                          {!loadedImages[actualIndex] && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-transparent"></div>
                            </div>
                          )}
                          <img
                            src={getAssetUrl(image)}
                            alt={`Property ${actualIndex + 1}`}
                            className={`w-full h-full object-cover ${loadedImages[actualIndex] ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
                            onLoad={() => handleTileImageLoad(actualIndex)}
                          />
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Carousel Navigation */}
                  {hasMoreImages && (
                    <>
                      {currentCarouselIndex > 0 && (
                        <button
                          onClick={prevCarousel}
                          className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                      )}
                      {currentCarouselIndex < images.length - maxVisibleImages && (
                        <button
                          onClick={nextCarousel}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                  
                  {/* Show more indicator */}
                  {hasMoreImages && (
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                      +{images.length - maxVisibleImages} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Property Location Map */}
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
                Property Location
              </h3>
              <div className="h-64 rounded-xl overflow-hidden border border-gray-200 flex-1">
                <MapContainer
                  center={mapCenter}
                  zoom={hasCoordinates ? 16 : 12}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Property Marker */}
                  {hasCoordinates && (
                    <Marker position={mapCenter}>
                      <Popup>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900">{property.name}</div>
                          <div className="text-sm text-gray-600">
                            {typeof property.address === 'string' 
                              ? property.address 
                              : `${property.address?.street || ''}, ${property.address?.city || ''}`}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>
              </div>
              {!hasCoordinates && (
                <p className="text-sm text-gray-500 mt-2 text-center">
                  No specific location coordinates available
                </p>
              )}
            </div>
          </div>

          {/* Property Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Property Type:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {property.propertyType || property.property_type || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Year Built:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {property.yearBuilt || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[property.status as keyof typeof statusColors]}`}>
                      {property.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-600" />
                  Address
                </h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">
                    {typeof property.address === 'string' ? property.address : (property.address?.street || 'No street address')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {typeof property.address === 'string' 
                      ? '' 
                      : `${property.address?.city || 'No city'}, ${property.address?.state || ''} ${property.address?.zipCode || ''}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {typeof property.address === 'string' ? '' : (property.address?.country || 'No country')}
                  </p>
                </div>
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Square className="w-5 h-5 mr-2 text-purple-600" />
                  Property Details
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bed className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Bedrooms:</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {property.size?.bedrooms || property.bedrooms || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bath className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Bathrooms:</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {property.size?.bathrooms || property.bathrooms || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Square className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Size:</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {property.size?.squareFeet || property.square_feet || 0} m²
                    </span>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-600" />
                  Pricing
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Monthly Rent:</span>
                    <span className="text-lg font-bold text-gray-900">
                      CHF {(property.rent_price || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Features & Amenities */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2 text-orange-600" />
              Features & Amenities
            </h3>
            <div className="flex flex-wrap gap-2">
              {/* Amenities as pills */}
              {property.parking && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                  <Car className="w-3 h-3 mr-1" />
                  Parking: {property.parking}
                </span>
              )}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${property.petFriendly ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <Heart className="w-3 h-3 mr-1" />
                Pet Friendly: {property.petFriendly ? 'Yes' : 'No'}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${property.furnished ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <Home className="w-3 h-3 mr-1" />
                Furnished: {property.furnished ? 'Yes' : 'No'}
              </span>

              {/* Features as pills */}
              {property.features && (() => {
                const featuresArray = Array.isArray((property as any).features)
                  ? ((property as any).features as string[])
                  : typeof (property as any).features === 'string'
                    ? ((property as any).features as string)
                        .split(',')
                        .map((f) => f.trim())
                        .filter(Boolean)
                    : []

                const colorClasses = [
                  'bg-indigo-50 text-indigo-700',
                  'bg-emerald-50 text-emerald-700',
                  'bg-sky-50 text-sky-700',
                  'bg-amber-50 text-amber-800',
                  'bg-fuchsia-50 text-fuchsia-700',
                  'bg-purple-50 text-purple-700',
                  'bg-pink-50 text-pink-700',
                  'bg-teal-50 text-teal-700',
                ]

                return featuresArray.map((feature, index) => (
                  <span
                    key={`${feature}-${index}`}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      colorClasses[index % colorClasses.length]
                    }`}
                  >
                    {feature}
                  </span>
                ))
              })()}
            </div>
          </div>

          {/* Description */}
          {property.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {property.description}
              </p>
            </div>
          )}

          {/* Defects */}
          {property.defects && property.defects.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Reported Defects</h3>
              <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <ul className="text-sm text-yellow-800">
                  {property.defects.map((defect, index) => (
                    <li key={index} className="mb-1">• {defect}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-4">
          <div className="relative max-w-4xl max-h-full w-full h-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-8 h-8" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </>
            )}

            {/* Main image */}
            {!lightboxImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
              </div>
            )}
            <img
              src={getAssetUrl(images[currentImageIndex])}
              alt={`Property ${currentImageIndex + 1}`}
              className={`max-w-full max-h-full object-contain ${lightboxImageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
              onLoad={() => setLightboxImageLoaded(true)}
            />

            {/* Image counter */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
                {currentImageIndex + 1} / {images.length}
              </div>
            )}

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 ${
                      index === currentImageIndex ? 'border-white' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={getAssetUrl(image)}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
