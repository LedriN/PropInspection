import React, { useState } from 'react'
import { X, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { BuildingUnit } from '../../types/database'

interface AddUnitModalProps {
  isOpen: boolean
  onClose: () => void
  onUnitAdded: () => void
  objectId: string
}

export function AddUnitModal({ isOpen, onClose, onUnitAdded, objectId }: AddUnitModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    unitNumber: '',
    floor: '',
    description: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.unitNumber) {
      toast.error('Please enter a unit number')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(getApiUrl('/units'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          objectId: objectId,
          unitNumber: formData.unitNumber,
          floor: formData.floor || undefined,
          description: formData.description || ''
        })
      })

      if (response.ok) {
        toast.success('Unit added successfully!')
        onUnitAdded()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to add unit')
      }
    } catch (error) {
      console.error('Error adding unit:', error)
      toast.error('Failed to add unit')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      unitNumber: '',
      floor: '',
      description: ''
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3" style={{backgroundColor: '#8d2138'}}>
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add New Unit</h2>
              <p className="text-sm text-gray-600">Create a new unit in this building</p>
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
          {/* Unit Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Number *
            </label>
            <input
              type="text"
              name="unitNumber"
              value={formData.unitNumber}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="e.g., Unit A, A1, 101"
              required
            />
          </div>

          {/* Floor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Floor
            </label>
            <input
              type="text"
              name="floor"
              value={formData.floor}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="e.g., Floor 1, 1, Ground"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Describe the unit..."
            />
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
              className="px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{backgroundColor: '#8d2138'}}
            >
              {loading ? 'Adding Unit...' : 'Add Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
