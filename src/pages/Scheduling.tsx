import { useState, useEffect } from 'react'
import { Plus, Edit, X, MoreVertical, Building2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, isPast, isToday, startOfWeek, addWeeks, subWeeks } from 'date-fns'
import toast from 'react-hot-toast'
import { getApiUrl, getAuthHeaders } from '../config/api'
import { ScheduleInspectionModal } from '../components/Scheduling/ScheduleInspectionModal'
import { DeleteInspectionModal } from '../components/Scheduling/DeleteInspectionModal'

interface InspectionDisplay {
  id: string
  date: Date
  time: string
  property: string
  client: string
  agent: string
  type: string
  status: string
  // Additional fields for editing
  clientId?: string
  agentId?: string
  propertyId?: string
  notes?: string
  isCompleted?: boolean
  // Client contact information
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  // Property details
  propertyType?: string
  propertySize?: string
  // Agent details
  agentEmail?: string
  agentPhone?: string
}

export function Scheduling() {
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [inspections, setInspections] = useState<InspectionDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [editingInspection, setEditingInspection] = useState<InspectionDisplay | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingInspection, setDeletingInspection] = useState<InspectionDisplay | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [completingInspection, setCompletingInspection] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)

  // Generate week days
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }) // Monday as start
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  // Generate time slots (2-hour intervals from 8am to 10pm)
  const timeSlots = Array.from({ length: 7 }, (_, i) => {
    const startHour = 8 + (i * 2)
    const endHour = startHour + 2
    return {
      start: startHour,
      end: endHour,
      label: `${startHour === 12 ? 12 : startHour % 12 || 12}${startHour < 12 ? 'am' : 'pm'} - ${endHour === 12 ? 12 : endHour % 12 || 12}${endHour < 12 ? 'am' : 'pm'}`
    }
  })

  // Helper function to get time slot for an inspection
  const getTimeSlotForInspection = (inspection: InspectionDisplay) => {
    let hour = 0
    
    // Try to parse time from inspection.time string (e.g., "10:00 AM", "10:00AM", "10 AM")
    const timeStr = inspection.time.toLowerCase().trim()
    const match = timeStr.match(/(\d+):?(\d*)\s*(am|pm)/)
    
    if (match) {
      hour = parseInt(match[1])
      const isPM = match[3] === 'pm'
      
      // Handle 12-hour format conversion
      if (isPM && hour !== 12) {
        hour += 12
      } else if (!isPM && hour === 12) {
        hour = 0
      }
    } else {
      // Fallback to date hour if time string parsing fails
      hour = inspection.date.getHours()
    }
    
    // Calculate which time slot this hour falls into (2-hour slots starting at 8am)
    const slotIndex = Math.floor((hour - 8) / 2)
    
    // Return slot index if valid, otherwise null
    if (slotIndex >= 0 && slotIndex < timeSlots.length) {
      return slotIndex
    }
    
    // If hour is before 8am, return first slot (0)
    if (hour < 8) {
      return 0
    }
    
    // If hour is after 10pm, return last slot
    if (hour >= 22) {
      return timeSlots.length - 1
    }
    
    return null
  }

  // Helper function to determine if an inspection is overdue
  const isInspectionOverdue = (inspection: InspectionDisplay) => {
    const inspectionDate = inspection.date
    
    // Check if the inspection date is in the past and status is not completed
    return isPast(inspectionDate) && !isToday(inspectionDate) && inspection.status !== 'completed'
  }

  // Helper function to check if an inspection can be marked as completed
  const canMarkAsCompleted = (inspection: InspectionDisplay) => {
    return inspection.status === 'scheduled' || inspection.status === 'in-progress' || isInspectionOverdue(inspection)
  }

  // Function to mark an inspection as completed
  const handleMarkCompleted = async (inspection: InspectionDisplay) => {
    try {
      setCompletingInspection(inspection.id)
      
      const response = await fetch(getApiUrl(`/inspections/${inspection.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': getAuthHeaders().Authorization || ''
        },
        body: JSON.stringify({
          status: 'completed',
          completedAt: new Date().toISOString()
        })
      })

      if (response.ok) {
        toast.success('Inspection marked as completed!')
        // Update the local state
        setInspections(prev => prev.map(ins => 
          ins.id === inspection.id 
            ? { ...ins, status: 'completed' }
            : ins
        ))
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to mark inspection as completed')
      }
    } catch (error) {
      console.error('Error marking inspection as completed:', error)
      toast.error('Failed to mark inspection as completed')
    } finally {
      setCompletingInspection(null)
    }
  }


  // Filter inspections based on showCompleted state
  const getFilteredInspections = () => {
    if (showCompleted) {
      // Show only completed inspections
      return inspections.filter(inspection => (inspection.isCompleted || inspection.status === 'completed'))
    }
    // Show only non-completed inspections
    return inspections.filter(inspection => !(inspection.isCompleted || inspection.status === 'completed'))
  }

  const filteredInspections = getFilteredInspections()

  // Get border color based on inspection type
  const getBorderColor = (type: string) => {
    if (type.toLowerCase().includes('lease renewal')) return 'border-l-4 border-red-500'
    if (type.toLowerCase().includes('move-in') || type.toLowerCase().includes('tenant move-in')) return 'border-l-4 border-cyan-500'
    return 'border-l-4 border-green-500'
  }

  // Get icon color based on inspection type
  const getIconColor = (type: string) => {
    if (type.toLowerCase().includes('lease renewal')) return 'text-red-500'
    if (type.toLowerCase().includes('move-in') || type.toLowerCase().includes('tenant move-in')) return 'text-cyan-500'
    return 'text-green-500'
  }

  const handleEditInspection = (inspection: InspectionDisplay) => {
    setEditingInspection(inspection)
    setIsScheduleModalOpen(true)
    setMenuOpen(null)
  }

  const handleCancelInspection = (inspection: InspectionDisplay) => {
    setDeletingInspection(inspection)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteInspection = async () => {
    if (!deletingInspection) return

    try {
      setDeleteLoading(true)
      const response = await fetch(getApiUrl(`/inspections/${deletingInspection.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        toast.success('Inspection cancelled successfully!')
        loadInspections()
        closeDeleteModal()
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to cancel inspection')
      }
    } catch (error) {
      console.error('Error cancelling inspection:', error)
      toast.error('Failed to cancel inspection')
    } finally {
      setDeleteLoading(false)
    }
  }

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false)
    setDeletingInspection(null)
    setDeleteLoading(false)
  }


  // Load inspections from API
  const loadInspections = async () => {
    try {
      setLoading(true)
      const response = await fetch(getApiUrl('/inspections'), {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const result = await response.json()
        
        // Transform the data to match the expected format
        const transformedInspections = (result.data || [])
          .map((inspection: any) => {
            // Use the stored names directly (new inspections) or fallback to ID-based lookup (old inspections)
            const propertyDisplay = inspection.property_name || 
              (inspection.propertyId?.address?.street) || 
              (inspection.propertyId?.name) ||
              (typeof inspection.propertyId === 'string' ? `Property ID: ${inspection.propertyId}` : 'Property Address');
            
            const clientName = inspection.client_name || 
              (inspection.clientId?.firstName && inspection.clientId?.lastName ? `${inspection.clientId.firstName} ${inspection.clientId.lastName}` : '') ||
              (typeof inspection.clientId === 'string' ? `Client ID: ${inspection.clientId}` : 'Client Name');
            
            const agentName = inspection.inspector_name || 
              (inspection.inspectorId?.firstName && inspection.inspectorId?.lastName ? `${inspection.inspectorId.firstName} ${inspection.inspectorId.lastName}` : '') ||
              (typeof inspection.inspectorId === 'string' ? `Agent ID: ${inspection.inspectorId}` : 'Agent Name');

            return {
              id: inspection._id,
              date: new Date(inspection.scheduledDate),
              time: format(new Date(inspection.scheduledDate), 'h:mm a'),
              property: propertyDisplay,
              client: clientName,
              agent: agentName,
              type: inspection.inspectionType || 'Inspection',
              status: inspection.status || 'scheduled',
              isCompleted: inspection.isCompleted || false,
              // Add client contact information (use stored fields first, then fallback to ID-based lookup)
              clientEmail: inspection.client_email || inspection.clientId?.email || '',
              clientPhone: inspection.client_phone || inspection.clientId?.phone || '',
              clientAddress: inspection.client_address || inspection.clientId?.address || '',
              // Add property details (use stored fields first, then fallback to ID-based lookup)
              propertyType: inspection.property_type || inspection.propertyId?.propertyType || '',
              propertySize: inspection.property_size || inspection.propertyId?.size || '',
              // Add agent details (use stored fields first, then fallback to ID-based lookup)
              agentEmail: inspection.inspector_email || inspection.inspectorId?.email || '',
              agentPhone: inspection.inspector_phone || inspection.inspectorId?.phone || '',
              // Add IDs for editing
              clientId: inspection.clientId?._id || inspection.clientId || '',
              agentId: inspection.inspectorId?._id || inspection.inspectorId || '',
              propertyId: inspection.propertyId?._id || inspection.propertyId || '',
              notes: inspection.summary || inspection.notes || ''
            }
          })
        
        setInspections(transformedInspections)
      } else {
        console.error('Failed to load inspections:', response.status, response.statusText)
        setInspections([])
      }
    } catch (error) {
      console.error('Error loading inspections:', error)
      toast.error('Failed to load inspections')
      setInspections([])
    } finally {
      setLoading(false)
    }
  }

  // Load inspections on mount and when week changes
  useEffect(() => {
    loadInspections()
  }, [currentWeek])

  const handleInspectionScheduled = () => {
    loadInspections()
    setEditingInspection(null)
  }

  // Sync horizontal scrolling between header and content
  useEffect(() => {
    const headerScroll = document.getElementById('header-scroll')
    const contentScroll = document.getElementById('content-scroll')
    
    if (!headerScroll || !contentScroll) return

    const syncHeaderScroll = () => {
      if (contentScroll) {
        contentScroll.scrollLeft = headerScroll.scrollLeft
      }
    }

    const syncContentScroll = () => {
      if (headerScroll) {
        headerScroll.scrollLeft = contentScroll.scrollLeft
      }
    }

    headerScroll.addEventListener('scroll', syncHeaderScroll)
    contentScroll.addEventListener('scroll', syncContentScroll)

    return () => {
      headerScroll.removeEventListener('scroll', syncHeaderScroll)
      contentScroll.removeEventListener('scroll', syncContentScroll)
    }
  }, [])

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #f1f5f9;
        }
      `}</style>
      <div className="h-screen flex flex-col overflow-hidden relative">
        {/* Loading Indicator */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-gray-600 font-medium">Loading inspections...</div>
          </div>
        )}
        {/* Calendar Grid - Dates on Top, Time Slots on Left */}
        <div className="h-screen overflow-hidden bg-gray-50">
          <div className="h-full flex flex-col">
            {/* Date Headers - Horizontal Scroll with Custom Scrollbar */}
            <div className="flex border-b-2 border-gray-200 bg-white overflow-x-auto overflow-y-hidden custom-scrollbar" id="header-scroll">
              <div className="flex min-w-max">
                {/* Date Navigation */}
                <div className="px-6 py-6 border-r border-gray-200 flex-shrink-0 bg-white w-[180px] min-h-[150px] flex items-center justify-center">
                  <div className="flex items-center gap-1.5 w-full">
                    <button
                      onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                      className="p-1 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <div className="px-2 py-1 text-xs font-medium text-gray-600 flex-1 text-center">
                      {format(weekDays[0], 'MMM d')} - {format(weekDays[6], 'MMM d, yyyy')}
                    </div>
                    <button
                      onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                      className="p-1 hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
                      title="Next week"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                  </div>
                </div>
                {weekDays.map((day, index) => (
                  <div 
                    key={index} 
                    className="px-6 py-6 text-center bg-white border-r border-gray-200 w-[180px] min-h-[150px] flex flex-col items-center justify-center"
                  >
                    <div className="text-xs font-medium text-gray-500 mb-1">{format(day, 'EEE').toUpperCase()}</div>
                    <div className="text-xl font-bold text-gray-900">{format(day, 'd')}</div>
                  </div>
                ))}
                {/* Action Buttons */}
                <div className="px-6 py-6 flex flex-col items-center gap-2 border-r border-gray-200 w-[180px] min-h-[150px] justify-center">
                  <button 
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="w-10 h-10 flex items-center justify-center text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                    style={{backgroundColor: '#8d2138'}}
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowCompleted(!showCompleted)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                      showCompleted 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Completed
                  </button>
                </div>
              </div>
            </div>
          
          {/* Calendar Grid - Time Slots Rows with Vertical Scroll */}
          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar" id="content-scroll">
            <div className="flex min-w-max">
              {/* Time Slot Column - Sticky */}
              <div className="bg-gray-50 border-r border-gray-200 flex-shrink-0 w-[180px] sticky left-0 z-10">
                {timeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="px-6 py-6 text-center text-sm font-medium text-gray-600 border-b border-gray-200 min-h-[150px] flex items-center justify-center"
                  >
                    {slot.label}
                  </div>
                ))}
              </div>
              
              {/* Day Columns - Scrollable */}
              <div className="flex min-w-max">
                {weekDays.map((weekDay, dayIndex) => {
                    // Get inspections for this specific day - normalize dates to avoid timezone issues
                    const dayInspections = filteredInspections.filter(inspection => {
                      const inspectionDate = new Date(inspection.date)
                      inspectionDate.setHours(0, 0, 0, 0)
                      const compareDate = new Date(weekDay)
                      compareDate.setHours(0, 0, 0, 0)
                      return inspectionDate.getTime() === compareDate.getTime()
                    })
                    
                    return (
                      <div key={dayIndex} className="bg-white border-r border-gray-200 w-[180px]">
                        {timeSlots.map((_, slotIndex) => {
                          // Get inspections for this time slot
                          const slotInspections = dayInspections.filter(inspection => {
                            const slotForInspection = getTimeSlotForInspection(inspection)
                            return slotForInspection === slotIndex
                          })
                        
                          return (
                            <div
                              key={slotIndex}
                              className="px-6 py-6 border-b border-gray-200 min-h-[150px] relative overflow-hidden"
                            >
                              <div className="flex flex-col gap-2 h-full">
                                {slotInspections.map((inspection) => (
                                  <div
                                    key={inspection.id}
                                    className={`${getBorderColor(inspection.type)} bg-white rounded-lg p-3 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group relative flex-shrink-0`}
                                    onClick={() => handleEditInspection(inspection)}
                                  >
                                    <div className="flex items-start gap-2">
                                      <Building2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${getIconColor(inspection.type)}`} />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-900 text-xs leading-tight truncate">
                                          {inspection.property}
                                        </div>
                                        <div className="text-gray-600 text-[10px] mt-1 truncate">
                                          {inspection.type}
                                        </div>
                                        <div className="text-gray-500 text-[10px] mt-0.5 font-medium">
                                          {inspection.time}
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setMenuOpen(menuOpen === inspection.id ? null : inspection.id)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded flex-shrink-0"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
                                      </button>
                                    </div>
                                    
                                    {/* Dropdown Menu */}
                                    {menuOpen === inspection.id && (
                                      <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[160px]">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleEditInspection(inspection)
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                                        >
                                          <Edit className="w-3 h-3 mr-2" />
                                          Edit
                                        </button>
                                        {canMarkAsCompleted(inspection) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleMarkCompleted(inspection)
                                              setMenuOpen(null)
                                            }}
                                            disabled={completingInspection === inspection.id}
                                            className="w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50 flex items-center disabled:opacity-50"
                                          >
                                            {completingInspection === inspection.id ? (
                                              <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin mr-2" />
                                            ) : (
                                              <svg className="w-3 h-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                              </svg>
                                            )}
                                            Complete
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            handleCancelInspection(inspection)
                                            setMenuOpen(null)
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50 flex items-center"
                                        >
                                          <X className="w-3 h-3 mr-2" />
                                          Remove
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })} 
                      </div>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Inspection Modal */}
      <ScheduleInspectionModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false)
          setEditingInspection(null)
        }}
        onInspectionScheduled={handleInspectionScheduled}
        editingInspection={editingInspection}
      />

      {/* Delete Inspection Modal */}
      <DeleteInspectionModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteInspection}
        inspection={deletingInspection}
        loading={deleteLoading}
      />
    </div>
    </>
  )
}