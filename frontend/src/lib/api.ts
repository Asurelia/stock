import { supabase } from './supabase'
import type { Json } from './database.types'

// =============================================
// Types
// =============================================

export interface Product {
    id: string
    name: string
    category: string
    quantity: number
    unit: string
    minStock: number
    avgConsumption: number
    price: number
    emoji?: string
}

export interface Output {
    id: string
    productId: string
    productName?: string
    product?: Product
    quantity: number
    reason: string
    recipeId?: string | null
    recipeName?: string
    date: string
    createdAt: string
}

export interface Supplier {
    id: string
    name: string
    category: string
    phone: string
    email: string
    contact: string
    notes: string
    logoUrl: string
    orderDays: string[]
    deliveryDays: string[]
}

export interface DeliveryItem {
    id?: string
    productId: string
    productName: string
    quantity: number
    price: number
}

export interface Delivery {
    id: string
    date: string
    supplierId: string | null
    supplierName: string
    photoUrl: string | null
    total: number
    items: DeliveryItem[]
    createdAt: string
}

export interface RecipeIngredient {
    id?: string
    productId: string
    productName: string
    quantity: number
    unit: string
}

export interface Recipe {
    id: string
    name: string
    portions: number
    photoUrl: string | null
    dietaryTags: string[]
    instructions: string
    ingredients: RecipeIngredient[]
}

// Menu types (nouvelle structure)
export interface Menu {
    id: string
    name: string
    menuDate: string
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null
    notes: string | null
    recipes: MenuRecipe[]
}

export interface MenuRecipe {
    id: string
    recipeId: string
    recipeName: string
    servings: number
}

// =============================================
// Staff & Planning Types
// =============================================

export type StaffGroup = 'week1' | 'week2' | 'manager'
export type WorkDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export interface Staff {
    id: string
    firstName: string
    lastName: string
    role: string
    email: string
    phone: string
    color: string
    avatarUrl?: string | null
    contractHours: number
    isActive: boolean
    signatureData?: string | null
    pinCode?: string | null
    staffGroup: StaffGroup
    workDaysWeek1: WorkDay[]
    workDaysWeek2: WorkDay[]
    createdAt: string
}

export const STAFF_GROUPS: Record<StaffGroup, { label: string; color: string; icon: string }> = {
    week1: { label: 'Semaine 1', color: '#3B82F6', icon: '1️⃣' },
    week2: { label: 'Semaine 2', color: '#22C55E', icon: '2️⃣' },
    manager: { label: 'Chef Gérant', color: '#F59E0B', icon: '👨‍🍳' }
}

export const WEEK_DAYS: { key: WorkDay; label: string; short: string }[] = [
    { key: 'mon', label: 'Lundi', short: 'L' },
    { key: 'tue', label: 'Mardi', short: 'M' },
    { key: 'wed', label: 'Mercredi', short: 'M' },
    { key: 'thu', label: 'Jeudi', short: 'J' },
    { key: 'fri', label: 'Vendredi', short: 'V' },
    { key: 'sat', label: 'Samedi', short: 'S' },
    { key: 'sun', label: 'Dimanche', short: 'D' }
]

export type ScheduleEventType =
    | 'work'
    | 'vacation'
    | 'sick'
    | 'overtime'
    | 'training'
    | 'holiday'
    | 'unpaid_leave'
    | 'recovery'

export interface ScheduleEvent {
    id: string
    staffId: string
    staffName: string
    staffColor: string
    eventType: ScheduleEventType
    title?: string | null
    startDate: string
    endDate: string
    startTime?: string | null
    endTime?: string | null
    hours: number
    notes?: string | null
    isValidated: boolean
    validatedBy?: string | null
    validatedAt?: string | null
    createdAt: string
}

export interface UserProfile {
    id: string
    staffId?: string | null
    staffName?: string | null
    displayName: string
    role: 'admin' | 'manager' | 'user'
    avatarEmoji: string
    lastLogin?: string | null
    preferences: Record<string, unknown>
    isActive: boolean
    createdAt: string
}

// Event type display info
export const EVENT_TYPES: Record<ScheduleEventType, { label: string; color: string; icon: string }> = {
    work: { label: 'Travail', color: '#22C55E', icon: '💼' },
    vacation: { label: 'Congés', color: '#3B82F6', icon: '🏖️' },
    sick: { label: 'Maladie', color: '#EF4444', icon: '🤒' },
    overtime: { label: 'Heures sup.', color: '#F59E0B', icon: '⏰' },
    training: { label: 'Formation', color: '#8B5CF6', icon: '📚' },
    holiday: { label: 'Férié', color: '#EC4899', icon: '🎉' },
    unpaid_leave: { label: 'Sans solde', color: '#6B7280', icon: '📋' },
    recovery: { label: 'Récupération', color: '#14B8A6', icon: '🔄' }
}

export const STAFF_ROLES = [
    'Chef cuisinier',
    'Cuisinier',
    'Commis',
    'Aide-cuisinier',
    'Plongeur',
    'Serveur',
    'Responsable',
    'Autre'
] as const

export const STAFF_COLORS = [
    '#3B82F6', // Blue
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#84CC16', // Lime
]

// =============================================
// Helper
// =============================================

function getSupabase() {
    if (!supabase) {
        throw new Error('Supabase non configuré. Vérifiez les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY')
    }
    return supabase
}

