import { useState } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLanguage } from '../../contexts/LanguageContext'
import { getApiUrl, getAuthHeaders } from '../../config/api'

interface AddDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  propertyId: string
  onDocumentAdded: () => void
}

export function AddDocumentModal({ isOpen, onClose, propertyId, onDocumentAdded }: AddDocumentModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'document' as 'contract' | 'document' | 'other',
    file: null as File | null
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'document',
      file: null
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type === 'application/pdf') {
        setFormData(prev => ({
          ...prev,
          file,
          name: prev.name || file.name.replace('.pdf', '')
        }))
        toast.success('PDF file selected')
      } else {
        toast.error('Please select a PDF file')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.file) {
      toast.error(t('properties.detail.addDocument.errors.fillRequired'))
      return
    }

    try {
      setLoading(true)
      
      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('type', formData.type)
      formDataToSend.append('document', formData.file)

      // Get auth headers but exclude Content-Type for FormData
      const authHeaders = getAuthHeaders()
      const headers: Record<string, string> = {}
      if (authHeaders.Authorization) {
        headers['Authorization'] = authHeaders.Authorization
      }
      // Don't set Content-Type, let browser set it with boundary for FormData

      const response = await fetch(getApiUrl(`/properties/${propertyId}/documents`), {
        method: 'POST',
        headers,
        body: formDataToSend
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(t('properties.detail.addDocument.success'))
        onDocumentAdded()
        onClose()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.message || t('properties.detail.addDocument.errors.uploadFailed'))
      }
    } catch (error) {
      console.error('Error uploading document:', error)
      toast.error(t('properties.detail.addDocument.errors.uploadFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3" style={{backgroundColor: '#8d2138'}}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('properties.detail.addDocument.title')}</h2>
              <p className="text-sm text-gray-600">{t('properties.detail.addDocument.subtitle')}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Document Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('properties.detail.addDocument.name')} *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200"
              placeholder={t('properties.detail.addDocument.namePlaceholder')}
              required
            />
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('properties.detail.addDocument.type')} *
            </label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8d2138] focus:border-transparent transition-all duration-200 appearance-none bg-white cursor-pointer"
              required
            >
              <option value="document">{t('properties.detail.documentType.document')}</option>
              <option value="contract">{t('properties.detail.documentType.contract')}</option>
              <option value="other">{t('properties.detail.documentType.other')}</option>
            </select>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('properties.detail.addDocument.file')} *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#8d2138] transition-colors duration-200">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="document-upload"
                required
              />
              <label htmlFor="document-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2" style={{color: '#8d2138'}} />
                <p className="text-sm text-gray-600">
                  {formData.file ? formData.file.name : t('properties.detail.addDocument.filePlaceholder')}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t('properties.detail.addDocument.fileHint')}</p>
              </label>
            </div>
            
            {formData.file && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <FileText className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">{formData.file.name}</span>
                  <span className="ml-2 text-xs text-blue-600">
                    ({(formData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, file: null }))}
                    className="ml-auto text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || !formData.file}
              className="px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{backgroundColor: '#8d2138'}}
            >
              {loading ? t('properties.detail.addDocument.uploading') : t('properties.detail.addDocument.upload')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

