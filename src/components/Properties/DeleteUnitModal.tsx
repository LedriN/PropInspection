import React, { useState } from 'react'
import { X, AlertTriangle, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { BuildingUnit } from '../../types/database'

interface DeleteUnitModalProps {
  isOpen: boolean
  onClose: () => void
  onUnitDeleted: () => void
  unit: BuildingUnit | null
}

export function DeleteUnitModal({ isOpen, onClose, onUnitDeleted, unit }: DeleteUnitModalProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!unit?._id) {
      toast.error('No unit selected')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(getApiUrl(`/units/${unit._id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        toast.success('Unit deleted successfully!')
        onUnitDeleted()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete unit')
      }
    } catch (error) {
      console.error('Error deleting unit:', error)
      toast.error('Failed to delete unit')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !unit) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3 bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Delete Unit</h2>
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
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-100">
              <Home className="w-6 h-6" style={{color: '#8d2138'}} />
            </div>
            <div className="flex-1">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete <span className="font-semibold">Unit {unit.unitNumber}</span>?
              </p>
              {unit.properties && unit.properties.length > 0 && (
                <p className="text-sm text-red-600 font-medium">
                  Warning: This unit contains {unit.properties.length} propert{unit.properties.length === 1 ? 'y' : 'ies'}. 
                  All properties will also be deleted.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Unit'}
          </button>
        </div>
      </div>
    </div>
  )
}

