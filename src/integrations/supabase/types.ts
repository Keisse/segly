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
      campaign_questions: {
        Row: {
          campaign_id: string
          category: string | null
          created_at: string
          id: string
          is_required: boolean
          options: Json
          question_text: string
          question_type: Database["public"]["Enums"]["campaign_question_type"]
          scale_max: number | null
          scale_min: number | null
          sort_order: number
        }
        Insert: {
          campaign_id: string
          category?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json
          question_text: string
          question_type?: Database["public"]["Enums"]["campaign_question_type"]
          scale_max?: number | null
          scale_min?: number | null
          sort_order?: number
        }
        Update: {
          campaign_id?: string
          category?: string | null
          created_at?: string
          id?: string
          is_required?: boolean
          options?: Json
          question_text?: string
          question_type?: Database["public"]["Enums"]["campaign_question_type"]
          scale_max?: number | null
          scale_min?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_questions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_responses: {
        Row: {
          answer_text: string | null
          answer_value: number | null
          campaign_id: string
          created_at: string
          id: string
          lead_id: string
          question_id: string
        }
        Insert: {
          answer_text?: string | null
          answer_value?: number | null
          campaign_id: string
          created_at?: string
          id?: string
          lead_id: string
          question_id: string
        }
        Update: {
          answer_text?: string | null
          answer_value?: number | null
          campaign_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_responses_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "campaign_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          optin_fields: Json
          public_subtitle: string | null
          public_title: string | null
          slug: string
          status: Database["public"]["Enums"]["campaign_status"]
          tag: string | null
          thank_you_message: string | null
          type: Database["public"]["Enums"]["campaign_type"]
          updated_at: string
          voucher_code: string | null
          voucher_description: string | null
          voucher_enabled: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          optin_fields?: Json
          public_subtitle?: string | null
          public_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["campaign_status"]
          tag?: string | null
          thank_you_message?: string | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
          voucher_code?: string | null
          voucher_description?: string | null
          voucher_enabled?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          optin_fields?: Json
          public_subtitle?: string | null
          public_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          tag?: string | null
          thank_you_message?: string | null
          type?: Database["public"]["Enums"]["campaign_type"]
          updated_at?: string
          voucher_code?: string | null
          voucher_description?: string | null
          voucher_enabled?: boolean
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          file_url: string | null
          id: string
          metadata: Json | null
          source_url: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          file_url?: string | null
          id?: string
          metadata?: Json | null
          source_url?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_ai_content: {
        Row: {
          analysis_type: string
          content: string
          created_at: string
          id: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          analysis_type: string
          content: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          analysis_type?: string
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_ai_content_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string | null
          campaign_name: string | null
          campaign_slug: string | null
          cargo: string
          created_at: string
          departamento: string
          email: string
          empresa: string
          fonte: string
          historico: Json | null
          id: string
          nome: string
          notas: Json | null
          porte_empresa: string
          responsavel: string | null
          resultado_diagnostico: Json | null
          status: string
          telefone: string
        }
        Insert: {
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_slug?: string | null
          cargo: string
          created_at?: string
          departamento: string
          email: string
          empresa: string
          fonte?: string
          historico?: Json | null
          id?: string
          nome: string
          notas?: Json | null
          porte_empresa: string
          responsavel?: string | null
          resultado_diagnostico?: Json | null
          status?: string
          telefone: string
        }
        Update: {
          campaign_id?: string | null
          campaign_name?: string | null
          campaign_slug?: string | null
          cargo?: string
          created_at?: string
          departamento?: string
          email?: string
          empresa?: string
          fonte?: string
          historico?: Json | null
          id?: string
          nome?: string
          notas?: Json | null
          porte_empresa?: string
          responsavel?: string | null
          resultado_diagnostico?: Json | null
          status?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      question_sets: {
        Row: {
          context: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          pillars: Json
          updated_at: string
        }
        Insert: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          pillars: Json
          updated_at?: string
        }
        Update: {
          context?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          pillars?: Json
          updated_at?: string
        }
        Relationships: []
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      campaign_question_type:
        | "multiple_choice"
        | "checkbox"
        | "scale"
        | "short_text"
        | "long_text"
        | "yes_no"
        | "dropdown"
        | "nps"
      campaign_status: "ativa" | "inativa"
      campaign_type: "diagnostico_score" | "formulario_captura" | "pesquisa"
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
      app_role: ["admin", "user"],
      campaign_question_type: [
        "multiple_choice",
        "checkbox",
        "scale",
        "short_text",
        "long_text",
        "yes_no",
        "dropdown",
        "nps",
      ],
      campaign_status: ["ativa", "inativa"],
      campaign_type: ["diagnostico_score", "formulario_captura", "pesquisa"],
    },
  },
} as const
