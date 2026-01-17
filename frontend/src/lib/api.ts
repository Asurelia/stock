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

export const api = {
    products: {
        getAll: async (): Promise<Product[]> => {
            const { data, error } = await supabase
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
            const { data, error } = await supabase
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
            const { data, error } = await supabase
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
            const { error } = await supabase
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
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', id)

            if (error) throw error
        },
    },
}
