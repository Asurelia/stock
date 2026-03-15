/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Database backup and restore utilities
 * Uses dexie-export-import to export/import the entire IndexedDB database
 */

import { db } from './core'
import 'dexie-export-import'

/**
 * Export the entire database as a downloadable JSON file
 */
export async function exportDatabase(): Promise<void> {
    const blob = await (db as any).export({
        prettyJson: true,
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stockpro-backup-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Import a database backup from a JSON file
 * WARNING: This will overwrite all existing data
 */
export async function importDatabase(file: File): Promise<void> {
    await (db as any).import(file, {
        clearTablesBeforeImport: true,
        overwriteValues: true,
        acceptVersionDiff: true,
    })
}

/**
 * Get database size estimate
 */
export async function getDatabaseSize(): Promise<{ used: number; quota: number } | null> {
    if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        return {
            used: estimate.usage || 0,
            quota: estimate.quota || 0,
        }
    }
    return null
}

export const backupApi = {
    export: exportDatabase,
    import: importDatabase,
    getSize: getDatabaseSize,
}
