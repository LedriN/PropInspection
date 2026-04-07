import { useState, useEffect } from 'react'
import { FileText, Download, Plus, Search, Filter, Eye, Calendar, Building2, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../config/api'
import { GenerateReportModal } from '../components/Reports/GenerateReportModal'
import { ViewReportModal } from '../components/Reports/ViewReportModal'
import { DeleteReportModal } from '../components/Reports/DeleteReportModal'
import { exportReportListToExcel } from '../utils/exportUtils'

interface ReportDisplay {
  id: string
  title: string
  property: string
  client: string
  agent: string
  type: string
  date: string
  status: string
  sourceDatabase?: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalCount: number
  limit: number
  hasNextPage: boolean
  hasPrevPage: boolean
}


const statusColors = {
  Completed: 'text-green-600 bg-green-100',
  Draft: 'text-yellow-600 bg-yellow-100',
  Pending: 'text-blue-600 bg-blue-100',
}

export function Reports() {
  const [searchTerm, setSearchTerm] = useState('')
  const [reports, setReports] = useState<ReportDisplay[]>([])
  const [selectedType, setSelectedType] = useState('all')
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState('')
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [rawReports, setRawReports] = useState<any[]>([])
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingReport, setDeletingReport] = useState<ReportDisplay | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNextPage: false,
    hasPrevPage: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReports()
  }, [pagination.currentPage])

  const loadReports = async (page: number = pagination.currentPage) => {
    try {
      setLoading(true)
      const response = await fetch(getApiUrl(`/reports?page=${page}&limit=${pagination.limit}`), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        const rawData = result.data || []
        setRawReports(rawData)
        
        // Update pagination info
        if (result.pagination) {
          setPagination(result.pagination)
        }
        
        // Transform the data to match the expected format
        const transformedReports = rawData.map((report: any) => ({
          id: report._id,
          title: report.title,
          property: report.property_name || 
            (report.property_id?.address?.street) || 
            (typeof report.property_id === 'string' ? `Property ID: ${report.property_id}` : 'Property Address'),
          client: report.client_name || 
            (report.client_id?.firstName && report.client_id?.lastName ? `${report.client_id.firstName} ${report.client_id.lastName}` : '') ||
            (typeof report.client_id === 'string' ? `Client ID: ${report.client_id}` : 'Client Name'),
          agent: report.agent_name || 
            (report.agent_id?.firstName && report.agent_id?.lastName ? `${report.agent_id.firstName} ${report.agent_id.lastName}` : '') ||
            (typeof report.agent_id === 'string' ? `Agent ID: ${report.agent_id}` : 'Agent Name'),
          type: report.report_type || 'Report',
          date: new Date(report.generated_at).toLocaleDateString(),
          status: report.status || 'Draft',
          sourceDatabase: report._sourceDatabase || 'Unknown'
        }))
        setReports(transformedReports)
      } else {
        setReports([])
        setRawReports([])
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      toast.error('Failed to load reports')
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(
    (report) =>
      (selectedType === 'all' || report.type.toLowerCase().includes(selectedType)) &&
      (report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.property.toLowerCase().includes(searchTerm.toLowerCase()) ||
       report.client.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleGenerateReport = (type: string) => {
    setSelectedReportType(type)
    setIsGenerateModalOpen(true)
  }

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId)
    setIsViewModalOpen(true)
  }

  const handleExportAllReports = () => {
    try {
      exportReportListToExcel(rawReports)
      toast.success('All reports exported to Excel successfully!')
    } catch (error) {
      console.error('Error exporting all reports:', error)
      toast.error('Failed to export reports')
    }
  }

  const handleDeleteReport = (report: ReportDisplay) => {
    setDeletingReport(report)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteReport = async () => {
    if (!deletingReport) return

    try {
      setDeleteLoading(true)
      const response = await fetch(getApiUrl(`/reports/${deletingReport.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        toast.success('Report deleted successfully!')
        loadReports() // Reload the reports list
        closeDeleteModal()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to delete report')
      }
    } catch (error) {
      console.error('Error deleting report:', error)
      toast.error('Failed to delete report')
    } finally {
      setDeleteLoading(false)
    }
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingReport(null)
    setDeleteLoading(false)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, currentPage: newPage }))
    }
  }

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      handlePageChange(pagination.currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      handlePageChange(pagination.currentPage + 1)
    }
  }

  const handleRefresh = () => {
    loadReports(pagination.currentPage)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Generate and manage inspection reports</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExportAllReports}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-400 text-white rounded-xl font-medium hover:from-green-600 hover:to-emerald-500 transition-all duration-200"
          >
            <Download className="w-5 h-5 mr-2" />
            Export All
          </button>
          <button 
            onClick={() => handleGenerateReport('inspection')}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-xl font-medium hover:from-blue-600 hover:to-teal-500 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Generate Report
          </button>
        </div>
      </div>
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        >
          <option value="all">All Types</option>
          <option value="inspection">Inspection Reports</option>
          <option value="defect">Defect Reports</option>
          <option value="summary">Summary Reports</option>
          <option value="agreement">Agreements</option>
        </select>

        <button className="flex items-center px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors duration-200">
          <Filter className="w-5 h-5 mr-2 text-gray-500" />
          Filter
        </button>

        <button 
          onClick={handleRefresh}
          disabled={loading}
          className={`flex items-center px-4 py-2 border border-gray-200 rounded-xl transition-colors duration-200 ${
            loading 
              ? 'text-gray-400 cursor-not-allowed' 
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
          }`}
          title="Refresh reports"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading reports...</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 transition-colors duration-200">
                     <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                      {report.id.slice(-6)}
                      </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{report.title}</div>
                        <div className="text-sm text-gray-500">{report.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                      {report.property}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.client}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{report.agent}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {report.date}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${statusColors[report.status as keyof typeof statusColors]}`}>
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={() => handleViewReport(report.id)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="View Report"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteReport(report)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete Report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={handlePrevPage}
                disabled={!pagination.hasPrevPage}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  pagination.hasPrevPage
                    ? 'text-gray-700 bg-white hover:bg-gray-50'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={!pagination.hasNextPage}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  pagination.hasNextPage
                    ? 'text-gray-700 bg-white hover:bg-gray-50'
                    : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {Math.min((pagination.currentPage - 1) * pagination.limit + 1, pagination.totalCount)}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium">{pagination.totalCount}</span>{' '}
                  results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrevPage}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.hasPrevPage
                        ? 'text-gray-500 hover:bg-gray-50'
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const startPage = Math.max(1, pagination.currentPage - 2)
                    const pageNum = startPage + i
                    if (pageNum > pagination.totalPages) return null
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNum === pagination.currentPage
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  
                  <button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.hasNextPage
                        ? 'text-gray-500 hover:bg-gray-50'
                        : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <span className="sr-only">Next</span>
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {filteredReports.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {reports.length === 0 
              ? "No reports generated yet. Click 'Generate Report' to create your first report." 
              : "No reports found matching your criteria."
            }
          </p>
        </div>
      )}

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={isGenerateModalOpen}
        onClose={() => {
          setIsGenerateModalOpen(false)
          setSelectedReportType('')
        }}
        onReportGenerated={loadReports}
        reportType={selectedReportType || 'inspection'}
      />

      {/* View Report Modal */}
      <ViewReportModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedReportId(null)
        }}
        reportId={selectedReportId}
      />

      {/* Delete Report Modal */}
      <DeleteReportModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteReport}
        reportTitle={deletingReport?.title || ''}
        loading={deleteLoading}
      />
    </div>
  )
}