import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ActivityEntry {
  createdAt: string
  userName: string
  action: string
  entityType: string
  details?: string
}

export function generateActivityReport(entries: ActivityEntry[], date: string) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(40)
  doc.text('Journal d\'activite', 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Date: ${date}`, 14, 28)
  doc.text(`Total: ${entries.length} actions`, 14, 34)

  doc.line(14, 38, 196, 38)

  autoTable(doc, {
    startY: 42,
    head: [['Heure', 'Utilisateur', 'Action', 'Type', 'Details']],
    body: entries.map(e => [
      new Date(e.createdAt).toLocaleTimeString('fr-FR'),
      e.userName || '-',
      e.action,
      e.entityType,
      e.details || '-',
    ]),
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [142, 68, 173], textColor: 255, fontStyle: 'bold' },
    didDrawPage() {
      const h = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${(doc as any).internal.getNumberOfPages()}`, 14, h - 8)
    },
  })

  doc.save(`activite_${date}.pdf`)
}
