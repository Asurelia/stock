/**
 * Legacy offline/db module - now backed by Express + Prisma + SQLite.
 * These exports are kept for backward compatibility with files that still import them.
 */

export const db = null

export function generateId(): string {
  return crypto.randomUUID()
}

export function nowISO(): string {
  return new Date().toISOString()
}

export async function clearAllCache(): Promise<void> {
  // No-op: data is managed by the backend
}

export async function isDBAvailable(): Promise<boolean> {
  try {
    const res = await fetch('/api/products')
    return res.ok
  } catch {
    return false
  }
}

export async function requestPersistentStorage(): Promise<boolean> {
  return true
}
