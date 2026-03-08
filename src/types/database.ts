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
      communities: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          member_count: number | null
          moderators: string[] | null
          name: string
          settings: Json | null
          type: Database["public"]["Enums"]["community_type"]
          rules: string[] | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          member_count?: number | null
          moderators?: string[] | null
          name: string
          settings?: Json | null
          type?: Database["public"]["Enums"]["community_type"]
          rules?: string[] | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          member_count?: number | null
          moderators?: string[] | null
          name?: string
          settings?: Json | null
          type?: Database["public"]["Enums"]["community_type"]
          rules?: string[] | null
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          id: string
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          id?: string
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          exchange_agreement_id: string | null
          id: string
          last_message_at: string | null
          participant_a: string
          participant_b: string
          post_id: string | null
        }
        Insert: {
          created_at?: string | null
          exchange_agreement_id?: string | null
          id?: string
          last_message_at?: string | null
          participant_a: string
          participant_b: string
          post_id?: string | null
        }
        Update: {
          created_at?: string | null
          exchange_agreement_id?: string | null
          id?: string
          last_message_at?: string | null
          participant_a?: string
          participant_b?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_exchange_agreement_id_fkey"
            columns: ["exchange_agreement_id"]
            isOneToOne: false
            referencedRelation: "exchange_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_a_fkey"
            columns: ["participant_a"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_b_fkey"
            columns: ["participant_b"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          id: string
          thread_id: string
          removed_by_mod: string | null
          removed_reason: string | null
          removed_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          id?: string
          thread_id: string
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          id?: string
          thread_id?: string
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          author_id: string
          body: string
          community_id: string
          created_at: string | null
          id: string
          last_reply_at: string | null
          pinned: boolean | null
          reply_count: number | null
          title: string
          removed_by_mod: string | null
          removed_reason: string | null
          removed_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          community_id: string
          created_at?: string | null
          id?: string
          last_reply_at?: string | null
          pinned?: boolean | null
          reply_count?: number | null
          title: string
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          community_id?: string
          created_at?: string | null
          id?: string
          last_reply_at?: string | null
          pinned?: boolean | null
          reply_count?: number | null
          title?: string
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discussion_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_agreements: {
        Row: {
          completed_at: string | null
          created_at: string | null
          exchange_mode: Database["public"]["Enums"]["exchange_mode"]
          id: string
          loan_return_date: string | null
          post_id: string
          provider_confirmed: boolean | null
          provider_id: string
          receiver_confirmed: boolean | null
          receiver_id: string
          status: Database["public"]["Enums"]["exchange_status"] | null
          terms: string | null
          time_dollar_amount: number | null
          dispute_reason: string | null
          dispute_filed_by: string | null
          dispute_filed_at: string | null
          dispute_resolved_by: string | null
          dispute_resolved_at: string | null
          dispute_resolution: string | null
          condition_photos_before: string[] | null
          condition_photos_after: string[] | null
          late_flag: boolean | null
          late_notified_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          exchange_mode: Database["public"]["Enums"]["exchange_mode"]
          id?: string
          loan_return_date?: string | null
          post_id: string
          provider_confirmed?: boolean | null
          provider_id: string
          receiver_confirmed?: boolean | null
          receiver_id: string
          status?: Database["public"]["Enums"]["exchange_status"] | null
          terms?: string | null
          time_dollar_amount?: number | null
          dispute_reason?: string | null
          dispute_filed_by?: string | null
          dispute_filed_at?: string | null
          dispute_resolved_by?: string | null
          dispute_resolved_at?: string | null
          dispute_resolution?: string | null
          condition_photos_before?: string[] | null
          condition_photos_after?: string[] | null
          late_flag?: boolean | null
          late_notified_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          exchange_mode?: Database["public"]["Enums"]["exchange_mode"]
          id?: string
          loan_return_date?: string | null
          post_id?: string
          provider_confirmed?: boolean | null
          provider_id?: string
          receiver_confirmed?: boolean | null
          receiver_id?: string
          status?: Database["public"]["Enums"]["exchange_status"] | null
          terms?: string | null
          time_dollar_amount?: number | null
          dispute_reason?: string | null
          dispute_filed_by?: string | null
          dispute_filed_at?: string | null
          dispute_resolved_by?: string | null
          dispute_resolved_at?: string | null
          dispute_resolution?: string | null
          condition_photos_before?: string[] | null
          condition_photos_after?: string[] | null
          late_flag?: boolean | null
          late_notified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_agreements_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_agreements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exchange_agreements_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string | null
          id: string
          read: boolean | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          data: Json | null
          id: string
          read: boolean | null
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          recipient_id: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          body?: string | null
          created_at?: string | null
          data?: Json | null
          id?: string
          read?: boolean | null
          recipient_id?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          id: string
          user_id: string
          post_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          post_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          category: string
          community_id: string | null
          condition: string | null
          created_at: string | null
          exchange_modes: Database["public"]["Enums"]["exchange_mode"][]
          expires_at: string | null
          id: string
          images: string[] | null
          latitude: number | null
          loan_duration: string | null
          location_name: string | null
          longitude: number | null
          response_count: number | null
          status: Database["public"]["Enums"]["post_status"] | null
          subcategory: string | null
          time_dollar_amount: number | null
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string | null
          removed_by_mod: string | null
          removed_reason: string | null
          removed_at: string | null
        }
        Insert: {
          author_id: string
          body?: string | null
          category: string
          community_id?: string | null
          condition?: string | null
          created_at?: string | null
          exchange_modes: Database["public"]["Enums"]["exchange_mode"][]
          expires_at?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          loan_duration?: string | null
          location_name?: string | null
          longitude?: number | null
          response_count?: number | null
          status?: Database["public"]["Enums"]["post_status"] | null
          subcategory?: string | null
          time_dollar_amount?: number | null
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string | null
          category?: string
          community_id?: string | null
          condition?: string | null
          created_at?: string | null
          exchange_modes?: Database["public"]["Enums"]["exchange_mode"][]
          expires_at?: string | null
          id?: string
          images?: string[] | null
          latitude?: number | null
          loan_duration?: string | null
          location_name?: string | null
          longitude?: number | null
          response_count?: number | null
          status?: Database["public"]["Enums"]["post_status"] | null
          subcategory?: string | null
          time_dollar_amount?: number | null
          title?: string
          type?: Database["public"]["Enums"]["post_type"]
          updated_at?: string | null
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          email: string
          id: string
          last_active: string | null
          needs_list: string[] | null
          offers_list: string[] | null
          onboarding_completed: boolean | null
          phone: string | null
          primary_location: string | null
          skills: string[] | null
          social_links: Json | null
          total_exchanges: number | null
          total_given: number | null
          total_received: number | null
          trust_score: number | null
          verification_methods: string[] | null
          verified: boolean | null
          verified_at: string | null
          response_rate: number | null
          messages_received: number | null
          messages_responded: number | null
          pending_reviews: number | null
          trust_score_at_day_start: number | null
          trust_score_day_reset: string | null
          verification_tier: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          email: string
          id: string
          last_active?: string | null
          needs_list?: string[] | null
          offers_list?: string[] | null
          onboarding_completed?: boolean | null
          phone?: string | null
          primary_location?: string | null
          skills?: string[] | null
          social_links?: Json | null
          total_exchanges?: number | null
          total_given?: number | null
          total_received?: number | null
          trust_score?: number | null
          verification_methods?: string[] | null
          verified?: boolean | null
          verified_at?: string | null
          response_rate?: number | null
          messages_received?: number | null
          messages_responded?: number | null
          pending_reviews?: number | null
          trust_score_at_day_start?: number | null
          trust_score_day_reset?: string | null
          verification_tier?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          email?: string
          id?: string
          last_active?: string | null
          needs_list?: string[] | null
          offers_list?: string[] | null
          onboarding_completed?: boolean | null
          phone?: string | null
          primary_location?: string | null
          skills?: string[] | null
          social_links?: Json | null
          total_exchanges?: number | null
          total_given?: number | null
          total_received?: number | null
          trust_score?: number | null
          verification_methods?: string[] | null
          verified?: boolean | null
          verified_at?: string | null
          response_rate?: number | null
          messages_received?: number | null
          messages_responded?: number | null
          pending_reviews?: number | null
          trust_score_at_day_start?: number | null
          trust_score_day_reset?: string | null
          verification_tier?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          exchange_id: string
          id: string
          rating: number
          subject_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          exchange_id: string
          id?: string
          rating: number
          subject_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          exchange_id?: string
          id?: string
          rating?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchange_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      potlucks: {
        Row: {
          id: string
          community_id: string
          host_id: string
          title: string
          description: string | null
          images: string[] | null
          event_date: string
          end_time: string | null
          latitude: number | null
          longitude: number | null
          location_name: string | null
          location_details: string | null
          capacity: number | null
          rsvp_count: number | null
          host_providing: string | null
          status: Database["public"]["Enums"]["potluck_status"] | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          community_id: string
          host_id: string
          title: string
          description?: string | null
          images?: string[] | null
          event_date: string
          end_time?: string | null
          latitude?: number | null
          longitude?: number | null
          location_name?: string | null
          location_details?: string | null
          capacity?: number | null
          rsvp_count?: number | null
          host_providing?: string | null
          status?: Database["public"]["Enums"]["potluck_status"] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          community_id?: string
          host_id?: string
          title?: string
          description?: string | null
          images?: string[] | null
          event_date?: string
          end_time?: string | null
          latitude?: number | null
          longitude?: number | null
          location_name?: string | null
          location_details?: string | null
          capacity?: number | null
          rsvp_count?: number | null
          host_providing?: string | null
          status?: Database["public"]["Enums"]["potluck_status"] | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "potlucks_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potlucks_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      potluck_dish_slots: {
        Row: {
          id: string
          potluck_id: string
          category: string
          label: string | null
          claimed_by: string | null
          dish_name: string | null
          servings: number | null
          dietary_notes: string[] | null
          claimed_at: string | null
        }
        Insert: {
          id?: string
          potluck_id: string
          category: string
          label?: string | null
          claimed_by?: string | null
          dish_name?: string | null
          servings?: number | null
          dietary_notes?: string[] | null
          claimed_at?: string | null
        }
        Update: {
          id?: string
          potluck_id?: string
          category?: string
          label?: string | null
          claimed_by?: string | null
          dish_name?: string | null
          servings?: number | null
          dietary_notes?: string[] | null
          claimed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "potluck_dish_slots_potluck_id_fkey"
            columns: ["potluck_id"]
            isOneToOne: false
            referencedRelation: "potlucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potluck_dish_slots_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      potluck_rsvps: {
        Row: {
          id: string
          potluck_id: string
          user_id: string
          status: string
          note: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          potluck_id: string
          user_id: string
          status?: string
          note?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          potluck_id?: string
          user_id?: string
          status?: string
          note?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "potluck_rsvps_potluck_id_fkey"
            columns: ["potluck_id"]
            isOneToOne: false
            referencedRelation: "potlucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potluck_rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      potluck_comments: {
        Row: {
          id: string
          potluck_id: string
          author_id: string
          body: string
          created_at: string | null
          removed_by_mod: string | null
          removed_reason: string | null
          removed_at: string | null
        }
        Insert: {
          id?: string
          potluck_id: string
          author_id: string
          body: string
          created_at?: string | null
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Update: {
          id?: string
          potluck_id?: string
          author_id?: string
          body?: string
          created_at?: string | null
          removed_by_mod?: string | null
          removed_reason?: string | null
          removed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "potluck_comments_potluck_id_fkey"
            columns: ["potluck_id"]
            isOneToOne: false
            referencedRelation: "potlucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "potluck_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      time_dollar_ledger: {
        Row: {
          id: string
          user_id: string
          exchange_id: string | null
          amount: number
          balance_after: number
          description: string
          type: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          exchange_id?: string | null
          amount: number
          balance_after: number
          description: string
          type?: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          exchange_id?: string | null
          amount?: number
          balance_after?: number
          description?: string
          type?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_dollar_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_dollar_ledger_exchange_id_fkey"
            columns: ["exchange_id"]
            isOneToOne: false
            referencedRelation: "exchange_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          id: string
          inviter_id: string
          code: string
          invited_email: string | null
          used_by: string | null
          used_at: string | null
          created_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          inviter_id: string
          code: string
          invited_email?: string | null
          used_by?: string | null
          used_at?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          inviter_id?: string
          code?: string
          invited_email?: string | null
          used_by?: string | null
          used_at?: string | null
          created_at?: string | null
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_flags: {
        Row: {
          id: string
          community_id: string
          reporter_id: string
          content_type: string
          content_id: string
          content_author_id: string
          reason: Database["public"]["Enums"]["flag_reason"]
          description: string | null
          status: Database["public"]["Enums"]["flag_status"] | null
          resolved_by: string | null
          resolved_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          community_id: string
          reporter_id: string
          content_type: string
          content_id: string
          content_author_id: string
          reason: Database["public"]["Enums"]["flag_reason"]
          description?: string | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          community_id?: string
          reporter_id?: string
          content_type?: string
          content_id?: string
          content_author_id?: string
          reason?: Database["public"]["Enums"]["flag_reason"]
          description?: string | null
          status?: Database["public"]["Enums"]["flag_status"] | null
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_flags_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_flags_content_author_id_fkey"
            columns: ["content_author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      mod_actions: {
        Row: {
          id: string
          community_id: string
          moderator_id: string
          action_type: Database["public"]["Enums"]["mod_action_type"]
          target_user_id: string | null
          target_content_type: string | null
          target_content_id: string | null
          flag_id: string | null
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          community_id: string
          moderator_id: string
          action_type: Database["public"]["Enums"]["mod_action_type"]
          target_user_id?: string | null
          target_content_type?: string | null
          target_content_id?: string | null
          flag_id?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          community_id?: string
          moderator_id?: string
          action_type?: Database["public"]["Enums"]["mod_action_type"]
          target_user_id?: string | null
          target_content_type?: string | null
          target_content_id?: string | null
          flag_id?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mod_actions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mod_actions_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_bans: {
        Row: {
          id: string
          community_id: string
          user_id: string
          banned_by: string
          reason: string | null
          expires_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          banned_by: string
          reason?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          banned_by?: string
          reason?: string | null
          expires_at?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_bans_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_bans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_bans_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_warnings: {
        Row: {
          id: string
          community_id: string
          user_id: string
          moderator_id: string
          reason: string
          flag_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          community_id: string
          user_id: string
          moderator_id: string
          reason: string
          flag_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          community_id?: string
          user_id?: string
          moderator_id?: string
          reason?: string
          flag_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_warnings_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_warnings_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      references: {
        Row: {
          id: string
          author_id: string
          subject_id: string
          relationship: Database["public"]["Enums"]["reference_relationship"]
          body: string
          is_positive: boolean
          created_at: string | null
        }
        Insert: {
          id?: string
          author_id: string
          subject_id: string
          relationship: Database["public"]["Enums"]["reference_relationship"]
          body: string
          is_positive?: boolean
          created_at?: string | null
        }
        Update: {
          id?: string
          author_id?: string
          subject_id?: string
          relationship?: Database["public"]["Enums"]["reference_relationship"]
          body?: string
          is_positive?: boolean
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "references_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "references_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_vouches: {
        Row: {
          id: string
          voucher_id: string
          subject_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          voucher_id: string
          subject_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          voucher_id?: string
          subject_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_vouches_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_vouches_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_endorsements: {
        Row: {
          id: string
          endorser_id: string
          endorsed_id: string
          skill: string
          created_at: string | null
        }
        Insert: {
          id?: string
          endorser_id: string
          endorsed_id: string
          skill: string
          created_at?: string | null
        }
        Update: {
          id?: string
          endorser_id?: string
          endorsed_id?: string
          skill?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_endorsements_endorser_id_fkey"
            columns: ["endorser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_endorsements_endorsed_id_fkey"
            columns: ["endorsed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_posts_nearby: {
        Args: {
          center_lat: number
          center_lng: number
          radius_miles?: number
          filter_type?: string
          result_limit?: number
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_trust_score: number
          body: string
          category: string
          created_at: string
          distance_miles: number
          exchange_modes: Database["public"]["Enums"]["exchange_mode"][]
          id: string
          images: string[]
          latitude: number
          location_name: string
          longitude: number
          response_count: number
          status: string
          title: string
          type: Database["public"]["Enums"]["post_type"]
        }[]
      }
      get_matching_posts: {
        Args: { p_user_id: string; result_limit?: number }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_trust_score: number
          body: string
          category: string
          community_id: string
          community_name: string
          created_at: string
          exchange_modes: Database["public"]["Enums"]["exchange_mode"][]
          id: string
          images: string[]
          loan_duration: string
          match_reason: string
          response_count: number
          status: string
          time_dollar_amount: number
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }[]
      }
      search_posts: {
        Args: {
          cursor_created_at?: string
          filter_category?: string
          filter_type?: string
          result_limit?: number
          search_query: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_trust_score: number
          body: string
          category: string
          community_id: string
          community_name: string
          created_at: string
          exchange_modes: Database["public"]["Enums"]["exchange_mode"][]
          id: string
          images: string[]
          loan_duration: string
          response_count: number
          status: string
          time_dollar_amount: number
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }[]
      }
      get_posts_in_bounds: {
        Args: {
          min_lat: number
          min_lng: number
          max_lat: number
          max_lng: number
          filter_category?: string
          filter_type?: string
          search_query?: string
          result_limit?: number
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_id: string
          author_trust_score: number
          body: string
          category: string
          community_id: string
          community_name: string
          created_at: string
          exchange_modes: Database["public"]["Enums"]["exchange_mode"][]
          id: string
          images: string[]
          latitude: number
          loan_duration: string
          location_name: string
          longitude: number
          response_count: number
          status: string
          time_dollar_amount: number
          title: string
          type: Database["public"]["Enums"]["post_type"]
          updated_at: string
        }[]
      }
      get_potlucks_in_bounds: {
        Args: {
          min_lat: number
          min_lng: number
          max_lat: number
          max_lng: number
          result_limit?: number
        }
        Returns: {
          id: string
          title: string
          event_date: string
          end_time: string
          latitude: number
          longitude: number
          location_name: string
          capacity: number
          rsvp_count: number
          status: string
          host_display_name: string
          host_avatar_url: string
          community_name: string
          community_id: string
        }[]
      }
      is_user_banned: {
        Args: {
          p_community_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      get_flag_queue: {
        Args: {
          p_community_id: string
        }
        Returns: {
          id: string
          content_type: string
          content_id: string
          content_author_id: string
          reason: Database["public"]["Enums"]["flag_reason"]
          description: string | null
          status: Database["public"]["Enums"]["flag_status"]
          created_at: string
          reporter_display_name: string
          reporter_avatar_url: string | null
          author_display_name: string
          author_avatar_url: string | null
          content_preview: string | null
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      community_type: "geographic" | "affinity"
      exchange_mode: "gift" | "loan" | "time_dollar" | "barter" | "flexible"
      exchange_status:
        | "proposed"
        | "accepted"
        | "in_progress"
        | "completed"
        | "disputed"
        | "cancelled"
      flag_reason: "spam" | "harassment" | "misinformation" | "inappropriate" | "other"
      flag_status: "pending" | "dismissed" | "actioned"
      mod_action_type:
        | "flag_dismissed"
        | "content_removed"
        | "user_warned"
        | "user_suspended"
        | "user_unsuspended"
        | "thread_pinned"
        | "thread_unpinned"
        | "role_changed"
        | "dispute_resolved"
      notification_type:
        | "new_message"
        | "exchange_proposed"
        | "exchange_accepted"
        | "exchange_completed"
        | "review_received"
        | "post_response"
        | "discussion_reply"
        | "community_announcement"
        | "potluck_created"
        | "potluck_rsvp"
        | "potluck_reminder"
        | "potluck_cancelled"
        | "potluck_updated"
        | "content_flagged"
        | "content_removed"
        | "user_warned"
        | "user_suspended"
        | "loan_return_reminder"
        | "loan_overdue"
        | "dispute_filed"
        | "dispute_resolved"
        | "trust_milestone"
        | "review_reminder"
        | "posting_suspended"
      post_status: "active" | "fulfilled" | "expired" | "closed"
      potluck_status: "upcoming" | "in_progress" | "completed" | "cancelled"
      post_type: "offer" | "request"
      reference_relationship: "exchanged" | "messaged" | "community_member" | "other"
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
      community_type: ["geographic", "affinity"],
      exchange_mode: ["gift", "loan", "time_dollar", "barter", "flexible"],
      exchange_status: [
        "proposed",
        "accepted",
        "in_progress",
        "completed",
        "disputed",
        "cancelled",
      ],
      flag_reason: ["spam", "harassment", "misinformation", "inappropriate", "other"],
      flag_status: ["pending", "dismissed", "actioned"],
      mod_action_type: [
        "flag_dismissed",
        "content_removed",
        "user_warned",
        "user_suspended",
        "user_unsuspended",
        "thread_pinned",
        "thread_unpinned",
        "role_changed",
        "dispute_resolved",
      ],
      notification_type: [
        "new_message",
        "exchange_proposed",
        "exchange_accepted",
        "exchange_completed",
        "review_received",
        "post_response",
        "discussion_reply",
        "community_announcement",
        "potluck_created",
        "potluck_rsvp",
        "potluck_reminder",
        "potluck_cancelled",
        "potluck_updated",
        "content_flagged",
        "content_removed",
        "user_warned",
        "user_suspended",
        "loan_return_reminder",
        "loan_overdue",
        "dispute_filed",
        "dispute_resolved",
        "trust_milestone",
        "review_reminder",
        "posting_suspended",
      ],
      post_status: ["active", "fulfilled", "expired", "closed"],
      post_type: ["offer", "request"],
      potluck_status: ["upcoming", "in_progress", "completed", "cancelled"],
    },
  },
} as const

// ============================================================
// Custom type aliases
// ============================================================
export type Profile = Tables<"profiles">;
export type Post = Tables<"posts">;
export type ExchangeAgreement = Tables<"exchange_agreements">;
export type Review = Tables<"reviews">;
export type Reference = Tables<"references">;
export type Notification = Tables<"notifications">;

export type PostWithAuthor = Tables<"posts"> & {
  author: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
  community: Pick<Tables<"communities">, "id" | "name"> | null;
};

export type ReviewWithAuthor = Tables<"reviews"> & {
  author: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
};

export type ReferenceWithAuthor = Tables<"references"> & {
  author: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type Message = Tables<"messages">;
export type ExchangeMode = Database["public"]["Enums"]["exchange_mode"];
export type PostType = Database["public"]["Enums"]["post_type"];

export type TimeDollarLedgerEntry = Tables<"time_dollar_ledger">;
export type LedgerEntryWithExchange = TimeDollarLedgerEntry & {
  exchange: Pick<ExchangeAgreement, "id" | "terms" | "exchange_mode"> | null;
};

export type Invite = Tables<"invites">;
export type InviteWithInvitee = Invite & {
  invitee: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export type MapPost = {
  id: string;
  author_id: string;
  type: PostType;
  exchange_modes: ExchangeMode[];
  category: string;
  title: string;
  body: string | null;
  images: string[] | null;
  status: string;
  response_count: number | null;
  loan_duration: string | null;
  time_dollar_amount: number | null;
  community_id: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  created_at: string;
  updated_at: string | null;
  author_display_name: string;
  author_avatar_url: string | null;
  author_trust_score: number | null;
  community_name: string | null;
};

export type Potluck = Tables<"potlucks">;
export type PotluckDishSlot = Tables<"potluck_dish_slots">;
export type PotluckRsvp = Tables<"potluck_rsvps">;
export type PotluckComment = Tables<"potluck_comments">;
export type PotluckStatus = Database["public"]["Enums"]["potluck_status"];

export type PotluckWithHost = Potluck & {
  host: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
  community: Pick<Tables<"communities">, "id" | "name">;
};

export type PotluckDishSlotWithClaimer = PotluckDishSlot & {
  claimer: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export type PotluckRsvpWithProfile = PotluckRsvp & {
  profile: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
};

export type PotluckCommentWithAuthor = PotluckComment & {
  author: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
};

export type MapPotluck = {
  id: string;
  title: string;
  event_date: string;
  end_time: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  capacity: number | null;
  rsvp_count: number;
  status: string;
  host_display_name: string;
  host_avatar_url: string | null;
  community_name: string;
  community_id: string;
};

export type NearbyPost = {
  id: string;
  author_id: string;
  type: PostType;
  exchange_modes: ExchangeMode[];
  category: string;
  title: string;
  body: string | null;
  images: string[] | null;
  status: string;
  response_count: number | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  created_at: string;
  author_display_name: string;
  author_avatar_url: string | null;
  author_trust_score: number | null;
  distance_miles: number;
};

// Moderation types
export type FlagReason = Database["public"]["Enums"]["flag_reason"];
export type FlagStatus = Database["public"]["Enums"]["flag_status"];
export type ModActionType = Database["public"]["Enums"]["mod_action_type"];

export type ContentFlag = Tables<"content_flags">;
export type ModAction = Tables<"mod_actions">;
export type CommunityBan = Tables<"community_bans">;
export type UserWarning = Tables<"user_warnings">;
export type SkillEndorsement = Tables<"skill_endorsements">;
export type CommunityVouch = Tables<"community_vouches">;

export type CommunityVouchWithVoucher = CommunityVouch & {
  voucher: Pick<Profile, "id" | "display_name" | "avatar_url" | "trust_score">;
};

export type ContentFlagWithDetails = ContentFlag & {
  reporter: Pick<Profile, "id" | "display_name" | "avatar_url">;
  content_author: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type ModActionWithDetails = ModAction & {
  moderator: Pick<Profile, "id" | "display_name" | "avatar_url">;
  target_user: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export type CommunityBanWithDetails = CommunityBan & {
  user: Pick<Profile, "id" | "display_name" | "avatar_url">;
  banner: Pick<Profile, "id" | "display_name" | "avatar_url">;
};

export type FlagQueueItem = {
  id: string;
  content_type: string;
  content_id: string;
  content_author_id: string;
  reason: FlagReason;
  description: string | null;
  status: FlagStatus;
  created_at: string;
  reporter_display_name: string;
  reporter_avatar_url: string | null;
  author_display_name: string;
  author_avatar_url: string | null;
  content_preview: string | null;
};
