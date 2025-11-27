// Type exports - re-export from Supabase types for convenience
// This provides a single import point for all types

export type {
  // Database types
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  Json,
  
  // Entity types
  Company,
  CompanyInsert,
  Founder,
  FounderInsert,
  User,
  Comment,
  CommentInsert,
  FounderComment,
  FounderCommentInsert,
  Tag,
  CalendarEvent,
  EmailThread,
  DriveDocument,
  
  // Enum types
  Stage,
  CommentType,
  
  // Relation types
  CompanyWithRelations,
  CompanyWithRelationsExtended,
  FounderWithRelations,
  CustomField,
} from "../supabase/types"

// Legacy type aliases for backwards compatibility
export type { Company as CompanyBase } from "../supabase/types"
export type { Founder as FounderBase } from "../supabase/types"
