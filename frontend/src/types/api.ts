export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface Product {
  id: string;
  product_code: string;
  product_name: string;
  stock: number;
  price: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  customer_address: string;
  gender: "PRIA" | "WANITA";
  birth_date: string;
  phone: string | null;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_date: string;
  customer_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  total_amount: string;
  customer: Customer;
  items: OrderItem[];
}

export interface CreateOrderPayload {
  customer_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
}

export interface OrderResponse {
  id: string;
  order_number: string;
  total_amount: string;
  customer: Customer;
  items: OrderItem[];
}

export interface DashboardSummary {
  total_transactions: number;
  total_sales: string;
  best_selling_products: Array<{
    product_id: string;
    product_name: string | null;
    quantity_sold: number;
  }>;
  low_stock_products: Array<{
    id: string;
    product_code: string;
    product_name: string;
    stock: number;
  }>;
}
