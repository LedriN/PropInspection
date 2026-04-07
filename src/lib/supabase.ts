import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return supabaseUrl && 
         supabaseAnonKey &&
         supabaseUrl.startsWith('http') &&
         supabaseUrl !== 'https://placeholder.supabase.co' && 
         supabaseAnonKey !== 'placeholder-key'
}

// Only create client if properly configured
export const supabase = isSupabaseConfigured() ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
}) : null

export type Database = {
  public: {
    Tables: {
      properties: {
        Row: {
          id: string
          title: string
          address: string
          city: string
          property_type: string
          rent_price: number
          deposit: number
          bedrooms: number
          bathrooms: number
          square_feet: number
          description: string
          status: string
          defects: string[]
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['properties']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['properties']['Insert']>
      }
      clients: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          status: string
          notes: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      agents: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone: string
          status: string
          specialties: string[]
          workload: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['agents']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['agents']['Insert']>
      }
      inspections: {
        Row: {
          id: string
          property_id: string
          client_id: string
          agent_id: string
          scheduled_date: string
          status: string
          inspection_type: string
          notes: string
          defects_found: string[]
          completion_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['inspections']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['inspections']['Insert']>
      }
      reports: {
        Row: {
          id: string
          inspection_id: string
          report_type: string
          content: Record<string, any>
          generated_at: string
          generated_by: string
        }
        Insert: Omit<Database['public']['Tables']['reports']['Row'], 'id' | 'generated_at'>
        Update: Partial<Database['public']['Tables']['reports']['Insert']>
      }
    }
  }
}