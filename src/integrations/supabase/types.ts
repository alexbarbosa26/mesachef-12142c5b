export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cmv_snapshots: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          difference_pct: number
          difference_value: number
          final_stock_value: number
          id: string
          initial_stock_value: number
          notes: string | null
          period_end: string
          period_start: string
          purchases_value: number
          real_cmv: number
          status: Database["public"]["Enums"]["cmv_status"]
          theoretical_cmv: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          difference_pct?: number
          difference_value?: number
          final_stock_value?: number
          id?: string
          initial_stock_value?: number
          notes?: string | null
          period_end: string
          period_start: string
          purchases_value?: number
          real_cmv?: number
          status?: Database["public"]["Enums"]["cmv_status"]
          theoretical_cmv?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          difference_pct?: number
          difference_value?: number
          final_stock_value?: number
          id?: string
          initial_stock_value?: number
          notes?: string | null
          period_end?: string
          period_start?: string
          purchases_value?: number
          real_cmv?: number
          status?: Database["public"]["Enums"]["cmv_status"]
          theoretical_cmv?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cmv_snapshots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          document: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_columns: {
        Row: {
          column_type: string
          company_id: string | null
          created_at: string
          id: string
          is_required: boolean
          name: string
        }
        Insert: {
          column_type?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
        }
        Update: {
          column_type?: string
          company_id?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          name?: string
        }
        Relationships: []
      }
      password_history: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      pricing_config_global: {
        Row: {
          company_id: string
          fixed_expenses_pct: number
          healthy_margin_threshold: number
          id: string
          investment_pct: number
          price_proximity_factor: number
          profit_pct: number
          updated_at: string
          updated_by: string | null
          variable_expenses_pct: number
        }
        Insert: {
          company_id: string
          fixed_expenses_pct?: number
          healthy_margin_threshold?: number
          id?: string
          investment_pct?: number
          price_proximity_factor?: number
          profit_pct?: number
          updated_at?: string
          updated_by?: string | null
          variable_expenses_pct?: number
        }
        Update: {
          company_id?: string
          fixed_expenses_pct?: number
          healthy_margin_threshold?: number
          id?: string
          investment_pct?: number
          price_proximity_factor?: number
          profit_pct?: number
          updated_at?: string
          updated_by?: string | null
          variable_expenses_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_global_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config_product: {
        Row: {
          company_id: string | null
          fixed_expenses_pct: number | null
          id: string
          investment_pct: number | null
          product_id: string
          profit_pct: number | null
          updated_at: string
          updated_by: string | null
          variable_expenses_pct: number | null
        }
        Insert: {
          company_id?: string | null
          fixed_expenses_pct?: number | null
          id?: string
          investment_pct?: number | null
          product_id: string
          profit_pct?: number | null
          updated_at?: string
          updated_by?: string | null
          variable_expenses_pct?: number | null
        }
        Update: {
          company_id?: string | null
          fixed_expenses_pct?: number | null
          id?: string
          investment_pct?: number | null
          product_id?: string
          profit_pct?: number | null
          updated_at?: string
          updated_by?: string | null
          variable_expenses_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_product_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_config_product_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "pricing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_products: {
        Row: {
          category: Database["public"]["Enums"]["product_category"]
          category_id: string | null
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          sale_unit: Database["public"]["Enums"]["sale_unit"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["product_category"]
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          sale_unit?: Database["public"]["Enums"]["sale_unit"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["product_category"]
          category_id?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sale_unit?: Database["public"]["Enums"]["sale_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pricing_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          last_password_change: string | null
          password_expires_at: string | null
          password_expiry_days: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          last_password_change?: string | null
          password_expires_at?: string | null
          password_expiry_days?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          last_password_change?: string | null
          password_expires_at?: string | null
          password_expiry_days?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      self_service_daily_items: {
        Row: {
          category: string | null
          company_id: string
          consumed_kg: number
          cost_participation_percentage: number
          cost_per_kg: number
          created_at: string
          daily_record_id: string
          id: string
          leftover_kg: number
          leftover_percentage: number
          leftover_total_value: number
          produced_kg: number
          production_total_cost: number
          recipe_name: string
          sales_participation_percentage: number
          total_sales: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          consumed_kg?: number
          cost_participation_percentage?: number
          cost_per_kg?: number
          created_at?: string
          daily_record_id: string
          id?: string
          leftover_kg?: number
          leftover_percentage?: number
          leftover_total_value?: number
          produced_kg?: number
          production_total_cost?: number
          recipe_name: string
          sales_participation_percentage?: number
          total_sales?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          consumed_kg?: number
          cost_participation_percentage?: number
          cost_per_kg?: number
          created_at?: string
          daily_record_id?: string
          id?: string
          leftover_kg?: number
          leftover_percentage?: number
          leftover_total_value?: number
          produced_kg?: number
          production_total_cost?: number
          recipe_name?: string
          sales_participation_percentage?: number
          total_sales?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_service_daily_items_daily_record_id_fkey"
            columns: ["daily_record_id"]
            isOneToOne: false
            referencedRelation: "self_service_daily_records"
            referencedColumns: ["id"]
          },
        ]
      }
      self_service_daily_records: {
        Row: {
          actual_average_consumption: number
          actual_meals: number
          company_id: string
          created_at: string
          date: string
          estimated_cmv: number
          estimated_result: number
          id: string
          markup: number
          observations: string | null
          planned_average_consumption: number
          planned_meals: number
          practiced_kg_price: number
          suggested_kg_price: number
          total_consumed_kg: number
          total_leftover_kg: number
          total_leftover_value: number
          total_produced_kg: number
          total_production_cost: number
          total_recipes: number
          total_sales: number
          updated_at: string
          user_id: string
          weekday: string | null
        }
        Insert: {
          actual_average_consumption?: number
          actual_meals?: number
          company_id: string
          created_at?: string
          date: string
          estimated_cmv?: number
          estimated_result?: number
          id?: string
          markup?: number
          observations?: string | null
          planned_average_consumption?: number
          planned_meals?: number
          practiced_kg_price?: number
          suggested_kg_price?: number
          total_consumed_kg?: number
          total_leftover_kg?: number
          total_leftover_value?: number
          total_produced_kg?: number
          total_production_cost?: number
          total_recipes?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
          weekday?: string | null
        }
        Update: {
          actual_average_consumption?: number
          actual_meals?: number
          company_id?: string
          created_at?: string
          date?: string
          estimated_cmv?: number
          estimated_result?: number
          id?: string
          markup?: number
          observations?: string | null
          planned_average_consumption?: number
          planned_meals?: number
          practiced_kg_price?: number
          suggested_kg_price?: number
          total_consumed_kg?: number
          total_leftover_kg?: number
          total_leftover_value?: number
          total_produced_kg?: number
          total_production_cost?: number
          total_recipes?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
          weekday?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["adjustment_type"]
          company_id: string | null
          created_at: string
          created_by: string | null
          difference: number
          id: string
          notes: string | null
          physical_quantity: number
          snapshot_id: string | null
          stock_item_id: string
          theoretical_quantity: number
          updated_at: string
          value_impact: number
        }
        Insert: {
          adjustment_type?: Database["public"]["Enums"]["adjustment_type"]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number
          id?: string
          notes?: string | null
          physical_quantity?: number
          snapshot_id?: string | null
          stock_item_id: string
          theoretical_quantity?: number
          updated_at?: string
          value_impact?: number
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["adjustment_type"]
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          difference?: number
          id?: string
          notes?: string | null
          physical_quantity?: number
          snapshot_id?: string | null
          stock_item_id?: string
          theoretical_quantity?: number
          updated_at?: string
          value_impact?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "cmv_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_history: {
        Row: {
          change_type: string
          changed_by: string | null
          company_id: string | null
          created_at: string
          id: string
          item_id: string
          new_quantity: number
          previous_quantity: number
        }
        Insert: {
          change_type?: string
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          item_id: string
          new_quantity: number
          previous_quantity: number
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          item_id?: string
          new_quantity?: number
          previous_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          category_id: string
          company_id: string | null
          count_date: string | null
          created_at: string
          current_quantity: number
          expiry_date: string | null
          id: string
          is_active: boolean
          minimum_stock: number
          name: string
          responsible_user: string | null
          unit: string
          updated_at: string
          value: number | null
        }
        Insert: {
          category_id: string
          company_id?: string | null
          count_date?: string | null
          created_at?: string
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name: string
          responsible_user?: string | null
          unit?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          category_id?: string
          company_id?: string | null
          count_date?: string | null
          created_at?: string
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name?: string
          responsible_user?: string | null
          unit?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_purchases: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          purchase_date: string
          quantity: number
          stock_item_id: string
          supplier_name: string | null
          total_cost: number
          unit_cost: number
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          quantity?: number
          stock_item_id: string
          supplier_name?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          purchase_date?: string
          quantity?: number
          stock_item_id?: string
          supplier_name?: string | null
          total_cost?: number
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_purchases_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_purchases_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheet_ingredients: {
        Row: {
          calculated_cost: number
          company_id: string | null
          component_type: string
          created_at: string
          id: string
          linked_sheet_id: string | null
          quantity: number
          stock_item_id: string | null
          technical_sheet_id: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          calculated_cost?: number
          company_id?: string | null
          component_type?: string
          created_at?: string
          id?: string
          linked_sheet_id?: string | null
          quantity?: number
          stock_item_id?: string | null
          technical_sheet_id: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          calculated_cost?: number
          company_id?: string | null
          component_type?: string
          created_at?: string
          id?: string
          linked_sheet_id?: string | null
          quantity?: number
          stock_item_id?: string | null
          technical_sheet_id?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheet_ingredients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheet_ingredients_linked_sheet_id_fkey"
            columns: ["linked_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheet_ingredients_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheet_ingredients_technical_sheet_id_fkey"
            columns: ["technical_sheet_id"]
            isOneToOne: false
            referencedRelation: "technical_sheets"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_sheets: {
        Row: {
          cmv: number
          company_id: string | null
          created_at: string
          created_by: string | null
          id: string
          labor_cost_per_hour: number
          notes: string | null
          packaging_cost: number
          prep_time_minutes: number
          pricing_basis: string
          product_id: string
          sale_price: number
          updated_at: string
          yield_kg: number
          yield_portions: number
        }
        Insert: {
          cmv?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          labor_cost_per_hour?: number
          notes?: string | null
          packaging_cost?: number
          prep_time_minutes?: number
          pricing_basis?: string
          product_id: string
          sale_price?: number
          updated_at?: string
          yield_kg?: number
          yield_portions?: number
        }
        Update: {
          cmv?: number
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          labor_cost_per_hour?: number
          notes?: string | null
          packaging_cost?: number
          prep_time_minutes?: number
          pricing_basis?: string
          product_id?: string
          sale_price?: number
          updated_at?: string
          yield_kg?: number
          yield_portions?: number
        }
        Relationships: [
          {
            foreignKeyName: "technical_sheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_sheets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "pricing_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_audit_log: {
        Args: {
          p_action: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type: string
          p_user_id: string
        }
        Returns: string
      }
      current_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      adjustment_type: "perda" | "quebra" | "erro_operacional"
      app_role: "admin" | "staff" | "superadmin"
      cmv_status: "normal" | "alerta" | "critico"
      pricing_status: "saudavel" | "atencao" | "inviavel"
      product_category:
        | "cafe"
        | "doce"
        | "bolo"
        | "combo"
        | "salgado"
        | "bebida"
        | "outro"
      sale_unit: "unidade" | "fatia" | "copo" | "porcao" | "kg" | "litro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adjustment_type: ["perda", "quebra", "erro_operacional"],
      app_role: ["admin", "staff", "superadmin"],
      cmv_status: ["normal", "alerta", "critico"],
      pricing_status: ["saudavel", "atencao", "inviavel"],
      product_category: [
        "cafe",
        "doce",
        "bolo",
        "combo",
        "salgado",
        "bebida",
        "outro",
      ],
      sale_unit: ["unidade", "fatia", "copo", "porcao", "kg", "litro"],
    },
  },
} as const
