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
          created_at: string
          description: string | null
          founder_email: string | null
          founder_id: string | null
          founder_name: string | null
          id: string
          last_touch: string | null
          name: string
          owner: string | null
          owner_id: string | null
          stage: Database["public"]["Enums"]["stage"]
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          founder_email?: string | null
          founder_id?: string | null
          founder_name?: string | null
          id?: string
          last_touch?: string | null
          name: string
          owner?: string | null
          owner_id?: string | null
          stage?: Database["public"]["Enums"]["stage"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          founder_email?: string | null
          founder_id?: string | null
          founder_name?: string | null
          id?: string
          last_touch?: string | null
          name?: string
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
      founders: {
        Row: {
          additional_emails: string[] | null
          bio: string | null
          created_at: string
          domain_expertise: string[] | null
          education: string | null
          email: string
          id: string
          linkedin: string | null
          location: string | null
          name: string
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
          bio?: string | null
          created_at?: string
          domain_expertise?: string[] | null
          education?: string | null
          email: string
          id?: string
          linkedin?: string | null
          location?: string | null
          name: string
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
          bio?: string | null
          created_at?: string
          domain_expertise?: string[] | null
          education?: string | null
          email?: string
          id?: string
          linkedin?: string | null
          location?: string | null
          name?: string
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
}

// Founder with relations
export interface FounderWithRelations extends Founder {
  companies?: Company[]
  comments?: FounderComment[]
  calendar_events?: CalendarEvent[]
  email_threads?: EmailThread[]
}

