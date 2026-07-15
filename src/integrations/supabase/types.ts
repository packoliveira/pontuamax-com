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
          foto_url: string | null
          id: string
          nome: string
          store_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_pontos: number
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          store_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_pontos?: number
          descricao?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      store_clients: {
        Row: {
          cashback_saldo: number
          created_at: string
          id: string
          last_notified_birthday: string | null
          last_notified_expiry: string | null
          last_notified_inactivity: string | null
          last_purchase_at: string | null
          nivel: Database["public"]["Enums"]["nivel_cliente"]
          pending_registration: boolean
          pontos: number
          pontos_decaimento_last_at: string | null
          referral_bonus_paid: boolean
          referrer_user_id: string | null
          store_id: string
          user_id: string
        }
        Insert: {
          cashback_saldo?: number
          created_at?: string
          id?: string
          last_notified_birthday?: string | null
          last_notified_expiry?: string | null
          last_notified_inactivity?: string | null
          last_purchase_at?: string | null
          nivel?: Database["public"]["Enums"]["nivel_cliente"]
          pending_registration?: boolean
          pontos?: number
          pontos_decaimento_last_at?: string | null
          referral_bonus_paid?: boolean
          referrer_user_id?: string | null
          store_id: string
          user_id: string
        }
        Update: {
          cashback_saldo?: number
          created_at?: string
          id?: string
          last_notified_birthday?: string | null
          last_notified_expiry?: string | null
          last_notified_inactivity?: string | null
          last_purchase_at?: string | null
          nivel?: Database["public"]["Enums"]["nivel_cliente"]
          pending_registration?: boolean
          pontos?: number
          pontos_decaimento_last_at?: string | null
          referral_bonus_paid?: boolean
          referrer_user_id?: string | null
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_clients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_clients_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          activated_at: string | null
          admin_notes: string | null
          banner_mobile_fit: string
          banner_mobile_position_x: number
          banner_mobile_position_y: number
          banner_mobile_zoom: number
          banner_url: string | null
          banner_url_mobile: string | null
          bg_color_1: string | null
          bg_color_2: string | null
          bg_mode: string
          bonus_indicado: number
          bonus_indicador: number
          brand_primary: string
          brand_secondary: string
          cancelled_at: string | null
          cnpj: string | null
          created_at: string
          evolution_apikey: string | null
          evolution_instance: string | null
          evolution_url: string | null
          id: string
          indicacao_ativa: boolean
          instagram_handle: string | null
          instagram_instructions: string | null
          instagram_min_days_live: number
          instagram_points_per_post: number
          instagram_program_active: boolean
          logo_url: string | null
          modalidade: Database["public"]["Enums"]["modalidade"]
          mrr_amount: number
          nome_fantasia: string
          notif_birthday_bonus_points: number
          notif_birthday_enabled: boolean
          notif_birthday_template: string
          notif_expiry_days: number
          notif_expiry_enabled: boolean
          notif_expiry_template: string
          notif_expiry_warn_days: number
          notif_inactivity_days: number
          notif_inactivity_enabled: boolean
          notif_inactivity_template: string
          nps_ask_comment: boolean
          nps_enabled: boolean
          nps_template: string
          owner_id: string
          percentual_cashback: number
          plan: string
          pontos_decaimento_dias: number
          pontos_decaimento_valor: number
          pontos_expiracao_last_run_at: string | null
          pontos_expiracao_modo: string
          pontos_validade_dias: number
          regra_pontos: number
          setup_paid_at: string | null
          slug: string
          subscription_status: string
          telefone: string | null
          voucher_mostrar_expirados: boolean
          voucher_validade_dias: number
          voucher_visivel_apos_uso: boolean
          webhook_last_at: string | null
          webhook_secret: string
          whatsapp_enabled: boolean
          whatsapp_template_pontos: string
        }
        Insert: {
          activated_at?: string | null
          admin_notes?: string | null
          banner_mobile_fit?: string
          banner_mobile_position_x?: number
          banner_mobile_position_y?: number
          banner_mobile_zoom?: number
          banner_url?: string | null
          banner_url_mobile?: string | null
          bg_color_1?: string | null
          bg_color_2?: string | null
          bg_mode?: string
          bonus_indicado?: number
          bonus_indicador?: number
          brand_primary?: string
          brand_secondary?: string
          cancelled_at?: string | null
          cnpj?: string | null
          created_at?: string
          evolution_apikey?: string | null
          evolution_instance?: string | null
          evolution_url?: string | null
          id?: string
          indicacao_ativa?: boolean
          instagram_handle?: string | null
          instagram_instructions?: string | null
          instagram_min_days_live?: number
          instagram_points_per_post?: number
          instagram_program_active?: boolean
          logo_url?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade"]
          mrr_amount?: number
          nome_fantasia: string
          notif_birthday_bonus_points?: number
          notif_birthday_enabled?: boolean
          notif_birthday_template?: string
          notif_expiry_days?: number
          notif_expiry_enabled?: boolean
          notif_expiry_template?: string
          notif_expiry_warn_days?: number
          notif_inactivity_days?: number
          notif_inactivity_enabled?: boolean
          notif_inactivity_template?: string
          nps_ask_comment?: boolean
          nps_enabled?: boolean
          nps_template?: string
          owner_id: string
          percentual_cashback?: number
          plan?: string
          pontos_decaimento_dias?: number
          pontos_decaimento_valor?: number
          pontos_expiracao_last_run_at?: string | null
          pontos_expiracao_modo?: string
          pontos_validade_dias?: number
          regra_pontos?: number
          setup_paid_at?: string | null
          slug: string
          subscription_status?: string
          telefone?: string | null
          voucher_mostrar_expirados?: boolean
          voucher_validade_dias?: number
          voucher_visivel_apos_uso?: boolean
          webhook_last_at?: string | null
          webhook_secret?: string
          whatsapp_enabled?: boolean
          whatsapp_template_pontos?: string
        }
        Update: {
          activated_at?: string | null
          admin_notes?: string | null
          banner_mobile_fit?: string
          banner_mobile_position_x?: number
          banner_mobile_position_y?: number
          banner_mobile_zoom?: number
          banner_url?: string | null
          banner_url_mobile?: string | null
          bg_color_1?: string | null
          bg_color_2?: string | null
          bg_mode?: string
          bonus_indicado?: number
          bonus_indicador?: number
          brand_primary?: string
          brand_secondary?: string
          cancelled_at?: string | null
          cnpj?: string | null
          created_at?: string
          evolution_apikey?: string | null
          evolution_instance?: string | null
          evolution_url?: string | null
          id?: string
          indicacao_ativa?: boolean
          instagram_handle?: string | null
          instagram_instructions?: string | null
          instagram_min_days_live?: number
          instagram_points_per_post?: number
          instagram_program_active?: boolean
          logo_url?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade"]
          mrr_amount?: number
          nome_fantasia?: string
          notif_birthday_bonus_points?: number
          notif_birthday_enabled?: boolean
          notif_birthday_template?: string
          notif_expiry_days?: number
          notif_expiry_enabled?: boolean
          notif_expiry_template?: string
          notif_expiry_warn_days?: number
          notif_inactivity_days?: number
          notif_inactivity_enabled?: boolean
          notif_inactivity_template?: string
          nps_ask_comment?: boolean
          nps_enabled?: boolean
          nps_template?: string
          owner_id?: string
          percentual_cashback?: number
          plan?: string
          pontos_decaimento_dias?: number
          pontos_decaimento_valor?: number
          pontos_expiracao_last_run_at?: string | null
          pontos_expiracao_modo?: string
          pontos_validade_dias?: number
          regra_pontos?: number
          setup_paid_at?: string | null
          slug?: string
          subscription_status?: string
          telefone?: string | null
          voucher_mostrar_expirados?: boolean
          voucher_validade_dias?: number
          voucher_visivel_apos_uso?: boolean
          webhook_last_at?: string | null
          webhook_secret?: string
          whatsapp_enabled?: boolean
          whatsapp_template_pontos?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      stores_public: {
        Row: {
          banner_mobile_fit: string | null
          banner_mobile_position_x: number | null
          banner_mobile_position_y: number | null
          banner_mobile_zoom: number | null
          banner_url: string | null
          banner_url_mobile: string | null
          bg_color_1: string | null
          bg_color_2: string | null
          bg_mode: string | null
          bonus_indicado: number | null
          bonus_indicador: number | null
          brand_primary: string | null
          brand_secondary: string | null
          created_at: string | null
          id: string | null
          indicacao_ativa: boolean | null
          instagram_handle: string | null
          instagram_points_per_post: number | null
          instagram_program_active: boolean | null
          logo_url: string | null
          modalidade: Database["public"]["Enums"]["modalidade"] | null
          nome_fantasia: string | null
          nps_enabled: boolean | null
          percentual_cashback: number | null
          regra_pontos: number | null
          slug: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          banner_mobile_fit?: string | null
          banner_mobile_position_x?: number | null
          banner_mobile_position_y?: number | null
          banner_mobile_zoom?: number | null
          banner_url?: string | null
          banner_url_mobile?: string | null
          bg_color_1?: string | null
          bg_color_2?: string | null
          bg_mode?: string | null
          bonus_indicado?: number | null
          bonus_indicador?: number | null
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          id?: string | null
          indicacao_ativa?: boolean | null
          instagram_handle?: string | null
          instagram_points_per_post?: number | null
          instagram_program_active?: boolean | null
          logo_url?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade"] | null
          nome_fantasia?: string | null
          nps_enabled?: boolean | null
          percentual_cashback?: number | null
          regra_pontos?: number | null
          slug?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          banner_mobile_fit?: string | null
          banner_mobile_position_x?: number | null
          banner_mobile_position_y?: number | null
          banner_mobile_zoom?: number | null
          banner_url?: string | null
          banner_url_mobile?: string | null
          bg_color_1?: string | null
          bg_color_2?: string | null
          bg_mode?: string | null
          bonus_indicado?: number | null
          bonus_indicador?: number | null
          brand_primary?: string | null
          brand_secondary?: string | null
          created_at?: string | null
          id?: string | null
          indicacao_ativa?: boolean | null
          instagram_handle?: string | null
          instagram_points_per_post?: number | null
          instagram_program_active?: boolean | null
          logo_url?: string | null
          modalidade?: Database["public"]["Enums"]["modalidade"] | null
          nome_fantasia?: string | null
          nps_enabled?: boolean | null
          percentual_cashback?: number | null
          regra_pontos?: number | null
          slug?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "lojista" | "cliente" | "admin"
      modalidade: "pontos" | "cashback" | "ambos"
      nivel_cliente: "bronze" | "prata" | "ouro"
      transaction_status: "pendente" | "entregue" | "cancelado" | "expirado"
      transaction_tipo:
        | "venda"
        | "resgate_produto"
        | "resgate_cashback"
        | "indicacao"
        | "vale_presente"
        | "nota_fiscal"
        | "ajuste"
        | "instagram_bonus"
        | "expiracao"
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
      app_role: ["lojista", "cliente", "admin"],
      modalidade: ["pontos", "cashback", "ambos"],
      nivel_cliente: ["bronze", "prata", "ouro"],
      transaction_status: ["pendente", "entregue", "cancelado", "expirado"],
      transaction_tipo: [
        "venda",
        "resgate_produto",
        "resgate_cashback",
        "indicacao",
        "vale_presente",
        "nota_fiscal",
        "ajuste",
        "instagram_bonus",
        "expiracao",
      ],
    },
  },
} as const
