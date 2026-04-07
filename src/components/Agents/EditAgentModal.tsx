import React, { useState, useEffect } from 'react'
import { X, UserCheck, Mail, MapPin, Star, Award, Calendar, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import { Agent } from '../../types/database'
import { useLanguage } from '../../contexts/LanguageContext'

interface EditAgentModalProps {
  isOpen: boolean
  onClose: () => void
  onAgentUpdated: () => void
  agent: Agent | null
}

const specializations = [
  'Residential', 'Commercial', 'Industrial', 'Safety', 'Environmental', 
  'Structural', 'Electrical', 'Plumbing', 'HVAC', 'Roofing', 'Foundation'
]

const languages = [
  'English', 'German', 'French', 'Italian', 'Spanish', 'Portuguese', 'Dutch', 'Other'
]

export function EditAgentModal({ isOpen, onClose, onAgentUpdated, agent }: EditAgentModalProps) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    specialties: [] as string[],
    status: 'Active' as 'Active' | 'Busy' | 'Unavailable' | 'Inactive',
    bio: '',
    licenseNumber: '',
    commissionRate: 0,
    experience: '',
    languages: [] as string[],
    workingHours: {
      start: '09:00',
      end: '17:00'
    },
    availability: {
      monday: true,
      tuesday: true,
      wednesday: true,
      thursday: true,
      friday: true,
      saturday: false,
      sunday: false
    }
  })

  // Update form data when agent prop changes
  useEffect(() => {
    if (agent) {
      setFormData({
        firstName: agent.firstName || '',
        lastName: agent.lastName || '',
        email: agent.email || '',
        phone: agent.phone || '',
        address: {
          street: agent.address?.street || '',
          city: agent.address?.city || '',
          state: agent.address?.state || '',
          zipCode: agent.address?.zipCode || '',
          country: agent.address?.country || ''
        },
        specialties: agent.specialties || [],
        status: agent.status || 'Active',
        bio: agent.bio || '',
        licenseNumber: agent.licenseNumber || '',
        commissionRate: agent.commissionRate || 0,
        experience: agent.experience || '',
        languages: agent.languages || [],
        workingHours: agent.workingHours || { start: '09:00', end: '17:00' },
        availability: agent.availability || {
          monday: true, tuesday: true, wednesday: true, thursday: true, friday: true,
          saturday: false, sunday: false
        }
      })
    }
  }, [agent])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as any),
          [child]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
        }
      }))
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleSpecializationToggle = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }))
  }

  const handleLanguageToggle = (language: string) => {
    setFormData(prev => ({
      ...prev,
      languages: prev.languages.includes(language)
        ? prev.languages.filter(l => l !== language)
        : [...prev.languages, language]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agent?._id) {
      toast.error(t('agents.editAgent.errors.agentIdNotFound'))
      return
    }

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error(t('agents.editAgent.errors.fillRequiredFields'))
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error(t('agents.editAgent.errors.validEmail'))
      return
    }

    // Basic phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      toast.error(t('agents.editAgent.errors.validPhone'))
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch(getApiUrl(`/agents/${agent._id}`), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders()
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(t('agents.editAgent.messages.updateSuccess'))
        onAgentUpdated()
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.message || t('agents.editAgent.errors.updateFailed'))
      }
    } catch (error) {
      console.error('Error updating agent:', error)
      toast.error(t('agents.editAgent.errors.updateFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen || !agent) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 custom-btn rounded-xl flex items-center justify-center mr-3">
              <UserCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{t('agents.editAgent.title')}</h2>
              <p className="text-sm text-gray-600">{t('agents.editAgent.subtitle')}</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
              <UserCheck className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
              {t('agents.editAgent.basicInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.firstName')} *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.firstNamePlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.lastName')} *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.lastNamePlaceholder')}
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
              <Mail className="w-5 h-5 mr-2 text-green-600" />
              {t('agents.editAgent.contactInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.email')} *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.emailPlaceholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.phone')} *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.phonePlaceholder')}
                  required
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center">
              <MapPin className="w-5 h-5 mr-2" style={{color: '#8d2138'}} />
              {t('agents.editAgent.addressInfo')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.streetAddress')}
                </label>
                <input
                  type="text"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.streetPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.city')}
                </label>
                <input
                  type="text"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.cityPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.state')}
                </label>
                <input
                  type="text"
                  name="address.state"
                  value={formData.address.state}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.statePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.zipCode')}
                </label>
                <input
                  type="text"
                  name="address.zipCode"
                  value={formData.address.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.zipPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('agents.editAgent.country')}
                </label>
                <input
                  type="text"
                  name="address.country"
                  value={formData.address.country}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200"
                  style={{'--tw-ring-color': '#8d2138'} as React.CSSProperties}
                  placeholder={t('agents.editAgent.countryPlaceholder')}
                />
              </div>
            </div>
          </div>

          

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('agents.editAgent.bio')}
            </label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              placeholder={t('agents.editAgent.bioPlaceholder')}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
            >
              {t('agents.editAgent.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 custom-btn text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('agents.editAgent.updating') : t('agents.editAgent.update')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
