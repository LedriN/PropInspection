import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface ReportData {
  _id: string
  title: string
  report_type: string
  content: {
    exterior?: Record<string, any>
    interior?: Record<string, any>
    electrical?: Record<string, any>
    plumbing?: Record<string, any>
    hvac?: Record<string, any>
    safety?: Record<string, any>
  }
  status: string
  generated_at: string
  generated_by: string
  property_id?: {
    address: {
      street: string
      city: string
      state: string
      zipCode: string
      country: string
    }
  } | string
  client_id?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  } | string
  agent_id?: {
    firstName: string
    lastName: string
    email: string
    phone: string
  } | string
  // Add the stored names that are actually used
  property_name?: string
  client_name?: string
  agent_name?: string
  agent_email?: string
  client_email?: string
}

export const exportToPDF = async (report: ReportData) => {
  try {
    console.log('Starting PDF export for report:', report)
    console.log('Report email fields:', {
      agent_email: report.agent_email,
      client_email: report.client_email,
      agent_id_email: typeof report.agent_id === 'object' ? report.agent_id?.email : 'N/A',
      client_id_email: typeof report.client_id === 'object' ? report.client_id?.email : 'N/A'
    })
    
    // Validate report data
    if (!report) {
      throw new Error('Invalid report data: report is null or undefined')
    }
    
    if (!report.title) {
      throw new Error('Invalid report data: missing title')
    }
    
    console.log('Report validation passed, proceeding with PDF generation...')
    
    const doc = new jsPDF()
  
  // Set up colors
  const primaryColor = [59, 130, 246] // Blue-500
  const secondaryColor = [107, 114, 128] // Gray-500
  const successColor = [34, 197, 94] // Green-500
  const warningColor = [245, 158, 11] // Yellow-500
  const dangerColor = [239, 68, 68] // Red-500

  // Helper function to get condition color
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent':
      case 'Present & Working':
      case 'Present & Current':
        return successColor
      case 'Good':
        return primaryColor
      case 'Fair':
      case 'Present - Needs Battery':
        return warningColor
      case 'Poor':
      case 'Not Present':
        return dangerColor
      default:
        return secondaryColor
    }
  }

  // Title
  doc.setFontSize(20)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text(report.title, 20, 30)
  
  // Subtitle
  doc.setFontSize(12)
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.text(`${report.report_type} • Generated ${new Date(report.generated_at).toLocaleDateString()}`, 20, 40)

  let yPosition = 60

  // Report Information
  doc.setFontSize(14)
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.text('Report Information', 20, yPosition)
  yPosition += 10

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  
  // Helper function to get property info
  const getPropertyInfo = () => {
    if (report.property_name) {
      return report.property_name
    }
    if (typeof report.property_id === 'object' && report.property_id?.address?.street) {
      return report.property_id.address.street
    }
    if (typeof report.property_id === 'string') {
      return `Property ID: ${report.property_id}`
    }
    return 'N/A'
  }

  // Helper function to get client info
  const getClientInfo = () => {
    if (report.client_name) {
      return report.client_name
    }
    if (typeof report.client_id === 'object' && report.client_id?.firstName && report.client_id?.lastName) {
      return `${report.client_id.firstName} ${report.client_id.lastName}`
    }
    if (typeof report.client_id === 'string') {
      return `Client ID: ${report.client_id}`
    }
    return 'N/A'
  }

  // Helper function to get agent info
  const getAgentInfo = () => {
    if (report.agent_name) {
      return report.agent_name
    }
    if (typeof report.agent_id === 'object' && report.agent_id?.firstName && report.agent_id?.lastName) {
      return `${report.agent_id.firstName} ${report.agent_id.lastName}`
    }
    if (typeof report.agent_id === 'string') {
      return `Agent ID: ${report.agent_id}`
    }
    return 'N/A'
  }

  // Helper function to get client email
  const getClientEmail = () => {
    if (report.client_email && report.client_email.trim() !== '') {
      return report.client_email
    }
    if (typeof report.client_id === 'object' && report.client_id?.email) {
      return report.client_id.email
    }
    return 'N/A'
  }

  // Helper function to get agent email
  const getAgentEmail = async () => {
    if (report.agent_email && report.agent_email.trim() !== '') {
      return report.agent_email
    }
    if (typeof report.agent_id === 'object' && report.agent_id?.email) {
      return report.agent_id.email
    }
    
    // If we have agent_name, try to fetch from agents API
    if (report.agent_name && report.agent_name.trim() !== '') {
      try {
        const response = await fetch('/api/agents', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
        if (response.ok) {
          const result = await response.json()
          const agents = result.data || []
          const agent = agents.find((a: any) => 
            `${a.firstName} ${a.lastName}`.trim().toLowerCase() === report.agent_name?.toLowerCase() ||
            a.email === report.agent_name?.toLowerCase()
          )
          if (agent?.email) {
            return agent.email
          }
        }
      } catch (error) {
        console.error('Error fetching agent email:', error)
      }
    }
    
    return 'N/A'
  }

  const reportInfo = [
    ['Generated By:', report.generated_by || 'System'],
    ['Generated Date:', new Date(report.generated_at || Date.now()).toLocaleString()],
    ['Property:', getPropertyInfo()],
    ['Client:', getClientInfo()],
    ['Agent:', getAgentInfo()]
  ]

  reportInfo.forEach(([label, value]) => {
    doc.text(label, 20, yPosition)
    doc.text(value, 80, yPosition)
    yPosition += 6
  })

  yPosition += 10

  // Inspection Areas
  if (report.content && Object.keys(report.content).length > 0) {
    const inspectionAreas = [
      { name: 'Exterior', data: report.content.exterior },
      { name: 'Interior', data: report.content.interior },
      { name: 'Electrical', data: report.content.electrical },
      { name: 'Plumbing', data: report.content.plumbing },
      { name: 'HVAC', data: report.content.hvac },
      { name: 'Safety', data: report.content.safety }
    ]

    inspectionAreas.forEach((area) => {
      if (area.data && Object.keys(area.data).length > 0) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        // Area title
        doc.setFontSize(14)
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2])
        doc.text(area.name, 20, yPosition)
        yPosition += 10

        // Area data table
        const tableData = Object.entries(area.data)
          .filter(([key]) => !key.endsWith('_notes'))
          .map(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return [label, value as string]
          })

        if (tableData.length > 0) {
          // Simple table without autoTable plugin
          tableData.forEach(([label, condition]) => {
            if (yPosition > 250) {
              doc.addPage()
              yPosition = 20
            }
            
            doc.setFontSize(10)
            doc.setTextColor(0, 0, 0)
            doc.text(label, 20, yPosition)
            
            const color = getConditionColor(condition)
            doc.setTextColor(color[0], color[1], color[2])
            doc.setFont('helvetica', 'bold')
            doc.text(condition, 120, yPosition)
            
            yPosition += 6
          })
          yPosition += 5
        }

        // Notes
        const notesKey = `${Object.keys(area.data || {})[0]?.split('_')[0]}_notes`
        if (area.data && area.data[notesKey]) {
          doc.setFontSize(10)
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
          doc.text(`Notes: ${area.data[notesKey]}`, 20, yPosition)
          yPosition += 10
        }
      }
    })
  } else {
    // No inspection content available
    doc.setFontSize(12)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text('No inspection data available for this report.', 20, yPosition)
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
    doc.text(`Page ${i} of ${pageCount}`, 20, doc.internal.pageSize.height - 10)
    doc.text('Generated by PropInspection Dashboard', doc.internal.pageSize.width - 80, doc.internal.pageSize.height - 10)
  }

    // Save the PDF
    const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`
    console.log('Saving PDF with filename:', fileName)
    console.log('PDF document object:', doc)
    console.log('PDF page count:', doc.getNumberOfPages())
    
    try {
      doc.save(fileName)
      console.log('PDF export completed successfully')
    } catch (saveError) {
      console.error('Error saving PDF:', saveError)
      throw new Error(`Failed to save PDF: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Error in PDF export:', error)
    throw error
  }
}

