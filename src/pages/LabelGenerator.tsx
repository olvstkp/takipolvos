import React, { useState } from 'react';
import { Printer, QrCode, Download, Upload } from 'lucide-react';

interface LabelData {
  productName: string;
  serialNumber: string;
  entryDate: string;
  expiryDate: string;
  amount: string;
  invoiceNumber: string;
  batchNumber: string;
  supplier: string;
  logo: string;
}

const LabelGenerator: React.FC = () => {
  const [labelData, setLabelData] = useState<LabelData>({
    productName: '',
    serialNumber: '',
    entryDate: '',
    expiryDate: '',
    amount: '',
    invoiceNumber: '',
    batchNumber: '',
    supplier: '',
    logo: ''
  });

  const [zplCode, setZplCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const generateZPL = () => {
    const zpl = `
^XA
^FO50,50^A0N,30,30^FD${labelData.productName}^FS
^FO50,100^A0N,20,20^FDSeri No: ${labelData.serialNumber}^FS
^FO50,130^A0N,20,20^FDGiriş: ${labelData.entryDate}^FS
^FO50,160^A0N,20,20^FDSKU: ${labelData.expiryDate}^FS
^FO50,190^A0N,20,20^FDMiktar: ${labelData.amount}^FS
^FO50,220^A0N,20,20^FDIrsaliye: ${labelData.invoiceNumber}^FS
^FO50,250^A0N,20,20^FDParti: ${labelData.batchNumber}^FS
^FO50,280^A0N,20,20^FDTedarikçi: ${labelData.supplier}^FS
^FO300,50^BQN,2,6^FDQA,${labelData.serialNumber}^FS
^XZ
    `.trim();
    
    setZplCode(zpl);
    setShowPreview(true);
  };

  const printLabel = () => {
    // Zebra yazıcı ile bağlantı simülasyonu
    if (zplCode) {
      alert('Etiket yazdırılıyor...\n\nZebra yazıcıya ZPL kodu gönderildi.');
      // Gerçek implementasyonda burada Zebra yazıcı API'si kullanılacak
      console.log('ZPL Code:', zplCode);
    } else {
      alert('Önce ZPL kodunu oluşturun.');
    }
  };

  const downloadZPL = () => {
    if (zplCode) {
      const blob = new Blob([zplCode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `etiket_${labelData.serialNumber || 'yeni'}.zpl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etiket Oluşturucu</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Zebra Yazıcı Desteği
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Etiket Bilgileri</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Adı</label>
              <input
                type="text"
                value={labelData.productName}
                onChange={(e) => setLabelData({...labelData, productName: e.target.value})}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: Zeytinyağlı Kastil Sabunu"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seri No</label>
                <input
                  type="text"
                  value={labelData.serialNumber}
                  onChange={(e) => setLabelData({...labelData, serialNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="ZKS-2024-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parti No</label>
                <input
                  type="text"
                  value={labelData.batchNumber}
                  onChange={(e) => setLabelData({...labelData, batchNumber: e.target.value})}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="BATCH-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Tarihi</label>
                <input
                  type="date"
                  value={labelData.entryDate}
                  onChange={(e) => setLabelData({...labelData, entryDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Son Kullanma Tarihi</label>
                <input
                  type="date"
                  value={labelData.expiryDate}
                  onChange={(e) => setLabelData({...labelData, expiryDate: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Miktar</label>
              <input
                type="text"
                value={labelData.amount}
                onChange={(e) => setLabelData({...labelData, amount: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="500 g"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">İrsaliye No</label>
              <input
                type="text"
                value={labelData.invoiceNumber}
                onChange={(e) => setLabelData({...labelData, invoiceNumber: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="INV-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tedarikçi</label>
              <input
                type="text"
                value={labelData.supplier}
                onChange={(e) => setLabelData({...labelData, supplier: e.target.value})}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Akdeniz Gıda"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo (İsteğe Bağlı)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Logo Yükle
                </label>
                <span className="text-sm text-gray-500">PNG, JPG (Max 100KB)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <button
              onClick={generateZPL}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <QrCode className="w-4 h-4 mr-2" />
              ZPL Kodunu Oluştur
            </button>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={downloadZPL}
                disabled={!zplCode}
                className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                ZPL İndir
              </button>
              
              <button
                onClick={printLabel}
                disabled={!zplCode}
                className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4 mr-2" />
                Yazdır
              </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Etiket Önizleme</h3>
          
          {/* Label Preview */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 mb-4">
            <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 font-mono text-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    {labelData.productName || 'Ürün Adı'}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <div>Seri No: {labelData.serialNumber || 'XXX-XXXX-XXX'}</div>
                    <div>Giriş: {labelData.entryDate || 'XX/XX/XXXX'}</div>
                    <div>SKT: {labelData.expiryDate || 'XX/XX/XXXX'}</div>
                    <div>Miktar: {labelData.amount || 'XXX g'}</div>
                    <div>İrsaliye: {labelData.invoiceNumber || 'INV-XXXX-XXX'}</div>
                    <div>Parti: {labelData.batchNumber || 'BATCH-XXX'}</div>
                    <div>Tedarikçi: {labelData.supplier || 'Tedarikçi Adı'}</div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded border-2 border-gray-400 dark:border-gray-500 flex items-center justify-center">
                    <QrCode className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ZPL Code Display */}
          {zplCode && (
            <div className="mt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">ZPL Kodu:</h4>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-3">
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto">
                  {zplCode}
                </pre>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-md p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Yazdırma Talimatları:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Zebra yazıcının IP adresi ve port numarası ayarlanmalı</li>
              <li>• Etiket boyutu: 100mm x 50mm (4" x 2")</li>
              <li>• Isı transfer veya direct termal ribbon kullanın</li>
              <li>• Yazdırma hızı: 4 ips (inches per second)</li>
              <li>• Yazdırma kalitesi: 8 dpmm (dots per millimeter)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelGenerator;