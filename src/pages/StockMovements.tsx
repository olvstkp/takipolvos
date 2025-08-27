import React, { useState, useEffect } from 'react';
import { Search, Plus, ArrowUp, ArrowDown, Calendar } from 'lucide-react';
import { stockService } from '../services/stockService';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import type {
  StockMovement,
  StockItem,
  CreateStockMovementRequest
} from '../types/stock';

const StockMovements: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'selected' | 'all'>('selected');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [movementsData, stockItemsData] = await Promise.all([
          stockService.getStockMovements(),
          stockService.getStockItems()
        ]);
        setMovements(movementsData);
        setStockItems(stockItemsData.items);
        setError(null);
      } catch (err) {
        setError('Veri yüklenirken hata oluştu');
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredMovements = movements
    .map(movement => {
      const related = (movement as any).stockItem
      const fallback = stockItems.find(item => item.id === movement.stockItemId)
      return {
        ...movement,
        stockItemName: related?.stock_name || related?.stockName || fallback?.stockName || 'Bilinmeyen Ürün',
        unit: related?.unit || fallback?.unit || '',
        amount: Number(movement.amount || 0),
        remainingAmount: Number((movement as any).remainingAmount || 0)
      }
    })
    .filter(movement => {
      const matchesSearch = (movement.stockItemName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (movement.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (movement.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || movement.movementType === selectedType;
      const matchesDate = (!dateFrom || movement.movementDate >= dateFrom) &&
                         (!dateTo || movement.movementDate <= dateTo);
      return matchesSearch && matchesType && matchesDate;
    });

  const allSelected = selectedIds.length > 0 && selectedIds.length === filteredMovements.length;

  const MovementForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [selectedCategory, setSelectedCategory] = useState<string>('')
    const [filteredItems, setFilteredItems] = useState<StockItem[]>([])
    const [itemSearch, setItemSearch] = useState('')
    const [formData, setFormData] = useState<CreateStockMovementRequest>({
      stockItemId: '',
      movementType: 'in',
      amount: 0,
      supplier: '',
      expiryDate: '',
      serialNumber: '',
      invoiceNumber: '',
      waybillNumber: '',
      batchNumber: '',
      unitCost: 0,
      notes: '',
      referenceType: 'manual',
      deliveryInfo: ''
    });
    const [submitIntent, setSubmitIntent] = useState(false)
    const [serialEdited, setSerialEdited] = useState(false)

    // Stock code preview helpers (from stock_workflows_and_codes.md)
    const generateProductPrefix = (productName: string): string => {
      const source = (productName || '').toUpperCase().trim()
      const only = source.replace(/\s+/g, '')
      const result: string[] = []
      for (const ch of only) {
        if (/[A-ZÇĞİÖŞÜ]/.test(ch)) {
          result.push(ch)
          if (result.length === 3) break
        }
      }
      while (result.length < 3) result.push('X')
      return result.join('')
    }

    const getTodayYYMMDD = (): string => {
      const d = new Date()
      const yy = String(d.getFullYear()).slice(-2)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return yy + mm + dd
    }

    const previewStockCode = (category: string, productName: string): string => {
      const categoryMap: Record<string, string> = {
        'HAMMADDE': 'HA', 'Hammadde': 'HA',
        'KIMYASAL': 'KM', 'Kimyasal': 'KM',
        'AMBALAJ': 'AM', 'Ambalaj': 'AM',
        'YARDIMCI MALZEME': 'YA', 'Yardımcı Malzeme': 'YA'
      }
      const categoryCode = categoryMap[category] || 'XX'
      const productPrefix = generateProductPrefix(productName || '')
      const dateStr = getTodayYYMMDD() // YYMMDD
      const lot = '01'
      return `${categoryCode}${productPrefix}${dateStr}${lot}`
    }

    const [stockCodePreview, setStockCodePreview] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
      // Sadece "Ekle" butonuyla gelmişse izin ver
      if (!submitIntent) {
        e.preventDefault()
        return
      }
      e.preventDefault();
      try {
        await stockService.createStockMovement(formData);
        // Reload data to show the new movement
        const [movementsData, stockItemsData] = await Promise.all([
          stockService.getStockMovements(),
          stockService.getStockItems()
        ]);
        setMovements(movementsData);
        setStockItems(stockItemsData.items);
        onClose();
      } catch (err) {
        console.error('Error creating movement:', err);
        alert('Hareket eklenirken hata oluştu');
      } finally {
        setSubmitIntent(false)
      }
    };

    // Kategori değişince ürünleri filtrele
    useEffect(() => {
      // Step 3'e gelindiğinde varsayılan SKT = bugün + 5 yıl
      if (step === 3 && !formData.expiryDate) {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 5)
        const iso = d.toISOString().split('T')[0]
        setFormData(prev => ({ ...prev, expiryDate: iso }))
      }

      let base = !selectedCategory ? stockItems : stockItems.filter(i => i.category === selectedCategory)
      if (itemSearch.trim()) {
        const q = itemSearch.trim().toLowerCase()
        base = base.filter(i =>
          (i.stockName || '').toLowerCase().includes(q) ||
          (i.stockCode || '').toLowerCase().includes(q)
        )
      }
      setFilteredItems(base)
      // preview code for selected item
      const currentItem = stockItems.find(i => i.id === formData.stockItemId)
      if (currentItem) {
        setStockCodePreview(previewStockCode(currentItem.category, currentItem.stockName))
      } else {
        setStockCodePreview('')
      }
    }, [selectedCategory, stockItems, itemSearch, step, formData.expiryDate, formData.stockItemId])

    // Step 3'te otomatik stok kodunu seri no alanına yaz (kullanıcı düzenlemediyse)
    useEffect(() => {
      if (step === 3 && stockCodePreview && !serialEdited) {
        setFormData(prev => ({ ...prev, serialNumber: stockCodePreview }))
      }
    }, [step, stockCodePreview, serialEdited])

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Yeni Stok Hareketi Ekle</h3>

          {/* Stepper */}
          <div className="flex items-center mb-6">
            {[1,2,3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= (s as 1|2|3) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{s}</div>
                {s !== 3 && <div className={`w-16 h-1 ${step > (s as number) ? 'bg-blue-600' : 'bg-gray-200'}`}></div>}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hareket Türü</label>
                  <select
                    value={formData.movementType}
                    onChange={(e) => setFormData({...formData, movementType: e.target.value as 'in' | 'out'})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="in">Giriş</option>
                    <option value="out">Çıkış</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Tümü</option>
                    {[...new Set(stockItems.map(i => i.category))].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stok Kalemi</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    placeholder="İsim veya kod ile ara..."
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent col-span-2"
                  />
                  <select
                    value={formData.stockItemId}
                    onChange={(e) => setFormData({...formData, stockItemId: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent col-span-2"
                    size={8}
                    required
                  >
                    {filteredItems.map(item => (
                      <option key={item.id} value={item.id}>
                        {(item.stockCode || '') + (item.stockName ? ` - ${item.stockName}` : '')}
                      </option>
                    ))}
                  </select>
                  {stockCodePreview && (
                    <div className="col-span-2 text-sm text-gray-600">
                      Oluşacak stok kodu (önizleme):
                      <span className="font-mono ml-2 px-2 py-1 bg-gray-100 rounded">{stockCodePreview}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (<>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Son Kullanma Tarihi</label>
                <input
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seri No (Stok Kodu)</label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => { setFormData({...formData, serialNumber: e.target.value}); setSerialEdited(true) }}
                  placeholder="Stok kodu otomatik dolacak, gerekirse değiştirin"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fatura No</label>
                <input
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({...formData, invoiceNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İrsaliye No</label>
                <input
                  type="text"
                  value={formData.waybillNumber}
                  onChange={(e) => setFormData({...formData, waybillNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parti No</label>
                <input
                  type="text"
                  value={formData.batchNumber}
                  onChange={(e) => setFormData({...formData, batchNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Referans Türü</label>
                <select
                  value={formData.referenceType}
                  onChange={(e) => setFormData({...formData, referenceType: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="manual">Manuel</option>
                  <option value="purchase">Satın Alma</option>
                  <option value="production">Üretim</option>
                  <option value="adjustment">Düzeltme</option>
                  <option value="return">İade</option>
                </select>
              </div>
            </div>

            {/* Teslimat bilgisi kaldırıldı */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>
            </>)}

            <div className="flex justify-between space-x-3 pt-4">
              <div>
                <button
                  type="button"
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1|2|3) : s))}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  disabled={step === 1}
                >
                  Geri
                </button>
              </div>
              <div className="space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  İptal
                </button>
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 1) {
                        setStep(2)
                      } else if (step === 2) {
                        if (!formData.stockItemId) return
                        setStep(3)
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    disabled={(step === 2 && !formData.stockItemId)}
                  >
                    İleri
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    onClick={async (e) => {
                      // gerekli alanları doldurmadan submit’i engelle
                      if (!formData.stockItemId || !formData.amount || formData.amount <= 0) {
                        e.preventDefault()
                        alert('Lütfen ürün seçin ve miktarı girin.')
                      } else {
                        try {
                          const item = await stockService.getStockItemById(formData.stockItemId)
                          if (item?.stockCode) {
                            setFormData(prev => ({ ...prev, serialNumber: item.stockCode }))
                          }
                        } catch {}
                        setSubmitIntent(true)
                      }
                    }}
                  >
                    Ekle
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stok Hareketleri</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Hareket Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Ürün adı veya seri no ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Başlangıç"
              />
            </div>
          </div>
          <div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Bitiş"
              />
            </div>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Hareketler</option>
            <option value="in">Giriş</option>
            <option value="out">Çıkış</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <div className="text-center text-gray-500 dark:text-gray-400">
            Yükleniyor...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <div className="text-center text-red-500">
            {error}
          </div>
        </div>
      )}

      {/* Movements Table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Seçili: {selectedIds.length}
            </div>
            <div className="space-x-2">
              <button
                onClick={() => {
                  if (!selectedIds.length) return
                  setDeleteMode('selected')
                  setShowDeleteModal(true)
                }}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md disabled:opacity-50"
                disabled={!selectedIds.length}
              >
                Seçilenleri Sil
              </button>
              <button
                onClick={() => {
                  setDeleteMode('all')
                  setShowDeleteModal(true)
                }}
                className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-md"
              >
                Tümünü Sil
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredMovements.map(m => m.id))
                        } else {
                          setSelectedIds([])
                        }
                      }}
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ürün</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Miktar</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kalan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hareket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tedarikçi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SKT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Seri No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fatura</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İrsaliye</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Parti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMovements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(movement.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(prev => [...prev, movement.id])
                          else setSelectedIds(prev => prev.filter(id => id !== movement.id))
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {new Date(movement.movementDate).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div>
                        <div className="font-medium">{movement.stockItemName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {movement.unit}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {movement.amount.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {movement.remainingAmount.toLocaleString('tr-TR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        movement.movementType === 'in'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {movement.movementType === 'in' ? (
                          <ArrowUp className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDown className="w-3 h-3 mr-1" />
                        )}
                        {movement.movementType === 'in' ? 'Giriş' : 'Çıkış'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {movement.supplier || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {movement.expiryDate ? new Date(movement.expiryDate).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {movement.serialNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {movement.invoiceNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {movement.waybillNumber || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {movement.batchNumber || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <MovementForm onClose={() => setShowAddModal(false)} />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!deleteLoading) setShowDeleteModal(false)
        }}
        onConfirm={async () => {
          try {
            setDeleteLoading(true)
            if (deleteMode === 'selected') {
              await stockService.deleteStockMovementsByIds(selectedIds)
            } else {
              await stockService.deleteAllStockMovements()
            }
            const fresh = await stockService.getStockMovements()
            setMovements(fresh)
            setSelectedIds([])
            setShowDeleteModal(false)
          } catch (e) {
            alert('Silme sırasında hata oluştu')
          } finally {
            setDeleteLoading(false)
          }
        }}
        title={deleteMode === 'selected' ? 'Seçilenleri Sil' : 'Tümünü Sil'}
        message={deleteMode === 'selected'
          ? `${selectedIds.length} hareket kalıcı olarak silinecek. Bu işlem geri alınamaz.`
          : 'Tüm stok hareketleri kalıcı olarak silinecek. Bu işlem geri alınamaz.'}
        itemCount={deleteMode === 'selected' ? selectedIds.length : filteredMovements.length}
        loading={deleteLoading}
      />
    </div>
  );
};

export default StockMovements;