export async function exportDatabase(): Promise<void> {
    const token = localStorage.getItem('stockpro_auth_token')
    const res = await fetch('/api/backup/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stockpro-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
}

export async function importDatabase(file: File): Promise<void> {
    const text = await file.text()
    const data = JSON.parse(text)
    const token = localStorage.getItem('stockpro_auth_token')
    const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Import failed')
}

export async function getDatabaseSize(): Promise<{ used: number; quota: number } | null> {
    const token = localStorage.getItem('stockpro_auth_token')
    const res = await fetch('/api/backup/size', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) return null
    const data = await res.json()
    return { used: data.total, quota: 0 }
}

export const backupApi = {
    exportDatabase,
    importDatabase,
    getDatabaseSize,
}
