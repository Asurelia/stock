import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Product {
  name: string
  category: string
  quantity: number
  unit: string
  minStock: number
  price: number
}

export function generateInventoryReport(products: Product[]) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.setTextColor(40)
  doc.text('Rapport Inventaire', 14, 20)

  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, 14, 28)

  const totalValue = products.reduce((s, p) => s + p.quantity * p.price, 0)
  const lowStock = products.filter(p => p.minStock > 0 && p.quantity <= p.minStock)
  const outOfStock = products.filter(p => p.quantity <= 0)

  doc.setFontSize(11)
  doc.setTextColor(40)
  doc.text(`Produits: ${products.length} | Valeur totale: ${totalValue.toFixed(2)} EUR | Stock bas: ${lowStock.length} | Ruptures: ${outOfStock.length}`, 14, 36)

  doc.line(14, 40, 196, 40)

  autoTable(doc, {
    startY: 44,
    head: [['Produit', 'Categorie', 'Stock', 'Unite', 'Seuil min.', 'Prix unit.', 'Valeur', 'Statut']],
    body: products.map(p => [
      p.name,
      p.category,
      p.quantity,
      p.unit,
      p.minStock,
      `${p.price.toFixed(2)} EUR`,
      `${(p.quantity * p.price).toFixed(2)} EUR`,
      p.quantity <= 0 ? 'RUPTURE' : p.minStock > 0 && p.quantity <= p.minStock ? 'BAS' : 'OK',
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [39, 174, 96], textColor: 255, fontStyle: 'bold' },
    didParseCell(data) {
      if (data.row.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'RUPTURE') {
          data.cell.styles.textColor = [192, 57, 43]
          data.cell.styles.fontStyle = 'bold'
        } else if (data.cell.raw === 'BAS') {
          data.cell.styles.textColor = [243, 156, 18]
          data.cell.styles.fontStyle = 'bold'
        }
      }
    },
    didDrawPage() {
      const h = doc.internal.pageSize.getHeight()
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`Page ${(doc as any).internal.getNumberOfPages()}`, 14, h - 8)
    },
  })

  doc.save(`inventaire_${new Date().toISOString().split('T')[0]}.pdf`)
}
