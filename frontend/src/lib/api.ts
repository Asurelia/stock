import { supabase } from './supabase'

export interface Product {
    id: string
    name: string
    category: string
    quantity: number
    unit: string
    minStock: number
    price: number
}

function getSupabase() {
    if (!supabase) {
        throw new Error('Supabase non configuré. Vérifiez les variables d\'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY')
    }
    return supabase
}

export const api = {
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
                    minStock: productData.minStock
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
                    minStock: productData.minStock
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
    },
}
