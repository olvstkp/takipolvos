import { supabase } from '../lib/supabase'
import { handleSupabaseError } from '../utils/errorHandling'
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
    try {
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

      const items: StockItem[] = (data || []).map((r: any) => ({
      id: r.id,
      stockCode: r.stock_code,
      stockName: r.stock_name,
      category: r.category,
      unit: r.unit,
      currentAmount: Number(r.current_amount) || 0,
      minimumLevel: Number(r.minimum_level) || 0,
      initialAmount: r.initial_amount != null ? Number(r.initial_amount) : undefined,
      supplier: r.supplier || undefined,
      costPerUnit: r.cost_per_unit != null ? Number(r.cost_per_unit) : undefined,
      description: r.description || undefined,
      storageLocation: r.storage_location || undefined,
      systemEntryDate: r.system_entry_date || undefined,
      stockEntryDate: r.stock_entry_date || undefined,
      expiryDate: r.expiry_date || undefined,
      deliveryInfo: r.delivery_info || undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      createdBy: r.created_by || undefined,
      updatedBy: r.updated_by || undefined
      }))

      return {
        items,
        pagination: {
          page,
          limit,
          total: count || 0
        }
      }
    } catch (err) {
      // Supabase kapalı ise boş liste döndür
      return {
        items: [],
        pagination: {
          page,
          limit,
          total: 0
        }
      }
    }
  }

  async getStockItemById(id: string): Promise<StockItem | null> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      if (!data) return null
      const r: any = data
      const mapped: StockItem = {
        id: r.id,
        stockCode: r.stock_code,
        stockName: r.stock_name,
        category: r.category,
        unit: r.unit,
        currentAmount: Number(r.current_amount) || 0,
        minimumLevel: Number(r.minimum_level) || 0,
        initialAmount: r.initial_amount != null ? Number(r.initial_amount) : undefined,
        supplier: r.supplier || undefined,
        costPerUnit: r.cost_per_unit != null ? Number(r.cost_per_unit) : undefined,
        description: r.description || undefined,
        storageLocation: r.storage_location || undefined,
        systemEntryDate: r.system_entry_date || undefined,
        stockEntryDate: r.stock_entry_date || undefined,
        expiryDate: r.expiry_date || undefined,
        deliveryInfo: r.delivery_info || undefined,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        createdBy: r.created_by || undefined,
        updatedBy: r.updated_by || undefined
      }
      return mapped
    } catch (err) {
      return null
    }
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
    try {
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
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Kayıt oluşturulamadı. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
  }

  async updateStockItem(id: string, updates: Partial<StockItem>): Promise<StockItem> {
    try {
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
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Kayıt güncellenemedi. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
  }

  async deleteStockItem(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Kayıt silinemedi. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
  }

  // Stock Movements CRUD
  async getStockMovements(stockItemId?: string, page = 1, limit = 50): Promise<StockMovement[]> {
    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        stock_items (
          id,
          stock_code,
          stock_name,
          unit
        )
      `)
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (stockItemId) {
      query = query.eq('stock_item_id', stockItemId)
    }

    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) throw error

    const mapped: StockMovement[] = (data || []).map((r: any) => ({
      id: r.id,
      stockItemId: r.stock_item_id,
      movementDate: r.movement_date,
      movementType: r.movement_type,
      amount: Number(r.amount) || 0,
      remainingAmount: Number(r.remaining_amount) || 0,
      supplier: r.supplier || undefined,
      expiryDate: r.expiry_date || undefined,
      serialNumber: r.serial_number || undefined,
      invoiceNumber: r.invoice_number || undefined,
      waybillNumber: r.waybill_number || undefined,
      batchNumber: r.batch_number || undefined,
      unitCost: r.unit_cost != null ? Number(r.unit_cost) : undefined,
      totalCost: r.total_cost != null ? Number(r.total_cost) : undefined,
      notes: r.notes || undefined,
      referenceType: r.reference_type || undefined,
      referenceId: r.reference_id || undefined,
      deliveryInfo: r.delivery_info || undefined,
      systemEntryDate: r.system_entry_date || undefined,
      createdAt: r.created_at,
      createdBy: r.created_by || undefined,
      stockItem: r.stock_items
        ? {
            id: r.stock_items.id,
            stockCode: r.stock_items.stock_code,
            stockName: r.stock_items.stock_name,
            category: '',
            unit: r.stock_items.unit,
            currentAmount: 0,
            minimumLevel: 0,
            createdAt: '',
            updatedAt: ''
          } as any
        : undefined
    }))

    return mapped
  }

  async createStockMovement(movement: CreateStockMovementRequest): Promise<StockMovement> {
    try {
      // Get current stock amount and validate for 'out'
      const stockItem = await this.getStockItemById(movement.stockItemId)
      if (!stockItem) throw new Error('Stok kalemi bulunamadı')

      if (movement.movementType === 'out' && stockItem.currentAmount < movement.amount) {
        throw new Error('Yetersiz stok miktarı')
      }

      const newAmount = movement.movementType === 'in'
        ? stockItem.currentAmount + movement.amount
        : stockItem.currentAmount - movement.amount

      const { data, error } = await supabase
        .from('stock_movements')
        .insert({
          stock_item_id: movement.stockItemId,
          movement_date: new Date().toISOString().split('T')[0],
          movement_type: movement.movementType,
          amount: movement.amount,
          remaining_amount: newAmount,
          supplier: movement.supplier,
          expiry_date: movement.expiryDate && movement.expiryDate.length === 10 ? movement.expiryDate : null,
          serial_number: movement.serialNumber,
          invoice_number: movement.invoiceNumber,
          waybill_number: movement.waybillNumber,
          batch_number: movement.batchNumber,
          unit_cost: movement.unitCost != null && !Number.isNaN(movement.unitCost) ? movement.unitCost : null,
          total_cost: movement.unitCost ? movement.unitCost * movement.amount : null,
          notes: movement.notes,
          reference_type: movement.referenceType || 'manual',
          delivery_info: null,
          created_by: 'user'
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Hareket kaydı oluşturulamadı. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
  }

  async deleteStockMovementsByIds(ids: string[]): Promise<void> {
    if (!ids.length) return
    try {
      const { error } = await supabase
        .from('stock_movements')
        .delete()
        .in('id', ids)

      if (error) throw error
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Hareketler silinemedi. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
  }

  async deleteAllStockMovements(): Promise<number> {
    try {
      // Dikkat: Tüm kayıtları siler
      const { data, error, count } = await supabase
        .from('stock_movements')
        .delete({ count: 'exact' })
        .gt('id', '00000000-0000-0000-0000-000000000000')

      if (error) throw error
      return count || (data ? (data as any[]).length : 0)
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Tüm hareketler silinemedi. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
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
    try {
      const { data, error } = await supabase
        .from('stock_code_categories')
        .select('*')
        .eq('is_active', true)
        .order('category_name')

      if (error) throw error
      const mapped: StockCodeCategory[] = (data || []).map((r: any) => ({
        id: r.id,
        categoryName: r.category_name,
        categoryCode: r.category_code,
        description: r.description || undefined,
        isActive: r.is_active,
        createdAt: r.created_at,
        updatedAt: r.updated_at
      }))
      return mapped
    } catch (err) {
      return []
    }
  }

  async addStockCodeCategory(categoryName: string): Promise<StockCodeCategory> {
    // Kodu otomatik üret: isimden ilk 2 harf (Türkçe harfler dahil), eksikse X ile doldur
    const cleaned = (categoryName || '').toUpperCase().trim().replace(/\s+/g, '')
    const letters = cleaned.split('').filter(ch => /[A-ZÇĞİÖŞÜ]/.test(ch)).slice(0, 2)
    while (letters.length < 2) letters.push('X')
    const categoryCode = letters.join('')

    try {
      const { data, error } = await supabase
        .from('stock_code_categories')
        .insert({
          category_name: categoryName,
          category_code: categoryCode,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error
      return {
        id: data.id,
        categoryName: data.category_name,
        categoryCode: data.category_code,
        description: data.description || undefined,
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      }
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Kategori eklenemedi. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
  }

  async deleteStockCodeCategory(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('stock_code_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Kategori silinemedi. Lütfen daha sonra tekrar deneyin.')
      throw new Error(msg)
    }
  }

  // Suppliers
  async getStockSuppliers(): Promise<StockSupplier[]> {
    try {
      const { data, error } = await supabase
        .from('stock_suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      return data || []
    } catch (err) {
      return []
    }
  }

  // Alerts
  async getStockAlerts(resolved = false): Promise<StockAlert[]> {
    try {
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
    } catch (err) {
      return []
    }
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
    try {
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
    } catch (err) {
      return {
        totalItems: 0,
        totalValue: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        recentMovements: 0,
        categoryCounts: []
      }
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
        const msg = handleSupabaseError(err, 'Satır içe aktarılırken hata oluştu')
        errors.push({ row, error: msg })
      }
    }

    return { successes: results, errors }
  }

  // Stock Code Generation
  async generateStockCode(category: string, productName: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .rpc('generate_stock_code', {
          p_category: category,
          p_product_name: productName
        })

      if (error) throw error
      return data
    } catch (e: any) {
      const msg = handleSupabaseError(e, 'Kod üretilemedi')
      throw new Error(msg)
    }
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
