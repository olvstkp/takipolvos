import React, { useState, useRef, useEffect } from 'react';
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

  const [labelType, setLabelType] = useState<string>('Koli etiketi');
  // Etiket boyutu (mm) - 104 x 50.8 mm
  const [labelWidth, setLabelWidth] = useState<number>(104);
  const [labelHeight, setLabelHeight] = useState<number>(50.8);
  // Yazıcı ayarları
  const [dpi, setDpi] = useState<203 | 300 | 600>(203);
  const [printerHost, setPrinterHost] = useState<string>(localStorage.getItem('zebra_printer_host') || '192.168.1.150');
  const [printerPort, setPrinterPort] = useState<number>(Number(localStorage.getItem('zebra_printer_port') || 9100));
  const [agentPort, setAgentPort] = useState<number>(Number(localStorage.getItem('zebra_agent_port') || 18080));
  const [zplCode, setZplCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // mm -> dots dönüşümü (ZPL koordinatları için)
  const mmToDots = (mm: number) => Math.round((dpi / 25.4) * mm);

  // ZPL'i görsel olarak render et
  const renderZPLPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Canvas boyutunu ayarla (1mm = 3.78 pixel)
    const scale = 3.78;
    canvas.width = labelWidth * scale;
    canvas.height = labelHeight * scale;

    // Arka planı temizle
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yazı ayarları
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';

    switch (labelType) {
      case 'Koli etiketi':
        // OLIVOS
        ctx.font = 'bold 25px Arial';
        ctx.fillText('OLIVOS', 20 * scale, 10 * scale);
        
        // Ürün adı
        ctx.font = '20px Arial';
        ctx.fillText(labelData.productName, 20 * scale, 35 * scale);
        
        // Miktar
        ctx.font = '15px Arial';
        ctx.fillText(labelData.amount, 20 * scale, 55 * scale);
        
        // Koli içi
        ctx.fillText(`Koli İçi: ${labelData.batchNumber}`, 20 * scale, 70 * scale);
        
        // Barkod simülasyonu
        ctx.fillStyle = '#333';
        ctx.fillRect(20 * scale, 85 * scale, 60 * scale, 15 * scale);
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText('8681917311582', 22 * scale, 87 * scale);
        break;
        
      case 'Numune Etiketi':
        ctx.font = 'bold 20px Arial';
        ctx.fillText('NUMUNE', 20 * scale, 10 * scale);
        
        ctx.font = '18px Arial';
        ctx.fillText(labelData.productName, 20 * scale, 30 * scale);
        
        ctx.font = '15px Arial';
        ctx.fillText(`Seri No: ${labelData.serialNumber}`, 20 * scale, 48 * scale);
        ctx.fillText(`Giriş: ${labelData.entryDate}`, 20 * scale, 66 * scale);
        ctx.fillText(`SKT: ${labelData.expiryDate}`, 20 * scale, 84 * scale);
        ctx.fillText(`Miktar: ${labelData.amount}`, 20 * scale, 102 * scale);
        ctx.fillText(`Parti: ${labelData.batchNumber}`, 20 * scale, 120 * scale);
        ctx.fillText(`Tedarikçi: ${labelData.supplier}`, 20 * scale, 138 * scale);
        
        // QR kod simülasyonu
        ctx.fillStyle = '#333';
        ctx.fillRect(20 * scale, 156 * scale, 40 * scale, 40 * scale);
        break;
        
      case 'Yarı Mamül Etiketi':
        ctx.font = 'bold 20px Arial';
        ctx.fillText('YARI MAMÜL', 20 * scale, 10 * scale);
        
        ctx.font = '18px Arial';
        ctx.fillText(labelData.productName, 20 * scale, 30 * scale);
        
        ctx.font = '15px Arial';
        ctx.fillText(`Seri No: ${labelData.serialNumber}`, 20 * scale, 48 * scale);
        ctx.fillText(`Giriş: ${labelData.entryDate}`, 20 * scale, 66 * scale);
        ctx.fillText(`SKT: ${labelData.expiryDate}`, 20 * scale, 84 * scale);
        ctx.fillText(`Miktar: ${labelData.amount}`, 20 * scale, 102 * scale);
        ctx.fillText(`Parti: ${labelData.batchNumber}`, 20 * scale, 120 * scale);
        ctx.fillText(`Tedarikçi: ${labelData.supplier}`, 20 * scale, 138 * scale);
        
        // QR kod simülasyonu
        ctx.fillStyle = '#333';
        ctx.fillRect(20 * scale, 156 * scale, 40 * scale, 40 * scale);
        break;
    }
  };

  // Canvas'ı güncelle
  useEffect(() => {
    if (showPreview) {
      renderZPLPreview();
    }
  }, [labelData, labelType, labelWidth, labelHeight, showPreview]);

  const generateZPL = () => {
    let zpl = '';
    const PW = mmToDots(labelWidth);
    const LL = mmToDots(labelHeight);
    
    switch (labelType) {
      case 'Koli etiketi':
        zpl = `
^XA
^PW${PW}
^LL${LL}
^FO${mmToDots(20)},${mmToDots(10)}^A0N,${mmToDots(6)},${mmToDots(6)}^FDOLIVOS^FS
^FO${mmToDots(20)},${mmToDots(35)}^A0N,${mmToDots(5)},${mmToDots(5)}^FD${labelData.productName}^FS
^FO${mmToDots(20)},${mmToDots(55)}^A0N,${mmToDots(4)},${mmToDots(4)}^FD${labelData.amount}^FS
^FO${mmToDots(20)},${mmToDots(70)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDKoli İçi: ${labelData.batchNumber}^FS
^FO${mmToDots(20)},${mmToDots(85)}^BY3^BCN,${mmToDots(12)},Y,N,N^FD8681917311582^FS
^XZ`.trim();
        break;
        
      case 'Numune Etiketi':
        zpl = `
^XA
^PW${PW}
^LL${LL}
^FO${mmToDots(20)},${mmToDots(10)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDNUMUNE^FS
^FO${mmToDots(20)},${mmToDots(30)}^A0N,${mmToDots(4.5)},${mmToDots(4.5)}^FD${labelData.productName}^FS
^FO${mmToDots(20)},${mmToDots(48)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDSeri No: ${labelData.serialNumber}^FS
^FO${mmToDots(20)},${mmToDots(66)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDGiriş: ${labelData.entryDate}^FS
^FO${mmToDots(20)},${mmToDots(84)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDSKT: ${labelData.expiryDate}^FS
^FO${mmToDots(20)},${mmToDots(102)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDMiktar: ${labelData.amount}^FS
^FO${mmToDots(20)},${mmToDots(120)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDParti: ${labelData.batchNumber}^FS
^FO${mmToDots(20)},${mmToDots(138)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDTedarikçi: ${labelData.supplier}^FS
^FO${mmToDots(20)},${mmToDots(156)}^BY3^BCN,${mmToDots(10)},Y,N,N^FD${labelData.serialNumber}^FS
^XZ`.trim();
        break;
        
      case 'Yarı Mamül Etiketi':
        zpl = `
^XA
^PW${PW}
^LL${LL}
^FO${mmToDots(20)},${mmToDots(10)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDYARI MAMÜL^FS
^FO${mmToDots(20)},${mmToDots(30)}^A0N,${mmToDots(4.5)},${mmToDots(4.5)}^FD${labelData.productName}^FS
^FO${mmToDots(20)},${mmToDots(48)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDSeri No: ${labelData.serialNumber}^FS
^FO${mmToDots(20)},${mmToDots(66)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDGiriş: ${labelData.entryDate}^FS
^FO${mmToDots(20)},${mmToDots(84)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDSKT: ${labelData.expiryDate}^FS
^FO${mmToDots(20)},${mmToDots(102)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDMiktar: ${labelData.amount}^FS
^FO${mmToDots(20)},${mmToDots(120)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDParti: ${labelData.batchNumber}^FS
^FO${mmToDots(20)},${mmToDots(138)}^A0N,${mmToDots(4)},${mmToDots(4)}^FDTedarikçi: ${labelData.supplier}^FS
^FO${mmToDots(20)},${mmToDots(156)}^BY3^BCN,${mmToDots(10)},Y,N,N^FD${labelData.serialNumber}^FS
^XZ`.trim();
        break;
        
      default:
        zpl = `
^XA
^PW${PW}
^LL${LL}
^FO${mmToDots(50)},${mmToDots(50)}^A0N,${mmToDots(7)},${mmToDots(7)}^FD${labelData.productName}^FS
^FO${mmToDots(50)},${mmToDots(100)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDSeri No: ${labelData.serialNumber}^FS
^FO${mmToDots(50)},${mmToDots(130)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDGiriş: ${labelData.entryDate}^FS
^FO${mmToDots(50)},${mmToDots(160)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDSKU: ${labelData.expiryDate}^FS
^FO${mmToDots(50)},${mmToDots(190)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDMiktar: ${labelData.amount}^FS
^FO${mmToDots(50)},${mmToDots(220)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDIrsaliye: ${labelData.invoiceNumber}^FS
^FO${mmToDots(50)},${mmToDots(250)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDParti: ${labelData.batchNumber}^FS
^FO${mmToDots(50)},${mmToDots(280)}^A0N,${mmToDots(5)},${mmToDots(5)}^FDTedarikçi: ${labelData.supplier}^FS
^FO${mmToDots(300)},${mmToDots(50)}^BQN,2,6^FDQA,${labelData.serialNumber}^FS
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
      // Canvas'ı yazdır
      const canvas = canvasRef.current;
      if (canvas) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Etiket Yazdır</title>
                <style>
                  body { margin: 0; padding: 20px; }
                  .label { display: inline-block; border: 1px solid #ccc; }
                </style>
              </head>
              <body>
                <div class="label">
                  <img src="${canvas.toDataURL()}" style="width: ${labelWidth}mm; height: ${labelHeight}mm;" />
                </div>
                <script>
                  window.onload = function() {
                    window.print();
                    setTimeout(() => window.close(), 1000);
                  }
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      }
      
    } catch (error) {
      console.error('Yazdırma hatası:', error);
      alert('Yazdırma başarısız. Lütfen yazıcı bağlantısını kontrol edin.');
    }
  };

  // Zebra'ya (yerel ajan üzerinden) gönder
  const sendToPrinter = async () => {
    if (!zplCode) {
      alert('Önce ZPL kodunu oluşturun.');
      return;
    }
    try {
      localStorage.setItem('zebra_printer_host', printerHost);
      localStorage.setItem('zebra_printer_port', String(printerPort));
      localStorage.setItem('zebra_agent_port', String(agentPort));

      const res = await fetch(`http://localhost:${agentPort}/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zpl: zplCode, host: printerHost, port: printerPort })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Yazdırma hatası');
      alert('Zebra yazıcıya gönderildi.');
    } catch (err: any) {
      console.error('Zebra gönderim hatası:', err);
      alert(`Gönderim başarısız: ${err.message}. Lütfen yerel yazıcı ajanının çalıştığından emin olun.`);
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
            {/* Yazıcı/DPI Ayarları */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DPI</label>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value) as 203 | 300 | 600)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={203}>203 dpi (8 dpmm)</option>
                  <option value={300}>300 dpi (12 dpmm)</option>
                  <option value={600}>600 dpi (24 dpmm)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ajan Portu (Yerel)</label>
                <input
                  type="number"
                  value={agentPort}
                  onChange={(e) => setAgentPort(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={1024}
                  max={65535}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zebra Yazıcı IP</label>
                <input
                  type="text"
                  value={printerHost}
                  onChange={(e) => setPrinterHost(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="192.168.1.150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Yazıcı Portu</label>
                <input
                  type="number"
                  value={printerPort}
                  onChange={(e) => setPrinterPort(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={1}
                  max={65535}
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

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={sendToPrinter}
              disabled={!zplCode}
              className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
            >
              <Printer className="w-4 h-4 mr-2" />
              Zebra'ya Gönder (Yerel Ajan)
            </button>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Etiket Önizleme</h3>
          
          {/* Canvas Preview */}
          {showPreview && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 mb-4">
              <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4">
                <canvas
                  ref={canvasRef}
                  className="w-full h-auto border border-gray-300"
                  style={{ 
                    width: `${labelWidth * 3.78}px`, 
                    height: `${labelHeight * 3.78}px`,
                    maxWidth: '100%'
                  }}
                />
              </div>
            </div>
          )}

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