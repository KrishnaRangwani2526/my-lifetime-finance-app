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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      balance_anchors: {
        Row: {
          account_id: string
          as_of_date: string
          balance_amount: number
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          account_id: string
          as_of_date?: string
          balance_amount: number
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          account_id?: string
          as_of_date?: string
          balance_amount?: number
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_anchors_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_type: string
          bank_name: string
          created_at: string
          id: string
          is_confirmed: boolean
          name: string
          source_app: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_confirmed?: boolean
          name: string
          source_app?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          bank_name?: string
          created_at?: string
          id?: string
          is_confirmed?: boolean
          name?: string
          source_app?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      billing_cycles: {
        Row: {
          card_id: string
          created_at: string
          cycle_end: string
          cycle_start: string
          due_date: string | null
          id: string
          paid_status: string
          total_amount: number
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string
          cycle_end: string
          cycle_start: string
          due_date?: string | null
          id?: string
          paid_status?: string
          total_amount?: number
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          due_date?: string | null
          id?: string
          paid_status?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_cycles_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "card_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      card_accounts: {
        Row: {
          bank_name: string
          billing_date: number
          created_at: string
          credit_limit: number | null
          due_date: number
          id: string
          is_confirmed: boolean
          last4: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bank_name?: string
          billing_date?: number
          created_at?: string
          credit_limit?: number | null
          due_date?: number
          id?: string
          is_confirmed?: boolean
          last4?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bank_name?: string
          billing_date?: number
          created_at?: string
          credit_limit?: number | null
          due_date?: number
          id?: string
          is_confirmed?: boolean
          last4?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_custom: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_custom?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emis: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          installments_paid: number
          is_regular_payment: boolean
          linked_id: string | null
          linked_type: string
          monthly_amount: number
          start_date: string
          title: string
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          installments_paid?: number
          is_regular_payment?: boolean
          linked_id?: string | null
          linked_type?: string
          monthly_amount: number
          start_date?: string
          title: string
          total_installments?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          installments_paid?: number
          is_regular_payment?: boolean
          linked_id?: string | null
          linked_type?: string
          monthly_amount?: number
          start_date?: string
          title?: string
          total_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          currency: string
          display_name: string | null
          id: string
          monthly_budget: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
          monthly_budget?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
          monthly_budget?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      quick_entry_templates: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          direction: string
          id: string
          is_favorite: boolean
          linked_id: string | null
          linked_type: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          is_favorite?: boolean
          linked_id?: string | null
          linked_type?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          is_favorite?: boolean
          linked_id?: string | null
          linked_type?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quick_entry_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          direction: string
          frequency: string
          id: string
          is_active: boolean
          linked_id: string | null
          linked_type: string
          name: string
          next_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          direction?: string
          frequency?: string
          id?: string
          is_active?: boolean
          linked_id?: string | null
          linked_type?: string
          name: string
          next_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          direction?: string
          frequency?: string
          id?: string
          is_active?: boolean
          linked_id?: string | null
          linked_type?: string
          name?: string
          next_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          description: string | null
          direction: string
          id: string
          linked_id: string | null
          linked_type: string
          merchant: string | null
          source: string
          txn_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          linked_id?: string | null
          linked_type?: string
          merchant?: string | null
          source?: string
          txn_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          description?: string | null
          direction?: string
          id?: string
          linked_id?: string | null
          linked_type?: string
          merchant?: string | null
          source?: string
          txn_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
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
    Enums: {},
  },
} as const
