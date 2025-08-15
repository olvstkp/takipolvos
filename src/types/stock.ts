// Stok yönetimi TypeScript interfaces

export interface StockItem {
  id: string
  stockCode: string
  stockName: string // Excel: Stok Adı
  category: string // Excel: Kategori  
  unit: string // Excel: BR (Birim)
  currentAmount: number
  minimumLevel: number
  initialAmount?: number // Excel: Stok Giriş Miktarı
  supplier?: string // Excel: Tedarikçi
  costPerUnit?: number
  description?: string
  storageLocation?: string
  systemEntryDate?: string // Excel: Sisteme Giriş Tarihi
  stockEntryDate?: string // Excel: Stokta Giriş Tarihi
  expiryDate?: string // Excel: Son Kullanma Tarihi
  deliveryInfo?: string // Excel: Teslimat
  createdAt: string
  updatedAt: string
  createdBy?: string
  updatedBy?: string
}

export interface StockMovement {
  id: string
  stockItemId: string
  movementDate: string
  movementType: 'in' | 'out'
  amount: number
  remainingAmount: number
  supplier?: string
  expiryDate?: string
  serialNumber?: string
  invoiceNumber?: string
  waybillNumber?: string // İrsaliye No
  batchNumber?: string
  unitCost?: number
  totalCost?: number
  notes?: string
  referenceType?: string
  referenceId?: string
  deliveryInfo?: string
  systemEntryDate?: string
  createdAt: string
  createdBy?: string
}

export interface StockCategory {
  id: string
  name: string
  description?: string
  parentId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StockSupplier {
  id: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  taxNumber?: string
  notes?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface StockAlert {
  id: string
  stockItemId: string
  alertType: 'low_stock' | 'expiry_warning' | 'out_of_stock'
  message: string
  thresholdValue?: number
  isResolved: boolean
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
}

export interface StockCodeCategory {
  id: string
  categoryName: string
  categoryCode: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DailyLotCounter {
  id: string
  date: string
  categoryCode: string
  productPrefix: string
  counter: number
  createdAt: string
  updatedAt: string
}

// Excel Import/Export interfaces
export interface ExcelStockRow {
  stockCode: string
  stockName: string
  unit: string
  initialAmount: number
  category: string
  systemEntryDate: string
  stockEntryDate: string
  expiryDate?: string
  supplier?: string
  deliveryInfo?: string
  waybillNumber?: string // İrsaliye No
}

export interface ImportResult {
  successes: Array<{
    stockItemId: string
    stockCode: string
  }>
  errors: Array<{
    row: ExcelStockRow
    error: string
  }>
}

// API Request/Response types
export interface CreateStockItemRequest {
  stockName: string
  category: string
  unit: string
  initialAmount: number
  minimumLevel?: number
  supplier?: string
  costPerUnit?: number
  description?: string
  storageLocation?: string
  expiryDate?: string
  deliveryInfo?: string
}

export interface CreateStockMovementRequest {
  stockItemId: string
  movementType: 'in' | 'out'
  amount: number
  supplier?: string
  expiryDate?: string
  serialNumber?: string
  invoiceNumber?: string
  waybillNumber?: string
  batchNumber?: string
  unitCost?: number
  notes?: string
  referenceType?: string
  deliveryInfo?: string
}

export interface StockItemWithMovements extends StockItem {
  movements?: StockMovement[]
  alerts?: StockAlert[]
}

// Filter and pagination
export interface StockFilter {
  category?: string
  supplier?: string
  lowStock?: boolean
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface StockPagination {
  page: number
  limit: number
  total: number
}

export interface StockListResponse {
  items: StockItem[]
  pagination: StockPagination
}

// Dashboard statistics
export interface StockStats {
  totalItems: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  recentMovements: number
  categoryCounts: Array<{
    category: string
    count: number
    value: number
  }>
}

// Enum types
export const MovementTypes = {
  IN: 'in' as const,
  OUT: 'out' as const
} as const

export const AlertTypes = {
  LOW_STOCK: 'low_stock' as const,
  EXPIRY_WARNING: 'expiry_warning' as const,
  OUT_OF_STOCK: 'out_of_stock' as const
} as const

export const ReferenceTypes = {
  PURCHASE: 'purchase' as const,
  PRODUCTION: 'production' as const,
  ADJUSTMENT: 'adjustment' as const,
  RETURN: 'return' as const,
  INITIAL_IMPORT: 'initial_import' as const,
  INITIAL_STOCK: 'initial_stock' as const
} as const
