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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          contact_person: string | null
          country: string
          created_at: string
          currency: string
          email: string | null
          gstin: string | null
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          payment_terms_days: number | null
          phone: string | null
          postal_code: string | null
          state: string | null
          state_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          currency?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string
          created_at?: string
          currency?: string
          email?: string | null
          gstin?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          payment_terms_days?: number | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          state_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_counters: {
        Row: {
          fy: string
          kind: Database["public"]["Enums"]["doc_kind"]
          last_number: number
          user_id: string
        }
        Insert: {
          fy: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          last_number?: number
          user_id: string
        }
        Update: {
          fy?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          last_number?: number
          user_id?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          description: string
          discount_paise: number
          id: string
          invoice_id: string
          line_total_paise: number
          position: number
          quantity: number
          sac_code: string | null
          tax_paise: number
          tax_rate_bps: number
          unit: string | null
          unit_price_paise: number
          user_id: string
        }
        Insert: {
          description: string
          discount_paise?: number
          id?: string
          invoice_id: string
          line_total_paise?: number
          position?: number
          quantity?: number
          sac_code?: string | null
          tax_paise?: number
          tax_rate_bps?: number
          unit?: string | null
          unit_price_paise: number
          user_id: string
        }
        Update: {
          description?: string
          discount_paise?: number
          id?: string
          invoice_id?: string
          line_total_paise?: number
          position?: number
          quantity?: number
          sac_code?: string | null
          tax_paise?: number
          tax_rate_bps?: number
          unit?: string | null
          unit_price_paise?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          bill_to_address: string | null
          bill_to_country: string
          bill_to_gstin: string | null
          bill_to_name: string
          bill_to_state: string | null
          bill_to_state_code: string | null
          cgst_paise: number
          client_id: string | null
          converted_from_id: string | null
          created_at: string
          currency: string
          discount_paise: number
          due_date: string | null
          exchange_rate: number | null
          fy: string
          gst_treatment: Database["public"]["Enums"]["gst_treatment"]
          id: string
          igst_paise: number
          internal_memo: string | null
          issue_date: string
          kind: Database["public"]["Enums"]["doc_kind"]
          notes: string | null
          number: string
          pdf_path: string | null
          place_of_supply: string | null
          public_token: string | null
          reverse_charge: boolean
          round_off_paise: number
          sent_at: string | null
          seq: number
          sgst_paise: number
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal_paise: number
          template: string
          terms: string | null
          total_paise: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_to_address?: string | null
          bill_to_country?: string
          bill_to_gstin?: string | null
          bill_to_name: string
          bill_to_state?: string | null
          bill_to_state_code?: string | null
          cgst_paise?: number
          client_id?: string | null
          converted_from_id?: string | null
          created_at?: string
          currency?: string
          discount_paise?: number
          due_date?: string | null
          exchange_rate?: number | null
          fy: string
          gst_treatment?: Database["public"]["Enums"]["gst_treatment"]
          id?: string
          igst_paise?: number
          internal_memo?: string | null
          issue_date?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          notes?: string | null
          number: string
          pdf_path?: string | null
          place_of_supply?: string | null
          public_token?: string | null
          reverse_charge?: boolean
          round_off_paise?: number
          sent_at?: string | null
          seq: number
          sgst_paise?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_paise?: number
          template?: string
          terms?: string | null
          total_paise?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_to_address?: string | null
          bill_to_country?: string
          bill_to_gstin?: string | null
          bill_to_name?: string
          bill_to_state?: string | null
          bill_to_state_code?: string | null
          cgst_paise?: number
          client_id?: string | null
          converted_from_id?: string | null
          created_at?: string
          currency?: string
          discount_paise?: number
          due_date?: string | null
          exchange_rate?: number | null
          fy?: string
          gst_treatment?: Database["public"]["Enums"]["gst_treatment"]
          id?: string
          igst_paise?: number
          internal_memo?: string | null
          issue_date?: string
          kind?: Database["public"]["Enums"]["doc_kind"]
          notes?: string | null
          number?: string
          pdf_path?: string | null
          place_of_supply?: string | null
          public_token?: string | null
          reverse_charge?: boolean
          round_off_paise?: number
          sent_at?: string | null
          seq?: number
          sgst_paise?: number
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal_paise?: number
          template?: string
          terms?: string | null
          total_paise?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_converted_from_id_fkey"
            columns: ["converted_from_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_converted_from_id_fkey"
            columns: ["converted_from_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          fees_paise: number
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_on: string
          reference: string | null
          tds_paise: number
          user_id: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          fees_paise?: number
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_on?: string
          reference?: string | null
          tds_paise?: number
          user_id: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          fees_paise?: number
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_on?: string
          reference?: string | null
          tds_paise?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bank_account_name: string | null
          bank_account_no: string | null
          bank_ifsc: string | null
          bank_name: string | null
          city: string | null
          country: string
          created_at: string
          default_currency: string
          default_sac_code: string | null
          default_template: string
          default_terms_days: number
          email: string | null
          gstin: string | null
          has_lut: boolean
          invoice_prefix: string
          is_gst_registered: boolean
          legal_name: string
          logo_path: string | null
          notes_default: string | null
          pan: string | null
          phone: string | null
          postal_code: string | null
          signature_path: string | null
          state: string | null
          state_code: string | null
          trade_name: string | null
          updated_at: string
          upi_id: string | null
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          default_currency?: string
          default_sac_code?: string | null
          default_template?: string
          default_terms_days?: number
          email?: string | null
          gstin?: string | null
          has_lut?: boolean
          invoice_prefix?: string
          is_gst_registered?: boolean
          legal_name: string
          logo_path?: string | null
          notes_default?: string | null
          pan?: string | null
          phone?: string | null
          postal_code?: string | null
          signature_path?: string | null
          state?: string | null
          state_code?: string | null
          trade_name?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bank_account_name?: string | null
          bank_account_no?: string | null
          bank_ifsc?: string | null
          bank_name?: string | null
          city?: string | null
          country?: string
          created_at?: string
          default_currency?: string
          default_sac_code?: string | null
          default_template?: string
          default_terms_days?: number
          email?: string | null
          gstin?: string | null
          has_lut?: boolean
          invoice_prefix?: string
          is_gst_registered?: boolean
          legal_name?: string
          logo_path?: string | null
          notes_default?: string | null
          pan?: string | null
          phone?: string | null
          postal_code?: string | null
          signature_path?: string | null
          state?: string | null
          state_code?: string | null
          trade_name?: string | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          default_rate_paise: number
          description: string | null
          id: string
          is_archived: boolean
          name: string
          sac_code: string | null
          tax_rate_bps: number
          unit: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_rate_paise: number
          description?: string | null
          id?: string
          is_archived?: boolean
          name: string
          sac_code?: string | null
          tax_rate_bps?: number
          unit?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_rate_paise?: number
          description?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          sac_code?: string | null
          tax_rate_bps?: number
          unit?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      invoice_balances: {
        Row: {
          balance_paise: number | null
          client_id: string | null
          currency: string | null
          due_date: string | null
          id: string | null
          is_overdue: boolean | null
          issue_date: string | null
          number: string | null
          paid_paise: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          total_paise: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      financial_year: { Args: { d: string }; Returns: string }
      next_invoice_number: {
        Args: {
          p_date: string
          p_kind?: Database["public"]["Enums"]["doc_kind"]
          p_user_id: string
        }
        Returns: {
          fy: string
          seq: number
        }[]
      }
    }
    Enums: {
      doc_kind: "invoice" | "estimate"
      gst_treatment: "intra_state" | "inter_state" | "export" | "unregistered"
      invoice_status:
        | "draft"
        | "sent"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      payment_method:
        | "upi"
        | "bank_transfer"
        | "razorpay"
        | "cash"
        | "cheque"
        | "other"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      doc_kind: ["invoice", "estimate"],
      gst_treatment: ["intra_state", "inter_state", "export", "unregistered"],
      invoice_status: [
        "draft",
        "sent",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      payment_method: [
        "upi",
        "bank_transfer",
        "razorpay",
        "cash",
        "cheque",
        "other",
      ],
    },
  },
} as const