// =============================================
// Output Reasons
// =============================================

export const OUTPUT_REASONS = [
    'Service midi',
    'Service soir',
    'Perte',
    'Casse',
    'Péremption',
    'Autre'
] as const

// =============================================
// Supplier Categories
// =============================================

export const SUPPLIER_CATEGORIES = [
    { value: 'fruits-legumes', label: 'Fruits & Légumes', color: 'bg-green-500' },
    { value: 'viandes', label: 'Viandes', color: 'bg-red-500' },
    { value: 'poissons', label: 'Poissons', color: 'bg-blue-500' },
    { value: 'produits-laitiers', label: 'Produits Laitiers', color: 'bg-yellow-500' },
    { value: 'epicerie', label: 'Épicerie', color: 'bg-orange-500' },
    { value: 'boulangerie', label: 'Boulangerie', color: 'bg-amber-600' },
    { value: 'boissons', label: 'Boissons', color: 'bg-cyan-500' },
    { value: 'surgeles', label: 'Surgelés', color: 'bg-indigo-500' },
    { value: 'hygiene', label: 'Hygiène', color: 'bg-pink-500' },
    { value: 'materiel', label: 'Matériel', color: 'bg-gray-500' },
    { value: 'autre', label: 'Autre', color: 'bg-slate-500' },
] as const

// =============================================
// Dietary Tags
// =============================================

export const DIETARY_TAGS = [
    { value: 'normal', label: 'Normal', color: 'bg-gray-500' },
    { value: 'sans-sel', label: 'Sans sel', color: 'bg-blue-500' },
    { value: 'mixe', label: 'Mixé', color: 'bg-purple-500' },
    { value: 'hache', label: 'Haché', color: 'bg-orange-500' },
    { value: 'diabetique', label: 'Diabétique', color: 'bg-red-500' },
    { value: 'sans-gluten', label: 'Sans gluten', color: 'bg-yellow-500' },
    { value: 'vegetarien', label: 'Végétarien', color: 'bg-green-500' },
    { value: 'sans-lactose', label: 'Sans lactose', color: 'bg-cyan-500' },
] as const

// =============================================
// API
// =============================================

