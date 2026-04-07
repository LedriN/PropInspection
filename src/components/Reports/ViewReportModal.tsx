import { useState, useEffect } from 'react'
import { X, FileText, Building2, User, Calendar, Download, Edit, FileDown, Table } from 'lucide-react'
import { getApiUrl, getAuthHeaders } from '../../config/api'
import toast from 'react-hot-toast'
import { exportToPDF, exportToExcel } from '../../utils/exportUtils'
import { testPDFExport } from '../../utils/testExport'

interface ReportDetails {
  _id: string
  title: string
  report_type: string
  content: {
    exterior?: {
      roof_condition?: string
      siding_condition?: string
      windows_doors?: string
      foundation?: string
      exterior_notes?: string
    }
    interior?: {
      walls_condition?: string
      floors_condition?: string
      ceilings_condition?: string
      interior_notes?: string
    }
    electrical?: {
      electrical_system?: string
      outlets_switches?: string
      lighting?: string
      electrical_notes?: string
    }
    plumbing?: {
      water_supply?: string
      drainage?: string
      fixtures?: string
      plumbing_notes?: string
    }
    hvac?: {
      heating_system?: string
      cooling_system?: string
      ventilation?: string
      hvac_notes?: string
    }
    safety?: {
      smoke_detectors?: string
      carbon_monoxide?: string
      fire_extinguisher?: string
      safety_notes?: string
    }
  }
  status: string
  generated_at: string
  generated_by: string
  // New stored name fields
  property_name?: string
  client_name?: string
  agent_name?: string
  // Fallback to old structure for backward compatibility
  property_id?: {
    _id: string
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
  }
  client_id?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  agent_id?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
}

interface ViewReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string | null
}

const conditionColors = {
  'Excellent': 'text-green-600 bg-green-100',
  'Good': 'text-blue-600 bg-blue-100',
  'Fair': 'text-yellow-600 bg-yellow-100',
  'Poor': 'text-red-600 bg-red-100',
  'Present & Working': 'text-green-600 bg-green-100',
  'Present - Needs Battery': 'text-yellow-600 bg-yellow-100',
  'Present & Current': 'text-green-600 bg-green-100',
  'Not Present': 'text-red-600 bg-red-100'
}

const statusColors = {
  'Completed': 'text-green-600 bg-green-100',
  'Draft': 'text-yellow-600 bg-yellow-100',
  'Pending': 'text-blue-600 bg-blue-100'
}

export function ViewReportModal({ isOpen, onClose, reportId }: ViewReportModalProps) {
  const [report, setReport] = useState<ReportDetails | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && reportId) {
      loadReport()
    }
  }, [isOpen, reportId])

  const loadReport = async () => {
    if (!reportId) return

    try {
      setLoading(true)
      const response = await fetch(getApiUrl(`/reports/${reportId}`), {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const result = await response.json()
        setReport(result.data)
      } else {
        toast.error('Failed to load report details')
      }
    } catch (error) {
      console.error('Error loading report:', error)
      toast.error('Failed to load report details')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getConditionBadge = (condition: string) => {
    const colorClass = conditionColors[condition as keyof typeof conditionColors] || 'text-gray-600 bg-gray-100'
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {condition}
      </span>
    )
  }

  const handleExportPDF = () => {
    if (report) {
      try {
        console.log('Attempting to export PDF for report:', report.title)
        exportToPDF(report)
        toast.success('Report exported to PDF successfully!')
      } catch (error) {
        console.error('Error exporting to PDF:', error)
        toast.error(`Failed to export to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } else {
      toast.error('No report data available for export')
    }
  }

  const handleExportExcel = () => {
    if (report) {
      try {
        exportToExcel(report)
        toast.success('Report exported to Excel successfully!')
      } catch (error) {
        console.error('Error exporting to Excel:', error)
        toast.error('Failed to export to Excel')
      }
    }
  }

  const handleTestPDF = () => {
    try {
      console.log('Testing PDF export...')
      testPDFExport()
      toast.success('Test PDF exported successfully!')
    } catch (error) {
      console.error('Error in test PDF export:', error)
      toast.error(`Test PDF failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const renderInspectionSection = (title: string, data: any) => {
    if (!data) return null

    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Object.entries(data).map(([key, value]) => {
            if (key.endsWith('_notes')) return null // Skip notes for now, they'll be shown separately
            
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return (
              <div key={key} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{label}:</span>
                {getConditionBadge(value as string)}
              </div>
            )
          })}
        </div>
        {data[`${Object.keys(data)[0]?.split('_')[0]}_notes`] && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              <strong>Notes:</strong> {data[`${Object.keys(data)[0]?.split('_')[0]}_notes`]}
            </p>
          </div>
        )}
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {loading ? 'Loading...' : report?.title || 'Report Details'}
              </h2>
              <p className="text-sm text-gray-500">
                {report && `${report.report_type} • Generated ${formatDate(report.generated_at)}`}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={handleTestPDF}
              className="p-2 text-purple-500 hover:text-purple-700 transition-colors"
              title="Test PDF Export"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button 
              onClick={handleExportPDF}
              className="p-2 text-red-500 hover:text-red-700 transition-colors"
              title="Export to PDF"
            >
              <FileDown className="w-5 h-5" />
            </button>
            <button 
              onClick={handleExportExcel}
              className="p-2 text-green-500 hover:text-green-700 transition-colors"
              title="Export to Excel"
            >
              <Table className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : report ? (
            <div className="space-y-6">
              {/* Report Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Property</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {report.property_name || 
                     report.property_id?.address?.street || 
                     'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {report.property_id?.address?.city && report.property_id?.address?.state && report.property_id?.address?.zipCode
                      ? `${report.property_id.address.city}, ${report.property_id.address.state} ${report.property_id.address.zipCode}`
                      : 'N/A'}
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Client</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {report.client_name || 
                     (report.client_id?.firstName && report.client_id?.lastName ? `${report.client_id.firstName} ${report.client_id.lastName}` : '') ||
                     'N/A'}
                  </p>
                  {/* Email removed as requested */}
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Agent</span>
                  </div>
                  <p className="text-sm text-gray-900">
                    {report.agent_name || 
                     (report.agent_id?.firstName && report.agent_id?.lastName ? `${report.agent_id.firstName} ${report.agent_id.lastName}` : '') ||
                     'N/A'}
                  </p>
                  {/* Email removed as requested */}
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-600 mr-2">Status:</span>
                  <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusColors[report.status as keyof typeof statusColors]}`}>
                    {report.status}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-1" />
                  Generated by {report.generated_by} on {formatDate(report.generated_at)}
                </div>
              </div>

              {/* Inspection Areas */}
              {report.content && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Inspection Details</h3>
                  
                  {report.content.exterior && renderInspectionSection('Exterior', report.content.exterior)}
                  {report.content.interior && renderInspectionSection('Interior', report.content.interior)}
                  {report.content.electrical && renderInspectionSection('Electrical', report.content.electrical)}
                  {report.content.plumbing && renderInspectionSection('Plumbing', report.content.plumbing)}
                  {report.content.hvac && renderInspectionSection('HVAC', report.content.hvac)}
                  {report.content.safety && renderInspectionSection('Safety', report.content.safety)}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Report not found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
