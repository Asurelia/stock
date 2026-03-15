import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface TempReading {
  equipmentName: string
  temperature: number
  isCompliant: boolean
  recordedBy: string
  recordedAt: string
  notes?: string
}

export function generateHACCPReport(readings: TempReading[], dateRange: { from: string; to: string }) {
  const doc = new jsPDF()

  // Title
  doc.setFontSize(18)
  doc.setTextColor(40)
  doc.text('Rapport HACCP - Releves de Temperature', 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Periode: ${dateRange.from} au ${dateRange.to}`, 14, 28)
  doc.text(`Genere le: ${new Date().toLocaleDateString('fr-FR')}`, 14, 34)

  // Stats
  const total = readings.length
  const compliant = readings.filter(r => r.isCompliant).length
  const rate = total > 0 ? Math.round((compliant / total) * 100) : 100

  doc.setFontSize(11)
  doc.setTextColor(40)
  doc.text(`Total releves: ${total} | Conformes: ${compliant} | Taux: ${rate}%`, 14, 42)

  doc.line(14, 46, 196, 46)

  autoTable(doc, {
    startY: 50,
    head: [['Date/Heure', 'Equipement', 'Temperature', 'Conformite', 'Operateur', 'Notes']],
    body: readings.map(r => [
      new Date(r.recordedAt).toLocaleString('fr-FR'),
      r.equipmentName,
      `${r.temperature.toFixed(1)} C`,
      r.isCompliant ? 'Conforme' : 'NON CONFORME',
      r.recordedBy || '-',
      r.notes || '-',
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
    didParseCell(data) {
      if (data.row.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'NON CONFORME') {
          data.cell.styles.textColor = [192, 57, 43]
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [39, 174, 96]
        }
      }
    },
    didDrawPage() {
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${(doc as any).internal.getNumberOfPages()}`, 14, pageHeight - 8)
      doc.text('StockPro Clinique - Usage interne', 105, pageHeight - 8, { align: 'center' })
    },
  })

  doc.save(`haccp_${dateRange.from}_${dateRange.to}.pdf`)
}
