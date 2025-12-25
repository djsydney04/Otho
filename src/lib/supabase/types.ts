export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chat_conversations: {
        Row: {
          id: string
          user_id: string | null
          company_id: string | null
          founder_id: string | null
          title: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          company_id?: string | null
          founder_id?: string | null
          title?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          company_id?: string | null
          founder_id?: string | null
          title?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          role: string
          content: string
          proposed_action: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          role: string
          content: string
          proposed_action?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: string
          content?: string
          proposed_action?: Json | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          }
        ]
      }
      calendar_events: {
        Row: {
          attendees: Json | null
          company_id: string | null
          created_at: string
          description: string | null
          end_time: string
          founder_id: string | null
          google_event_id: string | null
          html_link: string | null
          id: string
          meet_link: string | null
          start_time: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          founder_id?: string | null
          google_event_id?: string | null
          html_link?: string | null
          id?: string
          meet_link?: string | null
          start_time: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attendees?: Json | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          founder_id?: string | null
          google_event_id?: string | null
          html_link?: string | null
          id?: string
          meet_link?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string | null
          comment_type: Database["public"]["Enums"]["comment_type"]
          company_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id?: string | null
          comment_type?: Database["public"]["Enums"]["comment_type"]
          company_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string | null
          comment_type?: Database["public"]["Enums"]["comment_type"]
          company_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          ai_analysis: string | null
          ai_analysis_updated_at: string | null
          created_at: string
          description: string | null
          followup_date: string | null
          founder_email: string | null
          founder_id: string | null
          founder_name: string | null
          id: string
          is_priority: boolean | null
          last_touch: string | null
          logo_url: string | null
          name: string
          needs_diligence: boolean | null
          needs_followup: boolean | null
          owner: string | null
          owner_id: string | null
          stage: Database["public"]["Enums"]["stage"]
          updated_at: string
          website: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_analysis_updated_at?: string | null
          created_at?: string
          description?: string | null
          followup_date?: string | null
          founder_email?: string | null
          founder_id?: string | null
          founder_name?: string | null
          id?: string
          is_priority?: boolean | null
          last_touch?: string | null
          logo_url?: string | null
          name: string
          needs_diligence?: boolean | null
          needs_followup?: boolean | null
          owner?: string | null
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["stage"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_analysis_updated_at?: string | null
          created_at?: string
          description?: string | null
          followup_date?: string | null
          founder_email?: string | null
          founder_id?: string | null
          founder_name?: string | null
          id?: string
          is_priority?: boolean | null
          last_touch?: string | null
          logo_url?: string | null
          name?: string
          needs_diligence?: boolean | null
          needs_followup?: boolean | null
          owner?: string | null
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["stage"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      company_custom_fields: {
        Row: {
          company_id: string
          created_at: string | null
          field_name: string
          field_type: string | null
          field_value: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          field_name: string
          field_type?: string | null
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          field_name?: string
          field_type?: string | null
          field_value?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_custom_fields_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_tags: {
        Row: {
          company_id: string
          tag_id: string
        }
        Insert: {
          company_id: string
          tag_id: string
        }
        Update: {
          company_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_tags_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_documents: {
        Row: {
          company_id: string | null
          created_at: string | null
          founder_id: string | null
          google_file_id: string
          icon_link: string | null
          id: string
          mime_type: string | null
          name: string
          size_bytes: number | null
          thumbnail_link: string | null
          updated_at: string | null
          user_id: string | null
          web_view_link: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          founder_id?: string | null
          google_file_id: string
          icon_link?: string | null
          id?: string
          mime_type?: string | null
          name: string
          size_bytes?: number | null
          thumbnail_link?: string | null
          updated_at?: string | null
          user_id?: string | null
          web_view_link?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          founder_id?: string | null
          google_file_id?: string
          icon_link?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          size_bytes?: number | null
          thumbnail_link?: string | null
          updated_at?: string | null
          user_id?: string | null
          web_view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_documents_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          company_id: string | null
          created_at: string
          email_date: string | null
          founder_id: string | null
          from_email: string | null
          from_name: string | null
          gmail_message_id: string | null
          gmail_thread_id: string | null
          id: string
          labels: Json | null
          snippet: string | null
          subject: string | null
          to_email: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email_date?: string | null
          founder_id?: string | null
          from_email?: string | null
          from_name?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          labels?: Json | null
          snippet?: string | null
          subject?: string | null
          to_email?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email_date?: string | null
          founder_id?: string | null
          from_email?: string | null
          from_name?: string | null
          gmail_message_id?: string | null
          gmail_thread_id?: string | null
          id?: string
          labels?: Json | null
          snippet?: string | null
          subject?: string | null
          to_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_comments: {
        Row: {
          author_id: string | null
          comment_type: Database["public"]["Enums"]["comment_type"]
          content: string
          created_at: string
          founder_id: string
          id: string
        }
        Insert: {
          author_id?: string | null
          comment_type?: Database["public"]["Enums"]["comment_type"]
          content: string
          created_at?: string
          founder_id: string
          id?: string
        }
        Update: {
          author_id?: string | null
          comment_type?: Database["public"]["Enums"]["comment_type"]
          content?: string
          created_at?: string
          founder_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "founder_comments_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_custom_fields: {
        Row: {
          created_at: string | null
          field_name: string
          field_type: string | null
          field_value: string | null
          founder_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          field_name: string
          field_type?: string | null
          field_value?: string | null
          founder_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          field_name?: string
          field_type?: string | null
          field_value?: string | null
          founder_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_custom_fields_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          additional_emails: string[] | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          domain_expertise: string[] | null
          education: string | null
          email: string
          followup_date: string | null
          id: string
          is_priority: boolean | null
          linkedin: string | null
          location: string | null
          name: string
          needs_followup: boolean | null
          notes: string | null
          previous_companies: string | null
          role_title: string | null
          source: string | null
          twitter: string | null
          updated_at: string
          warm_intro_path: string | null
        }
        Insert: {
          additional_emails?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domain_expertise?: string[] | null
          education?: string | null
          email: string
          followup_date?: string | null
          id?: string
          is_priority?: boolean | null
          linkedin?: string | null
          location?: string | null
          name: string
          needs_followup?: boolean | null
          notes?: string | null
          previous_companies?: string | null
          role_title?: string | null
          source?: string | null
          twitter?: string | null
          updated_at?: string
          warm_intro_path?: string | null
        }
        Update: {
          additional_emails?: string[] | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          domain_expertise?: string[] | null
          education?: string | null
          email?: string
          followup_date?: string | null
          id?: string
          is_priority?: boolean | null
          linkedin?: string | null
          location?: string | null
          name?: string
          needs_followup?: boolean | null
          notes?: string | null
          previous_companies?: string | null
          role_title?: string | null
          source?: string | null
          twitter?: string | null
          updated_at?: string
          warm_intro_path?: string | null
        }
        Relationships: []
      }
      notion_pages: {
        Row: {
          company_id: string | null
          cover_url: string | null
          created_at: string | null
          founder_id: string | null
          icon: string | null
          id: string
          last_edited_time: string | null
          notion_page_id: string
          parent_id: string | null
          parent_type: string | null
          properties: Json | null
          title: string
          updated_at: string | null
          url: string | null
          user_id: string | null
        }
        Insert: {
          company_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          founder_id?: string | null
          icon?: string | null
          id?: string
          last_edited_time?: string | null
          notion_page_id: string
          parent_id?: string | null
          parent_type?: string | null
          properties?: Json | null
          title: string
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Update: {
          company_id?: string | null
          cover_url?: string | null
          created_at?: string | null
          founder_id?: string | null
          icon?: string | null
          id?: string
          last_edited_time?: string | null
          notion_page_id?: string
          parent_id?: string | null
          parent_type?: string | null
          properties?: Json | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notion_pages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notion_pages_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notion_pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          label: string
        }
        Insert: {
          id?: string
          label: string
        }
        Update: {
          id?: string
          label?: string
        }
        Relationships: []
      }
      news_articles: {
        Row: {
          id: string
          external_id: string | null
          title: string
          url: string
          source_name: string | null
          source_url: string | null
          author: string | null
          description: string | null
          content: string | null
          image_url: string | null
          published_at: string | null
          category: string | null
          relevance_score: number | null
          company_id: string | null
          is_portfolio_relevant: boolean | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          external_id?: string | null
          title: string
          url: string
          source_name?: string | null
          source_url?: string | null
          author?: string | null
          description?: string | null
          content?: string | null
          image_url?: string | null
          published_at?: string | null
          category?: string | null
          relevance_score?: number | null
          company_id?: string | null
          is_portfolio_relevant?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          external_id?: string | null
          title?: string
          url?: string
          source_name?: string | null
          source_url?: string | null
          author?: string | null
          description?: string | null
          content?: string | null
          image_url?: string | null
          published_at?: string | null
          category?: string | null
          relevance_score?: number | null
          company_id?: string | null
          is_portfolio_relevant?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      news_categories: {
        Row: {
          id: string
          slug: string
          label: string
          description: string | null
          icon: string | null
          sort_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          label: string
          description?: string | null
          icon?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          label?: string
          description?: string | null
          icon?: string | null
          sort_order?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_interests: {
        Row: {
          id: string
          user_id: string | null
          category: string
          enabled: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          category: string
          enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          category?: string
          enabled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          google_access_token: string | null
          google_refresh_token: string | null
          google_token_expires_at: string | null
          id: string
          initials: string | null
          name: string
          notion_access_token: string | null
          notion_workspace_id: string | null
          notion_workspace_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          initials?: string | null
          name: string
          notion_access_token?: string | null
          notion_workspace_id?: string | null
          notion_workspace_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_token_expires_at?: string | null
          id?: string
          initials?: string | null
          name?: string
          notion_access_token?: string | null
          notion_workspace_id?: string | null
          notion_workspace_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      comment_type: "note" | "update" | "meeting" | "stage_change" | "email"
      stage: "Inbound" | "Qualified" | "Diligence" | "Committed" | "Passed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"]
export type TablesInsert<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"]
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T]

// Convenience types
export type Company = Tables<"companies">
export type CompanyInsert = TablesInsert<"companies">
export type Founder = Tables<"founders">
export type FounderInsert = TablesInsert<"founders">
export type User = Tables<"users">
export type Comment = Tables<"comments">
export type CommentInsert = TablesInsert<"comments">
export type FounderComment = Tables<"founder_comments">
export type FounderCommentInsert = TablesInsert<"founder_comments">
export type Tag = Tables<"tags">
export type CalendarEvent = Tables<"calendar_events">
export type EmailThread = Tables<"email_threads">
export type DriveDocument = Tables<"drive_documents">
export type NotionPage = Tables<"notion_pages">
export type NewsArticle = Tables<"news_articles">
export type NewsCategory = Tables<"news_categories">
export type UserInterest = Tables<"user_interests">
export type Stage = Enums<"stage">
export type CommentType = Enums<"comment_type">

// Company with relations (omit conflicting fields)
export interface CompanyWithRelations extends Omit<Company, 'owner'> {
  founder?: Founder | null
  owner?: User | null
  tags?: Tag[]
  comments?: Comment[]
  calendar_events?: CalendarEvent[]
  email_threads?: EmailThread[]
  drive_documents?: DriveDocument[]
  notion_pages?: NotionPage[]
}

// Custom field type
export interface CustomField {
  id: string
  field_name: string
  field_value: string | null
  field_type: 'text' | 'url' | 'email' | 'date' | 'number'
  created_at: string
  updated_at: string
}

// Founder with relations
export interface FounderWithRelations extends Founder {
  companies?: Company[]
  comments?: FounderComment[]
  calendar_events?: CalendarEvent[]
  email_threads?: EmailThread[]
  custom_fields?: CustomField[]
  drive_documents?: DriveDocument[]
  notion_pages?: NotionPage[]
}

// Company with custom fields
export interface CompanyWithRelationsExtended extends CompanyWithRelations {
  custom_fields?: CustomField[]
}
