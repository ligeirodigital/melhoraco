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
  melhoraco: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_assistant_service_state: {
        Row: {
          block_type: string
          safe_message: string
          service: string
          status_code: number
          updated_at: string
        }
        Insert: {
          block_type: string
          safe_message: string
          service: string
          status_code: number
          updated_at?: string
        }
        Update: {
          block_type?: string
          safe_message?: string
          service?: string
          status_code?: number
          updated_at?: string
        }
        Relationships: []
      }
      allowed_emails: {
        Row: {
          commission_rate: number | null
          created_at: string
          email: string
          name: string | null
          signature_url: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          email: string
          name?: string | null
          signature_url?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          email?: string
          name?: string | null
          signature_url?: string | null
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          created_at: string | null
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          created_at: string
          document_settings: Json
          id: string
          infinitypay_handle: string | null
          infinitypay_sandbox: boolean
          logo_url: string | null
          manual_balance: number | null
          monthly_expenses: number
          nubank_pix_key: string | null
          nubank_pix_name: string | null
          profits_distribution: number | null
          signature_url: string | null
          tax_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_settings?: Json
          id?: string
          infinitypay_handle?: string | null
          infinitypay_sandbox?: boolean
          logo_url?: string | null
          manual_balance?: number | null
          monthly_expenses?: number
          nubank_pix_key?: string | null
          nubank_pix_name?: string | null
          profits_distribution?: number | null
          signature_url?: string | null
          tax_rate?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_settings?: Json
          id?: string
          infinitypay_handle?: string | null
          infinitypay_sandbox?: boolean
          logo_url?: string | null
          manual_balance?: number | null
          monthly_expenses?: number
          nubank_pix_key?: string | null
          nubank_pix_name?: string | null
          profits_distribution?: number | null
          signature_url?: string | null
          tax_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_flow_transactions: {
        Row: {
          amount: number
          category: string
          category_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          installment_number: number | null
          paid_at: string | null
          payment_method: string | null
          quote_id: string | null
          status: string | null
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          category_id?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          installment_number?: number | null
          paid_at?: string | null
          payment_method?: string | null
          quote_id?: string | null
          status?: string | null
          total_installments?: number | null
          transaction_date?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          category_id?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          installment_number?: number | null
          paid_at?: string | null
          payment_method?: string | null
          quote_id?: string | null
          status?: string | null
          total_installments?: number | null
          transaction_date?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_flow_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "financial_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_flow_transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      client_feedbacks: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          project_photo_url: string | null
          quote_id: string | null
          rating: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          project_photo_url?: string | null
          quote_id?: string | null
          rating?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          project_photo_url?: string | null
          quote_id?: string | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_feedbacks_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          address_complement: string | null
          address_number: string | null
          cep: string | null
          cnpj_cpf: string | null
          created_at: string
          id: string
          last_purchase_at: string | null
          name: string
          notes: string | null
          phone: string | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          cep?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          id?: string
          last_purchase_at?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          address_complement?: string | null
          address_number?: string | null
          cep?: string | null
          cnpj_cpf?: string | null
          created_at?: string
          id?: string
          last_purchase_at?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          contract_number: string
          created_at: string
          id: string
          pdf_url: string | null
          quote_id: string
          service_order_data: Json | null
          signature_url: string | null
          signed_at: string | null
          status: string
          terms_snapshot: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contract_number: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          quote_id: string
          service_order_data?: Json | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          terms_snapshot?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contract_number?: string
          created_at?: string
          id?: string
          pdf_url?: string | null
          quote_id?: string
          service_order_data?: Json | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          terms_snapshot?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          is_fixed: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          is_fixed?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          is_fixed?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_categories: {
        Row: {
          created_at: string
          dre_group: string | null
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dre_group?: string | null
          id?: string
          name: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dre_group?: string | null
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      installation_schedule: {
        Row: {
          address: string | null
          client_notified_at: string | null
          created_at: string
          duration_hours: number | null
          id: string
          installer_name: string | null
          installer_phone: string | null
          notes: string | null
          quote_id: string
          scheduled_date: string
          scheduled_time: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          client_notified_at?: string | null
          created_at?: string
          duration_hours?: number | null
          id?: string
          installer_name?: string | null
          installer_phone?: string | null
          notes?: string | null
          quote_id: string
          scheduled_date: string
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          client_notified_at?: string | null
          created_at?: string
          duration_hours?: number | null
          id?: string
          installer_name?: string | null
          installer_phone?: string | null
          notes?: string | null
          quote_id?: string
          scheduled_date?: string
          scheduled_time?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_schedule_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          client_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          type: string
        }
        Insert: {
          client_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          type?: string
        }
        Update: {
          client_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_insights"
            referencedColumns: ["client_id"]
          },
        ]
      }
      inventory: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          min_quantity: number
          name: string
          quantity: number
          unit: string
          unit_cost: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          min_quantity?: number
          name: string
          quantity?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          min_quantity?: number
          name?: string
          quantity?: number
          unit?: string
          unit_cost?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          inventory_id: string | null
          product_id: string | null
          quantity: number
          reason: string | null
          type: string
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          product_id?: string | null
          quantity: number
          reason?: string | null
          type: string
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          inventory_id?: string | null
          product_id?: string | null
          quantity?: number
          reason?: string | null
          type?: string
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      investor_transactions: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string | null
          id: string
          investor_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          investor_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          investor_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_transactions_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      investors: {
        Row: {
          created_at: string
          id: string
          name: string
          share_percentage: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          share_percentage: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          share_percentage?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      landing_pages: {
        Row: {
          created_at: string
          features: Json | null
          google_tag_id: string | null
          headline: string
          hero_image_url: string | null
          id: string
          is_active: boolean | null
          meta_pixel_id: string | null
          original_price: number | null
          page_type: string | null
          price: number
          slug: string
          subheadline: string | null
          testimonials: Json | null
          title: string
          updated_at: string
          user_id: string | null
          whatsapp_number: string
        }
        Insert: {
          created_at?: string
          features?: Json | null
          google_tag_id?: string | null
          headline: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          meta_pixel_id?: string | null
          original_price?: number | null
          page_type?: string | null
          price: number
          slug: string
          subheadline?: string | null
          testimonials?: Json | null
          title: string
          updated_at?: string
          user_id?: string | null
          whatsapp_number: string
        }
        Update: {
          created_at?: string
          features?: Json | null
          google_tag_id?: string | null
          headline?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean | null
          meta_pixel_id?: string | null
          original_price?: number | null
          page_type?: string | null
          price?: number
          slug?: string
          subheadline?: string | null
          testimonials?: Json | null
          title?: string
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event: string
          id: string
          payload: Json | null
          quote_id: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          payload?: Json | null
          quote_id?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          payload?: Json | null
          quote_id?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          capture_method: string | null
          checked_at: string | null
          checkout_url: string | null
          confirmed_source: string | null
          created_at: string
          external_id: string | null
          id: string
          invoice_slug: string | null
          metadata: Json | null
          order_nsu: string | null
          paid_amount: number | null
          payment_link: string | null
          provider: string
          qr_code: string | null
          qr_code_base64: string | null
          quote_id: string
          status: string
          transaction_nsu: string | null
          updated_at: string
          user_id: string
          webhook_received_at: string | null
        }
        Insert: {
          amount: number
          capture_method?: string | null
          checked_at?: string | null
          checkout_url?: string | null
          confirmed_source?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          invoice_slug?: string | null
          metadata?: Json | null
          order_nsu?: string | null
          paid_amount?: number | null
          payment_link?: string | null
          provider: string
          qr_code?: string | null
          qr_code_base64?: string | null
          quote_id: string
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
          user_id: string
          webhook_received_at?: string | null
        }
        Update: {
          amount?: number
          capture_method?: string | null
          checked_at?: string | null
          checkout_url?: string | null
          confirmed_source?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          invoice_slug?: string | null
          metadata?: Json | null
          order_nsu?: string | null
          paid_amount?: number | null
          payment_link?: string | null
          provider?: string
          qr_code?: string | null
          qr_code_base64?: string | null
          quote_id?: string
          status?: string
          transaction_nsu?: string | null
          updated_at?: string
          user_id?: string
          webhook_received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          color: string
          created_at?: string | null
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      product_landing_pages: {
        Row: {
          created_at: string
          delivery_info: string | null
          description: string | null
          faq: Json | null
          features: Json | null
          google_tag_id: string | null
          id: string
          is_published: boolean | null
          meta_pixel_id: string | null
          name: string
          original_price: number | null
          price: number
          slug: string
          steps: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delivery_info?: string | null
          description?: string | null
          faq?: Json | null
          features?: Json | null
          google_tag_id?: string | null
          id?: string
          is_published?: boolean | null
          meta_pixel_id?: string | null
          name: string
          original_price?: number | null
          price: number
          slug: string
          steps?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delivery_info?: string | null
          description?: string | null
          faq?: Json | null
          features?: Json | null
          google_tag_id?: string | null
          id?: string
          is_published?: boolean | null
          meta_pixel_id?: string | null
          name?: string
          original_price?: number | null
          price?: number
          slug?: string
          steps?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          min_stock_level: number | null
          name: string
          price_adjustment: number | null
          product_id: string
          sku: string | null
          stock_quantity: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_stock_level?: number | null
          name: string
          price_adjustment?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_stock_level?: number | null
          name?: string
          price_adjustment?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          compare_at_price: number | null
          cost: number
          created_at: string
          description: string
          editable: boolean
          hidden: boolean | null
          id: string
          image_url: string | null
          is_digital: boolean | null
          lead_time_days: number | null
          made_to_order: boolean
          min_stock_level: number | null
          name: string
          price: number
          sku: string | null
          sort_order: number
          stock_quantity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          compare_at_price?: number | null
          cost?: number
          created_at?: string
          description?: string
          editable?: boolean
          hidden?: boolean | null
          id?: string
          image_url?: string | null
          is_digital?: boolean | null
          lead_time_days?: number | null
          made_to_order?: boolean
          min_stock_level?: number | null
          name: string
          price?: number
          sku?: string | null
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          compare_at_price?: number | null
          cost?: number
          created_at?: string
          description?: string
          editable?: boolean
          hidden?: boolean | null
          id?: string
          image_url?: string | null
          is_digital?: boolean | null
          lead_time_days?: number | null
          made_to_order?: boolean
          min_stock_level?: number | null
          name?: string
          price?: number
          sku?: string | null
          sort_order?: number
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          commission_rate: number | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          signature_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profit_withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          notes: string | null
          partner_name: string
          updated_at: string
          user_id: string
          withdrawal_date: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          partner_name: string
          updated_at?: string
          user_id: string
          withdrawal_date?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          partner_name?: string
          updated_at?: string
          user_id?: string
          withdrawal_date?: string
        }
        Relationships: []
      }
      quiz_leads: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string
          desired_number: string | null
          event_id: string | null
          fbclid: string | null
          first_name: string | null
          gclid: string | null
          id: string
          landing_page_id: string | null
          last_name: string | null
          neighborhood: string | null
          number: string | null
          page_path: string | null
          product_landing_page_id: string | null
          quantity: number | null
          referrer: string | null
          street: string | null
          total_value: number | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          desired_number?: string | null
          event_id?: string | null
          fbclid?: string | null
          first_name?: string | null
          gclid?: string | null
          id?: string
          landing_page_id?: string | null
          last_name?: string | null
          neighborhood?: string | null
          number?: string | null
          page_path?: string | null
          product_landing_page_id?: string | null
          quantity?: number | null
          referrer?: string | null
          street?: string | null
          total_value?: number | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          desired_number?: string | null
          event_id?: string | null
          fbclid?: string | null
          first_name?: string | null
          gclid?: string | null
          id?: string
          landing_page_id?: string | null
          last_name?: string | null
          neighborhood?: string | null
          number?: string | null
          page_path?: string | null
          product_landing_page_id?: string | null
          quantity?: number | null
          referrer?: string | null
          street?: string | null
          total_value?: number | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_leads_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_leads_product_landing_page_id_fkey"
            columns: ["product_landing_page_id"]
            isOneToOne: false
            referencedRelation: "product_landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          created_at: string
          fixed_cost: number | null
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          quote_id: string
          unit_discount: number | null
          unit_discount_type: string | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          fixed_cost?: number | null
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          quote_id: string
          unit_discount?: number | null
          unit_discount_type?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          fixed_cost?: number | null
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          quote_id?: string
          unit_discount?: number | null
          unit_discount_type?: string | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved_at: string | null
          client_id: string
          client_view_token: string | null
          confirmed_source: string | null
          created_at: string
          customer_signature_url: string | null
          deadline: string
          delivery_address: string
          delivery_confirmed_at: string | null
          delivery_fee: number
          delivery_required: boolean | null
          delivery_type: string | null
          delivery_value: number | null
          discount_amount: number | null
          discount_type: string | null
          down_payment: number | null
          down_payment_paid_at: string | null
          employee_name: string | null
          employee_signature_data: string | null
          expected_buy_date: string | null
          fbclid: string | null
          final_payment_paid_at: string | null
          gclid: string | null
          id: string
          installation_fee: number
          installation_photo_url: string | null
          installation_required: boolean | null
          installation_value: number | null
          is_lead: boolean | null
          last_follow_up: string | null
          lead_origin: string | null
          lost_reason: string | null
          next_follow_up_at: string | null
          notes: string | null
          order_nsu: string | null
          order_token: string | null
          payment_amount: number | null
          payment_checked_at: string | null
          payment_date: string | null
          payment_installments: number | null
          payment_invoice_slug: string | null
          payment_method: string | null
          payment_method_type: string | null
          payment_receipt_url: string | null
          payment_status: string | null
          payment_transaction_nsu: string | null
          pipeline_stage_id: string | null
          production_notes: string | null
          referral_code: string | null
          referrer: string | null
          remaining_balance: number | null
          shipping_label_data: Json | null
          signature_data: string | null
          signed_at: string | null
          source: string
          stage: string | null
          status: string
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          approved_at?: string | null
          client_id: string
          client_view_token?: string | null
          confirmed_source?: string | null
          created_at?: string
          customer_signature_url?: string | null
          deadline?: string
          delivery_address?: string
          delivery_confirmed_at?: string | null
          delivery_fee?: number
          delivery_required?: boolean | null
          delivery_type?: string | null
          delivery_value?: number | null
          discount_amount?: number | null
          discount_type?: string | null
          down_payment?: number | null
          down_payment_paid_at?: string | null
          employee_name?: string | null
          employee_signature_data?: string | null
          expected_buy_date?: string | null
          fbclid?: string | null
          final_payment_paid_at?: string | null
          gclid?: string | null
          id?: string
          installation_fee?: number
          installation_photo_url?: string | null
          installation_required?: boolean | null
          installation_value?: number | null
          is_lead?: boolean | null
          last_follow_up?: string | null
          lead_origin?: string | null
          lost_reason?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          order_nsu?: string | null
          order_token?: string | null
          payment_amount?: number | null
          payment_checked_at?: string | null
          payment_date?: string | null
          payment_installments?: number | null
          payment_invoice_slug?: string | null
          payment_method?: string | null
          payment_method_type?: string | null
          payment_receipt_url?: string | null
          payment_status?: string | null
          payment_transaction_nsu?: string | null
          pipeline_stage_id?: string | null
          production_notes?: string | null
          referral_code?: string | null
          referrer?: string | null
          remaining_balance?: number | null
          shipping_label_data?: Json | null
          signature_data?: string | null
          signed_at?: string | null
          source?: string
          stage?: string | null
          status?: string
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          approved_at?: string | null
          client_id?: string
          client_view_token?: string | null
          confirmed_source?: string | null
          created_at?: string
          customer_signature_url?: string | null
          deadline?: string
          delivery_address?: string
          delivery_confirmed_at?: string | null
          delivery_fee?: number
          delivery_required?: boolean | null
          delivery_type?: string | null
          delivery_value?: number | null
          discount_amount?: number | null
          discount_type?: string | null
          down_payment?: number | null
          down_payment_paid_at?: string | null
          employee_name?: string | null
          employee_signature_data?: string | null
          expected_buy_date?: string | null
          fbclid?: string | null
          final_payment_paid_at?: string | null
          gclid?: string | null
          id?: string
          installation_fee?: number
          installation_photo_url?: string | null
          installation_required?: boolean | null
          installation_value?: number | null
          is_lead?: boolean | null
          last_follow_up?: string | null
          lead_origin?: string | null
          lost_reason?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          order_nsu?: string | null
          order_token?: string | null
          payment_amount?: number | null
          payment_checked_at?: string | null
          payment_date?: string | null
          payment_installments?: number | null
          payment_invoice_slug?: string | null
          payment_method?: string | null
          payment_method_type?: string | null
          payment_receipt_url?: string | null
          payment_status?: string | null
          payment_transaction_nsu?: string | null
          pipeline_stage_id?: string | null
          production_notes?: string | null
          referral_code?: string | null
          referrer?: string | null
          remaining_balance?: number | null
          shipping_label_data?: Json | null
          signature_data?: string | null
          signed_at?: string | null
          source?: string
          stage?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_insights"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "quotes_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          discount_pct: number
          expires_at: string | null
          id: string
          referral_code: string
          referred_client_id: string | null
          referrer_client_id: string | null
          reward_amount: number
          status: string
          updated_at: string
          used_at: string | null
          used_quote_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          discount_pct?: number
          expires_at?: string | null
          id?: string
          referral_code: string
          referred_client_id?: string | null
          referrer_client_id?: string | null
          reward_amount?: number
          status?: string
          updated_at?: string
          used_at?: string | null
          used_quote_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          discount_pct?: number
          expires_at?: string | null
          id?: string
          referral_code?: string
          referred_client_id?: string | null
          referrer_client_id?: string | null
          reward_amount?: number
          status?: string
          updated_at?: string
          used_at?: string | null
          used_quote_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_client_id_fkey"
            columns: ["referred_client_id"]
            isOneToOne: false
            referencedRelation: "v_client_insights"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "v_client_insights"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "referrals_used_quote_id_fkey"
            columns: ["used_quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_targets: {
        Row: {
          created_at: string
          id: string
          month: number
          target_amount: number
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          target_amount?: number
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          target_amount?: number
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["melhoraco"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["melhoraco"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["melhoraco"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          payload: Json | null
          provider: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          provider: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          payload?: Json | null
          provider?: string
          status?: string | null
        }
        Relationships: []
      }
      whatsapp_clicks: {
        Row: {
          created_at: string
          event_id: string | null
          fbclid: string | null
          gclid: string | null
          id: string
          landing_page_id: string | null
          page_path: string | null
          product_landing_page_id: string | null
          referrer: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_page_id?: string | null
          page_path?: string | null
          product_landing_page_id?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string | null
          fbclid?: string | null
          gclid?: string | null
          id?: string
          landing_page_id?: string | null
          page_path?: string | null
          product_landing_page_id?: string | null
          referrer?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_clicks_landing_page_id_fkey"
            columns: ["landing_page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_clicks_product_landing_page_id_fkey"
            columns: ["product_landing_page_id"]
            isOneToOne: false
            referencedRelation: "product_landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_client_insights: {
        Row: {
          approved_quotes: number | null
          average_ticket: number | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          last_order_date: string | null
          total_quotes: number | null
          total_revenue: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      approve_public_quote: {
        Args: {
          p_quote_id: string
          p_receipt_url?: string
          p_signature_url?: string
          p_token: string
        }
        Returns: boolean
      }
      consume_referral_code: {
        Args: { p_code: string; p_quote_id: string; p_token: string }
        Returns: Json
      }
      create_public_order: { Args: { payload: Json }; Returns: Json }
      get_default_pipeline_stage: { Args: never; Returns: string }
      get_dre_metrics: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: Json
      }
      get_public_client_orders: { Args: { p_phone: string }; Returns: Json }
      get_public_quote: { Args: { p_slug: string }; Returns: Json }
      get_public_quote_by_id: {
        Args: { p_quote_id: string; p_token: string }
        Returns: Json
      }
      get_public_store_product: { Args: { p_id: string }; Returns: Json }
      get_public_store_products: { Args: never; Returns: Json }
      get_upsell_suggestions: {
        Args: { p_quote_id: string; p_token: string }
        Returns: Json
      }
      get_withdrawal_total: {
        Args: { p_end_date: string; p_start_date: string; p_user_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["melhoraco"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_product_stock: {
        Args: { p_amount: number; p_product_id: string }
        Returns: undefined
      }
      increment_variant_stock: {
        Args: { p_amount: number; p_variant_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_allowed_user: { Args: { p_email: string }; Returns: boolean }
      log_activity:
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_entity_id?: string
              p_entity_type: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_entity_id?: string
              p_entity_type: string
            }
            Returns: undefined
          }
      mark_follow_up: { Args: { p_quote_id: string }; Returns: undefined }
      provision_quote_receivables: {
        Args: { p_base_date?: string; p_quote_id: string }
        Returns: {
          amount: number
          category: string
          category_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          installment_number: number | null
          paid_at: string | null
          payment_method: string | null
          quote_id: string | null
          status: string | null
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cash_flow_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_quote_whatsapp_contact: {
        Args: { p_content: string; p_quote_id: string; p_type: string }
        Returns: undefined
      }
      save_public_feedback: {
        Args: {
          p_comment?: string
          p_project_photo_url?: string
          p_quote_id: string
          p_rating: number
          p_token: string
        }
        Returns: boolean
      }
      seed_default_products: { Args: { p_user_id: string }; Returns: undefined }
      set_quote_receivable_status: {
        Args: { p_paid_at?: string; p_receivable_id: string; p_status: string }
        Returns: {
          amount: number
          category: string
          category_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          installment_number: number | null
          paid_at: string | null
          payment_method: string | null
          quote_id: string | null
          status: string | null
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "cash_flow_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      sync_quote_receivables_internal: {
        Args: { p_base_date?: string; p_quote_id: string }
        Returns: {
          amount: number
          category: string
          category_id: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          installment_number: number | null
          paid_at: string | null
          payment_method: string | null
          quote_id: string | null
          status: string | null
          total_installments: number | null
          transaction_date: string
          type: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "cash_flow_transactions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_public_quote_items: {
        Args: { p_items: Json; p_quote_id: string; p_token: string }
        Returns: Json
      }
      validate_referral_code: { Args: { p_code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "staff" | "client"
      page_type: "landing" | "linkbio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "melhoraco">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  melhoraco: {
    Enums: {
      app_role: ["admin", "staff", "client"],
      page_type: ["landing", "linkbio"],
    },
  },
} as const
