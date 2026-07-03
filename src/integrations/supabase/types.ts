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
      campaign_recipients: {
        Row: {
          campaign_id: string
          client_user_id: string
          created_at: string
          enviado_em: string | null
          erro: string | null
          id: string
          mensagem_render: string | null
          status: string
          telefone: string | null
        }
        Insert: {
          campaign_id: string
          client_user_id: string
          created_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem_render?: string | null
          status?: string
          telefone?: string | null
        }
        Update: {
          campaign_id?: string
          client_user_id?: string
          created_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          mensagem_render?: string | null
          status?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          enviado_em: string | null
          id: string
          mensagem: string
          nome: string
          segmento: string
          segmento_param: string | null
          status: string
          store_id: string
          total_destinatarios: number
          total_enviados: number
          total_falhas: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          enviado_em?: string | null
          id?: string
          mensagem: string
          nome: string
          segmento?: string
          segmento_param?: string | null
          status?: string
          store_id: string
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          enviado_em?: string | null
          id?: string
          mensagem?: string
          nome?: string
          segmento?: string
          segmento_param?: string | null
          status?: string
          store_id?: string
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          store_id: string
          tag: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          store_id: string
          tag: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          store_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      fiscal_notes: {
        Row: {
          client_user_id: string
          cnpj_extraido: string | null
          created_at: string
          id: string
          image_hash: string
          image_path: string
          motivo_rejeicao: string | null
          ocr_raw: Json | null
          pontos_creditados: number | null
          status: string
          store_id: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          client_user_id: string
          cnpj_extraido?: string | null
          created_at?: string
          id?: string
          image_hash: string
          image_path: string
          motivo_rejeicao?: string | null
          ocr_raw?: Json | null
          pontos_creditados?: number | null
          status?: string
          store_id: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          client_user_id?: string
          cnpj_extraido?: string | null
          created_at?: string
          id?: string
          image_hash?: string
          image_path?: string
          motivo_rejeicao?: string | null
          ocr_raw?: Json | null
          pontos_creditados?: number | null
          status?: string
          store_id?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_notes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          codigo: string
          created_at: string
          id: string
          pontos: number
          redeemed_at: string | null
          redeemed_by: string | null
          store_id: string
        }
        Insert: {
          codigo: string
          created_at?: string
          id?: string
          pontos: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          store_id: string
        }
        Update: {
          codigo?: string
          created_at?: string
          id?: string
          pontos?: number
          redeemed_at?: string | null
          redeemed_by?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_cards_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_logs: {
        Row: {
          created_at: string
          id: string
          mensagem_erro: string | null
          origem: string
          payload_recebido: Json | null
          status: string
          store_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mensagem_erro?: string | null
          origem: string
          payload_recebido?: Json | null
          status: string
          store_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mensagem_erro?: string | null
          origem?: string
          payload_recebido?: Json | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          client_user_id: string
          created_at: string
          id: string
          mensagem_erro: string | null
          status: string
          store_id: string
          tipo: string
        }
        Insert: {
          client_user_id: string
          created_at?: string
          id?: string
          mensagem_erro?: string | null
          status: string
          store_id: string
          tipo: string
        }
        Update: {
          client_user_id?: string
          created_at?: string
          id?: string
          mensagem_erro?: string | null
          status?: string
          store_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      nps_responses: {
        Row: {
          client_user_id: string
          comment: string | null
          created_at: string
          id: string
          score: number
          store_id: string
          transaction_id: string
        }
        Insert: {
          client_user_id: string
          comment?: string | null
          created_at?: string
          id?: string
          score: number
          store_id: string
          transaction_id: string
        }
        Update: {
          client_user_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          score?: number
          store_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nps_responses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nps_responses_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          created_at: string
          custo_pontos: number
          descricao: string | null
          id: string
          nome: string
          store_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          custo_pontos: number
          descricao?: string | null
          id?: string
          nome: string
          store_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          custo_pontos?: number
          descricao?: string | null
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
        ]
      }
      profiles: {
        Row: {
          birthdate: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          birthdate?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          birthdate?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          ativo: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          dias_semana: number[]
          hora_fim: string
          hora_inicio: string
          id: string
          multiplicador: number
          nome: string
          store_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_semana?: number[]
          hora_fim?: string
          hora_inicio?: string
          id?: string
          multiplicador?: number
          nome: string
          store_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          dias_semana?: number[]
          hora_fim?: string
          hora_inicio?: string
          id?: string
          multiplicador?: number
          nome?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          created_at: string
          filtro_nivel_min: string | null
          filtro_tag: string | null
          ganhador_nome: string | null
          ganhador_user_id: string | null
          id: string
          premio: string
          sorted_at: string | null
          status: string
          store_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filtro_nivel_min?: string | null
          filtro_tag?: string | null
          ganhador_nome?: string | null
          ganhador_user_id?: string | null
          id?: string
          premio: string
          sorted_at?: string | null
          status?: string
          store_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filtro_nivel_min?: string | null
          filtro_tag?: string | null
          ganhador_nome?: string | null
          ganhador_user_id?: string | null
          id?: string
          premio?: string
          sorted_at?: string | null
          status?: string
          store_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
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
          pontos: number
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
          pontos?: number
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
          pontos?: number
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
            foreignKeyName: "store_clients_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          activated_at: string | null
          admin_notes: string | null
          banner_url: string | null
          banner_url_mobile: string | null
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
          plan: Database["public"]["Enums"]["plan_tier"]
          regra_pontos: number
          setup_paid_at: string | null
          slug: string
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          telefone: string | null
          webhook_last_at: string | null
          webhook_secret: string
          whatsapp_enabled: boolean
          whatsapp_template_pontos: string
        }
        Insert: {
          activated_at?: string | null
          admin_notes?: string | null
          banner_url?: string | null
          banner_url_mobile?: string | null
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
          plan?: Database["public"]["Enums"]["plan_tier"]
          regra_pontos?: number
          setup_paid_at?: string | null
          slug: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          telefone?: string | null
          webhook_last_at?: string | null
          webhook_secret?: string
          whatsapp_enabled?: boolean
          whatsapp_template_pontos?: string
        }
        Update: {
          activated_at?: string | null
          admin_notes?: string | null
          banner_url?: string | null
          banner_url_mobile?: string | null
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
          plan?: Database["public"]["Enums"]["plan_tier"]
          regra_pontos?: number
          setup_paid_at?: string | null
          slug?: string
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          telefone?: string | null
          webhook_last_at?: string | null
          webhook_secret?: string
          whatsapp_enabled?: boolean
          whatsapp_template_pontos?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          cashback_delta: number
          client_user_id: string
          created_at: string
          id: string
          id_venda_externa: string | null
          origem: string | null
          pontos_delta: number
          product_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["transaction_tipo"]
          valor: number
          voucher_code: string | null
        }
        Insert: {
          cashback_delta?: number
          client_user_id: string
          created_at?: string
          id?: string
          id_venda_externa?: string | null
          origem?: string | null
          pontos_delta?: number
          product_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["transaction_tipo"]
          valor?: number
          voucher_code?: string | null
        }
        Update: {
          cashback_delta?: number
          client_user_id?: string
          created_at?: string
          id?: string
          id_venda_externa?: string | null
          origem?: string | null
          pontos_delta?: number
          product_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          store_id?: string
          tipo?: Database["public"]["Enums"]["transaction_tipo"]
          valor?: number
          voucher_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_client_user_id_profiles_fkey"
            columns: ["client_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      [_ in never]: never
    }
    Functions: {
      bootstrap_first_admin: { Args: never; Returns: boolean }
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
      plan_tier: "starter" | "pro" | "premium"
      subscription_status:
        | "pending_payment"
        | "active"
        | "suspended"
        | "cancelled"
      transaction_status: "pendente" | "entregue"
      transaction_tipo:
        | "venda"
        | "resgate_produto"
        | "resgate_cashback"
        | "indicacao"
        | "vale_presente"
        | "nota_fiscal"
        | "ajuste"
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
      plan_tier: ["starter", "pro", "premium"],
      subscription_status: [
        "pending_payment",
        "active",
        "suspended",
        "cancelled",
      ],
      transaction_status: ["pendente", "entregue"],
      transaction_tipo: [
        "venda",
        "resgate_produto",
        "resgate_cashback",
        "indicacao",
        "vale_presente",
        "nota_fiscal",
        "ajuste",
      ],
    },
  },
} as const
