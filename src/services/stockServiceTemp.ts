// Temporary simple stock service to bypass errors
import { supabase } from '../lib/supabase'
import type {
  StockItem,
  StockAlert,
  StockStats,
  StockCodeCategory,
  ExcelStockRow,
  ImportResult
} from '../types/stock'

class TempStockService {
  async getStockItems() {
    try {
      // Get all data from Supabase (no limit)
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Supabase error:', error)
        return {
          items: [] as StockItem[],
          pagination: { page: 1, limit: 1000, total: 0 }
        }
      }

      const mappedItems: StockItem[] = (data || []).map((item: any) => ({
        id: item.id,
        stockCode: item.stock_code,
        stockName: item.stock_name,
        category: item.category,
        unit: item.unit,
        currentAmount: item.current_amount,
        minimumLevel: item.minimum_level,
        initialAmount: item.initial_amount,
        supplier: item.supplier,
        costPerUnit: item.cost_per_unit,
        description: item.description,
        storageLocation: item.storage_location,
        systemEntryDate: item.system_entry_date,
        stockEntryDate: item.stock_entry_date,
        expiryDate: item.expiry_date,
        deliveryInfo: item.delivery_info,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        createdBy: item.created_by,
        updatedBy: item.updated_by
      }))

      return {
        items: mappedItems,
        pagination: { page: 1, limit: 1000, total: mappedItems.length }
      }
    } catch (err) {
      console.log('Database connection error:', err)
      return {
        items: [] as StockItem[],
        pagination: { page: 1, limit: 50, total: 0 }
      }
    }
  }

  async getStockAlerts(): Promise<StockAlert[]> {
    return []
  }

  async getStockCodeCategories(): Promise<StockCodeCategory[]> {
    return [
      {
        id: '1',
        categoryName: 'HAMMADDE',
        categoryCode: 'HA',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  }

  async getStockStats(): Promise<StockStats> {
    return {
      totalItems: 0,
      totalValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      recentMovements: 0,
      categoryCounts: []
    }
  }

  async createStockItem(item: any): Promise<StockItem> {
    return {
      id: '1',
      stockCode: 'TEST001',
      stockName: item.stockName,
      category: item.category,
      unit: item.unit,
      currentAmount: item.initialAmount,
      minimumLevel: item.minimumLevel || 0,
      supplier: item.supplier,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  async updateStockItem(id: string, updateData: any): Promise<StockItem> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .update({
          stock_name: updateData.stockName,
          category: updateData.category,
          unit: updateData.unit,
          current_amount: updateData.currentAmount,
          minimum_level: updateData.minimumLevel,
          cost_per_unit: updateData.costPerUnit,
          supplier: updateData.supplier,
          description: updateData.description,
          storage_location: updateData.storageLocation,
          expiry_date: updateData.expiryDate,
          updated_at: new Date().toISOString(),
          updated_by: 'system'
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw new Error(`Güncelleme hatası: ${error.message}`)
      }

      // Map to frontend format
      const mappedItem: StockItem = {
        id: data.id,
        stockCode: data.stock_code,
        stockName: data.stock_name,
        category: data.category,
        unit: data.unit,
        currentAmount: data.current_amount,
        minimumLevel: data.minimum_level,
        initialAmount: data.initial_amount,
        supplier: data.supplier,
        costPerUnit: data.cost_per_unit,
        description: data.description,
        storageLocation: data.storage_location,
        systemEntryDate: data.system_entry_date,
        stockEntryDate: data.stock_entry_date,
        expiryDate: data.expiry_date,
        deliveryInfo: data.delivery_info,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        createdBy: data.created_by,
        updatedBy: data.updated_by
      }

      return mappedItem
    } catch (err: any) {
      throw new Error(`Güncelleme işlemi başarısız: ${err.message}`)
    }
  }

  async deleteStockItem(id: string): Promise<void> {
    try {
      // Delete related stock movements first
      const { error: movementError } = await supabase
        .from('stock_movements')
        .delete()
        .eq('stock_item_id', id)

      if (movementError) {
        console.log('Movement delete error (non-critical):', movementError)
      }

      // Delete the stock item
      const { error: stockError } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', id)

      if (stockError) {
        throw new Error(`Silme hatası: ${stockError.message}`)
      }
    } catch (err: any) {
      throw new Error(`Silme işlemi başarısız: ${err.message}`)
    }
  }

  async previewStockCode(category: string, productName: string): Promise<string> {
    return 'PREVIEW001'
  }

  async getStockSuppliers() {
    return []
  }

  async importStockFromExcel(excelData: ExcelStockRow[]): Promise<ImportResult> {
    const successes: any[] = []
    const errors: any[] = []

    for (const row of excelData) {
      try {
        // Map category to proper format
        let category = row.category
        if (category === 'Ham madde') category = 'HAMMADDE'
        if (category === 'Esans') category = 'KIMYASAL'

        // Insert stock item directly into database
        const { data: stockItem, error: stockError } = await supabase
          .from('stock_items')
          .insert({
            stock_code: row.stockCode,
            stock_name: row.stockName,
            category: category,
            unit: row.unit,
            current_amount: row.initialAmount,
            initial_amount: row.initialAmount,
            minimum_level: 0,
            supplier: row.supplier || null,
            system_entry_date: row.systemEntryDate,
            stock_entry_date: row.stockEntryDate,
            expiry_date: row.expiryDate || null,
            delivery_info: row.deliveryInfo || null,
            created_by: 'excel_import'
          })
          .select()
          .single()

        if (stockError) {
          errors.push({ 
            row, 
            error: `Stok kalemi eklenemedi: ${stockError.message}` 
          })
          continue
        }

        // Insert initial stock movement
        const { error: movementError } = await supabase
          .from('stock_movements')
          .insert({
            stock_item_id: stockItem.id,
            movement_date: row.stockEntryDate,
            movement_type: 'in',
            amount: row.initialAmount,
            remaining_amount: row.initialAmount,
            supplier: row.supplier || null,
            waybill_number: row.waybillNumber || null,
            reference_type: 'initial_import',
            created_by: 'excel_import'
          })

        if (movementError) {
          console.log('Movement error (non-critical):', movementError)
        }

        successes.push({
          stockItemId: stockItem.id,
          stockCode: row.stockCode
        })

      } catch (err: any) {
        errors.push({ 
          row, 
          error: `Beklenmeyen hata: ${err.message}` 
        })
      }
    }

    return { successes, errors }
  }
}

export const stockService = new TempStockService()
export default stockService
