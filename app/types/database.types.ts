export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      body_part: {
        Row: {
          color: string
          created_at: string
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      exercise: {
        Row: {
          body_part_id: string
          created_at: string
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          training_method_id: string | null
          user_id: string
        }
        Insert: {
          body_part_id: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          training_method_id?: string | null
          user_id: string
        }
        Update: {
          body_part_id?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          training_method_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "body_part"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "v_set_detail"
            referencedColumns: ["body_part_id"]
          },
          {
            foreignKeyName: "exercise_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "v_top_set"
            referencedColumns: ["body_part_id"]
          },
          {
            foreignKeyName: "exercise_body_part_id_fkey"
            columns: ["body_part_id"]
            isOneToOne: false
            referencedRelation: "v_weekly_bodypart_volume"
            referencedColumns: ["body_part_id"]
          },
          {
            foreignKeyName: "exercise_training_method_id_fkey"
            columns: ["training_method_id"]
            isOneToOne: false
            referencedRelation: "training_method"
            referencedColumns: ["id"]
          },
        ]
      }
      training_method: {
        Row: {
          created_at: string
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      workout: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_exercise: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          memo: string | null
          sort_order: number
          workout_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          memo?: string | null
          sort_order?: number
          workout_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          memo?: string | null
          sort_order?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercise_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercise"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercise_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "v_exercise_est_1rm"
            referencedColumns: ["exercise_id"]
          },
          {
            foreignKeyName: "workout_exercise_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "v_exercise_max_weight"
            referencedColumns: ["exercise_id"]
          },
          {
            foreignKeyName: "workout_exercise_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "v_set_detail"
            referencedColumns: ["exercise_id"]
          },
          {
            foreignKeyName: "workout_exercise_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "v_top_set"
            referencedColumns: ["exercise_id"]
          },
          {
            foreignKeyName: "workout_exercise_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workout"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_set: {
        Row: {
          created_at: string
          duration_sec: number | null
          id: string
          interval_sec: number | null
          reps: number | null
          set_no: number
          weight: number | null
          workout_exercise_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          interval_sec?: number | null
          reps?: number | null
          set_no: number
          weight?: number | null
          workout_exercise_id: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          interval_sec?: number | null
          reps?: number | null
          set_no?: number
          weight?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_set_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "v_set_detail"
            referencedColumns: ["workout_exercise_id"]
          },
          {
            foreignKeyName: "workout_set_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "v_top_set"
            referencedColumns: ["workout_exercise_id"]
          },
          {
            foreignKeyName: "workout_set_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercise"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_exercise_est_1rm: {
        Row: {
          date: string | null
          est_1rm: number | null
          exercise_id: string | null
          exercise_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_exercise_max_weight: {
        Row: {
          date: string | null
          exercise_id: string | null
          exercise_name: string | null
          max_weight: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_set_detail: {
        Row: {
          body_part_color: string | null
          body_part_id: string | null
          body_part_name: string | null
          date: string | null
          duration_sec: number | null
          est_1rm: number | null
          exercise_id: string | null
          exercise_name: string | null
          reps: number | null
          set_no: number | null
          user_id: string | null
          volume: number | null
          week_start: string | null
          weight: number | null
          workout_exercise_id: string | null
          workout_set_id: string | null
        }
        Relationships: []
      }
      v_top_set: {
        Row: {
          body_part_color: string | null
          body_part_id: string | null
          body_part_name: string | null
          date: string | null
          est_1rm: number | null
          exercise_id: string | null
          exercise_name: string | null
          reps: number | null
          set_no: number | null
          user_id: string | null
          volume: number | null
          week_start: string | null
          weight: number | null
          workout_exercise_id: string | null
        }
        Relationships: []
      }
      v_weekly_bodypart_volume: {
        Row: {
          body_part_color: string | null
          body_part_id: string | null
          body_part_name: string | null
          user_id: string | null
          volume: number | null
          week_start: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_add_cardio_set: {
        Args: { p_duration_sec: number; p_we: string }
        Returns: {
          created_at: string
          duration_sec: number | null
          id: string
          interval_sec: number | null
          reps: number | null
          set_no: number
          weight: number | null
          workout_exercise_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workout_set"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_add_exercise_entry: {
        Args: { p_date: string; p_exercise: string }
        Returns: {
          created_at: string
          exercise_id: string
          id: string
          memo: string | null
          sort_order: number
          workout_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workout_exercise"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_add_set: {
        Args: {
          p_interval: number
          p_reps: number
          p_we: string
          p_weight: number
        }
        Returns: {
          created_at: string
          duration_sec: number | null
          id: string
          interval_sec: number | null
          reps: number | null
          set_no: number
          weight: number | null
          workout_exercise_id: string
        }
        SetofOptions: {
          from: "*"
          to: "workout_set"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_delete_exercise_entry: { Args: { p_we: string }; Returns: undefined }
      fn_delete_set: { Args: { p_set: string }; Returns: undefined }
      fn_overloaded_report: {
        Args: { p_week: string }
        Returns: {
          achieved: boolean
          body_part_color: string
          body_part_id: string
          body_part_name: string
          diff: number
          is_new: boolean
          prev_volume: number
          this_volume: number
        }[]
      }
      fn_week_start: { Args: { d: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

