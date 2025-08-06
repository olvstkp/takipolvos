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
    productName: 'ZEYTİNYAĞLI BALLI SIVI SABUN',
    serialNumber: 'ZBS-2024-001',
    entryDate: '2024-12-28',
    expiryDate: '2025-12-28',
    amount: '12 PCS X 450 ML',
    invoiceNumber: 'INV-2024-001',
    batchNumber: 'BATCH-20241228',
    supplier: 'Akdeniz Gıda Ltd. Şti.',
    logo: ''
  });

  const [zplCode, setZplCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [labelType, setLabelType] = useState<string>('Koli etiketi');
  const [labelWidth, setLabelWidth] = useState<number>(100);
  const [labelHeight, setLabelHeight] = useState<number>(50);

  const generateZPL = () => {
    let zpl = '';
    
    switch (labelType) {
      case 'Koli etiketi':
        zpl = `
^XA
^PW${labelWidth}
^LL${labelHeight}
^FO20,10^A0N,25,25^FDOLIVOS^FS
^FO20,35^A0N,20,20^FD${labelData.productName}^FS
^FO20,55^A0N,15,15^FD${labelData.amount}^FS
^FO20,70^A0N,15,15^FDKoli İçi: ${labelData.batchNumber}^FS
^FO20,85^BY3^BCN,50,Y,N,N^FD8681917311582^FS
^XZ`.trim();
        break;
        
      case 'Numune Etiketi':
        zpl = `
^XA
^PW${labelWidth}
^LL${labelHeight}
^FO20,10^A0N,20,20^FDNUMUNE^FS
^FO20,30^A0N,18,18^FD${labelData.productName}^FS
^FO20,48^A0N,15,15^FDSeri No: ${labelData.serialNumber}^FS
^FO20,66^A0N,15,15^FDGiriş: ${labelData.entryDate}^FS
^FO20,84^A0N,15,15^FDSKT: ${labelData.expiryDate}^FS
^FO20,102^A0N,15,15^FDMiktar: ${labelData.amount}^FS
^FO20,120^A0N,15,15^FDParti: ${labelData.batchNumber}^FS
^FO20,138^A0N,15,15^FDTedarikçi: ${labelData.supplier}^FS
^FO20,156^BY3^BCN,40,Y,N,N^FD${labelData.serialNumber}^FS
^XZ`.trim();
        break;
        
      case 'Yarı Mamül Etiketi':
        zpl = `
^XA
^PW${labelWidth}
^LL${labelHeight}
^FO20,10^A0N,20,20^FDYARI MAMÜL^FS
^FO20,30^A0N,18,18^FD${labelData.productName}^FS
^FO20,48^A0N,15,15^FDSeri No: ${labelData.serialNumber}^FS
^FO20,66^A0N,15,15^FDGiriş: ${labelData.entryDate}^FS
^FO20,84^A0N,15,15^FDSKT: ${labelData.expiryDate}^FS
^FO20,102^A0N,15,15^FDMiktar: ${labelData.amount}^FS
^FO20,120^A0N,15,15^FDParti: ${labelData.batchNumber}^FS
^FO20,138^A0N,15,15^FDTedarikçi: ${labelData.supplier}^FS
^FO20,156^BY3^BCN,40,Y,N,N^FD${labelData.serialNumber}^FS
^XZ`.trim();
        break;
        
      default:
        zpl = `
^XA
^PW${labelWidth}
^LL${labelHeight}
^FO50,50^A0N,30,30^FD${labelData.productName}^FS
^FO50,100^A0N,20,20^FDSeri No: ${labelData.serialNumber}^FS
^FO50,130^A0N,20,20^FDGiriş: ${labelData.entryDate}^FS
^FO50,160^A0N,20,20^FDSKU: ${labelData.expiryDate}^FS
^FO50,190^A0N,20,20^FDMiktar: ${labelData.amount}^FS
^FO50,220^A0N,20,20^FDIrsaliye: ${labelData.invoiceNumber}^FS
^FO50,250^A0N,20,20^FDParti: ${labelData.batchNumber}^FS
^FO50,280^A0N,20,20^FDTedarikçi: ${labelData.supplier}^FS
^FO300,50^BQN,2,6^FDQA,${labelData.serialNumber}^FS
^XZ`.trim();
    }
    
    setZplCode(zpl);
    setShowPreview(true);
  };

  const printLabel = async () => {
    if (!zplCode) {
      alert('Önce ZPL kodunu oluşturun.');
      return;
    }

    try {
      // ZPL'i clipboard'a kopyala
      await navigator.clipboard.writeText(zplCode);
      
      // Kullanıcıya talimat ver
      alert(`ZPL kodu clipboard'a kopyalandı!\n\nŞimdi:\n1. Zebra yazıcı yazılımını açın\n2. Ctrl+V ile yapıştırın\n3. Yazdırın`);
      
    } catch (error) {
      console.error('Clipboard hatası:', error);
      
      // Fallback: ZPL'i yeni pencerede göster
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>ZPL Kodu</title></head>
            <body>
              <h3>ZPL Kodu</h3>
              <p>Bu kodu Zebra yazıcı yazılımına kopyalayın:</p>
              <textarea style="width:100%;height:200px;font-family:monospace;">${zplCode}</textarea>
              <br><br>
              <button onclick="navigator.clipboard.writeText(document.querySelector('textarea').value)">Kopyala</button>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
      
      alert('ZPL kodu yeni pencerede açıldı. Kopyalayıp Zebra yazıcı yazılımına yapıştırın.');
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

          {/* Etiket Türü Seçimi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Etiket Türü</label>
            <select
              value={labelType}
              onChange={e => setLabelType(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Koli etiketi">Koli etiketi</option>
              <option value="Numune Etiketi">Numune Etiketi</option>
              <option value="Yarı Mamül Etiketi">Yarı Mamül Etiketi</option>
            </select>
          </div>
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

            {/* Etiket Boyutu Ayarları */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Etiket Boyutu Ayarları</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Genişlik (mm)</label>
                  <input
                    type="number"
                    value={labelWidth}
                    onChange={(e) => setLabelWidth(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="20"
                    max="200"
                    step="0.1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Yükseklik (mm)</label>
                  <input
                    type="number"
                    value={labelHeight}
                    onChange={(e) => setLabelHeight(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="10"
                    max="100"
                    step="0.1"
                  />
                </div>
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
              {labelType === 'Koli etiketi' ? (
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    OLIVOS
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {labelData.productName || 'Ürün Adı'}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {labelData.amount || 'XXX g/ml'}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    Koli İçi: {labelData.batchNumber || 'BATCH-XXX'}
                  </div>
                  <div className="w-full h-8 bg-gray-200 dark:bg-gray-600 rounded border-2 border-gray-400 dark:border-gray-500 flex items-center justify-center">
                    <span className="text-xs text-gray-500">8681917311582</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                      {labelType === 'Numune Etiketi' ? 'NUMUNE' : labelType === 'Yarı Mamül Etiketi' ? 'YARI MAMÜL' : labelData.productName || 'Ürün Adı'}
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
              )}
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
              <li>• Etiket boyutu: {labelWidth}mm x {labelHeight}mm</li>
              <li>• Isı transfer veya direct termal ribbon kullanın</li>
              <li>• Yazdırma hızı: 4 ips (inches per second)</li>
              <li>• Yazdırma kalitesi: 8 dpmm (dots per millimeter)</li>
              <li>• Koli etiketi: Barkod formatı Code 128</li>
              <li>• Numune/Yarı Mamül: QR kod formatı</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelGenerator;