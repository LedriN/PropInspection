import React, { useState } from 'react'
import { X, AlertTriangle, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { Property } from '../../types/database'

interface DeletePropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onPropertyDeleted: () => void
  property: Property | null
}

export function DeletePropertyModal({ isOpen, onClose, onPropertyDeleted, property }: DeletePropertyModalProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!property?._id) {
      toast.error('Property ID not found')
      return
    }

    try {
      setLoading(true)

      const response = await fetch(getApiUrl(`/properties/${property._id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        toast.success('Property deleted successfully!')
        onPropertyDeleted()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete property')
      }
    } catch (error) {
      console.error('Error deleting property:', error)
      toast.error('Failed to delete property')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !property) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Delete Property</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-teal-400 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {property.name || property.title || property.address?.street || 'Untitled Property'}
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                {property.address?.street || 'No address'}
              </p>
              <p className="text-sm text-gray-600">
                {property.address?.city || 'No city'}
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-200">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">
                  Are you sure you want to delete this property?
                </h4>
                <p className="text-sm text-red-700">
                  This will permanently remove the property and all associated data. 
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              'Delete Property'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
