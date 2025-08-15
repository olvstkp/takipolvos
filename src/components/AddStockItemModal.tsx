import React, { useState, useEffect } from 'react'
import { StockCodeCategory, CreateStockItemRequest } from '../types/stock'
import stockService from '../services/stockServiceTemp'

interface AddStockItemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (item: any) => void
}

export default function AddStockItemModal({ isOpen, onClose, onSuccess }: AddStockItemModalProps) {
  const [formData, setFormData] = useState<CreateStockItemRequest>({
    stockName: '',
    category: '',
    unit: 'KG',
    initialAmount: 0,
    minimumLevel: 0,
    supplier: '',
    costPerUnit: 0,
    description: '',
    storageLocation: '',
    expiryDate: '',
    deliveryInfo: ''
  })

  const [categories, setCategories] = useState<StockCodeCategory[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [previewCode, setPreviewCode] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  useEffect(() => {
    if (formData.category && formData.stockName) {
      generatePreviewCode()
    }
  }, [formData.category, formData.stockName])

  const loadData = async () => {
    try {
      const [categoriesData, suppliersData] = await Promise.all([
        stockService.getStockCodeCategories(),
        stockService.getStockSuppliers()
      ])
      setCategories(categoriesData)
      setSuppliers(suppliersData)
    } catch (err: any) {
      setError('Veri yüklenirken hata oluştu: ' + err.message)
    }
  }

  const generatePreviewCode = async () => {
    try {
      const code = await stockService.previewStockCode(formData.category, formData.stockName)
      setPreviewCode(code)
    } catch (err) {
      setPreviewCode('HATA')
    }
  }

  const handleInputChange = (field: keyof CreateStockItemRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!formData.stockName.trim()) {
        throw new Error('Stok adı gereklidir')
      }
      if (!formData.category) {
        throw new Error('Kategori seçimi gereklidir')
      }
      if (!formData.unit.trim()) {
        throw new Error('Birim gereklidir')
      }
      if (formData.initialAmount < 0) {
        throw new Error('Başlangıç miktarı 0 veya pozitif olmalıdır')
      }

      const newItem = await stockService.createStockItem(formData)
      onSuccess(newItem)
      resetForm()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      stockName: '',
      category: '',
      unit: 'KG',
      initialAmount: 0,
      minimumLevel: 0,
      supplier: '',
      costPerUnit: 0,
      description: '',
      storageLocation: '',
      expiryDate: '',
      deliveryInfo: ''
    })
    setPreviewCode('')
    setError('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Yeni Stok Kalemi Ekle</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stok Adı */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Stok Adı *
              </label>
              <input
                type="text"
                value={formData.stockName}
                onChange={(e) => handleInputChange('stockName', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ürün adını girin"
                required
              />
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Kategori seçin</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.categoryName}>
                    {cat.categoryName} ({cat.categoryCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Stok Kodu Önizleme */}
            {previewCode && (
              <div className="bg-blue-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  Stok Kodu (Otomatik)
                </label>
                <p className="font-mono text-lg font-semibold text-blue-800">
                  {previewCode}
                </p>
              </div>
            )}

            {/* Birim ve Miktar */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birim *
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => handleInputChange('unit', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="KG">Kilogram (KG)</option>
                  <option value="LT">Litre (LT)</option>
                  <option value="ADET">Adet</option>
                  <option value="M">Metre (M)</option>
                  <option value="M2">Metrekare (M²)</option>
                  <option value="M3">Metreküp (M³)</option>
                  <option value="TON">Ton</option>
                  <option value="KUTU">Kutu</option>
                  <option value="PAKET">Paket</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlangıç Miktarı
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={formData.initialAmount}
                  onChange={(e) => handleInputChange('initialAmount', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Minimum Seviye ve Birim Fiyat */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Seviye
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  value={formData.minimumLevel}
                  onChange={(e) => handleInputChange('minimumLevel', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birim Fiyat (TL)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.costPerUnit}
                  onChange={(e) => handleInputChange('costPerUnit', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Tedarikçi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tedarikçi
              </label>
              <select
                value={formData.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tedarikçi seçin</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Depo Lokasyonu ve SKT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Depo Lokasyonu
                </label>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => handleInputChange('storageLocation', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Raf A1, Depom 3, vb."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Son Kullanma Tarihi
                </label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Teslimat Bilgisi */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teslimat Bilgisi
              </label>
              <input
                type="text"
                value={formData.deliveryInfo}
                onChange={(e) => handleInputChange('deliveryInfo', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Teslimat detayları"
              />
            </div>

            {/* Açıklama */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ek bilgiler ve notlar"
              />
            </div>

            {/* Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Ekleniyor...' : 'Stok Kalemi Ekle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
