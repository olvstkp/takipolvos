import React, { useState } from 'react';
import { Search, Plus, Edit, Trash2, Package, AlertTriangle } from 'lucide-react';

interface StockItem {
  id: string;
  stockCode: string;
  productName: string;
  category: string;
  unit: string;
  currentAmount: number;
  minimumLevel: number;
  supplier: string;
  lastUpdate: string;
}

const StockManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const categories = ['Hammadde', 'Ambalaj', 'Kimyasal', 'Yardımcı Malzeme'];

  const [stockItems, setStockItems] = useState<StockItem[]>([
    {
      id: '1',
      stockCode: 'HM001',
      productName: 'Zeytinyağı',
      category: 'Hammadde',
      unit: 'Litre',
      currentAmount: 1500,
      minimumLevel: 200,
      supplier: 'Akdeniz Gıda',
      lastUpdate: '2024-01-15'
    },
    {
      id: '2',
      stockCode: 'KM002',
      productName: 'Kostik Soda',
      category: 'Kimyasal',
      unit: 'Kg',
      currentAmount: 45,
      minimumLevel: 50,
      supplier: 'Kimya Dünyası',
      lastUpdate: '2024-01-14'
    },
    {
      id: '3',
      stockCode: 'YM003',
      productName: 'Lavanta Yağı',
      category: 'Yardımcı Malzeme',
      unit: 'Litre',
      currentAmount: 8,
      minimumLevel: 10,
      supplier: 'Doğal Aromalar',
      lastUpdate: '2024-01-13'
    },
    {
      id: '4',
      stockCode: 'AM004',
      productName: 'Sabun Kalıbı',
      category: 'Ambalaj',
      unit: 'Adet',
      currentAmount: 15,
      minimumLevel: 20,
      supplier: 'Plastik Çözümler',
      lastUpdate: '2024-01-12'
    }
  ]);

  const filteredItems = stockItems.filter(item => {
    const matchesSearch = item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.stockCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockItems = stockItems.filter(item => item.currentAmount <= item.minimumLevel);

  const StockForm: React.FC<{ item?: StockItem; onClose: () => void }> = ({ item, onClose }) => {
    const [formData, setFormData] = useState({
      stockCode: item?.stockCode || '',
      productName: item?.productName || '',
      category: item?.category || 'Hammadde',
      unit: item?.unit || 'Kg',
      currentAmount: item?.currentAmount || 0,
      minimumLevel: item?.minimumLevel || 0,
      supplier: item?.supplier || ''
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (item) {
        setStockItems(prev => prev.map(i => 
          i.id === item.id 
            ? { ...i, ...formData, lastUpdate: new Date().toISOString().split('T')[0] }
            : i
        ));
      } else {
        const newItem: StockItem = {
          id: Date.now().toString(),
          ...formData,
          lastUpdate: new Date().toISOString().split('T')[0]
        };
        setStockItems(prev => [...prev, newItem]);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            {item ? 'Stok Ürünü Düzenle' : 'Yeni Stok Ürünü Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stok Kodu</label>
              <input
                type="text"
                value={formData.stockCode}
                onChange={(e) => setFormData({...formData, stockCode: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Adı</label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({...formData, productName: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Birim</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Kg">Kg</option>
                <option value="Litre">Litre</option>
                <option value="Adet">Adet</option>
                <option value="Gram">Gram</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut Miktar</label>
              <input
                type="number"
                value={formData.currentAmount}
                onChange={(e) => setFormData({...formData, currentAmount: Number(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Seviye</label>
              <input
                type="number"
                value={formData.minimumLevel}
                onChange={(e) => setFormData({...formData, minimumLevel: Number(e.target.value)})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {item ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Stok Yönetimi</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Stok Ürünü Ekle
        </button>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mr-2" />
            <span className="text-amber-800 dark:text-amber-200 font-medium">
              {lowStockItems.length} ürün minimum seviye altında!
            </span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Ürün adı veya stok kodu ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
           className="px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Kategoriler</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Table */}
     <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
           <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stok Kodu</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ürün Adı</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kategori</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Birim</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kalan Miktar</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Min. Seviye</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tedarikçi</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
               <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İşlemler</th>
              </tr>
            </thead>
           <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredItems.map((item) => (
               <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.stockCode}
                  </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.productName}
                  </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {item.category}
                  </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {item.unit}
                  </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.currentAmount.toLocaleString()}
                  </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {item.minimumLevel.toLocaleString()}
                  </td>
                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {item.supplier}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {item.currentAmount <= item.minimumLevel ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Azalıyor
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Package className="w-3 h-3 mr-1" />
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setShowAddModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setStockItems(prev => prev.filter(i => i.id !== item.id))}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <StockForm
          item={editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
        />
      )}
    </div>
  );
};

export default StockManagement;