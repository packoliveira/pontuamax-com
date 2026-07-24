/**
 * Tipagens da Integração com Shopify API (FitGestor ERP)
 */

export interface ShopifyConfig {
  storeDomain: string;
  accessToken: string;
  locationId: string;
  apiVersion: string;
}

export interface ShopifyInventorySetPayload {
  location_id: number | string;
  inventory_item_id: number | string;
  available: number;
}

export interface ShopifySyncLog {
  id: string;
  sku: string;
  quantity: number;
  status: "pending" | "success" | "error";
  attempts: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyWebhookOrderLineItem {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  price: string;
  variant_id: number;
  product_id: number;
}

export interface ShopifyWebhookOrderPayload {
  id: number;
  order_number: number;
  total_price: string;
  subtotal_price: string;
  total_discounts: string;
  financial_status: "paid" | "pending" | "refunded";
  created_at: string;
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  line_items: ShopifyWebhookOrderLineItem[];
}
