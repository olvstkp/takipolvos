import React, { useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProductImportProps {
  onClose: () => void;
  onImportComplete: (products: ImportedProduct[]) => void;
}

interface ImportedProduct {
  name: string;
  price_per_piece: number;
  price_per_piece_usd: number;
}

const ProductImport: React.FC<ProductImportProps> = ({ onClose, onImportComplete }) => {
  const [importedProducts, setImportedProducts] = useState<ImportedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Excel şablonu indir
  const downloadTemplate = () => {
    const headers = ['Ürün Adı', 'Adet Fiyatı (EUR)', 'Adet Fiyatı (USD)'];
    const sampleData = [
      ['Zeytinyağlı Sabun 180g', '12,50', '13,75'],
      ['Lavanta Sabunu 180g', '15,00', '16,50'],
      ['Sıvı El Sabunu 500ml', '8,75', '9,63'],
      ['Zeytinyağlı Duş Jeli 750ml', '22,30', '24,53'],
      ['Lavanta Duş Jeli 750ml', '25,80', '28,38']
    ];
    
    // Excel dosyası oluştur
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    
    // Sütun genişliklerini ayarla
    const columnWidths = [
      { wch: 35 }, // Ürün Adı
      { wch: 18 }, // Adet Fiyatı (EUR)
      { wch: 18 }  // Adet Fiyatı (USD)
    ];
    worksheet['!cols'] = columnWidths;
    
    // Sayfayı workbook'a ekle
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ürün Şablonu');
    
    // Dosyayı indir
    XLSX.writeFile(workbook, 'urun_import_sablonu.xlsx');
    setSuccess('Excel şablonu başarıyla indirildi!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Excel dosyasını oku ve işle
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Excel'i JSON'a çevir
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // İlk satırı (başlıkları) atla
        const rows = jsonData.slice(1) as any[][];
        
        const products: ImportedProduct[] = [];
        
        rows.forEach((row) => {
          if (row.length >= 2 && row[0] && row[1]) {
            const product: ImportedProduct = {
              name: String(row[0]).trim(),
              price_per_piece: parseFloat(String(row[1]).replace(',', '.')) || 0,
              price_per_piece_usd: row[2] ? parseFloat(String(row[2]).replace(',', '.')) || 0 : 0
            };
            
            if (product.name && product.price_per_piece > 0) {
              products.push(product);
            }
          }
        });
        
        if (products.length === 0) {
          setError('Geçerli ürün verisi bulunamadı. Lütfen şablonu kontrol edin.');
        } else {
          setImportedProducts(products);
          setSuccess(`${products.length} ürün başarıyla yüklendi!`);
        }
      } catch (err) {
        setError('Dosya okunurken hata oluştu. Lütfen geçerli bir Excel dosyası seçin.');
      } finally {
        setIsProcessing(false);
      }
    };
    
    reader.readAsArrayBuffer(file);
  };

  // İçeri aktarma işlemini tamamla
  const handleImport = async () => {
    if (importedProducts.length > 0) {
      setIsProcessing(true);
      setError('');
      setSuccess('Ürünler veritabanına kaydediliyor...');
      
      try {
        await onImportComplete(importedProducts);
        setSuccess('Ürünler başarıyla veritabanına kaydedildi!');
        setTimeout(() => {
          onClose();
        }, 2000);
      } catch (err: any) {
        setError('Veritabanına kayıt sırasında hata oluştu.');
        setSuccess('');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Excel İçeri Aktarma</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Şablon İndirme Bölümü */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center mb-3">
            <FileSpreadsheet className="w-5 h-5 text-blue-600 mr-2" />
            <h4 className="font-medium text-blue-900 dark:text-blue-100">1. Şablon İndir</h4>
          </div>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            Önce Excel şablonunu indirin ve ürün bilgilerinizi girin. Fiyatları virgül (,) ile ayırın (örn: 12,50). Örnek verileri silip kendi verilerinizi ekleyin. Koli fiyatları otomatik hesaplanacak (12 adet/koli varsayımı).
          </p>
          <button
            onClick={downloadTemplate}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Şablon İndir
          </button>
        </div>

        {/* Dosya Yükleme Bölümü */}
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center mb-3">
            <Upload className="w-5 h-5 text-green-600 mr-2" />
            <h4 className="font-medium text-green-900 dark:text-green-100">2. Dosya Yükle</h4>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mb-3">
            Doldurduğunuz Excel dosyasını seçin. Fiyatlar virgül (,) ile ayrılmış olmalıdır.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700"
            disabled={isProcessing}
          />
        </div>

        {/* Hata ve Başarı Mesajları */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-green-700 dark:text-green-300 text-sm">{success}</span>
            </div>
          </div>
        )}

        {/* Yüklenen Ürünler Listesi */}
        {importedProducts.length > 0 && (
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Yüklenen Ürünler ({importedProducts.length})
            </h4>
            <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">Ürün Adı</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">EUR Fiyat</th>
                    <th className="px-3 py-2 text-left text-gray-600 dark:text-gray-300">USD Fiyat</th>
                  </tr>
                </thead>
                <tbody>
                  {importedProducts.map((product, index) => (
                    <tr key={index} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 text-gray-900 dark:text-white">{product.name}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">€{product.price_per_piece}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white">${product.price_per_piece_usd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* İşlem Durumu */}
        {isProcessing && (
          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
              <span className="text-yellow-700 dark:text-yellow-300 text-sm">Dosya işleniyor...</span>
            </div>
          </div>
        )}

        {/* Butonlar */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
          >
            İptal
          </button>
          <button
            onClick={handleImport}
            disabled={importedProducts.length === 0 || isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Veritabanına Kaydet ({importedProducts.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductImport; 