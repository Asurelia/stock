import { productsApi } from './products'
import { recipesApi } from './recipes'
import { menusApi } from './menus'
import { staffApi, scheduleEventsApi, userProfilesApi } from './staff'
import { temperatureApi } from './temperature'
import { traceabilityApi } from './traceability'
import { inventoryApi } from './inventory'
import { analyticsApi } from './analytics'
import { activityLogApi } from './activityLog'

export * from './core'
export * from './products'
export * from './recipes'
export * from './menus'
export * from './staff'
export * from './temperature'
export * from './traceability'
export * from './inventory'
export * from './activityLog'

import { recurringOutputsApi } from './traceability'

export const api = {
    products: productsApi,
    recipes: recipesApi,
    menus: menusApi,
    staff: staffApi,
    scheduleEvents: scheduleEventsApi,
    userProfiles: userProfilesApi,
    temperatureEquipment: temperatureApi.temperatureEquipment,
    temperatureReadings: temperatureApi.temperatureReadings,
    traceabilityPhotos: traceabilityApi.traceabilityPhotos,
    outputs: traceabilityApi.outputs,
    recurringOutputs: recurringOutputsApi,
    suppliers: inventoryApi.suppliers,
    deliveries: inventoryApi.deliveries,
    analytics: analyticsApi,
    activityLog: activityLogApi
}
