/**
 * Offline mode module exports
 */

// Offline-aware API
export {
    offlineApi,
    offlineProductsApi,
    offlineOutputsApi,
    offlineTemperatureApi,
    offlineRecipesApi,
    offlineMenusApi
} from './offlineApi'

// Database
export {
    offlineDB,
    type CachedProduct,
    type CachedOutput,
    type CachedTemperatureReading,
    type CachedRecipe,
    type CachedMenu,
    type CachedTemperatureEquipment,
    type PendingMutation,
    type MutationType,
    type SyncMeta,
    generateLocalId,
    isLocalId,
    nowISO,
    clearAllCache,
    clearPendingMutations,
    getPendingMutationsCount,
    getPendingMutations,
    queueMutation,
    updateMutationRetry,
    removeMutation,
    updateSyncMeta,
    getSyncMeta,
    isDBAvailable
} from './db'

// Sync operations
export {
    isOnline,
    subscribeToOnlineStatus,
    initOnlineStatusListeners,
    cacheProducts,
    cacheOutputs,
    cacheTemperatureEquipment,
    cacheTemperatureReadings,
    cacheRecipes,
    cacheMenus,
    cacheAllData,
    syncPendingMutations,
    fullSync,
    createOutputOffline,
    createTemperatureReadingOffline,
    updateProductOffline,
    getProductsFromCache,
    getProductFromCache,
    getOutputsFromCache,
    getTodayOutputsFromCache,
    getTemperatureReadingsFromCache,
    getTemperatureEquipmentFromCache,
    getRecipesFromCache,
    getMenusFromCache,
    type SyncResult,
    type CacheResult
} from './sync'
