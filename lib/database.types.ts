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
      administrative_units: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      employees: {
        Row: {
          administrative_unit_id: string
          cedula: string
          created_at: string | null
          email: string | null
          first_name: string
          hire_date: string
          id: string
          last_name: string
          phone: string | null
          position_id: string
          role_id: string
          salary: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          administrative_unit_id: string
          cedula: string
          created_at?: string | null
          email?: string | null
          first_name: string
          hire_date: string
          id?: string
          last_name: string
          phone?: string | null
          position_id: string
          role_id: string
          salary: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          administrative_unit_id?: string
          cedula?: string
          created_at?: string | null
          email?: string | null
          first_name?: string
          hire_date?: string
          id?: string
          last_name?: string
          phone?: string | null
          position_id?: string
          role_id?: string
          salary?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_administrative_unit_id_fkey"
            columns: ["administrative_unit_id"]
            isOneToOne: false
            referencedRelation: "administrative_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_costs: {
        Row: {
          afp_employer: number
          created_at: string | null
          employee_id: string
          employer_total_cost: number
          id: string
          isss_employer: number
          payroll_id: string
          payroll_period_month: number
          payroll_period_year: number
          salary_base: number
          updated_at: string | null
        }
        Insert: {
          afp_employer: number
          created_at?: string | null
          employee_id: string
          employer_total_cost: number
          id?: string
          isss_employer: number
          payroll_id: string
          payroll_period_month: number
          payroll_period_year: number
          salary_base: number
          updated_at?: string | null
        }
        Update: {
          afp_employer?: number
          created_at?: string | null
          employee_id?: string
          employer_total_cost?: number
          id?: string
          isss_employer?: number
          payroll_id?: string
          payroll_period_month?: number
          payroll_period_year?: number
          salary_base?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_costs_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_costs_payroll_id_fkey"
            columns: ["payroll_id"]
            isOneToOne: false
            referencedRelation: "payroll_records"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_parameters: {
        Row: {
          created_at: string | null
          description: string | null
          effective_date: string | null
          id: string
          parameter_name: string
          updated_at: string | null
          value: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          parameter_name: string
          updated_at?: string | null
          value?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          effective_date?: string | null
          id?: string
          parameter_name?: string
          updated_at?: string | null
          value?: number | null
        }
        Relationships: []
      }
      payroll_records: {
        Row: {
          afp: number | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          gross_salary: number
          id: string
          isapres: number | null
          net_salary: number
          notes: string | null
          other_deductions: number | null
          payroll_period_month: number
          payroll_period_year: number
          renta: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          afp?: number | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          gross_salary: number
          id?: string
          isapres?: number | null
          net_salary: number
          notes?: string | null
          other_deductions?: number | null
          payroll_period_month: number
          payroll_period_year: number
          renta?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          afp?: number | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          gross_salary?: number
          id?: string
          isapres?: number | null
          net_salary?: number
          notes?: string | null
          other_deductions?: number | null
          payroll_period_month?: number
          payroll_period_year?: number
          renta?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      positions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          salary_range_max: number | null
          salary_range_min: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          salary_range_max?: number | null
          salary_range_min?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          salary_range_max?: number | null
          salary_range_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_admin: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          is_admin?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_admin?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
