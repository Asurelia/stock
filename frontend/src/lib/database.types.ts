export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            products: {
                Row: {
                    id: string
                    created_at: string
                    name: string
                    category: string | null
                    quantity: number
                    unit: string | null
                    price: number
                    minStock: number
                }
                Insert: {
                    id?: string
                    created_at?: string
                    name: string
                    category?: string | null
                    quantity?: number
                    unit?: string | null
                    price?: number
                    minStock?: number
                }
                Update: {
                    id?: string
                    created_at?: string
                    name?: string
                    category?: string | null
                    quantity?: number
                    unit?: string | null
                    price?: number
                    minStock?: number
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
