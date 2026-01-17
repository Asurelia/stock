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
                    name: string
                    category: string | null
                    unit: string | null
                    quantity: number
                    minStock: number
                    avgConsumption: number
                    price: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    category?: string | null
                    unit?: string | null
                    quantity?: number
                    minStock?: number
                    avgConsumption?: number
                    price?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string | null
                    unit?: string | null
                    quantity?: number
                    minStock?: number
                    avgConsumption?: number
                    price?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            outputs: {
                Row: {
                    id: string
                    product_id: string | null
                    quantity: number
                    reason: string | null
                    date: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    product_id?: string | null
                    quantity: number
                    reason?: string | null
                    date?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    product_id?: string | null
                    quantity?: number
                    reason?: string | null
                    date?: string
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "outputs_product_id_fkey"
                        columns: ["product_id"]
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            suppliers: {
                Row: {
                    id: string
                    name: string
                    category: string | null
                    phone: string | null
                    email: string | null
                    contact: string | null
                    notes: string | null
                    logo_url: string | null
                    order_days: string[]
                    delivery_days: string[]
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    category?: string | null
                    phone?: string | null
                    email?: string | null
                    contact?: string | null
                    notes?: string | null
                    logo_url?: string | null
                    order_days?: string[]
                    delivery_days?: string[]
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string | null
                    phone?: string | null
                    email?: string | null
                    contact?: string | null
                    notes?: string | null
                    logo_url?: string | null
                    order_days?: string[]
                    delivery_days?: string[]
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            deliveries: {
                Row: {
                    id: string
                    date: string
                    supplier_id: string | null
                    supplier_name: string | null
                    photo_url: string | null
                    total: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    date?: string
                    supplier_id?: string | null
                    supplier_name?: string | null
                    photo_url?: string | null
                    total?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    date?: string
                    supplier_id?: string | null
                    supplier_name?: string | null
                    photo_url?: string | null
                    total?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "deliveries_supplier_id_fkey"
                        columns: ["supplier_id"]
                        referencedRelation: "suppliers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            delivery_items: {
                Row: {
                    id: string
                    delivery_id: string | null
                    product_id: string | null
                    product_name: string | null
                    quantity: number
                    price: number
                    created_at: string
                }
                Insert: {
                    id?: string
                    delivery_id?: string | null
                    product_id?: string | null
                    product_name?: string | null
                    quantity: number
                    price?: number
                    created_at?: string
                }
                Update: {
                    id?: string
                    delivery_id?: string | null
                    product_id?: string | null
                    product_name?: string | null
                    quantity?: number
                    price?: number
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "delivery_items_delivery_id_fkey"
                        columns: ["delivery_id"]
                        referencedRelation: "deliveries"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "delivery_items_product_id_fkey"
                        columns: ["product_id"]
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            recipes: {
                Row: {
                    id: string
                    name: string
                    portions: number
                    photo_url: string | null
                    dietary_tags: string[]
                    instructions: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    portions?: number
                    photo_url?: string | null
                    dietary_tags?: string[]
                    instructions?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    portions?: number
                    photo_url?: string | null
                    dietary_tags?: string[]
                    instructions?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            recipe_ingredients: {
                Row: {
                    id: string
                    recipe_id: string | null
                    product_id: string | null
                    product_name: string | null
                    quantity: number
                    unit: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    recipe_id?: string | null
                    product_id?: string | null
                    product_name?: string | null
                    quantity: number
                    unit?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    recipe_id?: string | null
                    product_id?: string | null
                    product_name?: string | null
                    quantity?: number
                    unit?: string | null
                    created_at?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "recipe_ingredients_recipe_id_fkey"
                        columns: ["recipe_id"]
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "recipe_ingredients_product_id_fkey"
                        columns: ["product_id"]
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    }
                ]
            }
            clinic_menus: {
                Row: {
                    id: string
                    date: string
                    patient_lunch: Json
                    patient_dinner: Json
                    staff_lunch: Json
                    punctual_orders: Json
                    notes: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    date: string
                    patient_lunch?: Json
                    patient_dinner?: Json
                    staff_lunch?: Json
                    punctual_orders?: Json
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    date?: string
                    patient_lunch?: Json
                    patient_dinner?: Json
                    staff_lunch?: Json
                    punctual_orders?: Json
                    notes?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            forecasts: {
                Row: {
                    id: string
                    date: string
                    patients: number
                    staff: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    date: string
                    patients?: number
                    staff?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    date?: string
                    patients?: number
                    staff?: number
                    created_at?: string
                    updated_at?: string
                }
                Relationships: []
            }
            photos: {
                Row: {
                    id: string
                    storage_path: string | null
                    url: string | null
                    type: string | null
                    description: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    storage_path?: string | null
                    url?: string | null
                    type?: string | null
                    description?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    storage_path?: string | null
                    url?: string | null
                    type?: string | null
                    description?: string | null
                    created_at?: string
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
