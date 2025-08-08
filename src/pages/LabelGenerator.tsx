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
  barcode?: string; // EAN-13
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
    logo: '',
    barcode: '5901234123457'
  });

  const [labelType, setLabelType] = useState<string>('Koli etiketi');
  // Etiket boyutu (mm) - 104 x 50.8 mm
  const [labelWidth, setLabelWidth] = useState<number>(104);
  const [labelHeight, setLabelHeight] = useState<number>(50.8);
  // ZPL için DPI (isteğe bağlı) ve görsel baskı için koyuluk
  const [dpi, setDpi] = useState<203 | 300 | 600>(203);
  const [darkness, setDarkness] = useState<number>(1);
  const [zplDarkness, setZplDarkness] = useState<number>(15); // ^MD 0-30
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(() => {
    const saved = Number(localStorage.getItem('label_zoom') || '1');
    return isNaN(saved) ? 1 : Math.min(3, Math.max(0.5, saved));
  });
  const [zplCode, setZplCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Ajan vb. yok – sade mod

  // mm -> dots dönüşümü (ZPL koordinatları için)
  const mmToDots = (mm: number) => Math.round((dpi / 25.4) * mm);

  // Drag&Drop edit modu ve konumlar (mm)
  const [editMode, setEditMode] = useState(false);
  type AnchorKey = 'title' | 'productName' | 'details' | 'barcode';
  type Pos = { x: number; y: number };
  const defaultAnchors: Record<AnchorKey, Pos> = {
    title: { x: 6, y: 6 },
    productName: { x: 6, y: 13 },
    details: { x: 6, y: 26 },
    barcode: { x: 6, y: 34 },
  };
  const [anchors, setAnchors] = useState<Record<AnchorKey, Pos>>(() => {
    try {
      const saved = localStorage.getItem('label_anchors_v1');
      return saved ? { ...defaultAnchors, ...JSON.parse(saved) } : defaultAnchors;
    } catch { return defaultAnchors; }
  });
  useEffect(() => { try { localStorage.setItem('label_anchors_v1', JSON.stringify(anchors)); } catch {} }, [anchors]);
  useEffect(() => { try { localStorage.setItem('label_zoom', String(zoom)); } catch {} }, [zoom]);
  const [dragKey, setDragKey] = useState<AnchorKey | null>(null);
  const [dragOffset, setDragOffset] = useState<{dx:number; dy:number}>({ dx: 0, dy: 0 });
  const [resizingKey, setResizingKey] = useState<AnchorKey | null>(null);
  const [resizeStart, setResizeStart] = useState<{x0:number; y0:number; wMm:number; hMm:number; productFont:number; productWrap:number; titleFont:number; detailsGap:number; detailsFont:number; bcHeight:number; bcScale:number}>({ x0:0, y0:0, wMm:0, hMm:0, productFont:0, productWrap:0, titleFont:0, detailsGap:0, detailsFont:0, bcHeight:0, bcScale:1 });

  // Bireysel boyut ayarları (mm) – her eleman için
  type ElementStyles = {
    title: { font: number; widthMm: number };
    productName: { font: number; wrapWidth: number };
    details: { font: number; lineGap: number; widthMm: number };
    barcode: { height: number; widthMm: number };
  };
  const defaultStyles: ElementStyles = {
    title: { font: 5, widthMm: 50 },
    productName: { font: 4, wrapWidth: 92 },
    details: { font: 3.2, lineGap: 4.2, widthMm: 92 },
    barcode: { height: 12, widthMm: 60 }
  };
  const [styles, setStyles] = useState<ElementStyles>(() => {
    try {
      const saved = localStorage.getItem('label_styles_v1');
      return saved ? { ...defaultStyles, ...JSON.parse(saved) } : defaultStyles;
    } catch { return defaultStyles; }
  });
  useEffect(() => { try { localStorage.setItem('label_styles_v1', JSON.stringify(styles)); } catch {} }, [styles]);
  // not used yet – future inline selection

  // ZPL'i görsel olarak render et (raster baskı için canvas, DPI'ya göre gerçek boyut)
  const renderZPLPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Gerçek DPI'a göre piksel/mm
    const pxPerMm = dpi / 25.4; // 203dpi ≈ 7.99 px/mm
    const mmToPx = (mm: number) => Math.round(mm * pxPerMm);

    // Canvas boyutunu ayarla (piksel)
    canvas.width = Math.max(1, Math.round(labelWidth * pxPerMm));
    canvas.height = Math.max(1, Math.round(labelHeight * pxPerMm));

    // Arka planı temizle
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Yazı ayarları
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top';

    // Basit metin sarma
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
      const words = text.split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line.trim(), x, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line.trim(), x, y);
      return y + lineHeight; // next y
    };

    // EAN-13 hesaplama/çizim yardımcıları
    const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
    const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
    const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
    const PARITY: Record<string,string> = {
      '0':'LLLLLL','1':'LLGLGG','2':'LLGGLG','3':'LLGGGL','4':'LGLLGG','5':'LGGLLG','6':'LGGGLL','7':'LGLGLG','8':'LGLGGL','9':'LGGLGL'
    };
    const toEAN13 = (input?: string): string | null => {
      if (!input) return null;
      const digits = input.replace(/\D/g, '');
      if (digits.length !== 12 && digits.length !== 13) return null;
      const arr = digits.split('').map(d => parseInt(d, 10));
      const base = arr.slice(0,12);
      const checksum = (10 - ((base.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0)) % 10)) % 10;
      if (arr.length === 13 && arr[12] !== checksum) return null;
      return base.join('') + String(checksum);
    };
    const drawEAN13 = (code: string, x: number, y: number, widthMm: number, heightMm: number) => {
      const first = code[0];
      const leftDigits = code.slice(1,7);
      const rightDigits = code.slice(7);
      const parity = PARITY[first];
      // 95 modul (3 + 42 + 5 + 42 + 3)
      const totalModules = 95;
      const modulePx = Math.max(1, Math.floor(mmToPx(widthMm) / totalModules));
      const heightPx = mmToPx(heightMm);
      let pos = x;
      const drawModules = (pattern: string, extraGuard = false) => {
        for (let i = 0; i < pattern.length; i++) {
          if (pattern[i] === '1') {
            ctx.fillRect(pos, y, modulePx, heightPx + (extraGuard ? mmToPx(2) : 0));
          }
          pos += modulePx;
        }
      };
      ctx.fillStyle = '#000';
      // start guard 101
      drawModules('101', true);
      // left six digits
      for (let i = 0; i < 6; i++) {
        const d = parseInt(leftDigits[i], 10);
        const enc = parity[i] === 'L' ? L[d] : G[d];
        drawModules(enc);
      }
      // center guard 01010
      drawModules('01010', true);
      // right six digits (R)
      for (let i = 0; i < 6; i++) {
        const d = parseInt(rightDigits[i], 10);
        drawModules(R[d]);
      }
      // end guard 101
      drawModules('101', true);
      // human readable text
      ctx.font = `${mmToPx(3)}px Arial`;
      ctx.textBaseline = 'top';
      const textY = y + heightPx + mmToPx(2);
      ctx.fillText(code[0], x - mmToPx(3), textY);
      const leftText = code.slice(1,7).split('').join(' ');
      const rightText = code.slice(7).split('').join(' ');
      ctx.fillText(leftText, x + modulePx * 4, textY);
      ctx.fillText(rightText, x + modulePx * 50, textY);
    };

    switch (labelType) {
      case 'Koli etiketi':
        // Başlık
        ctx.font = `bold ${mmToPx(styles.title.font)}px Arial`;
        ctx.fillText('OLIVOS', mmToPx(anchors.title.x), mmToPx(anchors.title.y));

        // Ürün adı (sararak)
        ctx.font = `${mmToPx(styles.productName.font)}px Arial`;
        let y = mmToPx(anchors.productName.y);
        const left = mmToPx(anchors.productName.x);
        const maxW = mmToPx(Math.min(labelWidth - anchors.productName.x - 6, styles.productName.wrapWidth));
        y = wrapText(labelData.productName, left, y, maxW, mmToPx(styles.details.lineGap));

        // Diğer alanlar (daha küçük yazı)
        ctx.font = `${mmToPx(styles.details.font)}px Arial`;
        let detX = mmToPx(anchors.details.x);
        let detY = mmToPx(anchors.details.y);
        const stepY = mmToPx(styles.details.lineGap);
        const addLine = (text: string) => { ctx.fillText(text, detX, detY); detY += stepY; };
        if (labelData.amount) addLine(`Miktar: ${labelData.amount}`);
        if (labelData.serialNumber) addLine(`Seri: ${labelData.serialNumber}`);
        if (labelData.batchNumber) addLine(`Parti: ${labelData.batchNumber}`);
        if (labelData.invoiceNumber) addLine(`İrsaliye: ${labelData.invoiceNumber}`);
        if (labelData.entryDate) addLine(`Giriş: ${labelData.entryDate}`);
        if (labelData.expiryDate) addLine(`SKT: ${labelData.expiryDate}`);
        if (labelData.supplier) addLine(`Tedarikçi: ${labelData.supplier}`);

        // Barkod (EAN-13)
        const ean = toEAN13(labelData.barcode);
        if (ean) {
          const barWidthMm = Math.max(20, styles.barcode.widthMm);
          const barLeft = mmToPx(anchors.barcode.x);
          const barTop = mmToPx(anchors.barcode.y);
          drawEAN13(ean, barLeft, barTop, barWidthMm, styles.barcode.height);
        }
        break;
        
      case 'Numune Etiketi':
        ctx.font = `bold ${mmToPx(5)}px Arial`;
        ctx.fillText('NUMUNE', mmToPx(6), mmToPx(6));

        ctx.font = `${mmToPx(4)}px Arial`;
        wrapText(labelData.productName, mmToPx(6), mmToPx(13), mmToPx(labelWidth - 12), mmToPx(5));

        ctx.font = `${mmToPx(3.2)}px Arial`;
        let yN = mmToPx(23);
        const leftN = mmToPx(6);
        const addLineN = (t: string) => { ctx.fillText(t, leftN, yN); yN += mmToPx(4.2); };
        if (labelData.serialNumber) addLineN(`Seri No: ${labelData.serialNumber}`);
        if (labelData.entryDate) addLineN(`Giriş: ${labelData.entryDate}`);
        if (labelData.expiryDate) addLineN(`SKT: ${labelData.expiryDate}`);
        if (labelData.amount) addLineN(`Miktar: ${labelData.amount}`);
        if (labelData.batchNumber) addLineN(`Parti: ${labelData.batchNumber}`);
        if (labelData.supplier) addLineN(`Tedarikçi: ${labelData.supplier}`);

        // QR kod simülasyonu
        ctx.fillStyle = '#333';
        ctx.fillRect(mmToPx(6), mmToPx(labelHeight - 18), mmToPx(16), mmToPx(16));
        break;
        
      case 'Yarı Mamül Etiketi':
        ctx.font = `bold ${mmToPx(5)}px Arial`;
        ctx.fillText('YARI MAMÜL', mmToPx(6), mmToPx(6));

        ctx.font = `${mmToPx(4)}px Arial`;
        wrapText(labelData.productName, mmToPx(6), mmToPx(13), mmToPx(labelWidth - 12), mmToPx(5));

        ctx.font = `${mmToPx(3.2)}px Arial`;
        let yY = mmToPx(23);
        const leftY = mmToPx(6);
        const addLineY = (t: string) => { ctx.fillText(t, leftY, yY); yY += mmToPx(4.2); };
        if (labelData.serialNumber) addLineY(`Seri No: ${labelData.serialNumber}`);
        if (labelData.entryDate) addLineY(`Giriş: ${labelData.entryDate}`);
        if (labelData.expiryDate) addLineY(`SKT: ${labelData.expiryDate}`);
        if (labelData.amount) addLineY(`Miktar: ${labelData.amount}`);
        if (labelData.batchNumber) addLineY(`Parti: ${labelData.batchNumber}`);
        if (labelData.supplier) addLineY(`Tedarikçi: ${labelData.supplier}`);

        // QR kod simülasyonu
        ctx.fillStyle = '#333';
        ctx.fillRect(mmToPx(6), mmToPx(labelHeight - 18), mmToPx(16), mmToPx(16));
        break;
    }
    // Koyuluk uygulaması (siyahları güçlendirme)
    if (darkness && Math.abs(darkness - 1) > 0.01) {
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      const k = darkness; // >1 koyu, <1 daha açık
      for (let i = 0; i < d.length; i += 4) {
        // sadece gri tonlar üzerinde çalışıyoruz (siyah yazı, beyaz zemin)
        d[i] = 255 - (255 - d[i]) * k;
        d[i + 1] = 255 - (255 - d[i + 1]) * k;
        d[i + 2] = 255 - (255 - d[i + 2]) * k;
      }
      ctx.putImageData(img, 0, 0);
    }
  };

  // Canvas'ı güncelle
  useEffect(() => {
    if (showPreview) {
      renderZPLPreview();
    }
  }, [labelData, labelType, labelWidth, labelHeight, showPreview, darkness, anchors, styles]);

  const generateZPL = () => {
    let zpl = '';
    const PW = mmToDots(labelWidth);
    const LL = mmToDots(labelHeight);
    
    switch (labelType) {
      case 'Koli etiketi':
        zpl = `
^XA
^MD${Math.min(30, Math.max(0, Math.round(zplDarkness)))}
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
^MD${Math.min(30, Math.max(0, Math.round(zplDarkness)))}
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
^MD${Math.min(30, Math.max(0, Math.round(zplDarkness)))}
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
^MD${Math.min(30, Math.max(0, Math.round(zplDarkness)))}
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
                  @page { size: ${labelWidth}mm ${labelHeight}mm; margin: 0; }
                  html, body { height: 100%; }
                  body { margin: 0; padding: 0; background: white; }
                  .label { display: inline-block; }
                  img {
                    width: ${labelWidth}mm;
                    height: ${labelHeight}mm;
                    display: block;
                    image-rendering: pixelated; /* Zebra raster için keskinlik */
                  }
                </style>
              </head>
              <body>
                <img src="${canvas.toDataURL('image/png', 1)}" />
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

  // Ekstra yazıcı yöntemleri kaldırıldı

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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Barkod (EAN-13)</label>
              <input
                type="text"
                value={labelData.barcode || ''}
                onChange={(e) => setLabelData({ ...labelData, barcode: e.target.value })}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="5901234123457"
              />
              <p className="text-xs text-gray-500 mt-1">12 haneli girerseniz son haneyi otomatik hesaplarız</p>
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

            {/* Gelişmiş Ayarlar Toggle */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium mb-3"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${showAdvancedSettings ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Gelişmiş Ayarları Göster
              </button>
              
              {/* Etiket Boyutu Ayarları - Collapsible */}
              {showAdvancedSettings && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
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
            {/* Görsel/ZPL koyuluk ayarları */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DPI (ZPL için)</label>
                <select
                  value={dpi}
                  onChange={(e) => setDpi(Number(e.target.value) as 203 | 300 | 600)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={203}>203 dpi</option>
                  <option value={300}>300 dpi</option>
                  <option value={600}>600 dpi</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Koyuluk (Önizleme)</label>
                <input
                  type="range"
                  min={0.6}
                  max={2}
                  step={0.05}
                  value={darkness}
                  onChange={(e) => setDarkness(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{Math.round(darkness * 100)}%</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZPL Darkness (^MD 0-30)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={zplDarkness}
                  onChange={(e) => setZplDarkness(Math.max(0, Math.min(30, Number(e.target.value))))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Düşük = açık, yüksek = daha koyu baskı</p>
              </div>
            </div>

            {/* Bireysel boyut ayarları (mm) */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Başlık Font (mm)</label>
                <input type="number" step={0.1} value={styles.title.font} onChange={(e)=>setStyles({...styles, title:{...styles.title, font:Number(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Font (mm)</label>
                <input type="number" step={0.1} value={styles.productName.font} onChange={(e)=>setStyles({...styles, productName:{...styles.productName, font:Number(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Sarma Genişliği (mm)</label>
                <input type="number" step={0.1} value={styles.productName.wrapWidth} onChange={(e)=>setStyles({...styles, productName:{...styles.productName, wrapWidth:Number(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Detay Font (mm)</label>
                <input type="number" step={0.1} value={styles.details.font} onChange={(e)=>setStyles({...styles, details:{...styles.details, font:Number(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Satır Aralığı (mm)</label>
                <input type="number" step={0.1} value={styles.details.lineGap} onChange={(e)=>setStyles({...styles, details:{...styles.details, lineGap:Number(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barkod Yükseklik (mm)</label>
                <input type="number" step={0.1} value={styles.barcode.height} onChange={(e)=>setStyles({...styles, barcode:{...styles.barcode, height:Number(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barkod Genişliği (mm)</label>
                <input type="number" step={0.1} min={20} value={styles.barcode.widthMm} onChange={(e)=>setStyles({...styles, barcode:{...styles.barcode, widthMm:Number(e.target.value)}})} className="w-full p-2 border border-gray-300 rounded" />
              </div>
            </div>
                </div>
              )}
          </div>

                     {/* Butonlar önizleme bölümüne taşındı */}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Etiket Önizleme</h3>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={generateZPL}
                className="flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <QrCode className="w-4 h-4 mr-1" />
                ZPL Oluştur
              </button>
              
              <button
                onClick={downloadZPL}
                disabled={!zplCode}
                className="flex items-center justify-center px-3 py-1.5 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-1" />
                ZPL İndir
              </button>
              
              <button
                onClick={printLabel}
                disabled={!zplCode}
                className="flex items-center justify-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4 mr-1" />
                Yazdır
              </button>
            </div>
          </div>
          
        {/* Canvas Preview + Drag Anchors */}
        {showPreview && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4 mb-4">
            <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 relative">
              <canvas
                ref={canvasRef}
                className="w-full h-auto border border-gray-300"
                style={{ 
                  width: `${labelWidth * 3.78 * zoom}px`, 
                  height: `${labelHeight * 3.78 * zoom}px`,
                  maxWidth: '100%'
                }}
              />
              {editMode && (
                <div ref={overlayRef} className="absolute inset-4 pointer-events-none select-none">
                  {(['title','productName','details','barcode'] as const).map((key) => (
                    <div
                      key={key}
                      className="absolute bg-blue-500/10 border border-blue-500 text-[10px] text-blue-800 rounded pointer-events-auto"
                      style={{
                        left: `${anchors[key].x * 3.78 * zoom}px`,
                        top: `${anchors[key].y * 3.78 * zoom}px`,
                        width: (()=>{
                          const base = 3.78 * zoom;
                          if (key==='productName') return `${styles.productName.wrapWidth * base}px`;
                          if (key==='barcode') return `${styles.barcode.widthMm * base}px`;
                          if (key==='details') return `${styles.details.widthMm * base}px`;
                          return `${styles.title.widthMm * base}px`;
                        })(),
                        height: (()=>{
                          const base = 3.78 * zoom;
                          if (key==='title') return `${(styles.title.font + 2) * base}px`;
                          if (key==='productName') return `${(styles.productName.font * 2 + styles.details.lineGap) * base}px`;
                          if (key==='details') return `${(styles.details.lineGap * 6) * base}px`;
                          return `${(styles.barcode.height + 8) * base}px`;
                        })(),
                        cursor: 'move'
                      }}
                      onMouseDown={(e) => {
                        setDragKey(key);
                        const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                        setDragOffset({ dx: e.clientX - (rect.left + anchors[key].x * 3.78 * zoom), dy: e.clientY - (rect.top + anchors[key].y * 3.78 * zoom) });
                      }}
                      onMouseMove={(e) => {
                        if (dragKey !== key) return;
                        const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                        const x = (e.clientX - parent.left - dragOffset.dx) / (3.78 * zoom);
                        const y = (e.clientY - parent.top - dragOffset.dy) / (3.78 * zoom);
                        setAnchors((prev) => ({ ...prev, [key]: { x: Math.max(0, Math.min(labelWidth-5, x)), y: Math.max(0, Math.min(labelHeight-5, y)) } }));
                      }}
                      onMouseUp={() => setDragKey(null)}
                      onMouseLeave={() => setDragKey(null)}
                    >
                      <div className="absolute left-1 top-1 text-[10px] px-1 py-0.5 bg-white/60 rounded">{key}</div>
                      {/* Resize handle (sağ-alt) */}
                      <div
                        className="absolute right-0 bottom-0 w-3 h-3 bg-blue-600 cursor-se-resize"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setResizingKey(key);
                          const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                          setResizeStart({
                            x0: e.clientX,
                            y0: e.clientY,
                            wMm: parseFloat(((parent.width)/(3.78*zoom)).toFixed(2)),
                            hMm: parseFloat(((parent.height)/(3.78*zoom)).toFixed(2)),
                            productFont: styles.productName.font,
                            productWrap: styles.productName.wrapWidth,
                            titleFont: styles.title.font,
                            detailsGap: styles.details.lineGap,
                            detailsFont: styles.details.font,
                            bcHeight: styles.barcode.height,
                            bcScale: 1
                          });
                        }}
                        onMouseMove={(e) => {
                          if (resizingKey !== key) return;
                          const dxMm = (e.clientX - resizeStart.x0) / (3.78*zoom);
                          const dyMm = (e.clientY - resizeStart.y0) / (3.78*zoom);
                          if (key==='productName') {
                            const newWrap = Math.max(20, resizeStart.productWrap + dxMm);
                            const newFont = Math.max(2, resizeStart.productFont + dyMm);
                            setStyles(s=>({...s, productName:{...s.productName, wrapWidth:newWrap, font:newFont}}));
                          } else if (key==='title') {
                            const newFont = Math.max(2, resizeStart.titleFont + dyMm);
                            const newW = Math.max(10, resizeStart.wMm + dxMm);
                            setStyles(s=>({...s, title:{...s.title, font:newFont, widthMm:newW}}));
                          } else if (key==='details') {
                            const newGap = Math.max(2, resizeStart.detailsGap + dyMm/2);
                            const newFont = Math.max(2, resizeStart.detailsFont + dyMm/2);
                            const newW = Math.max(20, resizeStart.wMm + dxMm);
                            setStyles(s=>({...s, details:{...s.details, lineGap:newGap, font:newFont, widthMm:newW}}));
                          } else if (key==='barcode') {
                            const newW = Math.max(20, resizeStart.wMm + dxMm);
                            const newH = Math.max(5, resizeStart.bcHeight + dyMm);
                            setStyles(s=>({...s, barcode:{...s.barcode, widthMm:newW, height:newH}}));
                          }
                        }}
                        onMouseUp={() => setResizingKey(null)}
                        onMouseLeave={() => setResizingKey(null)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editMode} onChange={(e)=>setEditMode(e.target.checked)} />
                Düzenleme modu (Konumları sürükle-bırak)
              </label>
              <div className="flex items-center gap-2 text-sm">
                <span>Yakınlaştır:</span>
                <button type="button" className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={()=>setZoom(z=>Math.max(0.5, Number((z-0.1).toFixed(2))))}>-</button>
                <input type="range" min={0.5} max={3} step={0.1} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} />
                <button type="button" className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={()=>setZoom(z=>Math.min(3, Number((z+0.1).toFixed(2))))}>+</button>
                <span className="w-10 text-right">{Math.round(zoom*100)}%</span>
              </div>
              <button
                type="button"
                className="text-xs px-2 py-1 bg-gray-200 rounded hover:bg-gray-300"
                onClick={() => setAnchors(defaultAnchors)}
              >Konumları Sıfırla</button>
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

          {/* Talimatlar kaldırıldı – arayüzü sadeleştirmek için */}
        </div>
      </div>
    </div>
  );
};

export default LabelGenerator;