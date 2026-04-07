import React from 'react'
import { X, AlertTriangle, UserCheck, Star } from 'lucide-react'
import { Agent } from '../../types/database'

interface DeleteAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  agent: Agent | null
  loading?: boolean
}

export function DeleteAgentModal({ isOpen, onClose, onConfirm, agent, loading = false }: DeleteAgentModalProps) {
  if (!isOpen || !agent) return null

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
              <h2 className="text-xl font-bold text-gray-900">Delete Agent</h2>
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
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {agent.firstName} {agent.lastName}
              </h3>
              <p className="text-sm text-gray-600 mb-2">{agent.email}</p>
              <div className="flex items-center mb-2">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                <span className="text-sm text-gray-600">Rating: {agent.rating || 'N/A'}</span>
              </div>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this agent? This will permanently remove all their information from your database.
              </p>
            </div>
          </div>

          {/* Agent Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{agent.completed_inspections || 0}</p>
              <p className="text-xs text-gray-600">Completed Inspections</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <p className="text-2xl font-bold text-gray-900">{agent.workload || 0}</p>
              <p className="text-xs text-gray-600">Current Workload</p>
            </div>
          </div>

          {/* Specialties */}
          {agent.specialties && agent.specialties.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Specialties</p>
              <div className="flex flex-wrap gap-1">
                {agent.specialties.map((specialty) => (
                  <span key={specialty} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg">
                    {specialty}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">Warning</h4>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All agent data, including contact information, specialties, and performance history will be permanently deleted.
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
              {loading ? 'Deleting...' : 'Delete Agent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
