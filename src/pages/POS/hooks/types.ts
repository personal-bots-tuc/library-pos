import type {
  Product,
  CashShift,
  ShiftAggregated,
  Client,
  ClientListResponse,
} from '../components/types';
import type { CashMovementAggregated } from '../components/CashMovementModal/types';
import type { CartItem } from '../components/Cart/types';
import type { SaleAttempt } from './saleIntegrity';

export type OperationMode = 'sale' | 'quote' | 'return';

export interface PreviewSaleItem {
  product: string;
  name: string;
  type: 'product' | 'service';
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  subtotal: number;
  availableStock?: number;
}

export interface PreviewSaleResult {
  items: PreviewSaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountReceived?: number;
  change?: number;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  creditBalanceAfter?: number;
}

export interface ReceiptData {
  number: number;
  type: 'sale' | 'quote' | 'return';
  items: Array<{
    product: string;
    name: string;
    type: 'product' | 'service';
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    subtotal: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod?: 'cash' | 'transfer' | 'credit';
  amountReceived?: number;
  change?: number;
  client?: { id: string; fullName: string; balance: number } | null;
  seller: { id: string; name: string; role: string };
  createdAt: string;
}

export interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseShiftResult {
  activeShift: CashShift | null;
  shiftStats: ShiftAggregated | null;
  loading: boolean;
  error: string | null;
  openShift: (openingAmount: number) => Promise<void>;
  closeShift: (
    closingAmount: number,
    note?: string,
    aggregated?: CashMovementAggregated
  ) => Promise<void>;
  refetch: () => Promise<void>;
}

export interface UseClientResult {
  createClient: (data: { fullName: string; dni: string; phone?: string }) => Promise<Client>;
  listClients: (params?: {
    search?: string;
    page?: number;
    limit?: number;
  }) => Promise<ClientListResponse>;
  searchClients: (query: string) => Promise<Client[]>;
  loading: boolean;
  error: string | null;
}

export interface UseCartResult {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
}

export interface UseSaleResult {
  checkout: (params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
    paymentMethod: 'cash' | 'transfer' | 'credit';
    amountReceived: number;
    expectedTotal?: number;
    /** Attempt estable por operación (misma idempotencyKey en reintentos). */
    attempt?: SaleAttempt;
  }) => Promise<{ total: number; change: number; sale: SaleLean }>;
  previewSale: (params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
    paymentMethod: 'cash' | 'transfer' | 'credit';
    amountReceived?: number;
  }) => Promise<PreviewSaleResult>;
  loading: boolean;
  error: string | null;
}

export interface SaleLean {
  id: string;
  number: number;
  subtotal: number;
  discount: number;
  total: number;
  amountReceived: number;
  change: number;
  paymentMethod: 'cash' | 'transfer' | 'credit';
  type: 'sale' | 'return';
  client?: { id: string; fullName: string; balance: number } | null;
  seller: { id: string; name: string; role: string };
  items: Array<{
    product: string;
    name: string;
    type: 'product' | 'service';
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    subtotal: number;
  }>;
  createdAt: string;
}

export interface UseQuotesResult {
  createQuote: (params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    discount: number;
  }) => Promise<QuoteLean>;
  loading: boolean;
  error: string | null;
}

export interface QuoteLean {
  id: string;
  number: number;
  subtotal: number;
  discount: number;
  total: number;
  client?: { id: string; fullName: string; balance: number } | null;
  seller: { id: string; name: string; role: string };
  items: Array<{
    product: string;
    name: string;
    type: 'product' | 'service';
    quantity: number;
    unitPrice: number;
    unitCost?: number;
    subtotal: number;
  }>;
  status: 'active' | 'cancelled';
  createdAt: string;
}

export interface UseReturnResult {
  createReturn: (params: {
    items: { product: string; quantity: number }[];
    clientId?: string;
    method: 'cash' | 'transfer' | 'credit';
  }) => Promise<{ sale: SaleLean }>;
  loading: boolean;
  error: string | null;
}