export const api = {
    // =========================================
    // Products
    // =========================================
    products: {
        getAll: async (): Promise<Product[]> => {
            const { data, error } = await getSupabase()
                .from('products')
                .select('*')
                .order('name')

            if (error) throw error

            return (data || []).map(p => ({
                id: p.id,
                name: p.name,
                category: p.category || '',
                quantity: Number(p.quantity) || 0,
                unit: p.unit || 'kg',
                minStock: Number(p.min_stock) || 0,
                avgConsumption: 0,
                price: Number(p.price) || 0
            }))
        },

        getById: async (id: string): Promise<Product> => {
            const { data, error } = await getSupabase()
                .from('products')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error

            return {
                id: data.id,
                name: data.name,
                category: data.category || '',
                quantity: Number(data.quantity) || 0,
                unit: data.unit || 'kg',
                minStock: Number(data.min_stock) || 0,
                avgConsumption: 0,
                price: Number(data.price) || 0
            }
        },

        create: async (productData: Omit<Product, 'id'>): Promise<Product> => {
            const { data, error } = await getSupabase()
                .from('products')
                .insert([{
                    name: productData.name,
                    category: productData.category,
                    quantity: productData.quantity,
                    unit: productData.unit,
                    price: productData.price,
                    min_stock: productData.minStock
                }])
                .select()
                .single()

            if (error) throw error

            return {
                id: data.id,
                name: data.name,
                category: data.category || '',
                quantity: Number(data.quantity) || 0,
                unit: data.unit || 'kg',
                minStock: Number(data.min_stock) || 0,
                avgConsumption: 0,
                price: Number(data.price) || 0
            }
        },

        update: async (id: string, productData: Partial<Product>): Promise<void> => {
            const { error } = await getSupabase()
                .from('products')
                .update({
                    name: productData.name,
                    category: productData.category,
                    quantity: productData.quantity,
                    unit: productData.unit,
                    price: productData.price,
                    min_stock: productData.minStock
                })
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('products')
                .delete()
                .eq('id', id)

            if (error) throw error
        },

        getCritical: async (): Promise<Product[]> => {
            const products = await api.products.getAll()
            return products.filter(p => p.quantity <= 0 || (p.minStock > 0 && p.quantity <= p.minStock))
        },

        getLowStock: async (): Promise<Product[]> => {
            const products = await api.products.getAll()
            return products.filter(p => {
                if (p.quantity <= 0) return true
                if (p.minStock > 0 && p.quantity <= p.minStock * 1.5) return true
                return false
            })
        },

        getTotalValue: async (): Promise<number> => {
            const products = await api.products.getAll()
            return products.reduce((sum, p) => sum + (p.quantity * p.price), 0)
        }
    },

    // =========================================
    // Outputs
    // =========================================
    outputs: {
        getAll: async (): Promise<Output[]> => {
            const { data, error } = await getSupabase()
                .from('outputs')
                .select(`
                    *,
                    products (name)
                `)
                .order('output_date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data || []).map(o => ({
                id: o.id,
                productId: o.product_id || '',
                productName: (o.products as { name: string } | null)?.name || 'Produit supprimé',
                quantity: Number(o.quantity) || 0,
                reason: o.reason || 'Service midi',
                date: o.output_date,
                createdAt: o.created_at
            }))
        },

        getByDateRange: async (from: string, to: string): Promise<Output[]> => {
            // Add time to make the range inclusive of the full days
            const fromDate = `${from}T00:00:00.000Z`
            const toDate = `${to}T23:59:59.999Z`

            const { data, error } = await getSupabase()
                .from('outputs')
                .select(`
                    *,
                    products (name)
                `)
                .gte('output_date', fromDate)
                .lte('output_date', toDate)
                .order('output_date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data || []).map(o => ({
                id: o.id,
                productId: o.product_id || '',
                productName: (o.products as { name: string } | null)?.name || 'Produit supprimé',
                quantity: Number(o.quantity) || 0,
                reason: o.reason || 'Service midi',
                date: o.output_date,
                createdAt: o.created_at
            }))
        },

        getToday: async (): Promise<Output[]> => {
            const today = new Date().toISOString().split('T')[0]
            return api.outputs.getByDateRange(today, today)
        },

        create: async (outputData: { productId: string; quantity: number; reason: string; date?: string }): Promise<Output> => {
            const supabaseClient = getSupabase()

            // 1. Get current product stock
            const { data: product, error: productError } = await supabaseClient
                .from('products')
                .select('quantity')
                .eq('id', outputData.productId)
                .single()

            if (productError) throw productError

            const currentStock = Number(product.quantity) || 0
            const newStock = currentStock - outputData.quantity

            if (newStock < 0) {
                throw new Error('Stock insuffisant')
            }

            // 2. Create the output record
            const { data, error } = await supabaseClient
                .from('outputs')
                .insert([{
                    product_id: outputData.productId,
                    quantity: outputData.quantity,
                    reason: outputData.reason,
                    output_date: outputData.date || new Date().toISOString()
                }])
                .select(`
                    *,
                    products (name)
                `)
                .single()

            if (error) throw error

            // 3. Update product stock
            const { error: updateError } = await supabaseClient
                .from('products')
                .update({ quantity: newStock })
                .eq('id', outputData.productId)

            if (updateError) throw updateError

            return {
                id: data.id,
                productId: data.product_id || '',
                productName: (data.products as { name: string } | null)?.name || '',
                quantity: Number(data.quantity) || 0,
                reason: data.reason || 'Service midi',
                date: data.output_date,
                createdAt: data.created_at
            }
        },

        delete: async (id: string): Promise<void> => {
            const supabaseClient = getSupabase()

            // 1. Get the output to restore stock
            const { data: output, error: fetchError } = await supabaseClient
                .from('outputs')
                .select('product_id, quantity')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // 2. Get current product stock
            const { data: product, error: productError } = await supabaseClient
                .from('products')
                .select('quantity')
                .eq('id', output.product_id)
                .single()

            if (productError) throw productError

            // 3. Restore the stock
            const restoredStock = Number(product.quantity) + Number(output.quantity)

            const { error: updateError } = await supabaseClient
                .from('products')
                .update({ quantity: restoredStock })
                .eq('id', output.product_id)

            if (updateError) throw updateError

            // 4. Delete the output record
            const { error } = await supabaseClient
                .from('outputs')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Suppliers
    // =========================================
    suppliers: {
        getAll: async (): Promise<Supplier[]> => {
            const { data, error } = await getSupabase()
                .from('suppliers')
                .select('*')
                .order('name')

            if (error) throw error

            return (data || []).map(s => ({
                id: s.id,
                name: s.name,
                category: 'autre',
                phone: s.phone || '',
                email: s.email || '',
                contact: s.contact || '',
                notes: s.notes || '',
                logoUrl: '',
                orderDays: [],
                deliveryDays: []
            }))
        },

        create: async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
            const { data, error } = await getSupabase()
                .from('suppliers')
                .insert([{
                    name: supplierData.name,
                    phone: supplierData.phone,
                    email: supplierData.email,
                    contact: supplierData.contact,
                    notes: supplierData.notes
                }])
                .select()
                .single()

            if (error) throw error

            return {
                id: data.id,
                name: data.name,
                category: 'autre',
                phone: data.phone || '',
                email: data.email || '',
                contact: data.contact || '',
                notes: data.notes || '',
                logoUrl: '',
                orderDays: [],
                deliveryDays: []
            }
        },

        update: async (id: string, supplierData: Partial<Supplier>): Promise<void> => {
            const { error } = await getSupabase()
                .from('suppliers')
                .update({
                    name: supplierData.name,
                    phone: supplierData.phone,
                    email: supplierData.email,
                    contact: supplierData.contact,
                    notes: supplierData.notes
                })
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('suppliers')
                .delete()
                .eq('id', id)

            if (error) throw error
        },

        getTodayOrderReminders: async (): Promise<Supplier[]> => {
            const suppliers = await api.suppliers.getAll()
            const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long' }).toLowerCase()
            return suppliers.filter(s => s.orderDays.map(d => d.toLowerCase()).includes(today))
        }
    },

    // =========================================
    // Deliveries
    // =========================================
    deliveries: {
        getAll: async (): Promise<Delivery[]> => {
            // Get deliveries with product and supplier info
            const { data, error } = await getSupabase()
                .from('deliveries')
                .select(`
                    *,
                    products (name),
                    suppliers (name)
                `)
                .order('delivery_date', { ascending: false })

            if (error) throw error

            return (data || []).map(d => ({
                id: d.id,
                date: d.delivery_date,
                supplierId: d.supplier_id,
                supplierName: (d.suppliers as { name: string } | null)?.name || '',
                photoUrl: null,
                total: Number(d.total_price) || 0,
                items: [{
                    id: d.id,
                    productId: d.product_id,
                    productName: (d.products as { name: string } | null)?.name || '',
                    quantity: Number(d.quantity) || 0,
                    price: Number(d.unit_price) || 0
                }],
                createdAt: d.created_at
            }))
        },

        create: async (deliveryData: { date: string; supplierName: string; supplierId?: string; photoUrl?: string; items: DeliveryItem[] }): Promise<Delivery> => {
            // The table structure has one delivery per product, so create multiple entries
            const results: Delivery[] = []

            for (const item of deliveryData.items) {
                const { data: delivery, error: deliveryError } = await getSupabase()
                    .from('deliveries')
                    .insert([{
                        product_id: item.productId,
                        supplier_id: deliveryData.supplierId || null,
                        quantity: item.quantity,
                        unit_price: item.price,
                        total_price: item.quantity * item.price,
                        delivery_date: deliveryData.date
                    }])
                    .select()
                    .single()

                if (deliveryError) throw deliveryError

                results.push({
                    id: delivery.id,
                    date: delivery.delivery_date,
                    supplierId: delivery.supplier_id,
                    supplierName: deliveryData.supplierName,
                    photoUrl: null,
                    total: Number(delivery.total_price) || 0,
                    items: [{
                        id: delivery.id,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: Number(delivery.quantity) || 0,
                        price: Number(delivery.unit_price) || 0
                    }],
                    createdAt: delivery.created_at
                })
            }

            return results[0] || {
                id: '',
                date: deliveryData.date,
                supplierId: deliveryData.supplierId || null,
                supplierName: deliveryData.supplierName,
                photoUrl: null,
                total: 0,
                items: [],
                createdAt: new Date().toISOString()
            }
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('deliveries')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Recipes
    // =========================================
    recipes: {
        getAll: async (): Promise<Recipe[]> => {
            const { data, error } = await getSupabase()
                .from('recipes')
                .select(`
                    *,
                    recipe_ingredients (
                        id,
                        product_id,
                        quantity,
                        unit,
                        products (name)
                    )
                `)
                .order('name')

            if (error) throw error

            return (data || []).map(r => ({
                id: r.id,
                name: r.name,
                portions: r.servings || 1,
                photoUrl: null,
                dietaryTags: [],
                instructions: r.instructions || '',
                ingredients: (r.recipe_ingredients || []).map((ing: { id: string; product_id: string; quantity: number; unit: string; products: { name: string } | null }) => ({
                    id: ing.id,
                    productId: ing.product_id,
                    productName: ing.products?.name || '',
                    quantity: Number(ing.quantity) || 0,
                    unit: ing.unit || ''
                }))
            }))
        },

        create: async (recipeData: Omit<Recipe, 'id'>): Promise<Recipe> => {
            const { data: recipe, error: recipeError } = await getSupabase()
                .from('recipes')
                .insert([{
                    name: recipeData.name,
                    servings: recipeData.portions,
                    instructions: recipeData.instructions
                }])
                .select()
                .single()

            if (recipeError) throw recipeError

            if (recipeData.ingredients.length > 0) {
                const { error: ingredientsError } = await getSupabase()
                    .from('recipe_ingredients')
                    .insert(recipeData.ingredients.map(ing => ({
                        recipe_id: recipe.id,
                        product_id: ing.productId,
                        quantity: ing.quantity,
                        unit: ing.unit
                    })))

                if (ingredientsError) throw ingredientsError
            }

            return {
                id: recipe.id,
                name: recipe.name,
                portions: recipe.servings || 1,
                photoUrl: null,
                dietaryTags: [],
                instructions: recipe.instructions || '',
                ingredients: recipeData.ingredients
            }
        },

        update: async (id: string, recipeData: Partial<Recipe>): Promise<void> => {
            const { error: recipeError } = await getSupabase()
                .from('recipes')
                .update({
                    name: recipeData.name,
                    servings: recipeData.portions,
                    instructions: recipeData.instructions
                })
                .eq('id', id)

            if (recipeError) throw recipeError

            if (recipeData.ingredients) {
                await getSupabase()
                    .from('recipe_ingredients')
                    .delete()
                    .eq('recipe_id', id)

                if (recipeData.ingredients.length > 0) {
                    const { error: ingredientsError } = await getSupabase()
                        .from('recipe_ingredients')
                        .insert(recipeData.ingredients.map(ing => ({
                            recipe_id: id,
                            product_id: ing.productId,
                            quantity: ing.quantity,
                            unit: ing.unit
                        })))

                    if (ingredientsError) throw ingredientsError
                }
            }
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('recipes')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Menus (nouvelle structure)
    // =========================================
    menus: {
        getAll: async () => {
            const { data, error } = await getSupabase()
                .from('menus')
                .select(`
                    *,
                    menu_recipes (
                        id,
                        recipe_id,
                        servings,
                        recipes (name)
                    )
                `)
                .order('menu_date', { ascending: false })

            if (error) throw error
            return data || []
        },

        getByDate: async (date: string) => {
            const { data, error } = await getSupabase()
                .from('menus')
                .select(`
                    *,
                    menu_recipes (
                        id,
                        recipe_id,
                        servings,
                        recipes (name)
                    )
                `)
                .eq('menu_date', date)

            if (error) throw error
            return data || []
        },

        create: async (menuData: { name: string; menu_date: string; meal_type?: string; notes?: string }) => {
            const { data, error } = await getSupabase()
                .from('menus')
                .insert([menuData])
                .select()
                .single()

            if (error) throw error
            return data
        },

        update: async (id: string, menuData: { name?: string; menu_date?: string; meal_type?: string; notes?: string }) => {
            const { error } = await getSupabase()
                .from('menus')
                .update(menuData)
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string) => {
            const { error } = await getSupabase()
                .from('menus')
                .delete()
                .eq('id', id)

            if (error) throw error
        },

        addRecipe: async (menuId: string, recipeId: string, servings?: number) => {
            const { data, error } = await getSupabase()
                .from('menu_recipes')
                .insert([{
                    menu_id: menuId,
                    recipe_id: recipeId,
                    servings: servings || 1
                }])
                .select()
                .single()

            if (error) throw error
            return data
        },

        removeRecipe: async (menuRecipeId: string) => {
            const { error } = await getSupabase()
                .from('menu_recipes')
                .delete()
                .eq('id', menuRecipeId)

            if (error) throw error
        }
    },

    // =========================================
    // Analytics
    // =========================================
    analytics: {
        getStats: async (from: string, to: string) => {
            const [outputs, deliveries, products] = await Promise.all([
                api.outputs.getByDateRange(from, to),
                api.deliveries.getAll(),
                api.products.getAll()
            ])

            const filteredDeliveries = deliveries.filter(d => d.date >= from && d.date <= to)

            const totalOutputs = outputs.reduce((sum, o) => sum + o.quantity, 0)
            const totalEntries = filteredDeliveries.reduce((sum, d) =>
                sum + d.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)

            const categoryStats = products.reduce((acc, p) => {
                const cat = p.category || 'Autre'
                if (!acc[cat]) acc[cat] = { count: 0, value: 0 }
                acc[cat].count++
                acc[cat].value += p.quantity * p.price
                return acc
            }, {} as Record<string, { count: number; value: number }>)

            const topConsumption = outputs.reduce((acc, o) => {
                const key = o.productName || o.productId
                if (!acc[key]) acc[key] = 0
                acc[key] += o.quantity
                return acc
            }, {} as Record<string, number>)

            const topConsumptionArray = Object.entries(topConsumption)
                .map(([name, quantity]) => ({ name, quantity }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 10)

            return {
                totalMovements: outputs.length + filteredDeliveries.length,
                totalOutputs,
                totalEntries,
                categoryStats,
                topConsumption: topConsumptionArray
            }
        }
    },

    // =========================================
    // Temperature Equipment
    // =========================================
    temperatureEquipment: {
        getAll: async () => {
            const { data, error } = await getSupabase()
                .from('temperature_equipment')
                .select('*')
                .order('name')

            if (error) throw error
            return data || []
        },

        getById: async (id: string) => {
            const { data, error } = await getSupabase()
                .from('temperature_equipment')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            return data
        },

        create: async (equipmentData: {
            name: string
            type: 'fridge' | 'freezer' | 'cold_room'
            location?: string
            min_temp?: number
            max_temp?: number
        }) => {
            const { data, error } = await getSupabase()
                .from('temperature_equipment')
                .insert([equipmentData])
                .select()
                .single()

            if (error) throw error
            return data
        },

        update: async (id: string, equipmentData: {
            name?: string
            type?: 'fridge' | 'freezer' | 'cold_room'
            location?: string
            min_temp?: number
            max_temp?: number
            is_active?: boolean
        }) => {
            const { error } = await getSupabase()
                .from('temperature_equipment')
                .update(equipmentData)
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string) => {
            const { error } = await getSupabase()
                .from('temperature_equipment')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Temperature Readings
    // =========================================
    temperatureReadings: {
        getByEquipment: async (equipmentId: string, limit = 50) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .select('*')
                .eq('equipment_id', equipmentId)
                .order('recorded_at', { ascending: false })
                .limit(limit)

            if (error) throw error
            return data || []
        },

        getLatest: async (equipmentId: string) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .select('*')
                .eq('equipment_id', equipmentId)
                .order('recorded_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (error) throw error
            return data
        },

        create: async (readingData: {
            equipment_id: string
            temperature: number
            is_compliant?: boolean
            recorded_by?: string
            notes?: string | null
        }) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .insert([readingData])
                .select()
                .single()

            if (error) throw error
            return data
        },

        getByDateRange: async (from: string, to: string) => {
            const { data, error } = await getSupabase()
                .from('temperature_readings')
                .select(`
                    *,
                    temperature_equipment (name, type)
                `)
                .gte('recorded_at', from)
                .lte('recorded_at', to)
                .order('recorded_at', { ascending: false })

            if (error) throw error
            return data || []
        }
    },

    // =========================================
    // Traceability Photos
    // =========================================
    traceabilityPhotos: {
        upload: async (file: File, outputId: string, notes?: string) => {
            const supabaseClient = getSupabase()
            const timestamp = Date.now()
            const extension = file.name.split('.').pop() || 'jpg'
            const storagePath = `${outputId}/${timestamp}.${extension}`

            // Upload to storage
            const { error: uploadError } = await supabaseClient.storage
                .from('traceability-photos')
                .upload(storagePath, file)

            if (uploadError) throw uploadError

            // Get public URL
            const { data: urlData } = supabaseClient.storage
                .from('traceability-photos')
                .getPublicUrl(storagePath)

            // Create record
            const { data, error } = await supabaseClient
                .from('traceability_photos')
                .insert([{
                    output_id: outputId,
                    storage_path: storagePath,
                    url: urlData.publicUrl,
                    notes: notes || null
                }])
                .select()
                .single()

            if (error) throw error
            return data
        },

        getByOutput: async (outputId: string) => {
            const { data, error } = await getSupabase()
                .from('traceability_photos')
                .select('*')
                .eq('output_id', outputId)
                .order('captured_at', { ascending: false })

            if (error) throw error
            return data || []
        },

        getByDateRange: async (from: string, to: string) => {
            const { data, error } = await getSupabase()
                .from('traceability_photos')
                .select(`
                    *,
                    outputs (
                        id,
                        product_id,
                        quantity,
                        products (name, category)
                    )
                `)
                .gte('captured_at', from)
                .lte('captured_at', to)
                .order('captured_at', { ascending: false })

            if (error) throw error
            return data || []
        },

        delete: async (id: string) => {
            // Get the photo record first
            const { data: photo, error: fetchError } = await getSupabase()
                .from('traceability_photos')
                .select('storage_path')
                .eq('id', id)
                .single()

            if (fetchError) throw fetchError

            // Delete from storage
            if (photo?.storage_path) {
                await getSupabase().storage
                    .from('traceability-photos')
                    .remove([photo.storage_path])
            }

            // Delete record
            const { error } = await getSupabase()
                .from('traceability_photos')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Staff (Collaborateurs)
    // =========================================
    staff: {
        getAll: async (): Promise<Staff[]> => {
            const { data, error } = await getSupabase()
                .from('staff')
                .select('*')
                .order('last_name')

            if (error) throw error
            return (data || []).map(s => {
                const rec = s as Record<string, unknown>
                return {
                    id: s.id,
                    firstName: s.first_name,
                    lastName: s.last_name,
                    role: s.role,
                    email: s.email || '',
                    phone: s.phone || '',
                    color: s.color || '#3B82F6',
                    avatarUrl: s.avatar_url,
                    contractHours: Number(s.contract_hours) || 35,
                    isActive: s.is_active,
                    signatureData: s.signature_data,
                    pinCode: s.pin_code,
                    staffGroup: (rec.staff_group as StaffGroup) || 'week1',
                    workDaysWeek1: (rec.work_days_week1 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                    workDaysWeek2: (rec.work_days_week2 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                    createdAt: s.created_at
                }
            })
        },

        getById: async (id: string): Promise<Staff> => {
            const { data, error } = await getSupabase()
                .from('staff')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            const rec = data as Record<string, unknown>
            return {
                id: data.id,
                firstName: data.first_name,
                lastName: data.last_name,
                role: data.role,
                email: data.email || '',
                phone: data.phone || '',
                color: data.color || '#3B82F6',
                avatarUrl: data.avatar_url,
                contractHours: Number(data.contract_hours) || 35,
                isActive: data.is_active,
                signatureData: data.signature_data,
                pinCode: data.pin_code,
                staffGroup: (rec.staff_group as StaffGroup) || 'week1',
                workDaysWeek1: (rec.work_days_week1 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                workDaysWeek2: (rec.work_days_week2 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                createdAt: data.created_at
            }
        },

        create: async (staffData: Omit<Staff, 'id' | 'createdAt'>): Promise<Staff> => {
            const { data, error } = await getSupabase()
                .from('staff')
                .insert([{
                    first_name: staffData.firstName,
                    last_name: staffData.lastName,
                    role: staffData.role,
                    email: staffData.email || null,
                    phone: staffData.phone || null,
                    color: staffData.color,
                    contract_hours: staffData.contractHours,
                    signature_data: staffData.signatureData || null,
                    pin_code: staffData.pinCode || null,
                    staff_group: staffData.staffGroup || 'week1',
                    work_days_week1: staffData.workDaysWeek1 || ['mon', 'tue', 'wed', 'thu', 'fri'],
                    work_days_week2: staffData.workDaysWeek2 || ['mon', 'tue', 'wed', 'thu', 'fri']
                }])
                .select()
                .single()

            if (error) throw error
            const rec = data as Record<string, unknown>
            return {
                id: data.id,
                firstName: data.first_name,
                lastName: data.last_name,
                role: data.role,
                email: data.email || '',
                phone: data.phone || '',
                color: data.color || '#3B82F6',
                avatarUrl: data.avatar_url,
                contractHours: Number(data.contract_hours) || 35,
                isActive: data.is_active,
                signatureData: data.signature_data,
                pinCode: data.pin_code,
                staffGroup: (rec.staff_group as StaffGroup) || 'week1',
                workDaysWeek1: (rec.work_days_week1 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                workDaysWeek2: (rec.work_days_week2 as WorkDay[]) || ['mon', 'tue', 'wed', 'thu', 'fri'],
                createdAt: data.created_at
            }
        },

        update: async (id: string, staffData: Partial<Staff>): Promise<void> => {
            const updateData: Record<string, unknown> = {}
            if (staffData.firstName !== undefined) updateData.first_name = staffData.firstName
            if (staffData.lastName !== undefined) updateData.last_name = staffData.lastName
            if (staffData.role !== undefined) updateData.role = staffData.role
            if (staffData.email !== undefined) updateData.email = staffData.email || null
            if (staffData.phone !== undefined) updateData.phone = staffData.phone || null
            if (staffData.color !== undefined) updateData.color = staffData.color
            if (staffData.contractHours !== undefined) updateData.contract_hours = staffData.contractHours
            if (staffData.isActive !== undefined) updateData.is_active = staffData.isActive
            if (staffData.signatureData !== undefined) updateData.signature_data = staffData.signatureData
            if (staffData.pinCode !== undefined) updateData.pin_code = staffData.pinCode
            if (staffData.staffGroup !== undefined) updateData.staff_group = staffData.staffGroup
            if (staffData.workDaysWeek1 !== undefined) updateData.work_days_week1 = staffData.workDaysWeek1
            if (staffData.workDaysWeek2 !== undefined) updateData.work_days_week2 = staffData.workDaysWeek2

            const { error } = await getSupabase()
                .from('staff')
                .update(updateData)
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('staff')
                .delete()
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // Schedule Events (Planning)
    // =========================================
    scheduleEvents: {
        getAll: async (): Promise<ScheduleEvent[]> => {
            const { data, error } = await getSupabase()
                .from('schedule_events')
                .select(`
                    *,
                    staff!schedule_events_staff_id_fkey (first_name, last_name, color)
                `)
                .order('start_date', { ascending: false })

            if (error) throw error
            return (data || []).map(e => {
                const staffData = e.staff as { first_name: string; last_name: string; color: string } | null
                return {
                    id: e.id,
                    staffId: e.staff_id,
                    staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : '',
                    staffColor: staffData?.color || '#3B82F6',
                    eventType: e.event_type as ScheduleEventType,
                    title: e.title,
                    startDate: e.start_date,
                    endDate: e.end_date,
                    startTime: e.start_time,
                    endTime: e.end_time,
                    hours: Number(e.hours) || 0,
                    notes: e.notes,
                    isValidated: e.is_validated ?? false,
                    validatedBy: e.validated_by,
                    validatedAt: e.validated_at,
                    createdAt: e.created_at ?? ''
                }
            })
        },

        getByDateRange: async (from: string, to: string): Promise<ScheduleEvent[]> => {
            const { data, error } = await getSupabase()
                .from('schedule_events')
                .select(`
                    *,
                    staff!schedule_events_staff_id_fkey (first_name, last_name, color)
                `)
                .or(`start_date.gte.${from},end_date.lte.${to}`)
                .or(`start_date.lte.${to},end_date.gte.${from}`)
                .order('start_date')

            if (error) throw error
            return (data || []).map(e => {
                const staffData = e.staff as { first_name: string; last_name: string; color: string } | null
                return {
                    id: e.id,
                    staffId: e.staff_id,
                    staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : '',
                    staffColor: staffData?.color || '#3B82F6',
                    eventType: e.event_type as ScheduleEventType,
                    title: e.title,
                    startDate: e.start_date,
                    endDate: e.end_date,
                    startTime: e.start_time,
                    endTime: e.end_time,
                    hours: Number(e.hours) || 0,
                    notes: e.notes,
                    isValidated: e.is_validated ?? false,
                    validatedBy: e.validated_by,
                    validatedAt: e.validated_at,
                    createdAt: e.created_at ?? ''
                }
            })
        },

        getByStaff: async (staffId: string): Promise<ScheduleEvent[]> => {
            const { data, error } = await getSupabase()
                .from('schedule_events')
                .select('*')
                .eq('staff_id', staffId)
                .order('start_date', { ascending: false })

            if (error) throw error
            return (data || []).map(e => ({
                id: e.id,
                staffId: e.staff_id,
                staffName: '',
                staffColor: '#3B82F6',
                eventType: e.event_type as ScheduleEventType,
                title: e.title,
                startDate: e.start_date,
                endDate: e.end_date,
                startTime: e.start_time,
                endTime: e.end_time,
                hours: Number(e.hours) || 0,
                notes: e.notes,
                isValidated: e.is_validated ?? false,
                validatedBy: e.validated_by,
                validatedAt: e.validated_at,
                createdAt: e.created_at ?? ''
            }))
        },

        create: async (eventData: Omit<ScheduleEvent, 'id' | 'staffName' | 'staffColor' | 'createdAt'>): Promise<ScheduleEvent> => {
            const { data, error } = await getSupabase()
                .from('schedule_events')
                .insert([{
                    staff_id: eventData.staffId,
                    event_type: eventData.eventType,
                    title: eventData.title || null,
                    start_date: eventData.startDate,
                    end_date: eventData.endDate,
                    start_time: eventData.startTime || null,
                    end_time: eventData.endTime || null,
                    hours: eventData.hours || null,
                    notes: eventData.notes || null,
                    is_validated: eventData.isValidated || false
                }])
                .select(`
                    *,
                    staff!schedule_events_staff_id_fkey (first_name, last_name, color)
                `)
                .single()

            if (error) throw error
            const staffData = data.staff as { first_name: string; last_name: string; color: string } | null
            return {
                id: data.id,
                staffId: data.staff_id,
                staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : '',
                staffColor: staffData?.color || '#3B82F6',
                eventType: data.event_type as ScheduleEventType,
                title: data.title,
                startDate: data.start_date,
                endDate: data.end_date,
                startTime: data.start_time,
                endTime: data.end_time,
                hours: Number(data.hours) || 0,
                notes: data.notes,
                isValidated: data.is_validated ?? false,
                validatedBy: data.validated_by,
                validatedAt: data.validated_at,
                createdAt: data.created_at ?? ''
            }
        },

        update: async (id: string, eventData: Partial<ScheduleEvent>): Promise<void> => {
            const updateData: Record<string, unknown> = {}
            if (eventData.staffId !== undefined) updateData.staff_id = eventData.staffId
            if (eventData.eventType !== undefined) updateData.event_type = eventData.eventType
            if (eventData.title !== undefined) updateData.title = eventData.title
            if (eventData.startDate !== undefined) updateData.start_date = eventData.startDate
            if (eventData.endDate !== undefined) updateData.end_date = eventData.endDate
            if (eventData.startTime !== undefined) updateData.start_time = eventData.startTime
            if (eventData.endTime !== undefined) updateData.end_time = eventData.endTime
            if (eventData.hours !== undefined) updateData.hours = eventData.hours
            if (eventData.notes !== undefined) updateData.notes = eventData.notes
            if (eventData.isValidated !== undefined) updateData.is_validated = eventData.isValidated

            const { error } = await getSupabase()
                .from('schedule_events')
                .update(updateData)
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('schedule_events')
                .delete()
                .eq('id', id)

            if (error) throw error
        },

        validate: async (id: string, validatedBy: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('schedule_events')
                .update({
                    is_validated: true,
                    validated_by: validatedBy,
                    validated_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error
        }
    },

    // =========================================
    // User Profiles
    // =========================================
    userProfiles: {
        getAll: async (): Promise<UserProfile[]> => {
            const { data, error } = await getSupabase()
                .from('user_profiles')
                .select(`
                    *,
                    staff!user_profiles_staff_id_fkey (first_name, last_name)
                `)
                .order('display_name')

            if (error) throw error
            return (data || []).map(p => {
                const staffData = p.staff as { first_name: string; last_name: string } | null
                return {
                    id: p.id,
                    staffId: p.staff_id,
                    staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : null,
                    displayName: p.display_name,
                    role: p.role as 'admin' | 'manager' | 'user',
                    avatarEmoji: p.avatar_emoji || '👤',
                    lastLogin: p.last_login,
                    preferences: (p.preferences as Record<string, unknown>) || {},
                    isActive: p.is_active ?? true,
                    createdAt: p.created_at ?? ''
                }
            })
        },

        getById: async (id: string): Promise<UserProfile> => {
            const { data, error } = await getSupabase()
                .from('user_profiles')
                .select(`
                    *,
                    staff!user_profiles_staff_id_fkey (first_name, last_name)
                `)
                .eq('id', id)
                .single()

            if (error) throw error
            const staffData = data.staff as { first_name: string; last_name: string } | null
            return {
                id: data.id,
                staffId: data.staff_id,
                staffName: staffData ? `${staffData.first_name} ${staffData.last_name}` : null,
                displayName: data.display_name,
                role: data.role as 'admin' | 'manager' | 'user',
                avatarEmoji: data.avatar_emoji || '👤',
                lastLogin: data.last_login,
                preferences: (data.preferences as Record<string, unknown>) || {},
                isActive: data.is_active ?? true,
                createdAt: data.created_at ?? ''
            }
        },

        create: async (profileData: Omit<UserProfile, 'id' | 'staffName' | 'createdAt'>): Promise<UserProfile> => {
            const { data, error } = await getSupabase()
                .from('user_profiles')
                .insert([{
                    staff_id: profileData.staffId || null,
                    display_name: profileData.displayName,
                    role: profileData.role,
                    avatar_emoji: profileData.avatarEmoji,
                    preferences: profileData.preferences as Json || {}
                }])
                .select()
                .single()

            if (error) throw error
            return {
                id: data.id,
                staffId: data.staff_id,
                staffName: null,
                displayName: data.display_name,
                role: data.role as 'admin' | 'manager' | 'user',
                avatarEmoji: data.avatar_emoji || '👤',
                lastLogin: data.last_login,
                preferences: (data.preferences as Record<string, unknown>) || {},
                isActive: data.is_active ?? true,
                createdAt: data.created_at ?? ''
            }
        },

        update: async (id: string, profileData: Partial<UserProfile>): Promise<void> => {
            const updateData: Record<string, unknown> = {}
            if (profileData.staffId !== undefined) updateData.staff_id = profileData.staffId
            if (profileData.displayName !== undefined) updateData.display_name = profileData.displayName
            if (profileData.role !== undefined) updateData.role = profileData.role
            if (profileData.avatarEmoji !== undefined) updateData.avatar_emoji = profileData.avatarEmoji
            if (profileData.preferences !== undefined) updateData.preferences = profileData.preferences
            if (profileData.isActive !== undefined) updateData.is_active = profileData.isActive

            const { error } = await getSupabase()
                .from('user_profiles')
                .update(updateData)
                .eq('id', id)

            if (error) throw error
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('user_profiles')
                .delete()
                .eq('id', id)

            if (error) throw error
        },

        updateLastLogin: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
                .from('user_profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('id', id)

            if (error) throw error
        }
    }
}
