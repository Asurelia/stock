import Dexie, { type Table } from 'dexie'

export class StockProOfflineDB extends Dexie {
    products!: Table<any, string>
    outputs!: Table<any, string>
    suppliers!: Table<any, string>
    deliveries!: Table<any, string>
    recipes!: Table<any, string>
    recipeIngredients!: Table<any, string>
    menus!: Table<any, string>
    menuRecipes!: Table<any, string>
    temperatureEquipment!: Table<any, string>
    temperatureReadings!: Table<any, string>
    traceabilityPhotos!: Table<any, string>
    staff!: Table<any, string>
    scheduleEvents!: Table<any, string>
    userProfiles!: Table<any, string>
    activityLog!: Table<any, string>
    userPermissions!: Table<any, string>
    pushTokens!: Table<any, string>
    recurringOutputConfigs!: Table<any, string>
    dailyRecurringOutputs!: Table<any, string>

    constructor() {
        super('stockpro-offline')

        this.version(1).stores({
            products: 'id, category, name',
            outputs: 'id, product_id, output_date',
            temperatureReadings: 'id, equipment_id, recorded_at',
            temperatureEquipment: 'id, type, is_active',
            recipes: 'id, name, category',
            menus: 'id, menu_date, meal_type',
        })

        this.version(2).stores({
            products: 'id, category, name, supplier_id',
            outputs: 'id, product_id, output_date, reason',
            suppliers: 'id, name',
            deliveries: 'id, product_id, supplier_id, delivery_date',
            recipes: 'id, name, category',
            recipeIngredients: 'id, recipe_id, product_id',
            menus: 'id, menu_date, meal_type',
            menuRecipes: 'id, menu_id, recipe_id',
            temperatureEquipment: 'id, name, type, is_active',
            temperatureReadings: 'id, equipment_id, recorded_at',
            traceabilityPhotos: 'id, output_id, captured_at',
            staff: 'id, last_name, is_active',
            scheduleEvents: 'id, staff_id, start_date, end_date, event_type',
            userProfiles: 'id, display_name, role, pin_code, is_active',
            activityLog: 'id, user_profile_id, action, entity_type, created_at',
            userPermissions: 'id, user_profile_id, permission_key',
            pushTokens: 'id, device_id, user_profile_id',
            recurringOutputConfigs: 'id, category, product_id, is_active',
            dailyRecurringOutputs: 'id, date, category, product_id, is_executed',
        })
    }
}

export const db = new StockProOfflineDB()

export function generateId(): string {
    return crypto.randomUUID()
}

export function nowISO(): string {
    return new Date().toISOString()
}

export async function clearAllCache(): Promise<void> {
    await db.transaction(
        'rw',
        [
            db.products,
            db.outputs,
            db.suppliers,
            db.deliveries,
            db.recipes,
            db.recipeIngredients,
            db.menus,
            db.menuRecipes,
            db.temperatureEquipment,
            db.temperatureReadings,
            db.traceabilityPhotos,
            db.staff,
            db.scheduleEvents,
            db.userProfiles,
            db.activityLog,
            db.userPermissions,
            db.pushTokens,
            db.recurringOutputConfigs,
            db.dailyRecurringOutputs,
        ],
        async () => {
            await db.products.clear()
            await db.outputs.clear()
            await db.suppliers.clear()
            await db.deliveries.clear()
            await db.recipes.clear()
            await db.recipeIngredients.clear()
            await db.menus.clear()
            await db.menuRecipes.clear()
            await db.temperatureEquipment.clear()
            await db.temperatureReadings.clear()
            await db.traceabilityPhotos.clear()
            await db.staff.clear()
            await db.scheduleEvents.clear()
            await db.userProfiles.clear()
            await db.activityLog.clear()
            await db.userPermissions.clear()
            await db.pushTokens.clear()
            await db.recurringOutputConfigs.clear()
            await db.dailyRecurringOutputs.clear()
        }
    )
}

export async function isDBAvailable(): Promise<boolean> {
    try {
        await db.open()
        return true
    } catch {
        return false
    }
}

export async function requestPersistentStorage(): Promise<boolean> {
    if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist()
    }
    return false
}
