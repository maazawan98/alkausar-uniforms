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
  public: {
    Tables: {
      accessories_categories: {
        Row: {
          created_at: string
          id: string
          image: string | null
          is_active: boolean
          name: string
          show_on_homepage: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          show_on_homepage?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          show_on_homepage?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      accessories_classes: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      accessories_product_classes: {
        Row: {
          accessory_class_id: string
          accessory_product_id: string
          created_at: string
          id: string
          product_size_id: string
        }
        Insert: {
          accessory_class_id: string
          accessory_product_id: string
          created_at?: string
          id?: string
          product_size_id: string
        }
        Update: {
          accessory_class_id?: string
          accessory_product_id?: string
          created_at?: string
          id?: string
          product_size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessories_product_classes_accessory_class_id_fkey"
            columns: ["accessory_class_id"]
            isOneToOne: false
            referencedRelation: "accessories_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessories_product_classes_accessory_product_id_fkey"
            columns: ["accessory_product_id"]
            isOneToOne: false
            referencedRelation: "accessories_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accessories_product_classes_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "accessories_product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      accessories_product_colours: {
        Row: {
          colour_name: string
          hex_code: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          colour_name: string
          hex_code: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          colour_name?: string
          hex_code?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "accessories_product_colours_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "accessories_products"
            referencedColumns: ["id"]
          },
        ]
      }
      accessories_product_genders: {
        Row: {
          gender: string
          id: string
          product_id: string
        }
        Insert: {
          gender: string
          id?: string
          product_id: string
        }
        Update: {
          gender?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessories_product_genders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "accessories_products"
            referencedColumns: ["id"]
          },
        ]
      }
      accessories_product_images: {
        Row: {
          created_at: string
          id: string
          image: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "accessories_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "accessories_products"
            referencedColumns: ["id"]
          },
        ]
      }
      accessories_product_quality_tags: {
        Row: {
          id: string
          product_id: string
          tag: string
        }
        Insert: {
          id?: string
          product_id: string
          tag: string
        }
        Update: {
          id?: string
          product_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessories_product_quality_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "accessories_products"
            referencedColumns: ["id"]
          },
        ]
      }
      accessories_product_sizes: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          sale_price: number | null
          size: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          product_id: string
          sale_price?: number | null
          size: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          sale_price?: number | null
          size?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "accessories_product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "accessories_products"
            referencedColumns: ["id"]
          },
        ]
      }
      accessories_products: {
        Row: {
          category_id: string
          company_name: string | null
          created_at: string
          customer_sees: string
          description: string
          id: string
          is_active: boolean
          is_deal: boolean
          is_featured: boolean
          is_out_of_stock: boolean
          product_name: string | null
          rating: number
          updated_at: string
        }
        Insert: {
          category_id: string
          company_name?: string | null
          created_at?: string
          customer_sees?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          product_name?: string | null
          rating?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          company_name?: string | null
          created_at?: string
          customer_sees?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          product_name?: string | null
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accessories_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "accessories_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
        Row: {
          created_at: string
          disabled_until: string | null
          email: string
          failed_attempts: number
          id: string
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          disabled_until?: string | null
          email: string
          failed_attempts?: number
          id?: string
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          disabled_until?: string | null
          email?: string
          failed_attempts?: number
          id?: string
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          created_at: string
          description: string | null
          display_priority: number
          id: string
          image_path: string
          is_active: boolean
          redirect_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_priority?: number
          id?: string
          image_path: string
          is_active?: boolean
          redirect_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_priority?: number
          id?: string
          image_path?: string
          is_active?: boolean
          redirect_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_number: string
          account_title: string
          bank_name: string
          created_at: string
          display_order: number
          iban_number: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_number: string
          account_title: string
          bank_name: string
          created_at?: string
          display_order?: number
          iban_number?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_number?: string
          account_title?: string
          bank_name?: string
          created_at?: string
          display_order?: number
          iban_number?: string | null
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      business_information: {
        Row: {
          address: string
          business_description: string | null
          business_name: string
          business_note: string | null
          closing_time: string
          created_at: string
          email: string
          facebook_url: string | null
          google_maps_link: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          landline_number: string | null
          linkedin_url: string | null
          opening_time: string
          phone_number: string
          tiktok_url: string | null
          twitter_url: string | null
          updated_at: string
          whatsapp_number: string | null
          whatsapp_url: string | null
          working_days: string[]
          youtube_url: string | null
        }
        Insert: {
          address: string
          business_description?: string | null
          business_name: string
          business_note?: string | null
          closing_time: string
          created_at?: string
          email: string
          facebook_url?: string | null
          google_maps_link?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          landline_number?: string | null
          linkedin_url?: string | null
          opening_time: string
          phone_number: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_url?: string | null
          working_days?: string[]
          youtube_url?: string | null
        }
        Update: {
          address?: string
          business_description?: string | null
          business_name?: string
          business_note?: string | null
          closing_time?: string
          created_at?: string
          email?: string
          facebook_url?: string | null
          google_maps_link?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          landline_number?: string | null
          linkedin_url?: string | null
          opening_time?: string
          phone_number?: string
          tiktok_url?: string | null
          twitter_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          whatsapp_url?: string | null
          working_days?: string[]
          youtube_url?: string | null
        }
        Relationships: []
      }
      college_campuses: {
        Row: {
          area: string
          campus_name: string | null
          city: string
          college_id: string
          country: string
          created_at: string
          id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          area: string
          campus_name?: string | null
          city: string
          college_id: string
          country?: string
          created_at?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area?: string
          campus_name?: string | null
          city?: string
          college_id?: string
          country?: string
          created_at?: string
          id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_campuses_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      college_categories: {
        Row: {
          collection_type: Database["public"]["Enums"]["school_collection_type"]
          college_id: string
          created_at: string
          id: string
          image: string | null
          name: string
          show_on_homepage: boolean
          updated_at: string
        }
        Insert: {
          collection_type: Database["public"]["Enums"]["school_collection_type"]
          college_id: string
          created_at?: string
          id?: string
          image?: string | null
          name: string
          show_on_homepage?: boolean
          updated_at?: string
        }
        Update: {
          collection_type?: Database["public"]["Enums"]["school_collection_type"]
          college_id?: string
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          show_on_homepage?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_categories_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      college_classes: {
        Row: {
          college_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          college_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          college_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_classes_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      college_product_campuses: {
        Row: {
          campus_id: string
          product_id: string
        }
        Insert: {
          campus_id: string
          product_id: string
        }
        Update: {
          campus_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_product_campuses_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "college_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_product_campuses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "college_products"
            referencedColumns: ["id"]
          },
        ]
      }
      college_product_classes: {
        Row: {
          college_class_id: string
          created_at: string
          id: string
          product_id: string
          product_size_id: string
        }
        Insert: {
          college_class_id: string
          created_at?: string
          id?: string
          product_id: string
          product_size_id: string
        }
        Update: {
          college_class_id?: string
          created_at?: string
          id?: string
          product_id?: string
          product_size_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_product_classes_college_class_id_fkey"
            columns: ["college_class_id"]
            isOneToOne: false
            referencedRelation: "college_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_product_classes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "college_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_product_classes_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "college_product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      college_product_colours: {
        Row: {
          colour_name: string
          hex_code: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          colour_name: string
          hex_code: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          colour_name?: string
          hex_code?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "college_product_colours_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "college_products"
            referencedColumns: ["id"]
          },
        ]
      }
      college_product_images: {
        Row: {
          created_at: string
          id: string
          image: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "college_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "college_products"
            referencedColumns: ["id"]
          },
        ]
      }
      college_product_quality_tags: {
        Row: {
          id: string
          product_id: string
          tag: string
        }
        Insert: {
          id?: string
          product_id: string
          tag: string
        }
        Update: {
          id?: string
          product_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_product_quality_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "college_products"
            referencedColumns: ["id"]
          },
        ]
      }
      college_product_sizes: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          sale_price: number | null
          size: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          product_id: string
          sale_price?: number | null
          size: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          sale_price?: number | null
          size?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "college_product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "college_products"
            referencedColumns: ["id"]
          },
        ]
      }
      college_products: {
        Row: {
          category_id: string
          collection_type: string
          college_id: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_deal: boolean
          is_featured: boolean
          is_out_of_stock: boolean
          name: string
          rating: number
          updated_at: string
        }
        Insert: {
          category_id: string
          collection_type: string
          college_id: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          name: string
          rating?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          collection_type?: string
          college_id?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          name?: string
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "college_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "college_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "college_products_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
      colleges: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_code: string | null
          coupon_id: string
          customer_id: string
          delivery_charge: number | null
          discount_amount: number
          discount_type: string | null
          discount_value: number | null
          grand_total: number | null
          id: string
          order_id: string | null
          order_number: string | null
          subtotal_before_discount: number | null
          used_at: string
        }
        Insert: {
          coupon_code?: string | null
          coupon_id: string
          customer_id: string
          delivery_charge?: number | null
          discount_amount: number
          discount_type?: string | null
          discount_value?: number | null
          grand_total?: number | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          subtotal_before_discount?: number | null
          used_at?: string
        }
        Update: {
          coupon_code?: string | null
          coupon_id?: string
          customer_id?: string
          delivery_charge?: number | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number | null
          grand_total?: number | null
          id?: string
          order_id?: string | null
          order_number?: string | null
          subtotal_before_discount?: number | null
          used_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          applicable_modules: string[]
          coupon_code: string
          coupon_name: string
          created_at: string
          discount_type: string
          discount_value: number
          id: string
          internal_notes: string | null
          is_active: boolean
          maximum_discount: number | null
          minimum_order_amount: number | null
          per_customer_limit: number | null
          updated_at: string
          usage_limit: number | null
          used_count: number
          valid_from: string
          valid_until: string
        }
        Insert: {
          applicable_modules?: string[]
          coupon_code: string
          coupon_name: string
          created_at?: string
          discount_type: string
          discount_value: number
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          maximum_discount?: number | null
          minimum_order_amount?: number | null
          per_customer_limit?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from: string
          valid_until: string
        }
        Update: {
          applicable_modules?: string[]
          coupon_code?: string
          coupon_name?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          maximum_discount?: number | null
          minimum_order_amount?: number | null
          per_customer_limit?: number | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string
        }
        Relationships: []
      }
      customer_cart: {
        Row: {
          category_id: string | null
          class_name: string | null
          color: string | null
          created_at: string
          customer_id: string
          gender: string | null
          id: string
          module: string
          product_id: string
          product_image: string | null
          product_name: string
          product_type: string | null
          quantity: number
          size: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          class_name?: string | null
          color?: string | null
          created_at?: string
          customer_id: string
          gender?: string | null
          id?: string
          module: string
          product_id: string
          product_image?: string | null
          product_name: string
          product_type?: string | null
          quantity?: number
          size?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          class_name?: string | null
          color?: string | null
          created_at?: string
          customer_id?: string
          gender?: string | null
          id?: string
          module?: string
          product_id?: string
          product_image?: string | null
          product_name?: string
          product_type?: string | null
          quantity?: number
          size?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_history: {
        Row: {
          address: string | null
          city: string | null
          confirmed_at: string
          country: string | null
          coupon_code: string | null
          coupon_discount: number
          coupon_discount_type: string | null
          coupon_discount_value: number | null
          coupon_id: string | null
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          delivery_charge: number
          delivery_note: string | null
          grand_total: number
          id: string
          items: Json
          order_date: string
          order_id: string
          order_number: string
          order_status: string
          payment_method: string | null
          payment_screenshot: string | null
          payment_status: string | null
          payment_verified_at: string | null
          postal_code: string | null
          subtotal: number
        }
        Insert: {
          address?: string | null
          city?: string | null
          confirmed_at?: string
          country?: string | null
          coupon_code?: string | null
          coupon_discount?: number
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          delivery_charge?: number
          delivery_note?: string | null
          grand_total?: number
          id?: string
          items?: Json
          order_date: string
          order_id: string
          order_number: string
          order_status: string
          payment_method?: string | null
          payment_screenshot?: string | null
          payment_status?: string | null
          payment_verified_at?: string | null
          postal_code?: string | null
          subtotal?: number
        }
        Update: {
          address?: string | null
          city?: string | null
          confirmed_at?: string
          country?: string | null
          coupon_code?: string | null
          coupon_discount?: number
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          delivery_charge?: number
          delivery_note?: string | null
          grand_total?: number
          id?: string
          items?: Json
          order_date?: string
          order_id?: string
          order_number?: string
          order_status?: string
          payment_method?: string | null
          payment_screenshot?: string | null
          payment_status?: string | null
          payment_verified_at?: string | null
          postal_code?: string | null
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_orders: {
        Row: {
          address: string
          auto_timeline: boolean
          city: string
          confirmed_at: string | null
          country: string
          coupon_code: string | null
          coupon_discount: number
          coupon_discount_type: string | null
          coupon_discount_value: number | null
          coupon_id: string | null
          coupon_usage_id: string | null
          created_at: string
          customer_id: string
          delivered_at: string | null
          delivery_charge: number
          delivery_instruction: string | null
          delivery_note: string | null
          email: string
          full_name: string
          id: string
          items: Json
          order_number: string
          payment_method: string
          payment_screenshot: string | null
          payment_status: string
          payment_verified_at: string | null
          phone: string | null
          postal_code: string | null
          shipped_at: string | null
          status: string
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address: string
          auto_timeline?: boolean
          city: string
          confirmed_at?: string | null
          country?: string
          coupon_code?: string | null
          coupon_discount?: number
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          coupon_usage_id?: string | null
          created_at?: string
          customer_id: string
          delivered_at?: string | null
          delivery_charge?: number
          delivery_instruction?: string | null
          delivery_note?: string | null
          email: string
          full_name: string
          id?: string
          items: Json
          order_number: string
          payment_method?: string
          payment_screenshot?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          phone?: string | null
          postal_code?: string | null
          shipped_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string
          auto_timeline?: boolean
          city?: string
          confirmed_at?: string | null
          country?: string
          coupon_code?: string | null
          coupon_discount?: number
          coupon_discount_type?: string | null
          coupon_discount_value?: number | null
          coupon_id?: string | null
          coupon_usage_id?: string | null
          created_at?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_charge?: number
          delivery_instruction?: string | null
          delivery_note?: string | null
          email?: string
          full_name?: string
          id?: string
          items?: Json
          order_number?: string
          payment_method?: string
          payment_screenshot?: string | null
          payment_status?: string
          payment_verified_at?: string | null
          phone?: string | null
          postal_code?: string | null
          shipped_at?: string | null
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_orders_coupon_usage_id_fkey"
            columns: ["coupon_usage_id"]
            isOneToOne: false
            referencedRelation: "coupon_usage"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_query: {
        Row: {
          created_at: string
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          id: string
          message: string
          query_type: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          id?: string
          message: string
          query_type: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          id?: string
          message?: string
          query_type?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_query_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wishlist: {
        Row: {
          category_id: string | null
          created_at: string
          customer_id: string
          id: string
          module: string
          product_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          module: string
          product_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          module?: string
          product_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          profile_picture: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          profile_picture?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          profile_picture?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_charges: {
        Row: {
          created_at: string
          delivery_charge: number
          id: string
          instruction: string | null
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_charge: number
          id?: string
          instruction?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_charge?: number
          id?: string
          instruction?: string | null
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      medical_product_colours: {
        Row: {
          colour_name: string
          hex_code: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          colour_name: string
          hex_code: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          colour_name?: string
          hex_code?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "medical_product_colours_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "medical_products"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_product_genders: {
        Row: {
          gender: string
          product_id: string
        }
        Insert: {
          gender: string
          product_id: string
        }
        Update: {
          gender?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_product_genders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "medical_products"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_product_images: {
        Row: {
          created_at: string
          id: string
          image: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "medical_product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "medical_products"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_product_quality_tags: {
        Row: {
          product_id: string
          tag: string
        }
        Insert: {
          product_id: string
          tag: string
        }
        Update: {
          product_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "medical_product_quality_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "medical_products"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_product_sizes: {
        Row: {
          id: string
          price: number
          product_id: string
          sale_price: number | null
          size: string
          sort_order: number
        }
        Insert: {
          id?: string
          price: number
          product_id: string
          sale_price?: number | null
          size: string
          sort_order?: number
        }
        Update: {
          id?: string
          price?: number
          product_id?: string
          sale_price?: number | null
          size?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "medical_product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "medical_products"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_products: {
        Row: {
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_deal: boolean
          is_featured: boolean
          is_out_of_stock: boolean
          name: string
          rating: number
          show_on_homepage: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          name: string
          rating?: number
          show_on_homepage?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          name?: string
          rating?: number
          show_on_homepage?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      order_number_sequences: {
        Row: {
          day: string
          last_seq: number
        }
        Insert: {
          day: string
          last_seq?: number
        }
        Update: {
          day?: string
          last_seq?: number
        }
        Relationships: []
      }
      product_campuses: {
        Row: {
          campus_id: string
          product_id: string
        }
        Insert: {
          campus_id: string
          product_id: string
        }
        Update: {
          campus_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_campuses_campus_id_fkey"
            columns: ["campus_id"]
            isOneToOne: false
            referencedRelation: "school_campuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_campuses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_classes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          product_size_id: string
          school_class_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          product_size_id: string
          school_class_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          product_size_id?: string
          school_class_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_classes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_classes_product_size_id_fkey"
            columns: ["product_size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_classes_school_class_id_fkey"
            columns: ["school_class_id"]
            isOneToOne: false
            referencedRelation: "school_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_colours: {
        Row: {
          colour_name: string
          hex_code: string
          id: string
          product_id: string
          sort_order: number
        }
        Insert: {
          colour_name: string
          hex_code: string
          id?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          colour_name?: string
          hex_code?: string
          id?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_colours_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image: string
          is_primary: boolean
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_quality_tags: {
        Row: {
          id: string
          product_id: string
          tag: string
        }
        Insert: {
          id?: string
          product_id: string
          tag: string
        }
        Update: {
          id?: string
          product_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_quality_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          created_at: string
          id: string
          price: number
          product_id: string
          sale_price: number | null
          size: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          product_id: string
          sale_price?: number | null
          size: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          product_id?: string
          sale_price?: number | null
          size?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_sizes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          created_at: string
          display_order: number
          id: string
          module: string
          product_id: string
          type_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          module: string
          product_id: string
          type_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          module?: string
          product_id?: string
          type_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string
          collection_type: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          is_deal: boolean
          is_featured: boolean
          is_out_of_stock: boolean
          name: string
          rating: number
          school_id: string
          updated_at: string
        }
        Insert: {
          category_id: string
          collection_type: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          name: string
          rating?: number
          school_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          collection_type?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          is_deal?: boolean
          is_featured?: boolean
          is_out_of_stock?: boolean
          name?: string
          rating?: number
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "school_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          occurred_at: string
          order_id: string | null
          order_number: string | null
          reason: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          occurred_at?: string
          order_id?: string | null
          order_number?: string | null
          reason: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          occurred_at?: string
          order_id?: string | null
          order_number?: string | null
          reason?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          category: string | null
          created_at: string
          customer_email: string | null
          customer_id: string
          customer_name: string
          customer_phone: string | null
          customer_photo: string | null
          deleted_at: string | null
          deleted_by: string | null
          featured_on_homepage: boolean
          id: string
          module: string
          order_id: string | null
          order_number: string
          product_id: string
          product_image: string | null
          product_name: string
          rating: number
          rejected_at: string | null
          rejected_by: string | null
          review_images: Json
          review_text: string
          review_title: string | null
          status: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id: string
          customer_name?: string
          customer_phone?: string | null
          customer_photo?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          featured_on_homepage?: boolean
          id?: string
          module: string
          order_id?: string | null
          order_number: string
          product_id: string
          product_image?: string | null
          product_name: string
          rating: number
          rejected_at?: string | null
          rejected_by?: string | null
          review_images?: Json
          review_text: string
          review_title?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          category?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string
          customer_name?: string
          customer_phone?: string | null
          customer_photo?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          featured_on_homepage?: boolean
          id?: string
          module?: string
          order_id?: string | null
          order_number?: string
          product_id?: string
          product_image?: string | null
          product_name?: string
          rating?: number
          rejected_at?: string | null
          rejected_by?: string | null
          review_images?: Json
          review_text?: string
          review_title?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "customer_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      school_campuses: {
        Row: {
          area: string
          campus_name: string | null
          city: string
          country: string
          created_at: string
          id: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          area: string
          campus_name?: string | null
          city: string
          country?: string
          created_at?: string
          id?: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          area?: string
          campus_name?: string | null
          city?: string
          country?: string
          created_at?: string
          id?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_campuses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_categories: {
        Row: {
          collection_type: Database["public"]["Enums"]["school_collection_type"]
          created_at: string
          id: string
          image: string | null
          name: string
          school_id: string
          show_on_homepage: boolean
          updated_at: string
        }
        Insert: {
          collection_type: Database["public"]["Enums"]["school_collection_type"]
          created_at?: string
          id?: string
          image?: string | null
          name: string
          school_id: string
          show_on_homepage?: boolean
          updated_at?: string
        }
        Update: {
          collection_type?: Database["public"]["Enums"]["school_collection_type"]
          created_at?: string
          id?: string
          image?: string | null
          name?: string
          school_id?: string
          show_on_homepage?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_classes: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      sizing_measurements: {
        Row: {
          created_at: string
          id: string
          measurement_label: string
          measurement_value: number
          sizing_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_label: string
          measurement_value: number
          sizing_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          measurement_label?: string
          measurement_value?: number
          sizing_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sizing_measurements_sizing_id_fkey"
            columns: ["sizing_id"]
            isOneToOne: false
            referencedRelation: "sizings"
            referencedColumns: ["id"]
          },
        ]
      }
      sizings: {
        Row: {
          created_at: string
          id: string
          measurement_unit: string
          size: string
          size_label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_unit: string
          size: string
          size_label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          measurement_unit?: string
          size?: string
          size_label?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_dashboard_stats: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      admin_recent_orders: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          order_number: string
          status: string
          total: number
        }[]
      }
      admin_revenue_series: {
        Args: { p_bucket?: string; p_from: string; p_to: string }
        Returns: {
          bucket: string
          revenue: number
        }[]
      }
      admin_top_products: {
        Args: { p_from: string; p_limit?: number; p_to: string }
        Returns: {
          module: string
          orders: number
          product_id: string
          product_name: string
          quantity: number
          revenue: number
        }[]
      }
      finalize_coupon_usage: {
        Args: {
          p_coupon_code: string
          p_coupon_id: string
          p_customer_id: string
          p_delivery_charge: number
          p_discount_amount: number
          p_discount_type: string
          p_discount_value: number
          p_grand_total: number
          p_order_id: string
          p_order_number: string
          p_subtotal: number
        }
        Returns: string
      }
      next_order_number: { Args: never; Returns: string }
      run_order_timeline: { Args: never; Returns: undefined }
    }
    Enums: {
      school_collection_type: "boys" | "girls"
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
      school_collection_type: ["boys", "girls"],
    },
  },
} as const
