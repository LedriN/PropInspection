import jsPDF from 'jspdf'

export const testPDFExport = () => {
  try {
    console.log('Testing PDF export...')
    const doc = new jsPDF()
    
    // Add some simple text
    doc.setFontSize(20)
    doc.text('Test PDF Export', 20, 30)
    
    doc.setFontSize(12)
    doc.text('This is a test PDF to verify the export functionality.', 20, 50)
    doc.text('If you can see this, the PDF export is working!', 20, 70)
    
    // Save the PDF
    const fileName = `test_export_${new Date().toISOString().split('T')[0]}.pdf`
    console.log('Saving test PDF with filename:', fileName)
    doc.save(fileName)
    
    console.log('Test PDF export completed successfully')
    return true
  } catch (error) {
    console.error('Error in test PDF export:', error)
    throw error
  }
}
