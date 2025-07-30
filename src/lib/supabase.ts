import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://duxgrvwcwnxoogyekffw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1eGdydndjd254b29neWVrZmZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNTIyNjcsImV4cCI6MjA2ODgyODI2N30.uzk40ZBpVNXWMiFyaqlOWk-Xfqiw-9Wgz5qRcKaj7qA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          address: string;
          tax_id: string;
          contact_person: string;
          phone: string;
          phone2?: string;
          email: string;
          delivery: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      series: {
        Row: {
          id: string;
          name: string;
          pieces_per_case: number;
          net_weight_kg_per_piece: number;
          net_weight_kg_per_case: number;
          packaging_weight_kg_per_case: number;
          width_cm?: number;
          length_cm?: number;
          height_cm?: number;
          description?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['series']['Row'], 'id' | 'net_weight_kg_per_case' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['series']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          series_id: string;
          price_per_case: number;
          price_per_piece: number;
          barcode?: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      proformas: {
        Row: {
          id: string;
          proforma_number: string;
          issue_date: string;
          customer_id: string;
          total_amount: number;
          payment_method: string;
          bank_name?: string;
          bank_branch?: string;
          swift_code?: string;
          account_number?: string;
          notes?: string;
          departure: string;
          delivery: string;
          brand: string;
          weight_per_pallet_kg: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['proformas']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['proformas']['Insert']>;
      };
      proforma_items: {
        Row: {
          id: string;
          proforma_id: string;
          product_id: string;
          description: string;
          quantity: number;
          unit: string;
          unit_price: number;
          total: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['proforma_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['proforma_items']['Insert']>;
      };
      pallets: {
        Row: {
          id: string;
          proforma_id: string;
          pallet_number: number;
          width_cm: number;
          length_cm: number;
          height_cm: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['pallets']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['pallets']['Insert']>;
      };
    };
  };
}; 