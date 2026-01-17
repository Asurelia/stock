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
}

export interface Output {
    id: string
    productId: string
    productName?: string
    quantity: number
    reason: string
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

export interface ClinicMenu {
    id: string
    date: string
    patientLunch: MealData
    patientDinner: MealData
    staffLunch: MealData
    punctualOrders: PunctualOrder[]
    notes: string
}

export interface MealData {
    recipeId?: string
    recipeName?: string
    portions?: number
}

export interface PunctualOrder {
    name: string
    quantity: number
}

export interface Forecast {
    id: string
    date: string
    patients: number
    staff: number
}

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
                quantity: p.quantity,
                unit: p.unit || 'kg',
                minStock: p.minStock,
                avgConsumption: p.avgConsumption || 0,
                price: p.price
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
                quantity: data.quantity,
                unit: data.unit || 'kg',
                minStock: data.minStock,
                avgConsumption: data.avgConsumption || 0,
                price: data.price
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
                    minStock: productData.minStock,
                    avgConsumption: productData.avgConsumption
                }])
                .select()
                .single()

            if (error) throw error

            return {
                id: data.id,
                name: data.name,
                category: data.category || '',
                quantity: data.quantity,
                unit: data.unit || 'kg',
                minStock: data.minStock,
                avgConsumption: data.avgConsumption || 0,
                price: data.price
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
                    minStock: productData.minStock,
                    avgConsumption: productData.avgConsumption
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
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data || []).map(o => ({
                id: o.id,
                productId: o.product_id || '',
                productName: o.products?.name || 'Produit supprimé',
                quantity: o.quantity,
                reason: o.reason || 'Service midi',
                date: o.date,
                createdAt: o.created_at
            }))
        },

        getByDateRange: async (from: string, to: string): Promise<Output[]> => {
            const { data, error } = await getSupabase()
                .from('outputs')
                .select(`
                    *,
                    products (name)
                `)
                .gte('date', from)
                .lte('date', to)
                .order('date', { ascending: false })
                .order('created_at', { ascending: false })

            if (error) throw error

            return (data || []).map(o => ({
                id: o.id,
                productId: o.product_id || '',
                productName: o.products?.name || 'Produit supprimé',
                quantity: o.quantity,
                reason: o.reason || 'Service midi',
                date: o.date,
                createdAt: o.created_at
            }))
        },

        getToday: async (): Promise<Output[]> => {
            const today = new Date().toISOString().split('T')[0]
            return api.outputs.getByDateRange(today, today)
        },

        create: async (outputData: { productId: string; quantity: number; reason: string; date?: string }): Promise<Output> => {
            const { data, error } = await getSupabase()
                .from('outputs')
                .insert([{
                    product_id: outputData.productId,
                    quantity: outputData.quantity,
                    reason: outputData.reason,
                    date: outputData.date || new Date().toISOString().split('T')[0]
                }])
                .select(`
                    *,
                    products (name)
                `)
                .single()

            if (error) throw error

            return {
                id: data.id,
                productId: data.product_id || '',
                productName: data.products?.name || '',
                quantity: data.quantity,
                reason: data.reason || 'Service midi',
                date: data.date,
                createdAt: data.created_at
            }
        },

        delete: async (id: string): Promise<void> => {
            const { error } = await getSupabase()
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
                .order('category')
                .order('name')

            if (error) throw error

            return (data || []).map(s => ({
                id: s.id,
                name: s.name,
                category: s.category || 'autre',
                phone: s.phone || '',
                email: s.email || '',
                contact: s.contact || '',
                notes: s.notes || '',
                logoUrl: s.logo_url || '',
                orderDays: s.order_days || [],
                deliveryDays: s.delivery_days || []
            }))
        },

        create: async (supplierData: Omit<Supplier, 'id'>): Promise<Supplier> => {
            const { data, error } = await getSupabase()
                .from('suppliers')
                .insert([{
                    name: supplierData.name,
                    category: supplierData.category,
                    phone: supplierData.phone,
                    email: supplierData.email,
                    contact: supplierData.contact,
                    notes: supplierData.notes,
                    logo_url: supplierData.logoUrl,
                    order_days: supplierData.orderDays,
                    delivery_days: supplierData.deliveryDays
                }])
                .select()
                .single()

            if (error) throw error

            return {
                id: data.id,
                name: data.name,
                category: data.category || 'autre',
                phone: data.phone || '',
                email: data.email || '',
                contact: data.contact || '',
                notes: data.notes || '',
                logoUrl: data.logo_url || '',
                orderDays: data.order_days || [],
                deliveryDays: data.delivery_days || []
            }
        },

        update: async (id: string, supplierData: Partial<Supplier>): Promise<void> => {
            const { error } = await getSupabase()
                .from('suppliers')
                .update({
                    name: supplierData.name,
                    category: supplierData.category,
                    phone: supplierData.phone,
                    email: supplierData.email,
                    contact: supplierData.contact,
                    notes: supplierData.notes,
                    logo_url: supplierData.logoUrl,
                    order_days: supplierData.orderDays,
                    delivery_days: supplierData.deliveryDays
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
            const { data, error } = await getSupabase()
                .from('deliveries')
                .select(`
                    *,
                    delivery_items (
                        id,
                        product_id,
                        product_name,
                        quantity,
                        price
                    )
                `)
                .order('date', { ascending: false })

            if (error) throw error

            return (data || []).map(d => ({
                id: d.id,
                date: d.date,
                supplierId: d.supplier_id,
                supplierName: d.supplier_name || '',
                photoUrl: d.photo_url,
                total: d.total,
                items: (d.delivery_items || []).map((item: { id: string; product_id: string; product_name: string; quantity: number; price: number }) => ({
                    id: item.id,
                    productId: item.product_id,
                    productName: item.product_name || '',
                    quantity: item.quantity,
                    price: item.price
                })),
                createdAt: d.created_at
            }))
        },

        create: async (deliveryData: { date: string; supplierName: string; supplierId?: string; photoUrl?: string; items: DeliveryItem[] }): Promise<Delivery> => {
            const total = deliveryData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0)

            const { data: delivery, error: deliveryError } = await getSupabase()
                .from('deliveries')
                .insert([{
                    date: deliveryData.date,
                    supplier_id: deliveryData.supplierId,
                    supplier_name: deliveryData.supplierName,
                    photo_url: deliveryData.photoUrl,
                    total
                }])
                .select()
                .single()

            if (deliveryError) throw deliveryError

            if (deliveryData.items.length > 0) {
                const { error: itemsError } = await getSupabase()
                    .from('delivery_items')
                    .insert(deliveryData.items.map(item => ({
                        delivery_id: delivery.id,
                        product_id: item.productId,
                        product_name: item.productName,
                        quantity: item.quantity,
                        price: item.price
                    })))

                if (itemsError) throw itemsError
            }

            return {
                id: delivery.id,
                date: delivery.date,
                supplierId: delivery.supplier_id,
                supplierName: delivery.supplier_name || '',
                photoUrl: delivery.photo_url,
                total: delivery.total,
                items: deliveryData.items,
                createdAt: delivery.created_at
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
                        product_name,
                        quantity,
                        unit
                    )
                `)
                .order('name')

            if (error) throw error

            return (data || []).map(r => ({
                id: r.id,
                name: r.name,
                portions: r.portions,
                photoUrl: r.photo_url,
                dietaryTags: r.dietary_tags || [],
                instructions: r.instructions || '',
                ingredients: (r.recipe_ingredients || []).map((ing: { id: string; product_id: string; product_name: string; quantity: number; unit: string }) => ({
                    id: ing.id,
                    productId: ing.product_id,
                    productName: ing.product_name || '',
                    quantity: ing.quantity,
                    unit: ing.unit || ''
                }))
            }))
        },

        create: async (recipeData: Omit<Recipe, 'id'>): Promise<Recipe> => {
            const { data: recipe, error: recipeError } = await getSupabase()
                .from('recipes')
                .insert([{
                    name: recipeData.name,
                    portions: recipeData.portions,
                    photo_url: recipeData.photoUrl,
                    dietary_tags: recipeData.dietaryTags,
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
                        product_name: ing.productName,
                        quantity: ing.quantity,
                        unit: ing.unit
                    })))

                if (ingredientsError) throw ingredientsError
            }

            return {
                id: recipe.id,
                name: recipe.name,
                portions: recipe.portions,
                photoUrl: recipe.photo_url,
                dietaryTags: recipe.dietary_tags || [],
                instructions: recipe.instructions || '',
                ingredients: recipeData.ingredients
            }
        },

        update: async (id: string, recipeData: Partial<Recipe>): Promise<void> => {
            const { error: recipeError } = await getSupabase()
                .from('recipes')
                .update({
                    name: recipeData.name,
                    portions: recipeData.portions,
                    photo_url: recipeData.photoUrl,
                    dietary_tags: recipeData.dietaryTags,
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
                            product_name: ing.productName,
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
    // Clinic Menus
    // =========================================
    clinicMenus: {
        getByDate: async (date: string): Promise<ClinicMenu | null> => {
            const { data, error } = await getSupabase()
                .from('clinic_menus')
                .select('*')
                .eq('date', date)
                .maybeSingle()

            if (error) throw error
            if (!data) return null

            return {
                id: data.id,
                date: data.date,
                patientLunch: (data.patient_lunch as unknown as MealData) || {},
                patientDinner: (data.patient_dinner as unknown as MealData) || {},
                staffLunch: (data.staff_lunch as unknown as MealData) || {},
                punctualOrders: (data.punctual_orders as unknown as PunctualOrder[]) || [],
                notes: data.notes || ''
            }
        },

        save: async (menuData: Omit<ClinicMenu, 'id'> & { id?: string }): Promise<ClinicMenu> => {
            const { data, error } = await getSupabase()
                .from('clinic_menus')
                .upsert({
                    id: menuData.id,
                    date: menuData.date,
                    patient_lunch: menuData.patientLunch as unknown as Json,
                    patient_dinner: menuData.patientDinner as unknown as Json,
                    staff_lunch: menuData.staffLunch as unknown as Json,
                    punctual_orders: menuData.punctualOrders as unknown as Json,
                    notes: menuData.notes
                }, { onConflict: 'date' })
                .select()
                .single()

            if (error) throw error

            return {
                id: data.id,
                date: data.date,
                patientLunch: (data.patient_lunch as unknown as MealData) || {},
                patientDinner: (data.patient_dinner as unknown as MealData) || {},
                staffLunch: (data.staff_lunch as unknown as MealData) || {},
                punctualOrders: (data.punctual_orders as unknown as PunctualOrder[]) || [],
                notes: data.notes || ''
            }
        }
    },

    // =========================================
    // Forecasts
    // =========================================
    forecasts: {
        getByDate: async (date: string): Promise<Forecast | null> => {
            const { data, error } = await getSupabase()
                .from('forecasts')
                .select('*')
                .eq('date', date)
                .maybeSingle()

            if (error) throw error
            if (!data) return null

            return {
                id: data.id,
                date: data.date,
                patients: data.patients,
                staff: data.staff
            }
        },

        save: async (forecastData: Omit<Forecast, 'id'> & { id?: string }): Promise<Forecast> => {
            const { data, error } = await getSupabase()
                .from('forecasts')
                .upsert([{
                    id: forecastData.id,
                    date: forecastData.date,
                    patients: forecastData.patients,
                    staff: forecastData.staff
                }], { onConflict: 'date' })
                .select()
                .single()

            if (error) throw error

            return {
                id: data.id,
                date: data.date,
                patients: data.patients,
                staff: data.staff
            }
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
    }
}