export const exportToExcel = async (report: ReportData) => {
  try {
    console.log('Starting Excel export for report:', report)
    console.log('Report email fields:', {
      agent_email: report.agent_email,
      client_email: report.client_email,
      agent_id_email: typeof report.agent_id === 'object' ? report.agent_id?.email : 'N/A',
      client_id_email: typeof report.client_id === 'object' ? report.client_id?.email : 'N/A'
    })
    
    // Validate report data
    if (!report) {
      throw new Error('Invalid report data: report is null or undefined')
    }
    
    if (!report.title) {
      throw new Error('Invalid report data: missing title')
    }
    
    console.log('Report validation passed, proceeding with Excel generation...')

    const workbook = XLSX.utils.book_new()

    // Helper function to get condition color for Excel
    const getConditionColor = (condition: string) => {
      switch (condition) {
        case 'Excellent':
        case 'Present & Working':
        case 'Present & Current':
          return { fgColor: { rgb: '228C7E' } } // Green
        case 'Good':
          return { fgColor: { rgb: '3B82F6' } } // Blue
        case 'Fair':
        case 'Present - Needs Battery':
          return { fgColor: { rgb: 'F59E0B' } } // Yellow
        case 'Poor':
        case 'Not Present':
          return { fgColor: { rgb: 'EF4444' } } // Red
        default:
          return { fgColor: { rgb: '6B7280' } } // Gray
      }
    }

    // Helper functions for Excel export
    const getPropertyInfo = () => {
      if (report.property_name) {
        return report.property_name
      }
      if (typeof report.property_id === 'object' && report.property_id?.address?.street) {
        return report.property_id.address.street
      }
      if (typeof report.property_id === 'string') {
        return `Property ID: ${report.property_id}`
      }
      return 'N/A'
    }

    const getClientInfo = () => {
      if (report.client_name) {
        return report.client_name
      }
      if (typeof report.client_id === 'object' && report.client_id?.firstName && report.client_id?.lastName) {
        return `${report.client_id.firstName} ${report.client_id.lastName}`
      }
      if (typeof report.client_id === 'string') {
        return `Client ID: ${report.client_id}`
      }
      return 'N/A'
    }

    const getAgentInfo = () => {
      if (report.agent_name) {
        return report.agent_name
      }
      if (typeof report.agent_id === 'object' && report.agent_id?.firstName && report.agent_id?.lastName) {
        return `${report.agent_id.firstName} ${report.agent_id.lastName}`
      }
      if (typeof report.agent_id === 'string') {
        return `Agent ID: ${report.agent_id}`
      }
      return 'N/A'
    }

    const getClientEmail = () => {
      if (report.client_email && report.client_email.trim() !== '') {
        return report.client_email
      }
      if (typeof report.client_id === 'object' && report.client_id?.email) {
        return report.client_id.email
      }
      return 'N/A'
    }

    const getAgentEmail = async () => {
      if (report.agent_email && report.agent_email.trim() !== '') {
        return report.agent_email
      }
      if (typeof report.agent_id === 'object' && report.agent_id?.email) {
        return report.agent_id.email
      }
      
      // If we have agent_name, try to fetch from agents API
      if (report.agent_name && report.agent_name.trim() !== '') {
        try {
          const response = await fetch('/api/agents', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })
          if (response.ok) {
            const result = await response.json()
            const agents = result.data || []
            const agent = agents.find((a: any) => 
              `${a.firstName} ${a.lastName}`.trim().toLowerCase() === report.agent_name?.toLowerCase() ||
              a.email === report.agent_name?.toLowerCase()
            )
            if (agent?.email) {
              return agent.email
            }
          }
        } catch (error) {
          console.error('Error fetching agent email:', error)
        }
      }
      
      return 'N/A'
    }

    // Report Information Sheet
    const reportInfo = [
      ['Report Title', report.title],
      ['Report Type', report.report_type || 'Report'],
      ['Generated By', report.generated_by || 'System'],
      ['Generated Date', new Date(report.generated_at || Date.now()).toLocaleString()],
      ['', ''],
      ['Property Information', ''],
      ['Property', getPropertyInfo()],
      ['', ''],
      ['Client Information', ''],
      ['Name', getClientInfo()],
      ['', ''],
      ['Agent Information', ''],
      ['Name', getAgentInfo()]
    ]

    const reportInfoSheet = XLSX.utils.aoa_to_sheet(reportInfo)
    XLSX.utils.book_append_sheet(workbook, reportInfoSheet, 'Report Info')

    // Inspection Areas
    if (report.content) {
      const inspectionAreas = [
        { name: 'Exterior', data: report.content.exterior },
        { name: 'Interior', data: report.content.interior },
        { name: 'Electrical', data: report.content.electrical },
        { name: 'Plumbing', data: report.content.plumbing },
        { name: 'HVAC', data: report.content.hvac },
        { name: 'Safety', data: report.content.safety }
      ]

      inspectionAreas.forEach((area) => {
        if (area.data && Object.keys(area.data).length > 0) {
          const areaData = [
            ['Item', 'Condition', 'Notes']
          ]

          Object.entries(area.data).forEach(([key, value]) => {
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            const notesKey = `${key.split('_')[0]}_notes`
            const notes = area.data?.[notesKey] || ''
            
            if (!key.endsWith('_notes')) {
              areaData.push([label, value as string, notes])
            }
          })

          const areaSheet = XLSX.utils.aoa_to_sheet(areaData)
          
          // Apply styling to condition column
          const range = XLSX.utils.decode_range(areaSheet['!ref'] || 'A1')
          for (let row = range.s.r + 1; row <= range.e.r; row++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: 1 })
            if (areaSheet[cellAddress]) {
              const condition = areaSheet[cellAddress].v
              areaSheet[cellAddress].s = getConditionColor(condition)
            }
          }

          XLSX.utils.book_append_sheet(workbook, areaSheet, area.name)
        }
      })
    }

    // Summary Sheet
    const summaryData = [
      ['Inspection Summary', ''],
      ['', ''],
      ['Area', 'Overall Condition', 'Notes']
    ]

    if (report.content) {
      const inspectionAreas = [
        { name: 'Exterior', data: report.content.exterior },
        { name: 'Interior', data: report.content.interior },
        { name: 'Electrical', data: report.content.electrical },
        { name: 'Plumbing', data: report.content.plumbing },
        { name: 'HVAC', data: report.content.hvac },
        { name: 'Safety', data: report.content.safety }
      ]

      inspectionAreas.forEach((area) => {
        if (area.data && Object.keys(area.data).length > 0) {
          const conditions = Object.entries(area.data)
            .filter(([key]) => !key.endsWith('_notes'))
            .map(([, value]) => value as string)
          
          // Calculate overall condition (simplified logic)
          let overallCondition = 'Good'
          if (conditions.includes('Poor') || conditions.includes('Not Present')) {
            overallCondition = 'Poor'
          } else if (conditions.includes('Fair') || conditions.includes('Present - Needs Battery')) {
            overallCondition = 'Fair'
          } else if (conditions.every(c => c === 'Excellent' || c === 'Present & Working' || c === 'Present & Current')) {
            overallCondition = 'Excellent'
          }

          const notesKey = `${Object.keys(area.data)[0]?.split('_')[0]}_notes`
          const notes = area.data[notesKey] || ''

          summaryData.push([area.name, overallCondition, notes])
        }
      })
    }

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')

    // Save the Excel file
    const fileName = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.xlsx`
    console.log('Saving Excel file with filename:', fileName)
    console.log('Workbook object:', workbook)
    
    try {
      XLSX.writeFile(workbook, fileName)
      console.log('Excel export completed successfully')
    } catch (saveError) {
      console.error('Error saving Excel file:', saveError)
      throw new Error(`Failed to save Excel file: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error('Error in Excel export:', error)
    throw error
  }
}

