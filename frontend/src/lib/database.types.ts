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
            activity_log: {
                Row: {
                    id: string
                    user_profile_id: string | null
                    action: string
                    entity_type: string | null
                    entity_id: string | null
                    details: Json | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    user_profile_id?: string | null
                    action: string
                    entity_type?: string | null
                    entity_id?: string | null
                    details?: Json | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    user_profile_id?: string | null
                    action?: string
                    entity_type?: string | null
                    entity_id?: string | null
                    details?: Json | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "activity_log_user_profile_id_fkey"
                        columns: ["user_profile_id"]
                        referencedRelation: "user_profiles"
                        referencedColumns: ["id"]
                    }
                ]
            }
            products: {
                Row: {
                    id: string
                    name: string
                    category: string | null
                    unit: string | null
                    quantity: number
                    min_stock: number | null
                    supplier_id: string | null
                    price: number
                    emoji: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    category?: string | null
                    unit?: string | null
                    quantity?: number
                    min_stock?: number | null
                    supplier_id?: string | null
                    price?: number
                    emoji?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    category?: string | null
                    unit?: string | null
                    quantity?: number
                    min_stock?: number | null
                    supplier_id?: string | null
                    price?: number
                    emoji?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "fk_products_supplier"
                        columns: ["supplier_id"]
                        referencedRelation: "suppliers"
                        referencedColumns: ["id"]
                    }
                ]
            }
            outputs: {
                Row: {
                    id: string
                    product_id: string
                    quantity: number
                    reason: string | null
                    recipe_id: string | null
                    output_date: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    product_id: string
                    quantity: number
                    reason?: string | null
                    recipe_id?: string | null
                    output_date?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    product_id?: string
                    quantity?: number
                    reason?: string | null
                    recipe_id?: string | null
                    output_date?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "outputs_product_id_fkey"
                        columns: ["product_id"]
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "outputs_recipe_id_fkey"
                        columns: ["recipe_id"]
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    }
                ]
            }
            suppliers: {
                Row: {
                    id: string
                    name: string
                    contact: string | null
                    phone: string | null
                    email: string | null
                    address: string | null
                    notes: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    contact?: string | null
                    phone?: string | null
                    email?: string | null
                    address?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    contact?: string | null
                    phone?: string | null
                    email?: string | null
                    address?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            deliveries: {
                Row: {
                    id: string
                    product_id: string
                    supplier_id: string | null
                    quantity: number
                    unit_price: number | null
                    total_price: number | null
                    delivery_date: string | null
                    invoice_number: string | null
                    notes: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    product_id: string
                    supplier_id?: string | null
                    quantity: number
                    unit_price?: number | null
                    total_price?: number | null
                    delivery_date?: string | null
                    invoice_number?: string | null
                    notes?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    product_id?: string
                    supplier_id?: string | null
                    quantity?: number
                    unit_price?: number | null
                    total_price?: number | null
                    delivery_date?: string | null
                    invoice_number?: string | null
                    notes?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "deliveries_supplier_id_fkey"
                        columns: ["supplier_id"]
                        referencedRelation: "suppliers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "deliveries_product_id_fkey"
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
                    description: string | null
                    category: string | null
                    servings: number | null
                    prep_time: number | null
                    cook_time: number | null
                    instructions: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    category?: string | null
                    servings?: number | null
                    prep_time?: number | null
                    cook_time?: number | null
                    instructions?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    category?: string | null
                    servings?: number | null
                    prep_time?: number | null
                    cook_time?: number | null
                    instructions?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            recipe_ingredients: {
                Row: {
                    id: string
                    recipe_id: string
                    product_id: string
                    quantity: number
                    unit: string | null
                    notes: string | null
                }
                Insert: {
                    id?: string
                    recipe_id: string
                    product_id: string
                    quantity: number
                    unit?: string | null
                    notes?: string | null
                }
                Update: {
                    id?: string
                    recipe_id?: string
                    product_id?: string
                    quantity?: number
                    unit?: string | null
                    notes?: string | null
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
            menus: {
                Row: {
                    id: string
                    name: string
                    menu_date: string
                    meal_type: string | null
                    notes: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    menu_date: string
                    meal_type?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    menu_date?: string
                    meal_type?: string | null
                    notes?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            menu_recipes: {
                Row: {
                    id: string
                    menu_id: string
                    recipe_id: string
                    servings: number | null
                }
                Insert: {
                    id?: string
                    menu_id: string
                    recipe_id: string
                    servings?: number | null
                }
                Update: {
                    id?: string
                    menu_id?: string
                    recipe_id?: string
                    servings?: number | null
                }
                Relationships: [
                    {
                        foreignKeyName: "menu_recipes_menu_id_fkey"
                        columns: ["menu_id"]
                        referencedRelation: "menus"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "menu_recipes_recipe_id_fkey"
                        columns: ["recipe_id"]
                        referencedRelation: "recipes"
                        referencedColumns: ["id"]
                    }
                ]
            }
            temperature_equipment: {
                Row: {
                    id: string
                    name: string
                    type: string
                    location: string | null
                    min_temp: number
                    max_temp: number
                    is_active: boolean | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    name: string
                    type: string
                    location?: string | null
                    min_temp?: number
                    max_temp?: number
                    is_active?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    name?: string
                    type?: string
                    location?: string | null
                    min_temp?: number
                    max_temp?: number
                    is_active?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            temperature_readings: {
                Row: {
                    id: string
                    equipment_id: string
                    temperature: number
                    is_compliant: boolean | null
                    recorded_by: string | null
                    notes: string | null
                    recorded_at: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    equipment_id: string
                    temperature: number
                    is_compliant?: boolean | null
                    recorded_by?: string | null
                    notes?: string | null
                    recorded_at?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    equipment_id?: string
                    temperature?: number
                    is_compliant?: boolean | null
                    recorded_by?: string | null
                    notes?: string | null
                    recorded_at?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "temperature_readings_equipment_id_fkey"
                        columns: ["equipment_id"]
                        referencedRelation: "temperature_equipment"
                        referencedColumns: ["id"]
                    }
                ]
            }
            traceability_photos: {
                Row: {
                    id: string
                    output_id: string
                    storage_path: string
                    url: string | null
                    captured_at: string | null
                    notes: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    output_id: string
                    storage_path: string
                    url?: string | null
                    captured_at?: string | null
                    notes?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    output_id?: string
                    storage_path?: string
                    url?: string | null
                    captured_at?: string | null
                    notes?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "traceability_photos_output_id_fkey"
                        columns: ["output_id"]
                        referencedRelation: "outputs"
                        referencedColumns: ["id"]
                    }
                ]
            }
            staff: {
                Row: {
                    id: string
                    first_name: string
                    last_name: string
                    role: string
                    email: string | null
                    phone: string | null
                    color: string | null
                    avatar_url: string | null
                    contract_hours: number | null
                    is_active: boolean | null
                    signature_data: string | null
                    pin_code: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    first_name: string
                    last_name: string
                    role?: string
                    email?: string | null
                    phone?: string | null
                    color?: string | null
                    avatar_url?: string | null
                    contract_hours?: number | null
                    is_active?: boolean | null
                    signature_data?: string | null
                    pin_code?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    first_name?: string
                    last_name?: string
                    role?: string
                    email?: string | null
                    phone?: string | null
                    color?: string | null
                    avatar_url?: string | null
                    contract_hours?: number | null
                    is_active?: boolean | null
                    signature_data?: string | null
                    pin_code?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: []
            }
            schedule_events: {
                Row: {
                    id: string
                    staff_id: string
                    event_type: string
                    title: string | null
                    start_date: string
                    end_date: string
                    start_time: string | null
                    end_time: string | null
                    hours: number | null
                    notes: string | null
                    is_validated: boolean | null
                    validated_by: string | null
                    validated_at: string | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    staff_id: string
                    event_type: string
                    title?: string | null
                    start_date: string
                    end_date: string
                    start_time?: string | null
                    end_time?: string | null
                    hours?: number | null
                    notes?: string | null
                    is_validated?: boolean | null
                    validated_by?: string | null
                    validated_at?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    staff_id?: string
                    event_type?: string
                    title?: string | null
                    start_date?: string
                    end_date?: string
                    start_time?: string | null
                    end_time?: string | null
                    hours?: number | null
                    notes?: string | null
                    is_validated?: boolean | null
                    validated_by?: string | null
                    validated_at?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "schedule_events_staff_id_fkey"
                        columns: ["staff_id"]
                        referencedRelation: "staff"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "schedule_events_validated_by_fkey"
                        columns: ["validated_by"]
                        referencedRelation: "staff"
                        referencedColumns: ["id"]
                    }
                ]
            }
            user_profiles: {
                Row: {
                    id: string
                    staff_id: string | null
                    display_name: string
                    role: string
                    avatar_emoji: string | null
                    last_login: string | null
                    preferences: Json | null
                    is_active: boolean | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    staff_id?: string | null
                    display_name: string
                    role?: string
                    avatar_emoji?: string | null
                    last_login?: string | null
                    preferences?: Json | null
                    is_active?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    staff_id?: string | null
                    display_name?: string
                    role?: string
                    avatar_emoji?: string | null
                    last_login?: string | null
                    preferences?: Json | null
                    is_active?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "user_profiles_staff_id_fkey"
                        columns: ["staff_id"]
                        referencedRelation: "staff"
                        referencedColumns: ["id"]
                    }
                ]
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

// Convenience type exports
export type TemperatureEquipment = Database['public']['Tables']['temperature_equipment']['Row']
export type TemperatureEquipmentInsert = Database['public']['Tables']['temperature_equipment']['Insert']
export type TemperatureEquipmentUpdate = Database['public']['Tables']['temperature_equipment']['Update']

export type TemperatureReading = Database['public']['Tables']['temperature_readings']['Row']
export type TemperatureReadingInsert = Database['public']['Tables']['temperature_readings']['Insert']
export type TemperatureReadingUpdate = Database['public']['Tables']['temperature_readings']['Update']

export type TraceabilityPhoto = Database['public']['Tables']['traceability_photos']['Row']
export type TraceabilityPhotoInsert = Database['public']['Tables']['traceability_photos']['Insert']
export type TraceabilityPhotoUpdate = Database['public']['Tables']['traceability_photos']['Update']

export type StaffRow = Database['public']['Tables']['staff']['Row']
export type StaffInsert = Database['public']['Tables']['staff']['Insert']
export type StaffUpdate = Database['public']['Tables']['staff']['Update']

export type ScheduleEventRow = Database['public']['Tables']['schedule_events']['Row']
export type ScheduleEventInsert = Database['public']['Tables']['schedule_events']['Insert']
export type ScheduleEventUpdate = Database['public']['Tables']['schedule_events']['Update']

export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type ActivityLogRow = Database['public']['Tables']['activity_log']['Row']
export type ActivityLogInsert = Database['public']['Tables']['activity_log']['Insert']
