export type UserRole = 'super_admin' | 'admin' | 'student'

export interface Profile {
  id: string
  student_id: string
  name: string
  phone?: string
  role: UserRole
  class_id: string | null
  created_at: string
}

export interface Class {
  id: string
  name: string
  contribution_target: number
  created_at: string
}

export interface ClassAdmin {
  id: string
  class_id: string
  admin_id: string
}

export interface Contribution {
  id: string
  student_id: string
  class_id: string
  amount: number
  date: string
  recorded_by: string
  created_at: string
  deleted_at: string | null
}

export interface Expense {
  id: string
  class_id: string
  description: string
  amount: number
  date: string
  added_by: string
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  action: string
  timestamp: string
}

export interface ClassComment {
  id: string
  class_id: string
  user_id: string
  content: string
  created_at: string
  author_name?: string
  author_role?: UserRole
  author_student_id?: string
  class_name?: string
}

export interface AdminMessage {
  id: string
  sender_id: string
  content: string
  category: 'general' | 'announcement' | 'urgent' | 'query'
  created_at: string
  sender_name?: string
  sender_role?: UserRole
  sender_phone?: string
}

export interface FeatureItem {
  title: string
  desc: string
  icon: string
}

export interface StatItem {
  value: string
  label: string
}

export interface LandingPageSettings {
  id: string
  hero_badge: string
  hero_title: string
  hero_subtitle: string
  hero_bg_image: string
  hero_bg_overlay_opacity: number
  cta_primary_text: string
  cta_primary_link: string
  cta_secondary_text: string
  cta_secondary_link: string
  show_announcement: boolean
  announcement_text: string
  announcement_link: string
  features_data: FeatureItem[]
  stats_data: StatItem[]
  updated_at?: string
  updated_by?: string
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Json; Update: Json }
      classes: { Row: Class; Insert: Json; Update: Json }
      class_admins: { Row: ClassAdmin; Insert: Json; Update: Json }
      contributions: { Row: Contribution; Insert: Json; Update: Json }
      expenses: { Row: Expense; Insert: Json; Update: Json }
      activity_logs: { Row: ActivityLog; Insert: Json; Update: Json }
      landing_page_settings: { Row: LandingPageSettings; Insert: Json; Update: Json }
    }
  }
}
