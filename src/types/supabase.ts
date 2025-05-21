export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          created_at?: string
        }
      }
      users: {
        Row: {
          id: string
          full_name: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          email?: string | null
          created_at?: string
        }
      }
      org_memberships: {
        Row: {
          org_id: string
          user_id: string
          role: 'owner' | 'admin' | 'member'
          joined_at: string
        }
        Insert: {
          org_id: string
          user_id: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
        Update: {
          org_id?: string
          user_id?: string
          role?: 'owner' | 'admin' | 'member'
          joined_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          org_id: string
          name: string
          client_name: string | null
          billable: boolean
          hourly_rate: number | null
          archived: boolean
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          client_name?: string | null
          billable?: boolean
          hourly_rate?: number | null
          archived?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          client_name?: string | null
          billable?: boolean
          hourly_rate?: number | null
          archived?: boolean
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          created_at?: string
        }
      }
      weekly_timesheets: {
        Row: {
          id: string
          user_id: string
          week_start_date: string
          status: 'draft' | 'submitted' | 'approved' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start_date: string
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start_date?: string
          status?: 'draft' | 'submitted' | 'approved' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      timesheet_entries: {
        Row: {
          id: string
          timesheet_id: string
          project_id: string | null
          task_id: string | null
          description: string | null
          monday_hours: number | null
          tuesday_hours: number | null
          wednesday_hours: number | null
          thursday_hours: number | null
          friday_hours: number | null
          saturday_hours: number | null
          sunday_hours: number | null
          monday_start_time: string
          monday_end_time: string
          tuesday_start_time: string
          tuesday_end_time: string
          wednesday_start_time: string
          wednesday_end_time: string
          thursday_start_time: string
          thursday_end_time: string
          friday_start_time: string
          friday_end_time: string
          saturday_start_time: string
          saturday_end_time: string
          sunday_start_time: string
          sunday_end_time: string
        }
        Insert: {
          id?: string
          timesheet_id: string
          project_id?: string | null
          task_id?: string | null
          description?: string | null
          monday_hours?: number | null
          tuesday_hours?: number | null
          wednesday_hours?: number | null
          thursday_hours?: number | null
          friday_hours?: number | null
          saturday_hours?: number | null
          sunday_hours?: number | null
          monday_start_time?: string
          monday_end_time?: string
          tuesday_start_time?: string
          tuesday_end_time?: string
          wednesday_start_time?: string
          wednesday_end_time?: string
          thursday_start_time?: string
          thursday_end_time?: string
          friday_start_time?: string
          friday_end_time?: string
          saturday_start_time?: string
          saturday_end_time?: string
          sunday_start_time?: string
          sunday_end_time?: string
        }
        Update: {
          id?: string
          timesheet_id?: string
          project_id?: string | null
          task_id?: string | null
          description?: string | null
          monday_hours?: number | null
          tuesday_hours?: number | null
          wednesday_hours?: number | null
          thursday_hours?: number | null
          friday_hours?: number | null
          saturday_hours?: number | null
          sunday_hours?: number | null
          monday_start_time?: string
          monday_end_time?: string
          tuesday_start_time?: string
          tuesday_end_time?: string
          wednesday_start_time?: string
          wednesday_end_time?: string
          thursday_start_time?: string
          thursday_end_time?: string
          friday_start_time?: string
          friday_end_time?: string
          saturday_start_time?: string
          saturday_end_time?: string
          sunday_start_time?: string
          sunday_end_time?: string
        }
      }
      tags: {
        Row: {
          id: string
          org_id: string
          name: string
          color: string | null
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          color?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          color?: string | null
        }
      }
      project_memberships: {
        Row: {
          project_id: string
          user_id: string
          role: 'member' | 'manager'
          added_at: string
        }
        Insert: {
          project_id: string
          user_id: string
          role?: 'member' | 'manager'
          added_at?: string
        }
        Update: {
          project_id?: string
          user_id?: string
          role?: 'member' | 'manager'
          added_at?: string
        }
      }
    }
    Views: {
      running_timers: {
        Row: {
          id: string
          user_id: string
          project_id: string | null
          task_id: string | null
          start_time: string
          end_time: null
          duration_sec: number
          description: string | null
          billable: boolean
          created_at: string
          status: 'draft' | 'submitted' | 'approved' | 'rejected'
        }
      }
    }
    Functions: {
      start_timer: {
        Args: {
          _project: string
          _task: string
          _desc: string
        }
        Returns: string
      }
      stop_timer: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}