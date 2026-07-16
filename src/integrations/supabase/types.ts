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
      admin_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string
          created_at: string
          details: Json
          id: string
          target_id: string | null
          target_label: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string | null
          target_label?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
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
          agendada_para: string | null
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
          agendada_para?: string | null
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
          agendada_para?: string | null
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
          {
            foreignKeyName: "campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "client_tags_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          employee_id: string | null
          id: string
          ip: string | null
          meta: Json
          store_id: string
          target_label: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          store_id: string
          target_label?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          employee_id?: string | null
          id?: string
          ip?: string | null
          meta?: Json
          store_id?: string
          target_label?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_audit_logs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "store_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_audit_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_credentials: {
        Row: {
          access_token: string | null
          account_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          last_refresh_at: string | null
          provider: string
          refresh_token: string | null
          scopes: string[] | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          account_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_refresh_at?: string | null
          provider: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          account_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          last_refresh_at?: string | null
          provider?: string
          refresh_token?: string | null
          scopes?: string[] | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_credentials_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_webhook_events: {
        Row: {
          error_message: string | null
          evento: string
          id: string
          payload: Json | null
          processed_at: string | null
          provider: string
          received_at: string
          resource_id: string
          signature: string | null
          signature_valid: boolean | null
          status: string
          store_id: string | null
        }
        Insert: {
          error_message?: string | null
          evento: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider: string
          received_at?: string
          resource_id: string
          signature?: string | null
          signature_valid?: boolean | null
          status?: string
          store_id?: string | null
        }
        Update: {
          error_message?: string | null
          evento?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          provider?: string
          received_at?: string
          resource_id?: string
          signature?: string | null
          signature_valid?: boolean | null
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "erp_webhook_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_webhook_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "fiscal_notes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "gift_cards_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_submissions: {
        Row: {
          client_note: string | null
          client_user_id: string
          created_at: string
          id: string
          points_awarded: number
          post_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["instagram_submission_status"]
          store_id: string
          transaction_id: string | null
          updated_at: string
          verify_after: string | null
        }
        Insert: {
          client_note?: string | null
          client_user_id: string
          created_at?: string
          id?: string
          points_awarded?: number
          post_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["instagram_submission_status"]
          store_id: string
          transaction_id?: string | null
          updated_at?: string
          verify_after?: string | null
        }
        Update: {
          client_note?: string | null
          client_user_id?: string
          created_at?: string
          id?: string
          points_awarded?: number
          post_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["instagram_submission_status"]
          store_id?: string
          transaction_id?: string | null
          updated_at?: string
          verify_after?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instagram_submissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_submissions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_submissions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
          {
            foreignKeyName: "integration_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_notifications: {
        Row: {
          actor_label: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          mensagem: string | null
          metadata: Json
          read_at: string | null
          store_id: string
          tipo: string
          titulo: string
        }
        Insert: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          metadata?: Json
          read_at?: string | null
          store_id: string
          tipo: string
          titulo: string
        }
        Update: {
          actor_label?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          mensagem?: string | null
          metadata?: Json
          read_at?: string | null
          store_id?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchant_notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "notification_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
            foreignKeyName: "nps_responses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          provider: string
          state: string
          store_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          provider: string
          state: string
          store_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          provider?: string
          state?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_states_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "promotions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "raffles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
          {
            foreignKeyName: "store_clients_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_employee_permissions: {
        Row: {
          employee_id: string
          granted: boolean
          permission_key: string
        }
        Insert: {
          employee_id: string
          granted?: boolean
          permission_key: string
        }
        Update: {
          employee_id?: string
          granted?: boolean
          permission_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_employee_permissions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "store_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_employee_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "team_permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      store_employees: {
        Row: {
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string
          first_login_at: string | null
          id: string
          must_change_password: boolean
          nome: string
          phone: string | null
          role_key: string
          status: string
          store_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          first_login_at?: string | null
          id?: string
          must_change_password?: boolean
          nome: string
          phone?: string | null
          role_key: string
          status?: string
          store_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          first_login_at?: string | null
          id?: string
          must_change_password?: boolean
          nome?: string
          phone?: string | null
          role_key?: string
          status?: string
          store_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_employees_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "store_employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_secrets: {
        Row: {
          evolution_apikey: string | null
          evolution_instance: string | null
          evolution_url: string | null
          store_id: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          evolution_apikey?: string | null
          evolution_instance?: string | null
          evolution_url?: string | null
          store_id: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          evolution_apikey?: string | null
          evolution_instance?: string | null
          evolution_url?: string | null
          store_id?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_secrets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
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
          brand_accent_cashback: string | null
          brand_accent_points: string | null
          brand_cta: string | null
          brand_price: string | null
          brand_primary: string
          brand_secondary: string
          brand_vip: string | null
          cancelled_at: string | null
          cnpj: string | null
          created_at: string
          erp_provider: string | null
          header_kicker_show: boolean
          header_kicker_size: string | null
          header_kicker_size_mobile: string | null
          header_kicker_text: string
          header_title_size: string
          header_title_size_mobile: string | null
          header_title_weight: string
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
          reward_rain_colors: string[]
          reward_rain_enabled: boolean
          reward_rain_opacity: number
          setup_paid_at: string | null
          slug: string
          subscription_status: string
          telefone: string | null
          text_on_dark: string | null
          voucher_mostrar_expirados: boolean
          voucher_validade_dias: number
          voucher_visivel_apos_uso: boolean
          webhook_last_at: string | null
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
          brand_accent_cashback?: string | null
          brand_accent_points?: string | null
          brand_cta?: string | null
          brand_price?: string | null
          brand_primary?: string
          brand_secondary?: string
          brand_vip?: string | null
          cancelled_at?: string | null
          cnpj?: string | null
          created_at?: string
          erp_provider?: string | null
          header_kicker_show?: boolean
          header_kicker_size?: string | null
          header_kicker_size_mobile?: string | null
          header_kicker_text?: string
          header_title_size?: string
          header_title_size_mobile?: string | null
          header_title_weight?: string
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
          reward_rain_colors?: string[]
          reward_rain_enabled?: boolean
          reward_rain_opacity?: number
          setup_paid_at?: string | null
          slug: string
          subscription_status?: string
          telefone?: string | null
          text_on_dark?: string | null
          voucher_mostrar_expirados?: boolean
          voucher_validade_dias?: number
          voucher_visivel_apos_uso?: boolean
          webhook_last_at?: string | null
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
          brand_accent_cashback?: string | null
          brand_accent_points?: string | null
          brand_cta?: string | null
          brand_price?: string | null
          brand_primary?: string
          brand_secondary?: string
          brand_vip?: string | null
          cancelled_at?: string | null
          cnpj?: string | null
          created_at?: string
          erp_provider?: string | null
          header_kicker_show?: boolean
          header_kicker_size?: string | null
          header_kicker_size_mobile?: string | null
          header_kicker_text?: string
          header_title_size?: string
          header_title_size_mobile?: string | null
          header_title_weight?: string
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
          reward_rain_colors?: string[]
          reward_rain_enabled?: boolean
          reward_rain_opacity?: number
          setup_paid_at?: string | null
          slug?: string
          subscription_status?: string
          telefone?: string | null
          text_on_dark?: string | null
          voucher_mostrar_expirados?: boolean
          voucher_validade_dias?: number
          voucher_visivel_apos_uso?: boolean
          webhook_last_at?: string | null
          whatsapp_enabled?: boolean
          whatsapp_template_pontos?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          ativo: boolean
          campanhas_sms: boolean
          campanhas_whatsapp: boolean
          created_at: string
          descricao: string | null
          destaque: boolean
          id: string
          instagram_ativo: boolean
          integracao_erp: boolean
          max_clientes: number | null
          max_funcionarios: number | null
          max_lojas: number | null
          nome: string
          nps_ativo: boolean
          ordem: number
          preco_anual: number
          preco_mensal: number
          setup_fee: number
          slug: string
          sorteios_ativo: boolean
          suporte_prioritario: boolean
          vale_presente_ativo: boolean
        }
        Insert: {
          ativo?: boolean
          campanhas_sms?: boolean
          campanhas_whatsapp?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          instagram_ativo?: boolean
          integracao_erp?: boolean
          max_clientes?: number | null
          max_funcionarios?: number | null
          max_lojas?: number | null
          nome: string
          nps_ativo?: boolean
          ordem?: number
          preco_anual?: number
          preco_mensal?: number
          setup_fee?: number
          slug: string
          sorteios_ativo?: boolean
          suporte_prioritario?: boolean
          vale_presente_ativo?: boolean
        }
        Update: {
          ativo?: boolean
          campanhas_sms?: boolean
          campanhas_whatsapp?: boolean
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          instagram_ativo?: boolean
          integracao_erp?: boolean
          max_clientes?: number | null
          max_funcionarios?: number | null
          max_lojas?: number | null
          nome?: string
          nps_ativo?: boolean
          ordem?: number
          preco_anual?: number
          preco_mensal?: number
          setup_fee?: number
          slug?: string
          sorteios_ativo?: boolean
          suporte_prioritario?: boolean
          vale_presente_ativo?: boolean
        }
        Relationships: []
      }
      team_permissions: {
        Row: {
          category: string
          created_at: string
          description: string
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      team_role_permissions: {
        Row: {
          permission_key: string
          role_key: string
        }
        Insert: {
          permission_key: string
          role_key: string
        }
        Update: {
          permission_key?: string
          role_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "team_permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "team_role_permissions_role_key_fkey"
            columns: ["role_key"]
            isOneToOne: false
            referencedRelation: "team_roles"
            referencedColumns: ["key"]
          },
        ]
      }
      team_roles: {
        Row: {
          created_at: string
          description: string | null
          is_system: boolean
          key: string
          label: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_system?: boolean
          key: string
          label: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          is_system?: boolean
          key?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          cashback_delta: number
          client_user_id: string
          created_at: string
          delivered_at: string | null
          id: string
          id_venda_externa: string | null
          origem: string | null
          pontos_delta: number
          product_id: string | null
          redeemed_by: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["transaction_tipo"]
          valor: number
          voucher_code: string | null
          voucher_expires_at: string | null
        }
        Insert: {
          cashback_delta?: number
          client_user_id: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          id_venda_externa?: string | null
          origem?: string | null
          pontos_delta?: number
          product_id?: string | null
          redeemed_by?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["transaction_tipo"]
          valor?: number
          voucher_code?: string | null
          voucher_expires_at?: string | null
        }
        Update: {
          cashback_delta?: number
          client_user_id?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          id_venda_externa?: string | null
          origem?: string | null
          pontos_delta?: number
          product_id?: string | null
          redeemed_by?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          store_id?: string
          tipo?: Database["public"]["Enums"]["transaction_tipo"]
          valor?: number
          voucher_code?: string | null
          voucher_expires_at?: string | null
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
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores_public"
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
      bootstrap_first_admin: { Args: never; Returns: boolean }
      employee_has_permission: {
        Args: { _perm: string; _store_id: string; _user_id: string }
        Returns: boolean
      }
      get_employee_link: {
        Args: { _store_id: string; _user_id: string }
        Returns: {
          employee_id: string
          role_key: string
          status: string
        }[]
      }
      get_store_for_employee: { Args: { _store_id: string }; Returns: Json }
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
      is_store_owner_or_employee: {
        Args: { _user_id: string }
        Returns: boolean
      }
      resgatar_cashback_atomico: {
        Args: {
          p_expires_at: string
          p_store_id: string
          p_user_id: string
          p_valor: number
          p_voucher_code: string
        }
        Returns: {
          cashback_delta: number
          client_user_id: string
          created_at: string
          delivered_at: string | null
          id: string
          id_venda_externa: string | null
          origem: string | null
          pontos_delta: number
          product_id: string | null
          redeemed_by: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["transaction_tipo"]
          valor: number
          voucher_code: string | null
          voucher_expires_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resgatar_produto_atomico: {
        Args: {
          p_expires_at: string
          p_product_id: string
          p_store_id: string
          p_user_id: string
          p_voucher_code: string
        }
        Returns: {
          cashback_delta: number
          client_user_id: string
          created_at: string
          delivered_at: string | null
          id: string
          id_venda_externa: string | null
          origem: string | null
          pontos_delta: number
          product_id: string | null
          redeemed_by: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          store_id: string
          tipo: Database["public"]["Enums"]["transaction_tipo"]
          valor: number
          voucher_code: string | null
          voucher_expires_at: string | null
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
      app_role: "lojista" | "cliente" | "admin"
      instagram_submission_status:
        | "pendente"
        | "aprovado"
        | "rejeitado"
        | "estornado"
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
      instagram_submission_status: [
        "pendente",
        "aprovado",
        "rejeitado",
        "estornado",
      ],
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
