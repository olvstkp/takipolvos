import React, { useState, useRef } from 'react';
import { Search, Plus, Edit, Trash2, Upload, Download, FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  weight: number;
  price: number;
  currency: string;
  description: string;
  isActive: boolean;
  createdDate: string;
  lastUpdated: string;
}

interface ExcelColumn {
  key: string;
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date';
}

interface ColumnMapping {
  excelColumn: string;
  productField: string;
  fieldName: string;
}

const Products: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Excel import states
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview' | 'complete'>('upload');

  const categories = ['Katı Sabun', 'Sıvı Sabun', 'Özel Ürünler', 'Organik Ürünler'];

  const productFields: ExcelColumn[] = [
    { key: 'code', name: 'Ürün Kodu', type: 'text' },
    { key: 'name', name: 'Ürün Adı', type: 'text' },
    { key: 'category', name: 'Kategori', type: 'text' },
    { key: 'weight', name: 'Ağırlık (g)', type: 'number' },
    { key: 'price', name: 'Fiyat', type: 'number' },
    { key: 'currency', name: 'Para Birimi', type: 'text' },
    { key: 'description', name: 'Açıklama', type: 'text' },
    { key: 'isActive', name: 'Aktif', type: 'boolean' }
  ];

  const [products, setProducts] = useState<Product[]>([
    {
      id: '1',
      code: 'ZKS-180',
      name: 'Zeytinyağlı Kastil Sabunu 180g',
      category: 'Katı Sabun',
      weight: 180,
      price: 1.81,
      currency: 'USD',
      description: 'Doğal zeytinyağından yapılan geleneksel kastil sabun',
      isActive: true,
      createdDate: '2024-01-15',
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      code: 'LVT-180',
      name: 'Lavanta Sabunu 180g',
      category: 'Katı Sabun',
      weight: 180,
      price: 2.25,
      currency: 'USD',
      description: 'Lavanta yağı ile zenginleştirilmiş doğal sabun',
      isActive: true,
      createdDate: '2024-01-14',
      lastUpdated: '2024-01-14'
    },
    {
      id: '3',
      code: 'SES-5L',
      name: 'Sıvı El Sabunu 5L',
      category: 'Sıvı Sabun',
      weight: 5000,
      price: 19.75,
      currency: 'USD',
      description: 'Günlük kullanım için sıvı el sabunu',
      isActive: true,
      createdDate: '2024-01-13',
      lastUpdated: '2024-01-13'
    }
  ]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Excel file handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        }).filter(row => Object.values(row).some(val => val !== ''));

        setExcelColumns(headers);
        setExcelData(data);
        setImportStep('mapping');
        
        // Initialize column mappings
        const initialMappings: ColumnMapping[] = productFields.map(field => ({
          excelColumn: '',
          productField: field.key,
          fieldName: field.name
        }));
        setColumnMappings(initialMappings);
      } catch (error) {
        alert('Excel dosyası okunurken hata oluştu. Lütfen CSV formatında kaydettiğinizden emin olun.');
      }
    };
    reader.readAsText(file);
  };

  const updateColumnMapping = (productField: string, excelColumn: string) => {
    setColumnMappings(prev => prev.map(mapping => 
      mapping.productField === productField 
        ? { ...mapping, excelColumn }
        : mapping
    ));
  };

  const processImport = () => {
    const newProducts: Product[] = excelData.map((row, index) => {
      const product: any = {
        id: Date.now().toString() + index,
        createdDate: new Date().toISOString().split('T')[0],
        lastUpdated: new Date().toISOString().split('T')[0]
      };

      columnMappings.forEach(mapping => {
        if (mapping.excelColumn && row[mapping.excelColumn] !== undefined) {
          const value = row[mapping.excelColumn];
          
          if (mapping.productField === 'weight' || mapping.productField === 'price') {
            product[mapping.productField] = parseFloat(value) || 0;
          } else if (mapping.productField === 'isActive') {
            product[mapping.productField] = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'aktif';
          } else {
            product[mapping.productField] = value;
          }
        }
      });

      // Set defaults for required fields
      if (!product.code) product.code = `PRD-${Date.now()}-${index}`;
      if (!product.name) product.name = 'İsimsiz Ürün';
      if (!product.category) product.category = 'Katı Sabun';
      if (!product.currency) product.currency = 'USD';
      if (product.isActive === undefined) product.isActive = true;

      return product as Product;
    });

    setProducts(prev => [...prev, ...newProducts]);
    setImportStep('complete');
  };

  const exportToExcel = () => {
    const headers = ['Ürün Kodu', 'Ürün Adı', 'Kategori', 'Ağırlık (g)', 'Fiyat', 'Para Birimi', 'Açıklama', 'Aktif', 'Oluşturulma Tarihi'];
    
    // UTF-8 BOM ekleyerek Türkçe karakter desteği sağlıyoruz
    const csvContent = [
      headers.join(','),
      ...products.map(product => [
        product.code,
        `"${product.name}"`,
        product.category,
        product.weight,
        product.price,
        product.currency,
        `"${product.description}"`,
        product.isActive ? 'Aktif' : 'Pasif',
        product.createdDate
      ].join(','))
    ].join('\n');

    // UTF-8 BOM ekliyoruz (Excel'in Türkçe karakterleri doğru okuması için)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `urunler_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const ProductForm: React.FC<{ product?: Product; onClose: () => void }> = ({ product, onClose }) => {
    const [formData, setFormData] = useState({
      code: product?.code || '',
      name: product?.name || '',
      category: product?.category || 'Katı Sabun',
      weight: product?.weight || 0,
      price: product?.price || 0,
      currency: product?.currency || 'USD',
      description: product?.description || '',
      isActive: product?.isActive ?? true
    });

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (product) {
        setProducts(prev => prev.map(p => 
          p.id === product.id 
            ? { ...p, ...formData, lastUpdated: new Date().toISOString().split('T')[0] }
            : p
        ));
      } else {
        const newProduct: Product = {
          id: Date.now().toString(),
          ...formData,
          createdDate: new Date().toISOString().split('T')[0],
          lastUpdated: new Date().toISOString().split('T')[0]
        };
        setProducts(prev => [...prev, newProduct]);
      }
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {product ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Kodu</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Adı</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ağırlık (g)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => setFormData({...formData, weight: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fiyat</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Para Birimi</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="TRY">TRY</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Aktif Ürün
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                İptal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {product ? 'Güncelle' : 'Ekle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const ImportModal: React.FC = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Excel İçeri Aktarma</h3>
            <button
              onClick={() => {
                setShowImportModal(false);
                setImportStep('upload');
                setExcelData([]);
                setExcelColumns([]);
              }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center mb-6">
            <div className={`flex items-center ${importStep === 'upload' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                importStep === 'upload' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {importStep === 'upload' ? '1' : <Check className="w-4 h-4" />}
              </div>
              <span className="ml-2 text-sm font-medium">Dosya Yükle</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 mx-4"></div>
            <div className={`flex items-center ${
              importStep === 'mapping' ? 'text-blue-600' : 
              importStep === 'preview' || importStep === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                importStep === 'mapping' ? 'bg-blue-100 text-blue-600' : 
                importStep === 'preview' || importStep === 'complete' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {importStep === 'preview' || importStep === 'complete' ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className="ml-2 text-sm font-medium">Sütun Eşleştirme</span>
            </div>
            <div className="flex-1 h-px bg-gray-300 mx-4"></div>
            <div className={`flex items-center ${
              importStep === 'preview' ? 'text-blue-600' : 
              importStep === 'complete' ? 'text-green-600' : 'text-gray-400'
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                importStep === 'preview' ? 'bg-blue-100 text-blue-600' : 
                importStep === 'complete' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
              }`}>
                {importStep === 'complete' ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <span className="ml-2 text-sm font-medium">Önizleme & İçeri Aktar</span>
            </div>
          </div>

          {/* Upload Step */}
          {importStep === 'upload' && (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Excel Dosyası Yükle</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                CSV formatında kaydettiğiniz Excel dosyanızı seçin
              </p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 mx-auto"
              >
                <Upload className="w-4 h-4 mr-2" />
                Dosya Seç
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                Desteklenen formatlar: CSV, XLSX, XLS
              </p>
            </div>
          )}

          {/* Mapping Step */}
          {importStep === 'mapping' && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Sütun Eşleştirme</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Excel dosyanızdaki sütunları sistem alanlarıyla eşleştirin
              </p>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {columnMappings.map((mapping) => (
                  <div key={mapping.productField} className="grid grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {mapping.fieldName}
                      </label>
                    </div>
                    <div>
                      <select
                        value={mapping.excelColumn}
                        onChange={(e) => updateColumnMapping(mapping.productField, e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Sütun Seçin --</option>
                        {excelColumns.map((column) => (
                          <option key={column} value={column}>{column}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setImportStep('upload')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Geri
                </button>
                <button
                  onClick={() => setImportStep('preview')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Önizleme
                </button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {importStep === 'preview' && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Önizleme</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {excelData.length} ürün içeri aktarılacak
              </p>
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left">Ürün Kodu</th>
                      <th className="px-4 py-2 text-left">Ürün Adı</th>
                      <th className="px-4 py-2 text-left">Kategori</th>
                      <th className="px-4 py-2 text-left">Ağırlık</th>
                      <th className="px-4 py-2 text-left">Fiyat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {excelData.slice(0, 5).map((row, index) => {
                      const codeMapping = columnMappings.find(m => m.productField === 'code');
                      const nameMapping = columnMappings.find(m => m.productField === 'name');
                      const categoryMapping = columnMappings.find(m => m.productField === 'category');
                      const weightMapping = columnMappings.find(m => m.productField === 'weight');
                      const priceMapping = columnMappings.find(m => m.productField === 'price');
                      
                      return (
                        <tr key={index}>
                          <td className="px-4 py-2">{codeMapping?.excelColumn ? row[codeMapping.excelColumn] : '-'}</td>
                          <td className="px-4 py-2">{nameMapping?.excelColumn ? row[nameMapping.excelColumn] : '-'}</td>
                          <td className="px-4 py-2">{categoryMapping?.excelColumn ? row[categoryMapping.excelColumn] : '-'}</td>
                          <td className="px-4 py-2">{weightMapping?.excelColumn ? row[weightMapping.excelColumn] : '-'}</td>
                          <td className="px-4 py-2">{priceMapping?.excelColumn ? row[priceMapping.excelColumn] : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {excelData.length > 5 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  ... ve {excelData.length - 5} ürün daha
                </p>
              )}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setImportStep('mapping')}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Geri
                </button>
                <button
                  onClick={processImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  İçeri Aktar
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {importStep === 'complete' && (
            <div className="text-center py-12">
              <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">İçeri Aktarma Tamamlandı!</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {excelData.length} ürün başarıyla içeri aktarıldı
              </p>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStep('upload');
                  setExcelData([]);
                  setExcelColumns([]);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Tamam
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Ürünler</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <Upload className="w-4 h-4 mr-2" />
            Excel İçeri Aktar
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Excel Dışarı Aktar
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Yeni Ürün Ekle
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <FileSpreadsheet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Toplam Ürün</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Aktif Ürün</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.filter(p => p.isActive).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <AlertCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Kategori Sayısı</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{categories.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900">
              <FileSpreadsheet className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Ortalama Fiyat</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${products.length > 0 ? (products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Ürün adı veya kodu ara..."
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

      {/* Products Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ürün Kodu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ürün Adı</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ağırlık</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fiyat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {product.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{product.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.weight}g
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {product.price.toFixed(2)} {product.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowAddModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setProducts(prev => prev.filter(p => p.id !== product.id))}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
        <ProductForm
          product={editingProduct}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
        />
      )}

      {/* Import Modal */}
      {showImportModal && <ImportModal />}
    </div>
  );
};

export default Products;