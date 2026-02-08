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
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      custom_columns: {
        Row: {
          column_type: string
          created_at: string
          id: string
          is_required: boolean
          name: string
        }
        Insert: {
          column_type?: string
          created_at?: string
          id?: string
          is_required?: boolean
          name: string
        }
        Update: {
          column_type?: string
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
        Relationships: []
      }
      pricing_config_product: {
        Row: {
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
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sale_unit?: Database["public"]["Enums"]["sale_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
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
      stock_history: {
        Row: {
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          item_id: string
          new_quantity: number
          previous_quantity: number
        }
        Insert: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          item_id: string
          new_quantity: number
          previous_quantity: number
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          item_id?: string
          new_quantity?: number
          previous_quantity?: number
        }
        Relationships: [
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
          count_date: string | null
          created_at: string
          current_quantity: number
          expiry_date: string | null
          id: string
          minimum_stock: number
          name: string
          responsible_user: string | null
          unit: string
          updated_at: string
          value: number | null
        }
        Insert: {
          category_id: string
          count_date?: string | null
          created_at?: string
          current_quantity?: number
          expiry_date?: string | null
          id?: string
          minimum_stock?: number
          name: string
          responsible_user?: string | null
          unit?: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          category_id?: string
          count_date?: string | null
          created_at?: string
          current_quantity?: number
          expiry_date?: string | null
          id?: string
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
        ]
      }
      technical_sheet_ingredients: {
        Row: {
          calculated_cost: number
          created_at: string
          id: string
          quantity: number
          stock_item_id: string
          technical_sheet_id: string
          unit_type: string
          updated_at: string
        }
        Insert: {
          calculated_cost?: number
          created_at?: string
          id?: string
          quantity?: number
          stock_item_id: string
          technical_sheet_id: string
          unit_type?: string
          updated_at?: string
        }
        Update: {
          calculated_cost?: number
          created_at?: string
          id?: string
          quantity?: number
          stock_item_id?: string
          technical_sheet_id?: string
          unit_type?: string
          updated_at?: string
        }
        Relationships: [
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
          created_at: string
          created_by: string | null
          id: string
          labor_cost_per_hour: number
          notes: string | null
          packaging_cost: number
          prep_time_minutes: number
          product_id: string
          updated_at: string
        }
        Insert: {
          cmv?: number
          created_at?: string
          created_by?: string | null
          id?: string
          labor_cost_per_hour?: number
          notes?: string | null
          packaging_cost?: number
          prep_time_minutes?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          cmv?: number
          created_at?: string
          created_by?: string | null
          id?: string
          labor_cost_per_hour?: number
          notes?: string | null
          packaging_cost?: number
          prep_time_minutes?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "staff"
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
      app_role: ["admin", "staff"],
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
