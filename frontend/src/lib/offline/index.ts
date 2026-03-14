/**
 * Offline module exports
 * All data is stored locally in IndexedDB via Dexie.js
 */

export {
    db,
    generateId,
    nowISO,
    clearAllCache,
    isDBAvailable,
    requestPersistentStorage
} from './db'
