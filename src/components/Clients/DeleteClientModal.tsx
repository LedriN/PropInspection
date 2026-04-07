import React from 'react'
import { X, AlertTriangle, User } from 'lucide-react'
import { Client } from '../../types/database'

interface DeleteClientModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  client: Client | null
  loading?: boolean
}

export function DeleteClientModal({ isOpen, onClose, onConfirm, client, loading = false }: DeleteClientModalProps) {
  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-400 rounded-xl flex items-center justify-center mr-3">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Delete Client</h2>
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
          <div className="flex items-start space-x-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-400 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {client.firstName} {client.lastName}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{client.email}</p>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this client? This will permanently remove all their information from your database.
              </p>
            </div>
          </div>

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">Warning</h4>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All client data, including contact information, address, and notes will be permanently deleted.
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-4">
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
              onClick={onConfirm}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-400 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Deleting...' : 'Delete Client'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
