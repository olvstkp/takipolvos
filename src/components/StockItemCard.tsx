import React from 'react'
import { CheckSquare, Square } from 'lucide-react'
import { StockItem, StockAlert } from '../types/stock'

interface StockItemCardProps {
  item: StockItem
  alerts?: StockAlert[]
  selected?: boolean
  onEdit?: (item: StockItem) => void
  onDelete?: (item: StockItem) => void
  onAddMovement?: (item: StockItem) => void
  onSelect?: (item: StockItem, selected: boolean) => void
}

export default function StockItemCard({ 
  item, 
  alerts = [], 
  selected = false,
  onEdit, 
  onDelete, 
  onAddMovement,
  onSelect
}: StockItemCardProps) {
  const isLowStock = item.currentAmount <= item.minimumLevel
  const isOutOfStock = item.currentAmount <= 0
  const hasAlerts = alerts.length > 0

  const getStockStatusColor = () => {
    if (isOutOfStock) return 'bg-red-100 border-red-300'
    if (isLowStock) return 'bg-yellow-100 border-yellow-300'
    return 'bg-white border-gray-200'
  }

  const getStockStatusText = () => {
    if (isOutOfStock) return 'Stok Tükendi'
    if (isLowStock) return 'Düşük Stok'
    return 'Normal'
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('tr-TR')
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  return (
    <div className={`rounded-lg border-2 p-4 transition-all hover:shadow-md ${getStockStatusColor()} ${
      selected ? 'ring-2 ring-blue-500 border-blue-300' : ''
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          {onSelect && (
            <button
              onClick={() => onSelect(item, !selected)}
              className="mt-1 text-gray-500 hover:text-gray-700"
            >
              {selected ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
          )}
          <div>
            <h3 className="font-semibold text-lg text-gray-900">
              {item.stockName}
            </h3>
            <p className="text-sm text-gray-600 font-mono">
              {item.stockCode}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasAlerts && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
              {alerts.length} Uyarı
            </span>
          )}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isOutOfStock 
              ? 'bg-red-100 text-red-800'
              : isLowStock 
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
          }`}>
            {getStockStatusText()}
          </span>
        </div>
      </div>

      {/* Stock Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600">Mevcut Miktar</p>
          <p className="font-semibold text-lg">
            {item.currentAmount.toLocaleString('tr-TR')} {item.unit}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Minimum Seviye</p>
          <p className="font-semibold">
            {item.minimumLevel.toLocaleString('tr-TR')} {item.unit}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Kategori</p>
          <p className="font-medium">{item.category}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Tedarikçi</p>
          <p className="font-medium">{item.supplier || '-'}</p>
        </div>
      </div>

      {/* Additional Info */}
      {(item.costPerUnit || item.expiryDate) && (
        <div className="grid grid-cols-2 gap-4 mb-4 pt-3 border-t border-gray-200">
          {item.costPerUnit && (
            <div>
              <p className="text-sm text-gray-600">Birim Fiyat</p>
              <p className="font-medium">{formatCurrency(item.costPerUnit)}</p>
            </div>
          )}
          {item.expiryDate && (
            <div>
              <p className="text-sm text-gray-600">Son Kullanma</p>
              <p className="font-medium">{formatDate(item.expiryDate)}</p>
            </div>
          )}
        </div>
      )}

      {/* Storage Info */}
      {(item.storageLocation || item.deliveryInfo) && (
        <div className="mb-4 pt-3 border-t border-gray-200">
          {item.storageLocation && (
            <div className="mb-2">
              <p className="text-sm text-gray-600">Depo Lokasyonu</p>
              <p className="font-medium">{item.storageLocation}</p>
            </div>
          )}
          {item.deliveryInfo && (
            <div>
              <p className="text-sm text-gray-600">Teslimat Bilgisi</p>
              <p className="font-medium">{item.deliveryInfo}</p>
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {hasAlerts && (
        <div className="mb-4 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-2">Aktif Uyarılar</p>
          <div className="space-y-1">
            {alerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {alert.message}
              </div>
            ))}
            {alerts.length > 2 && (
              <p className="text-xs text-gray-500">+{alerts.length - 2} ek uyarı</p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-2 pt-3 border-t border-gray-200">
        {onAddMovement && (
          <button
            onClick={() => onAddMovement(item)}
            className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Hareket Ekle
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Düzenle
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(item)}
            className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            Sil
          </button>
        )}
      </div>

      {/* Dates Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Sisteme Giriş: {formatDate(item.systemEntryDate)}</span>
          <span>Güncelleme: {formatDate(item.updatedAt)}</span>
        </div>
      </div>
    </div>
  )
}