export const exportReportListToExcel = (reports: any[]) => {
  const workbook = XLSX.utils.book_new()
  
  const reportListData = [
    ['Report Title', 'Type', 'Property', 'Client', 'Agent', 'Generated Date']
  ]

  reports.forEach((report) => {
    // Helper functions for report list
    const getPropertyInfo = () => {
      if (report.property_name) {
        return report.property_name
      }
      if (typeof report.property_id === 'object' && report.property_id?.address?.street) {
        return report.property_id.address.street
      }
      if (typeof report.property_id === 'string') {
        return `Property ID: ${report.property_id}`
      }
      return 'N/A'
    }

    const getClientInfo = () => {
      if (report.client_name) {
        return report.client_name
      }
      if (typeof report.client_id === 'object' && report.client_id?.firstName && report.client_id?.lastName) {
        return `${report.client_id.firstName} ${report.client_id.lastName}`
      }
      if (typeof report.client_id === 'string') {
        return `Client ID: ${report.client_id}`
      }
      return 'N/A'
    }

    const getAgentInfo = () => {
      if (report.agent_name) {
        return report.agent_name
      }
      if (typeof report.agent_id === 'object' && report.agent_id?.firstName && report.agent_id?.lastName) {
        return `${report.agent_id.firstName} ${report.agent_id.lastName}`
      }
      if (typeof report.agent_id === 'string') {
        return `Agent ID: ${report.agent_id}`
      }
      return 'N/A'
    }

    reportListData.push([
      report.title,
      report.report_type || 'Report',
      getPropertyInfo(),
      getClientInfo(),
      getAgentInfo(),
      new Date(report.generated_at || Date.now()).toLocaleDateString()
    ])
  })

  const reportListSheet = XLSX.utils.aoa_to_sheet(reportListData)
  XLSX.utils.book_append_sheet(workbook, reportListSheet, 'Reports List')

  const fileName = `reports_list_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, fileName)
}
