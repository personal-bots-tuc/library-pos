export interface Product {
  id: string;
  name: string;
  description?: string;
  type: "product" | "service";
  price: number;
  cost?: number;
  stock: number;
  minStock?: number;
  unit?: "unit" | "sheet" | "binding";
  code?: string;
  active: boolean;
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  fullName: string;
  phone?: string;
  dni: string;
  isDefault: boolean;
  balance: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientListResponse {
  items: Client[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: "superadmin" | "admin" | "seller";
  schoolId: string;
  posId?: string;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CashShift {
  id: string;
  seller: string;
  openedAt: string;
  closedAt?: string;
  openingAmount: number;
  closingAmount?: number;
  expectedAmount?: number;
  difference?: number;
  status: "open" | "closed";
  note?: string;
}

export interface ShiftAggregated {
  cashTotal?: number;
  transferTotal?: number;
  creditTotal?: number;
  salesCount?: number;
  productsSold?: number;
  avgTicket?: number;
  expectedCash?: number;
  returnsTotal?: number;
  returnsCashTotal?: number;
  returnsTransferTotal?: number;
  returnsCreditTotal?: number;
  cashInTotal?: number;
  cashOutTotal?: number;
  netMovements?: number;
  movementsCount?: number;
}

export interface SaleItem {
  product: string;
  name: string;
  type: "product" | "service";
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CartItem extends SaleItem {
  stock: number;
}