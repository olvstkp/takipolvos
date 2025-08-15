import { supabase } from '../lib/supabase'
import type {
  StockItem,
  StockMovement,
  StockCategory,
  StockSupplier,
  StockAlert,
  StockCodeCategory,
  CreateStockItemRequest,
  CreateStockMovementRequest,
  StockFilter,
  StockListResponse,
  StockStats,
  ExcelStockRow,
  ImportResult
} from '../types/stock'

class StockService {
  // Stock Items CRUD
  async getStockItems(filter?: StockFilter, page = 1, limit = 50): Promise<StockListResponse> {
    let query = supabase
      .from('stock_items')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filter?.category) {
      query = query.eq('category', filter.category)
    }

    if (filter?.supplier) {
      query = query.eq('supplier', filter.supplier)
    }

    if (filter?.search) {
      query = query.or(`stock_name.ilike.%${filter.search}%,stock_code.ilike.%${filter.search}%`)
    }

    if (filter?.lowStock) {
      query = query.lt('current_amount', 'minimum_level')
    }

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) throw error

    return {
      items: data || [],
      pagination: {
        page,
        limit,
        total: count || 0
      }
    }
  }

  async getStockItemById(id: string): Promise<StockItem | null> {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getStockItemByCode(stockCode: string): Promise<StockItem | null> {
    const { data, error } = await supabase
      .from('stock_items')
      .select('*')
      .eq('stock_code', stockCode)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }

  async createStockItem(item: CreateStockItemRequest): Promise<StockItem> {
    // Generate stock code
    const { data: stockCode, error: codeError } = await supabase
      .rpc('generate_stock_code', {
        p_category: item.category,
        p_product_name: item.stockName
      })

    if (codeError) throw codeError

    const { data, error } = await supabase
      .from('stock_items')
      .insert({
        stock_code: stockCode,
        stock_name: item.stockName,
        category: item.category,
        unit: item.unit,
        current_amount: item.initialAmount,
        initial_amount: item.initialAmount,
        minimum_level: item.minimumLevel || 0,
        supplier: item.supplier,
        cost_per_unit: item.costPerUnit,
        description: item.description,
        storage_location: item.storageLocation,
        expiry_date: item.expiryDate,
        delivery_info: item.deliveryInfo,
        created_by: 'user'
      })
      .select()
      .single()

    if (error) throw error

    // Create initial stock movement
    if (item.initialAmount > 0) {
      await this.createStockMovement({
        stockItemId: data.id,
        movementType: 'in',
        amount: item.initialAmount,
        supplier: item.supplier,
        referenceType: 'initial_stock',
        notes: 'İlk stok girişi'
      })
    }

    return data
  }

  async updateStockItem(id: string, updates: Partial<StockItem>): Promise<StockItem> {
    const { data, error } = await supabase
      .from('stock_items')
      .update({
        ...updates,
        updated_by: 'user'
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async deleteStockItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('stock_items')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Stock Movements CRUD
  async getStockMovements(stockItemId?: string, page = 1, limit = 50): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (stockItemId) {
      query = query.eq('stock_item_id', stockItemId)
    }

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  async createStockMovement(movement: CreateStockMovementRequest): Promise<StockMovement> {
    // Get current stock amount
    const stockItem = await this.getStockItemById(movement.stockItemId)
    if (!stockItem) throw new Error('Stok kalemi bulunamadı')

    const newAmount = movement.movementType === 'in' 
      ? stockItem.currentAmount + movement.amount
      : stockItem.currentAmount - movement.amount

    if (newAmount < 0) {
      throw new Error('Yetersiz stok miktarı')
    }

    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        stock_item_id: movement.stockItemId,
        movement_date: new Date().toISOString().split('T')[0],
        movement_type: movement.movementType,
        amount: movement.amount,
        remaining_amount: newAmount,
        supplier: movement.supplier,
        expiry_date: movement.expiryDate,
        serial_number: movement.serialNumber,
        invoice_number: movement.invoiceNumber,
        waybill_number: movement.waybillNumber,
        batch_number: movement.batchNumber,
        unit_cost: movement.unitCost,
        total_cost: movement.unitCost ? movement.unitCost * movement.amount : undefined,
        notes: movement.notes,
        reference_type: movement.referenceType || 'manual',
        delivery_info: movement.deliveryInfo,
        created_by: 'user'
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  // Categories
  async getStockCategories(): Promise<StockCategory[]> {
    const { data, error } = await supabase
      .from('stock_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  async getStockCodeCategories(): Promise<StockCodeCategory[]> {
    const { data, error } = await supabase
      .from('stock_code_categories')
      .select('*')
      .eq('is_active', true)
      .order('category_name')

    if (error) throw error
    return data || []
  }

  // Suppliers
  async getStockSuppliers(): Promise<StockSupplier[]> {
    const { data, error } = await supabase
      .from('stock_suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    return data || []
  }

  // Alerts
  async getStockAlerts(resolved = false): Promise<StockAlert[]> {
    const { data, error } = await supabase
      .from('stock_alerts')
      .select(`
        *,
        stock_items(stock_name, stock_code)
      `)
      .eq('is_resolved', resolved)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  }

  async resolveAlert(alertId: string): Promise<void> {
    const { error } = await supabase
      .from('stock_alerts')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: 'user'
      })
      .eq('id', alertId)

    if (error) throw error
  }

  // Statistics
  async getStockStats(): Promise<StockStats> {
    // Total items and values
    const { data: items, error: itemsError } = await supabase
      .from('stock_items')
      .select('current_amount, minimum_level, cost_per_unit, category')

    if (itemsError) throw itemsError

    const totalItems = items?.length || 0
    const totalValue = items?.reduce((sum, item) => {
      return sum + (item.current_amount * (item.cost_per_unit || 0))
    }, 0) || 0

    const lowStockItems = items?.filter(item => 
      item.current_amount <= item.minimum_level
    ).length || 0

    const outOfStockItems = items?.filter(item => 
      item.current_amount <= 0
    ).length || 0

    // Recent movements (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('id')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (movementsError) throw movementsError

    // Category counts
    const categoryCounts = items?.reduce((acc: any, item) => {
      const category = item.category
      if (!acc[category]) {
        acc[category] = { count: 0, value: 0 }
      }
      acc[category].count += 1
      acc[category].value += item.current_amount * (item.cost_per_unit || 0)
      return acc
    }, {}) || {}

    const categoryCountsArray = Object.entries(categoryCounts).map(([category, data]: [string, any]) => ({
      category,
      count: data.count,
      value: data.value
    }))

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      recentMovements: movements?.length || 0,
      categoryCounts: categoryCountsArray
    }
  }

  // Excel Import
  async importStockFromExcel(excelData: ExcelStockRow[]): Promise<ImportResult> {
    const results: any[] = []
    const errors: any[] = []

    for (const row of excelData) {
      try {
        const { data, error } = await supabase.rpc('import_stock_from_excel', {
          p_stock_code: row.stockCode,
          p_stock_name: row.stockName,
          p_unit: row.unit,
          p_initial_amount: row.initialAmount,
          p_category: row.category,
          p_system_entry_date: row.systemEntryDate,
          p_stock_entry_date: row.stockEntryDate,
          p_expiry_date: row.expiryDate || null,
          p_supplier: row.supplier || null,
          p_delivery_info: row.deliveryInfo || null,
          p_waybill_number: row.waybillNumber || null
        })

        if (error) {
          errors.push({ row, error: error.message })
        } else {
          results.push({ stockItemId: data, stockCode: row.stockCode })
        }
      } catch (err: any) {
        errors.push({ row, error: err.message })
      }
    }

    return { successes: results, errors }
  }

  // Stock Code Generation
  async generateStockCode(category: string, productName: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('generate_stock_code', {
        p_category: category,
        p_product_name: productName
      })

    if (error) throw error
    return data
  }

  async previewStockCode(category: string, productName: string): Promise<string> {
    // Temporary preview without saving to database
    try {
      const code = await this.generateStockCode(category, productName)
      return code
    } catch (error) {
      return 'PREVIEW_ERROR'
    }
  }
}

export const stockService = new StockService()
export default stockService
