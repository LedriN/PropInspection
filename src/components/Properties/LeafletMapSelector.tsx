import React, { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LeafletMapSelectorProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialLat?: number
  initialLng?: number
  height?: string
  selectedAddress?: string
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number, address: string) => void }) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      // For now, we'll use coordinates as address. In a real app, you'd use a reverse geocoding service
      const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      onLocationSelect(lat, lng, address)
    },
  })
  return null
}

export function LeafletMapSelector({ 
  onLocationSelect, 
  initialLat, 
  initialLng, 
  height = '400px',
  selectedAddress
}: LeafletMapSelectorProps) {
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Default center (Zurich, Switzerland)
  const defaultCenter: [number, number] = [47.3769, 8.5417]
  const center = initialLat && initialLng ? [initialLat, initialLng] as [number, number] : defaultCenter

  useEffect(() => {
    if (initialLat && initialLng) {
      setPosition([initialLat, initialLng])
    }
  }, [initialLat, initialLng])

  const handleLocationSelect = (lat: number, lng: number, address: string) => {
    setPosition([lat, lng])
    onLocationSelect(lat, lng, address)
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      // Using OpenStreetMap Nominatim for geocoding (free service)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`
      )
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      
      if (data && data.length > 0) {
        const result = data[0]
        const lat = parseFloat(result.lat)
        const lng = parseFloat(result.lon)
        const address = result.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
        
        setPosition([lat, lng])
        onLocationSelect(lat, lng, address)
        setSearchQuery('')
      } else {
        setError('Location not found. Please try a different search term.')
      }
    } catch (err) {
      console.error('Geocoding error:', err)
      setError('Search failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Box */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder={selectedAddress || "Search for an address (e.g., Bahnhofstrasse 123, Zurich)"}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}

      {/* Map Container */}
      <div 
        className="w-full rounded-lg border border-gray-200 overflow-hidden"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Click handler */}
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          
          {/* Marker */}
          {position && (
            <Marker 
              position={position}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const marker = e.target
                  const position = marker.getLatLng()
                  const lat = position.lat
                  const lng = position.lng
                  const address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                  setPosition([lat, lng])
                  onLocationSelect(lat, lng, address)
                }
              }}
            >
              <Popup>
                Property Location<br />
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      
      {/* Instructions */}
      <div className="text-xs text-gray-500">
        💡 Click on the map or drag the marker to set the exact property location
      </div>
      
    </div>
  )
}
