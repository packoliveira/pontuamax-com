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
  public: {
    Tables: {
      products: {
        Row: {
          ativo: boolean
          created_at: string
          custo_pontos: number
          descricao: string | null
          estoque: number | null
          id: string
          imagem_url: string | null
          nome: string
          store_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_pontos: number
          descricao?: string | null
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          nome: string
          store_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_pontos?: number
          descricao?: string | null
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          nome?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          aniversario: string | null
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          pending_registration: boolean
          telefone: string | null
          updated_at: string
        }
        Insert: {
          aniversario?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          pending_registration?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          aniversario?: string | null
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          pending_registration?: boolean
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_clients: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          profile_id: string
          saldo_cashback: number
          saldo_pontos: number
          store_id: string
          tags: string[]
          total_gasto: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          profile_id: string
          saldo_cashback?: number
          saldo_pontos?: number
          store_id: string
          tags?: string[]
          total_gasto?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          profile_id?: string
          saldo_cashback?: number
          saldo_pontos?: number
          store_id?: string
          tags?: string[]
          total_gasto?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_clients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_employee_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          employee_id: string
          id: string
          permission: string
          updated_at: string
        }
        Insert: {
          allowed: boolean
          created_at?: string
          employee_id: string
          id?: string
          permission: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          employee_id?: string
          id?: string
          permission?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "store_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      store_employees: {
        Row: {
          ativo: boolean
          created_at: string
          email: string
          id: string
          nome: string
          role_name: string
          store_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email: string
          id?: string
          nome: string
          role_name?: string
          store_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string
          id?: string
          nome?: string
          role_name?: string
          store_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          ativo: boolean
          banner_desktop_url: string | null
          banner_mobile_fit: string
          banner_mobile_position: string
          banner_mobile_url: string | null
          banner_mobile_zoom: number
          cashback_percentual: number
          cnpj: string | null
          cor_accent: string
          cor_primaria: string
          cor_secundaria: string
          created_at: string
          endereco: Json
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          plano: string
          pontos_por_real: number
          slug: string
          subscription_status: string
          updated_at: string
          webhook_secret: string
        }
        Insert: {
          ativo?: boolean
          banner_desktop_url?: string | null
          banner_mobile_fit?: string
          banner_mobile_position?: string
          banner_mobile_url?: string | null
          banner_mobile_zoom?: number
          cashback_percentual?: number
          cnpj?: string | null
          cor_accent?: string
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          endereco?: Json
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          plano?: string
          pontos_por_real?: number
          slug: string
          subscription_status?: string
          updated_at?: string
          webhook_secret?: string
        }
        Update: {
          ativo?: boolean
          banner_desktop_url?: string | null
          banner_mobile_fit?: string
          banner_mobile_position?: string
          banner_mobile_url?: string | null
          banner_mobile_zoom?: number
          cashback_percentual?: number
          cnpj?: string | null
          cor_accent?: string
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          endereco?: Json
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          plano?: string
          pontos_por_real?: number
          slug?: string
          subscription_status?: string
          updated_at?: string
          webhook_secret?: string
        }
        Relationships: []
      }
      team_role_permissions: {
        Row: {
          allowed: boolean
          created_at: string
          id: string
          permission: string
          role_name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission: string
          role_name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          id?: string
          permission?: string
          role_name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_role_permissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          cashback_delta: number
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          origem: string
          pontos_delta: number
          product_id: string | null
          profile_id: string
          store_id: string
          tipo: string
          usado_em: string | null
          validado_por: string | null
          valor_reais: number
          voucher_code: string | null
        }
        Insert: {
          cashback_delta?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          origem?: string
          pontos_delta?: number
          product_id?: string | null
          profile_id: string
          store_id: string
          tipo: string
          usado_em?: string | null
          validado_por?: string | null
          valor_reais?: number
          voucher_code?: string | null
        }
        Update: {
          cashback_delta?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json
          origem?: string
          pontos_delta?: number
          product_id?: string | null
          profile_id?: string
          store_id?: string
          tipo?: string
          usado_em?: string | null
          validado_por?: string | null
          valor_reais?: number
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
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
          role: Database["public"]["Enums"]["app_role"]
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
      employee_has_permission: {
        Args: { _permission: string; _store_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_store_owner: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      resgatar_cashback_atomico: {
        Args: { _profile_id: string; _store_id: string; _valor: number }
        Returns: {
          cashback_delta: number
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          origem: string
          pontos_delta: number
          product_id: string | null
          profile_id: string
          store_id: string
          tipo: string
          usado_em: string | null
          validado_por: string | null
          valor_reais: number
          voucher_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resgatar_produto_atomico: {
        Args: { _product_id: string; _profile_id: string; _store_id: string }
        Returns: {
          cashback_delta: number
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json
          origem: string
          pontos_delta: number
          product_id: string | null
          profile_id: string
          store_id: string
          tipo: string
          usado_em: string | null
          validado_por: string | null
          valor_reais: number
          voucher_code: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "lojista" | "cliente"
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
      app_role: ["admin", "lojista", "cliente"],
    },
  },
} as const
