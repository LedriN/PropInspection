import React from 'react'
import { X, AlertTriangle, Trash2 } from 'lucide-react'

interface DeleteInspectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  inspection: {
    id: string
    date: Date
    time: string
    property: string
    client: string
    agent: string
    type: string
  } | null
  loading?: boolean
}

export function DeleteInspectionModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  inspection, 
  loading = false 
}: DeleteInspectionModalProps) {
  if (!isOpen || !inspection) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cancel Inspection</h2>
              <p className="text-sm text-gray-600">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Are you sure you want to cancel this inspection? This action cannot be undone and will permanently remove the inspection from your schedule.
            </p>
            
            {/* Inspection Details */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Date & Time:</span>
                <span className="text-sm text-gray-900">
                  {inspection.date.toLocaleDateString()} at {inspection.time}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <span className="text-sm text-gray-900 capitalize">{inspection.type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Client:</span>
                <span className="text-sm text-gray-900">{inspection.client}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Agent:</span>
                <span className="text-sm text-gray-900">{inspection.agent}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Property:</span>
                <span className="text-sm text-gray-900">{inspection.property}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Inspection
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Cancel Inspection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
