import React, { useState, useRef, useEffect } from 'react';
// import { Link } from 'react-router-dom';
import LabelSettingsModal from '../components/LabelSettingsModal';
import { Printer, QrCode, Download, Type, Barcode as BarcodeIcon, Image as ImageIcon, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FreeItemsPanel, { FreeItem as FreeItemType, FreeItemType as FreeItemTypeEnum } from '../components/FreeItemsPanel';
import PreviewCanvas from '../components/PreviewCanvas';
import StandardForm from '../components/StandardForm';
import { showToast } from '../utils/toast';

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
  customFields?: Record<string, string | number | boolean>;
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
    logo: '',
    barcode: ''
  });

  const [labelType, setLabelType] = useState<string>('');
  const [labelTypeFields, setLabelTypeFields] = useState<any | null>(null);
  const [labelTypeCustomFields, setLabelTypeCustomFields] = useState<any[]>([]);
  const [labelTypeOptions, setLabelTypeOptions] = useState<string[]>([]);
  // Etiket boyutu (mm) - 104 x 50.8 mm
  const [labelWidth, setLabelWidth] = useState<number>(104);
  const [labelHeight, setLabelHeight] = useState<number>(50.8);
  // ZPL için DPI (isteğe bağlı) ve görsel baskı için koyuluk
  const [dpi, setDpi] = useState<203 | 300 | 600>(203);
  const [darkness, setDarkness] = useState<number>(2);
  const [zplDarkness, setZplDarkness] = useState<number>(30); // ^MD 0-30
  const [printSpeed, setPrintSpeed] = useState<number>(1); // ^PR 1-14 (varsayılan 1: daha koyu)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(() => {
    const saved = Number(localStorage.getItem('label_zoom') || '1');
    return isNaN(saved) ? 1 : Math.min(3, Math.max(0.5, saved));
  });
  const [zplCode, setZplCode] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [showLabelSettings, setShowLabelSettings] = useState(false);
  // /labels sayfası ilk açılışta kısa yükleniyor durumu
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // Ajan vb. yok – sade mod
  // Resize yumuşatma: hız ve easing
  const RESIZE_SENS = 0.22; // küçük önizleme: daha yüksek hassasiyet
  const RESIZE_SMOOTH = 0.12; // küçük önizleme: daha hızlı yaklaşım
  // büyük önizleme (workspace) için hızlandırma katsayıları
  const WS_RESIZE_SENS = 3.0;
  const WS_FREE_RESIZE_SENS = 3.0;
  const WS_RESIZE_SMOOTH = 0.18; // büyük önizleme: daha pürüzsüz
  const resizeDeltaRef = useRef<{dx:number; dy:number}>({ dx:0, dy:0 });

  // Şirket logoları (Supabase -> company_logo)
  type CompanyLogo = { company_name: string; logo_url: string };
  const [companyLogos, setCompanyLogos] = useState<CompanyLogo[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('Olivos');
  const [logoImages, setLogoImages] = useState<Record<string, HTMLImageElement | null>>({});

  // Supabase'den logoları çek ve önbelleğe al
  useEffect(() => {
    const fetchLogos = async () => {
      const { data, error } = await supabase
        .from('company_logo')
        .select('company_name, logo_url');
      if (!error && data) {
        setCompanyLogos(data as CompanyLogo[]);
        // Varsayılan seçimi ayarla
        const hasOlivos = (data as CompanyLogo[]).find((l) => l.company_name.toLowerCase().includes('olivos'));
        if (hasOlivos) setSelectedCompany(hasOlivos.company_name);
        else if ((data as CompanyLogo[])[0]) setSelectedCompany((data as CompanyLogo[])[0].company_name);

        // Görselleri önceden yükle
        (data as CompanyLogo[]).forEach((l) => {
          if (!l.logo_url) return;
          const img = new Image();
          (img as any).crossOrigin = 'anonymous';
          img.onload = () => setLogoImages((prev) => ({ ...prev, [l.company_name]: img }));
          img.onerror = () => setLogoImages((prev) => ({ ...prev, [l.company_name]: null }));
          img.src = l.logo_url;
        });
      }
    };
    fetchLogos();
  }, []);

  // mm -> dots dönüşümü (ZPL koordinatları için)
  const mmToDots = (mm: number) => Math.round((dpi / 25.4) * mm);

  // EAN-13 doğrulama/normalize
  const normalizeEan13 = (input?: string): { normalized: string | null; error?: string; checksum?: number } => {
    if (!input) return { normalized: null, error: 'Boş barkod' };
    const digitsOnly = String(input).replace(/\D/g, '');
    if (digitsOnly.length !== 12 && digitsOnly.length !== 13) {
      return { normalized: null, error: 'EAN-13, 12 veya 13 haneli olmalı' };
    }
    const arr = digitsOnly.split('').map(d => parseInt(d, 10));
    const base = arr.slice(0, 12);
    const checksum = (10 - ((base.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0)) % 10)) % 10;
    if (arr.length === 13 && arr[12] !== checksum) {
      return { normalized: null, error: `Checksum uyuşmuyor (beklenen ${checksum})`, checksum };
    }
    return { normalized: base.join('') + String(checksum), checksum };
  };

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
  // Daha smooth sürükleme için global drag state
  const [draggingAnchorKey, setDraggingAnchorKey] = useState<AnchorKey | null>(null);
  const [draggingFreeId, setDraggingFreeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{dx:number; dy:number}>({ dx: 0, dy: 0 });

  const [resizeStart, setResizeStart] = useState<{x0:number; y0:number; wMm:number; hMm:number; productFont:number; productWrap:number; titleFont:number; detailsGap:number; detailsFont:number; bcHeight:number; bcScale:number}>({ x0:0, y0:0, wMm:0, hMm:0, productFont:0, productWrap:0, titleFont:0, detailsGap:0, detailsFont:0, bcHeight:0, bcScale:1 });
  // Global resize hedefleri
  const [resizingAnchorKeyGlobal, setResizingAnchorKeyGlobal] = useState<AnchorKey | null>(null);
  const [resizingFreeIdGlobal, setResizingFreeIdGlobal] = useState<string | null>(null);

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

  // Görünürlük yönetimi (eleman kaldırma/gizleme)
  const defaultVisibility: Record<AnchorKey, boolean> = {
    title: true,
    productName: true,
    details: true,
    barcode: true,
  };
  const [visible, setVisible] = useState<Record<AnchorKey, boolean>>(() => {
    try {
      const saved = localStorage.getItem('label_visibility_v1');
      return saved ? { ...defaultVisibility, ...JSON.parse(saved) } : defaultVisibility;
    } catch { return defaultVisibility; }
  });
  useEffect(() => { try { localStorage.setItem('label_visibility_v1', JSON.stringify(visible)); } catch {} }, [visible]);

  // Tür kurallarını görünürlükle birleştir (type-visible AND user-visible)
  const effectiveVisible = React.useMemo(() => {
    // Etiket türü seçilmediyse, önizleme alanı açık kalsın ama içerik çizilmesin
    if (!labelType) {
      return { title:false, productName:false, details:false, barcode:false } as Record<AnchorKey, boolean>;
    }
    const typeVis: Record<AnchorKey, boolean> = {
      title: true,
      productName: true,
      details: true,
      barcode: true,
    };
    if (labelTypeFields) {
      typeVis.productName = labelTypeFields.productName?.visible !== false;
      const detailKeys = ['amount','serialNumber','batchNumber','invoiceNumber','entryDate','expiryDate','supplier'];
      typeVis.details = detailKeys.some((k: any)=> labelTypeFields[k]?.visible !== false);
      typeVis.barcode = labelTypeFields.barcode?.visible !== false;
    }
    return {
      title: visible.title && typeVis.title,
      productName: visible.productName && typeVis.productName,
      details: visible.details && typeVis.details,
      barcode: visible.barcode && typeVis.barcode,
    } as Record<AnchorKey, boolean>;
  }, [visible, labelTypeFields, labelType]);

  // Serbest Mod öğeleri
  // FreeItemType tipi import'tan geliyor
  // Çakışma önleme yardımcıları (serbest öğeler ve sabit anchorlar)
  const getFreeItemTypeBounds = (item: FreeItemType) => {
    const widthMm = (() => {
      if (item.type === 'text') return Math.max(10, item.wrapWidthMm || 60);
      if (item.type === 'line') return Math.max(5, item.widthMm || 40);
      if (item.type === 'rectangle') return Math.max(5, item.widthMm || 20);
      return Math.max(10, item.widthMm || 40);
    })();
    const heightMm = (() => {
      if (item.type === 'text') return Math.max(4, (item.fontMm || 4) + 6);
      if (item.type === 'line') return Math.max(0.2, item.heightMm || 0.6);
      if (item.type === 'rectangle') return Math.max(2, item.heightMm || 10);
      return Math.max(5, item.heightMm || 12);
    })();
    return { left: item.x, top: item.y, right: item.x + widthMm, bottom: item.y + heightMm };
  };
  const rectsOverlap = (A: {left:number;top:number;right:number;bottom:number}, B: {left:number;top:number;right:number;bottom:number}) => {
    if (A.right <= B.left || A.left >= B.right || A.bottom <= B.top || A.top >= B.bottom) return false;
    return true;
  };
  const getAnchorBoundsRuntime = (key: AnchorKey) => {
    const left = anchors[key].x; const top = anchors[key].y;
    if (key==='title') return { left, top, right: left + styles.title.widthMm, bottom: top + (styles.title.font + 2) };
    if (key==='productName') return { left, top, right: left + styles.productName.wrapWidth, bottom: top + (styles.productName.font * 2 + styles.details.lineGap) };
    if (key==='details') return { left, top, right: left + styles.details.widthMm, bottom: top + (styles.details.lineGap * 6) };
    return { left, top, right: left + styles.barcode.widthMm, bottom: top + (styles.barcode.height + 8) };
  };
  const overlapsAnchorsRuntime = (rect: {left:number;top:number;right:number;bottom:number}) => {
    const keys: AnchorKey[] = ['title','productName','details','barcode'];
    for (const k of keys) {
      if (!effectiveVisible[k]) continue;
      const r = getAnchorBoundsRuntime(k);
      if (rectsOverlap(rect, r)) return true;
    }
    return false;
  };
  const overlapsFreeItemsRuntime = (rect: {left:number;top:number;right:number;bottom:number}, items: FreeItemType[], ignoreId?: string) => {
    for (const it of items) {
      if (it.id === ignoreId) continue;
      const r = getFreeItemTypeBounds(it);
      if (rectsOverlap(rect, r)) return true;
    }
    return false;
  };
  const [freeMode, setFreeMode] = useState<boolean>(false);
  const [freeItems, setFreeItemTypes] = useState<FreeItemType[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const freeImageCache = useRef<Record<string, HTMLImageElement>>({});
  const [showFreeDialog, setShowFreeDialog] = useState<boolean>(false);
  const [freeDraft, setFreeDraft] = useState<Partial<FreeItemType> & { type: FreeItemTypeEnum } | null>(null);
  const [editingFreeId, setEditingFreeId] = useState<string | null>(null);
  const [freeEditContext, setFreeEditContext] = useState<'preview'|'workspace'>('preview');
  const [showFreeWorkspace, setShowFreeWorkspace] = useState<boolean>(false);
  const [wsItems, setWsItems] = useState<FreeItemType[]>([]);
  const wsCanvasRef = useRef<HTMLCanvasElement>(null);
  const wsContainerRef = useRef<HTMLDivElement>(null);
  const [wsZoom, setWsZoom] = useState<number>(1);
  const [wsRemoveId, setWsRemoveId] = useState<string | null>(null);
  // Büyük önizleme: standart anchor sürükleme/yeniden boyutlandırma
  const [wsDraggingAnchorKey, setWsDraggingAnchorKey] = useState<AnchorKey | null>(null);
  const [wsDragOffset, setWsDragOffset] = useState<{dx:number;dy:number}>({ dx:0, dy:0 });
  const [wsResizingAnchorKey, setWsResizingAnchorKey] = useState<AnchorKey | null>(null);
  const [wsResizeStart, setWsResizeStart] = useState<{x0:number;y0:number; wMm:number; hMm:number; productFont:number; productWrap:number; titleFont:number; detailsGap:number; detailsFont:number; bcHeight:number}>({ x0:0, y0:0, wMm:0, hMm:0, productFont:0, productWrap:0, titleFont:0, detailsGap:0, detailsFont:0, bcHeight:0 });
  const [wsSelectedAnchorKey, setWsSelectedAnchorKey] = useState<AnchorKey | null>(null);
  const wsResizeDeltaRef = useRef<{dx:number; dy:number}>({ dx:0, dy:0 });
  // Workspace serbest öğe resize state (global mousemove için)
  const [wsResizingFreeId, setWsResizingFreeId] = useState<string | null>(null);
  const [wsResizeStartFree, setWsResizeStartFree] = useState<{x0:number;y0:number; wMm:number; hMm:number; fontMm:number; wrapMm:number}>({ x0:0, y0:0, wMm:0, hMm:0, fontMm:4, wrapMm:60 });
  const wsFreeResizeDeltaRef = useRef<{dx:number; dy:number}>({ dx:0, dy:0 });

  const adjustSelectedSize = (direction: 1 | -1) => {
    const mmStep = 1.5 * direction;
    const fontStep = 0.8 * direction;
    if (wsSelectedAnchorKey) {
      const key = wsSelectedAnchorKey;
      setStyles(s => {
        if (key==='productName') return { ...s, productName: { ...s.productName, wrapWidth: Math.max(20, s.productName.wrapWidth + mmStep*2), font: Math.max(2, s.productName.font + fontStep) } };
        if (key==='title') return { ...s, title: { ...s.title, widthMm: Math.max(10, s.title.widthMm + mmStep*2), font: Math.max(2, s.title.font + fontStep) } };
        if (key==='details') return { ...s, details: { ...s.details, widthMm: Math.max(20, s.details.widthMm + mmStep*2), lineGap: Math.max(2, s.details.lineGap + fontStep/2), font: Math.max(2, s.details.font + fontStep/2) } };
        if (key==='barcode') return { ...s, barcode: { ...s.barcode, widthMm: Math.max(20, s.barcode.widthMm + mmStep*2), height: Math.max(5, s.barcode.height + mmStep) } };
        return s;
      });
      return;
    }
    if (selectedFreeId) {
      setWsItems(arr => arr.map(it => {
        if (it.id !== selectedFreeId) return it;
        if (it.type==='text') return { ...it, wrapWidthMm: Math.max(20, (it.wrapWidthMm||60) + mmStep*2), fontMm: Math.max(2, (it.fontMm||4) + fontStep) };
        if (it.type==='line') return { ...it, widthMm: Math.max(5, (it.widthMm||40) + mmStep*2), heightMm: Math.max(0.2, (it.heightMm||0.6) + fontStep/3) };
        return { ...it, widthMm: Math.max(10, (it.widthMm||40) + mmStep*2), heightMm: Math.max(5, (it.heightMm||12) + mmStep) };
      }));
    }
  };

  const adjustSelectedFreeSize = (direction: 1 | -1) => {
    if (!selectedFreeId) return;
    const mmStep = 1.5 * direction;
    const fontStep = 0.8 * direction;
    setFreeItemTypes(arr => arr.map(it => {
      if (it.id !== selectedFreeId) return it;
      if (it.type==='text') return { ...it, wrapWidthMm: Math.max(20, (it.wrapWidthMm||60) + mmStep*2), fontMm: Math.max(2, (it.fontMm||4) + fontStep) };
      if (it.type==='line') return { ...it, widthMm: Math.max(5, (it.widthMm||40) + mmStep*2), heightMm: Math.max(0.2, (it.heightMm||0.6) + fontStep/3) };
      return { ...it, widthMm: Math.max(10, (it.widthMm||40) + mmStep*2), heightMm: Math.max(5, (it.heightMm||12) + mmStep) };
    }));
  };
  // Izgara ve hizalama
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [gridMm, setGridMm] = useState<number>(2);
  const [selectedFreeId, setSelectedFreeId] = useState<string | null>(null);

  // Global mousemove/mouseup ile sürüklemeyi pürüzsüz yap
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!overlayRef.current) return;
      const parent = overlayRef.current.getBoundingClientRect();
      const base = 3.78 * zoom;
      if (draggingAnchorKey) {
        let x = (e.clientX - parent.left - dragOffset.dx) / base;
        let y = (e.clientY - parent.top - dragOffset.dy) / base;
        if (snapToGrid) { const g = gridMm; x = Math.round(x/g)*g; y = Math.round(y/g)*g; }
        setAnchors(prev => ({ ...prev, [draggingAnchorKey]: { x: Math.max(0, Math.min(labelWidth-5, x)), y: Math.max(0, Math.min(labelHeight-5, y)) } }));
      } else if (draggingFreeId) {
        let x = (e.clientX - parent.left - dragOffset.dx) / base;
        let y = (e.clientY - parent.top - dragOffset.dy) / base;
        if (snapToGrid) { const g = gridMm; x = Math.round(x/g)*g; y = Math.round(y/g)*g; }
        setFreeItemTypes(arr => arr.map(it => it.id===draggingFreeId ? { ...it, x: Math.max(0, Math.min(labelWidth-5, x)), y: Math.max(0, Math.min(labelHeight-5, y)) } : it));
      } else if (resizingAnchorKeyGlobal) {
        const key = resizingAnchorKeyGlobal;
        // hedef delta
        const rawDx = (e.clientX - resizeStart.x0) / base;
        const rawDy = (e.clientY - resizeStart.y0) / base;
        // küçük hareketleri filtrele
        const targetDx = Math.abs(rawDx) < 0.2 ? 0 : rawDx * RESIZE_SENS;
        const targetDy = Math.abs(rawDy) < 0.2 ? 0 : rawDy * RESIZE_SENS;
        // yumuşatma (lerp)
        resizeDeltaRef.current.dx = resizeDeltaRef.current.dx + (targetDx - resizeDeltaRef.current.dx) * RESIZE_SMOOTH;
        resizeDeltaRef.current.dy = resizeDeltaRef.current.dy + (targetDy - resizeDeltaRef.current.dy) * RESIZE_SMOOTH;
        const dxMm = resizeDeltaRef.current.dx;
        const dyMm = resizeDeltaRef.current.dy;
        setStyles(s=>{
          if (key==='productName') {
            return { ...s, productName: { ...s.productName, wrapWidth: Math.max(20, resizeStart.productWrap + dxMm), font: Math.max(2, resizeStart.productFont + dyMm) } };
          } else if (key==='title') {
            return { ...s, title: { ...s.title, widthMm: Math.max(10, resizeStart.wMm + dxMm), font: Math.max(2, resizeStart.titleFont + dyMm) } };
          } else if (key==='details') {
            return { ...s, details: { ...s.details, widthMm: Math.max(20, resizeStart.wMm + dxMm), lineGap: Math.max(2, resizeStart.detailsGap + dyMm/2), font: Math.max(2, resizeStart.detailsFont + dyMm/2) } };
          } else if (key==='barcode') {
            return { ...s, barcode: { ...s.barcode, widthMm: Math.max(20, resizeStart.wMm + dxMm), height: Math.max(5, resizeStart.bcHeight + dyMm) } };
          }
          return s;
        });
      } else if (resizingFreeIdGlobal) {
        const rawDx = (e.clientX - resizeStart.x0) / base;
        const rawDy = (e.clientY - resizeStart.y0) / base;
        const targetDx = Math.abs(rawDx) < 0.2 ? 0 : rawDx * RESIZE_SENS;
        const targetDy = Math.abs(rawDy) < 0.2 ? 0 : rawDy * RESIZE_SENS;
        resizeDeltaRef.current.dx = resizeDeltaRef.current.dx + (targetDx - resizeDeltaRef.current.dx) * RESIZE_SMOOTH;
        resizeDeltaRef.current.dy = resizeDeltaRef.current.dy + (targetDy - resizeDeltaRef.current.dy) * RESIZE_SMOOTH;
        const dxMm = resizeDeltaRef.current.dx;
        const dyMm = resizeDeltaRef.current.dy;
        setFreeItemTypes(arr => arr.map(it => {
          if (it.id !== resizingFreeIdGlobal) return it;
          if (it.type==='text') {
            // Metin: genişlik wrapWidthMm, yükseklik fontMm; font büyürken satır yüksekliği render tarafında fonta bağlı
            return { ...it, wrapWidthMm: Math.max(20, (it.wrapWidthMm||60) + dxMm), fontMm: Math.max(2, (it.fontMm||4) + dyMm) };
          }
          if (it.type==='line') {
            return { ...it, widthMm: Math.max(5, (it.widthMm||40) + dxMm), heightMm: Math.max(0.2, (it.heightMm||0.6) + dyMm/4) };
          }
          const maxW = Math.max(10, labelWidth - it.x - 1);
          const maxH = Math.max(5, labelHeight - it.y - 1);
          return { ...it, widthMm: Math.min(maxW, Math.max(10, (it.widthMm||40) + dxMm)), heightMm: Math.min(maxH, Math.max(5, (it.heightMm||12) + dyMm)) };
        }));
      }
    };
    const handleUp = () => { setDraggingAnchorKey(null); setDraggingFreeId(null); setResizingAnchorKeyGlobal(null); setResizingFreeIdGlobal(null); resizeDeltaRef.current = { dx:0, dy:0 }; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
  }, [draggingAnchorKey, draggingFreeId, resizingAnchorKeyGlobal, resizingFreeIdGlobal, resizeStart, dragOffset, zoom, snapToGrid, gridMm, labelWidth, labelHeight]);

  // Büyük Önizleme açıldığında etiketi alanın genişliğine göre otomatik büyüt
  useEffect(() => {
    if (!showFreeWorkspace) return;
    const fit = () => {
      const container = wsContainerRef.current;
      if (!container) return;
      const basePx = labelWidth * 3.78; // 1x zoom genişliği
      const available = Math.max(100, container.clientWidth - 32);
      const target = Math.min(6, Math.max(0.5, available / basePx));
      setWsZoom(Number(target.toFixed(2)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [showFreeWorkspace, labelWidth]);

  // Workspace: serbest öğe global resize hareketi
  useEffect(() => {
    if (!showFreeWorkspace) return;
    const onMove = (e: MouseEvent) => {
      if (!wsResizingFreeId) return;
      const base = 3.78 * wsZoom;
      const rawDx = (e.clientX - wsResizeStartFree.x0) / base;
      const rawDy = (e.clientY - wsResizeStartFree.y0) / base;
      const targetDx = (Math.abs(rawDx) < 0.15 ? 0 : rawDx * WS_FREE_RESIZE_SENS);
      const targetDy = (Math.abs(rawDy) < 0.15 ? 0 : rawDy * WS_FREE_RESIZE_SENS);
      wsFreeResizeDeltaRef.current.dx = wsFreeResizeDeltaRef.current.dx + (targetDx - wsFreeResizeDeltaRef.current.dx) * WS_RESIZE_SMOOTH;
      wsFreeResizeDeltaRef.current.dy = wsFreeResizeDeltaRef.current.dy + (targetDy - wsFreeResizeDeltaRef.current.dy) * WS_RESIZE_SMOOTH;
      const dxMm = wsFreeResizeDeltaRef.current.dx;
      const dyMm = wsFreeResizeDeltaRef.current.dy;
      setWsItems(arr => arr.map(it => {
        if (it.id !== wsResizingFreeId) return it;
        if (it.type === 'text') {
          return {
            ...it,
            wrapWidthMm: Math.max(20, (wsResizeStartFree.wrapMm || 60) + dxMm),
            fontMm: Math.max(2, (wsResizeStartFree.fontMm || 4) + dyMm)
          };
        }
        if (it.type === 'line') {
          return {
            ...it,
            widthMm: Math.max(5, (wsResizeStartFree.wMm || it.widthMm || 40) + dxMm),
            heightMm: Math.max(0.2, (wsResizeStartFree.hMm || it.heightMm || 0.6) + dyMm/4)
          };
        }
        const maxW = Math.max(10, labelWidth - it.x - 1);
        const maxH = Math.max(5, labelHeight - it.y - 1);
        return {
          ...it,
          widthMm: Math.min(maxW, Math.max(10, (wsResizeStartFree.wMm || it.widthMm || 40) + dxMm)),
          heightMm: Math.min(maxH, Math.max(5, (wsResizeStartFree.hMm || it.heightMm || 12) + dyMm))
        };
      }));
    };
    const onUp = () => { setWsResizingFreeId(null); wsFreeResizeDeltaRef.current = { dx:0, dy:0 }; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [showFreeWorkspace, wsResizingFreeId, wsResizeStartFree, wsZoom, labelWidth, labelHeight]);

  // Büyük önizleme açıldığında mevcut serbest öğeleri içeri al
  useEffect(() => {
    if (!showFreeWorkspace) return;
    setWsItems(freeItems);
    // Küçük önizlemeyi de eşitle (serbest öğeler görünür olsun)
    setFreeMode(true);
    setFreeItemTypes(() => [...freeItems]);
    setTimeout(() => { try { renderZPLPreview(); generateZPL(); } catch {} }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFreeWorkspace]);

  // Taslak yönetimi
  type TemplateRow = { id: string; name: string; data: any; thumbnail?: string };
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateName, setTemplateName] = useState<string>('Yeni Taslak');
  const [saving, setSaving] = useState<boolean>(false);
  // const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [templateSearch, setTemplateSearch] = useState<string>('');
  const [templateTypeFilter, setTemplateTypeFilter] = useState<string>('Hepsi');
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null>(null);
  const [baselineState, setBaselineState] = useState<any | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AnchorKey | null>(null);
  const [removeFreeId, setRemoveFreeId] = useState<string | null>(null);
  // Sekmeler: standart vs serbest
  const [activeTab, setActiveTab] = useState<'standart' | 'serbest'>('standart');

  // Katman yardımcıları
  const normalizeZ = (items: FreeItemType[]): FreeItemType[] => {
    const sorted = [...items].sort((a,b)=> (a.zIndex||0) - (b.zIndex||0));
    return sorted.map((it, idx) => ({ ...it, zIndex: idx }));
  };
  const getMaxZ = (items: FreeItemType[]) => items.reduce((m, it)=> Math.max(m, it.zIndex ?? 0), -1);
  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setFreeItemTypes(items => {
      if (items.length <= 1) return items;
      const sorted = [...items].sort((a,b)=> (a.zIndex||0) - (b.zIndex||0)); // bottom -> top
      const idx = sorted.findIndex(it => it.id === id);
      if (idx === -1) return items;
      if (direction === 'up' && idx < sorted.length - 1) {
        const tmp = sorted[idx].zIndex ?? idx;
        sorted[idx].zIndex = sorted[idx+1].zIndex ?? (idx+1);
        sorted[idx+1].zIndex = tmp;
      } else if (direction === 'down' && idx > 0) {
        const tmp = sorted[idx].zIndex ?? idx;
        sorted[idx].zIndex = sorted[idx-1].zIndex ?? (idx-1);
        sorted[idx-1].zIndex = tmp;
      } else {
        return items;
      }
      return normalizeZ(sorted);
    });
  };
  // Liste sürükle-bırak (katman sırası)
  const reorderLayers = (dragId: string, dropId: string) => {
    setFreeItemTypes(items => {
      if (dragId === dropId) return items;
      const desc = [...items].sort((a,b)=> (b.zIndex||0)-(a.zIndex||0)); // top -> bottom
      const from = desc.findIndex(i=>i.id===dragId);
      const to = desc.findIndex(i=>i.id===dropId);
      if (from<0 || to<0) return items;
      const [moved] = desc.splice(from,1);
      desc.splice(to,0,moved);
      const n = desc.length;
      const updated = desc.map((it, idx)=> ({ ...it, zIndex: n-1-idx })); // rebuild z (bottom=0)
      return updated;
    });
  };
  
  // Serbest sekmesine geçildiğinde önizleme ve serbest düzenleme açık olsun
  useEffect(() => {
    if (activeTab === 'serbest') {
      setFreeMode(true);
      setEditMode(true);
      setShowPreview(true);
      // serbest moda geçerken standard sürükleme/resize state'lerini sıfırla
      setDraggingAnchorKey(null);
      setResizingAnchorKeyGlobal(null);
      setDraggingFreeId(null);
      setResizingFreeIdGlobal(null);
      setSelectedFreeId(null);
    } else {
      // standart moda geçişte serbest mod bayrağını kapat ve state'leri temizle
      setFreeMode(false);
      setEditMode(true);
      setShowPreview(true);
      setDraggingAnchorKey(null);
      setResizingAnchorKeyGlobal(null);
      setDraggingFreeId(null);
      setResizingFreeIdGlobal(null);
      setSelectedFreeId(null);
      // ZPL'i sekmeye göre tazelemek için temizle
      setZplCode('');
    }
  }, [activeTab]);

  const serializeState = () => ({
    labelData,
    labelType,
    labelWidth,
    labelHeight,
    dpi,
    darkness,
    zplDarkness,
    printSpeed,
    anchors,
    styles,
    selectedCompany,
    visible,
    freeMode,
    freeItems,
    customFields: labelTypeCustomFields,
  });

  // İlk 3 saniyelik yükleniyor sekmesi
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const applySerializedState = (s: any) => {
    if (!s) return;
    setLabelData(s.labelData ?? labelData);
    setLabelType(s.labelType ?? labelType);
    setLabelWidth(s.labelWidth ?? labelWidth);
    setLabelHeight(s.labelHeight ?? labelHeight);
    setDpi(s.dpi ?? dpi);
    setDarkness(s.darkness ?? darkness);
    setZplDarkness(s.zplDarkness ?? zplDarkness);
    setPrintSpeed(s.printSpeed ?? printSpeed);
    setAnchors(s.anchors ?? anchors);
    setStyles(s.styles ?? styles);
    if (s.selectedCompany) setSelectedCompany(s.selectedCompany);
    if (s.visible) setVisible({ ...defaultVisibility, ...s.visible });
    if (s.freeMode !== undefined) setFreeMode(!!s.freeMode);
    if (s.freeItems) setFreeItemTypes(s.freeItems as FreeItemType[]);
    if (s.customFields) setLabelTypeCustomFields(s.customFields);
  };

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from('label_templates')
      .select('id, name, data, thumbnail, is_free')
      .eq('is_free', activeTab === 'serbest')
      .order('created_at', { ascending: false });
    if (!error && data) setTemplates(data as TemplateRow[]);
  };

  useEffect(() => { fetchTemplates(); }, [activeTab]);

  // Etiket türü alan görünürlüğü ve anchor yükleme
  useEffect(() => {
    const loadType = async () => {
      try {
        const { data: list } = await supabase.from('label_types').select('name, anchors').order('name');
        if (list && Array.isArray(list)) {
          setLabelTypeOptions(list.map((r: any)=> r.name));
          // Otomatik seçim istemiyoruz; kullanıcı seçecek
        }
        if (!labelType) { setLabelTypeFields(null); setLabelTypeCustomFields([]); return; }
        const { data } = await supabase.from('label_types').select('fields, anchors, custom_fields').eq('name', labelType).maybeSingle();
        if (data?.fields) setLabelTypeFields(data.fields);
        if (data?.custom_fields) setLabelTypeCustomFields(data.custom_fields);
        else {
          // Supabase kaydı yoksa local defaultlara düş
          try {
            const { DEFAULT_LABEL_TYPES } = await import('../lib/label_settings');
            const def = DEFAULT_LABEL_TYPES.find(t => t.name === labelType);
            setLabelTypeFields(def?.fields || null);
            setLabelTypeCustomFields(def?.custom_fields || []);
            if (!list || list.length === 0) {
              setLabelTypeOptions(DEFAULT_LABEL_TYPES.map(t=>t.name));
            }
          } catch {
            setLabelTypeFields(null);
            setLabelTypeCustomFields([]);
          }
        }
        // Anchor’ları uygula (DB öncelikli, yoksa default)
        if (data?.anchors) {
          setAnchors(a=> ({ ...a, ...data.anchors }));
        } else {
          try {
            const { DEFAULT_LABEL_TYPES } = await import('../lib/label_settings');
            const def = DEFAULT_LABEL_TYPES.find(t => t.name === labelType);
            if (def?.anchors) setAnchors(a=> ({ ...a, ...def.anchors! }));
          } catch {}
        }
      } catch { setLabelTypeFields(null); setLabelTypeCustomFields([]); }
    };
    loadType();
  }, [labelType]);

  // Tür görünürlüklerini kullanıcı görünürlüğü ile senkronla (title=logo)
  useEffect(() => {
    if (!labelTypeFields) return;
    setVisible(() => ({
      title: labelTypeFields.logo?.visible !== false,
      productName: labelTypeFields.productName?.visible !== false,
      details: ['amount','serialNumber','batchNumber','invoiceNumber','entryDate','expiryDate','supplier'].some(k => (labelTypeFields as any)[k]?.visible !== false),
      barcode: labelTypeFields.barcode?.visible !== false,
    }));
  }, [labelTypeFields]);

  const generateThumbnail = (): string | undefined => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    try { return canvas.toDataURL('image/png', 0.6); } catch { return undefined; }
  };

  const saveTemplate = async () => {
    setSaving(true);
    const payload = { name: templateName || 'Yeni Taslak', data: serializeState(), thumbnail: generateThumbnail(), is_free: activeTab === 'serbest' };
    const { error } = await supabase.from('label_templates').insert(payload);
    setSaving(false);
    if (!error) {
      setBaselineState(serializeState());
      setIsDirty(false);
      setCurrentTemplateId(null);
      fetchTemplates();
    }
  };

  const updateTemplate = async (id: string) => {
    setSaving(true);
    const payload = { name: templateName || 'Taslak', data: serializeState(), thumbnail: generateThumbnail(), updated_at: new Date().toISOString(), is_free: activeTab === 'serbest' };
    const { error } = await supabase.from('label_templates').update(payload).eq('id', id);
    setSaving(false);
    if (!error) {
      setBaselineState(serializeState());
      setIsDirty(false);
      fetchTemplates();
    }
  };

  const removeTemplate = async (id: string) => {
    await supabase.from('label_templates').delete().eq('id', id);
    if (currentTemplateId === id) {
      setCurrentTemplateId(null);
    }
    await fetchTemplates();
  };

  const loadTemplate = async (id: string) => {
    const row = templates.find(t => t.id === id);
    if (!row) return;
    applySerializedState(row.data);
    setTemplateName(row.name);
    setCurrentTemplateId(row.id);
    setBaselineState(row.data);
    setIsDirty(false);
    setShowPreview(true);
    // ZPL ve önizlemeyi hemen oluştur
    setTimeout(() => {
      try { generateZPL(); } catch {}
    }, 0);
  };

  // İlk baseline
  useEffect(() => {
    if (!baselineState) setBaselineState(serializeState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Değişiklik izleme
  useEffect(() => {
    if (!baselineState) return;
    const now = JSON.stringify(serializeState());
    const base = JSON.stringify(baselineState);
    setIsDirty(now !== base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelData, labelType, labelWidth, labelHeight, dpi, darkness, zplDarkness, printSpeed, anchors, styles, selectedCompany, visible, freeMode, freeItems]);

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
    const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxHeight?: number) => {
      const paragraphs = String(text).replace(/\r\n/g, '\n').split('\n');
      const startY = y;
      for (let p = 0; p < paragraphs.length; p++) {
        const words = paragraphs[p].split(' ');
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            if (maxHeight !== undefined && (y - startY + lineHeight) > maxHeight) return y + lineHeight; // stop
          ctx.fillText(line.trim(), x, y);
          line = words[n] + ' ';
          y += lineHeight;
        } else {
          line = testLine;
        }
      }
        if (maxHeight === undefined || (y - startY + lineHeight) <= maxHeight) {
      ctx.fillText(line.trim(), x, y);
          y += lineHeight;
        } else {
          return y; // exceeded
        }
      }
      return y; // next y after all paragraphs
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

    // Standart mod çizimleri — tüm türler için aynı şablon (anchors + görünürlük kuralları)
    if (activeTab === 'standart') {
      // Başlık: logo varsa çiz, yoksa şirket adı
      if (effectiveVisible.title) {
            const logoImg = logoImages[selectedCompany];
            if (logoImg) {
              const targetHeightPx = mmToPx(styles.title.font + 4);
              const ratio = logoImg.width / logoImg.height;
              const targetWidthPx = Math.min(mmToPx(styles.title.widthMm), Math.round(targetHeightPx * ratio));
              ctx.drawImage(
                logoImg,
                mmToPx(anchors.title.x),
                mmToPx(anchors.title.y),
                targetWidthPx,
                targetHeightPx
              );
        } else if (selectedCompany) {
              ctx.font = `bold ${mmToPx(styles.title.font)}px Arial`;
          ctx.fillText(selectedCompany, mmToPx(anchors.title.x), mmToPx(anchors.title.y));
          }
        }

      // Ürün adı (genişliğe göre sar; etiket alt sınırını aşma)
      if (effectiveVisible.productName && labelData.productName) {
          ctx.font = `${mmToPx(styles.productName.font)}px Arial`;
          const top = mmToPx(anchors.productName.y);
          const left = mmToPx(anchors.productName.x);
          const maxW = mmToPx(Math.min(labelWidth - anchors.productName.x - 6, styles.productName.wrapWidth));
          const maxH = mmToPx(labelHeight - anchors.productName.y - 2);
          let y = top;
          y = wrapText(labelData.productName, left, y, maxW, mmToPx(styles.details.lineGap), maxH);
        }

      // Detaylar (genişliğe göre sar; alt sınırı aşma)
      if (effectiveVisible.details) {
          ctx.font = `${mmToPx(styles.details.font)}px Arial`;
          const detX = mmToPx(anchors.details.x);
          const detTop = mmToPx(anchors.details.y);
          const stepY = mmToPx(styles.details.lineGap);
          // genişlik hesaplanıyor ama şu an sadece satır sarma için x kullanılıyor
          const detWidthPx = mmToPx(Math.min(labelWidth - anchors.details.x - 6, styles.details.widthMm));
          void detWidthPx; // keep for future multi-column; avoid unused warning
          const detHeightPx = mmToPx(labelHeight - anchors.details.y - 2);
          let detY = detTop;
          const addLine = (text: string) => {
            if (!text) return;
            if (detY + stepY - detTop > detHeightPx) return; // sığmıyorsa yazma
            ctx.fillText(text, detX, detY);
            detY += stepY;
          };
          addLine(labelData.amount ? `Miktar: ${labelData.amount}` : '');
          addLine(labelData.serialNumber ? `Seri: ${labelData.serialNumber}` : '');
          addLine(labelData.batchNumber ? `Parti: ${labelData.batchNumber}` : '');
          addLine(labelData.invoiceNumber ? `İrsaliye: ${labelData.invoiceNumber}` : '');
          addLine(labelData.entryDate ? `Giriş: ${labelData.entryDate}` : '');
          addLine(labelData.expiryDate ? `SKT: ${labelData.expiryDate}` : '');
          addLine(labelData.supplier ? `Tedarikçi: ${labelData.supplier}` : '');
          
          // Custom fields
          if (labelTypeCustomFields && labelData.customFields) {
            labelTypeCustomFields
              .filter(field => field.visible)
              .forEach(field => {
                const value = labelData.customFields?.[field.name];
                if (value !== undefined && value !== null && value !== '') {
                  let displayValue = String(value);
                  if (field.type === 'boolean') {
                    displayValue = value ? 'Evet' : 'Hayır';
                  } else if (field.type === 'date' && value) {
                    displayValue = new Date(String(value)).toLocaleDateString('tr-TR');
                  }
                  addLine(`${field.label}: ${displayValue}`);
                }
              });
          }
        }

      // Barkod
      if (effectiveVisible.barcode) {
          const ean = toEAN13(labelData.barcode);
          if (ean) {
            const barWidthMm = Math.max(20, styles.barcode.widthMm);
            const barLeft = mmToPx(anchors.barcode.x);
            const barTop = mmToPx(anchors.barcode.y);
            drawEAN13(ean, barLeft, barTop, barWidthMm, styles.barcode.height);
        }
          }
        }
        
    // Serbest mod çizimleri: Serbest sekmesinde veya Standartta freeMode aktifken
        if (freeMode && freeItems.length > 0) {
          // zIndex'e göre sırala ve çiz
          const sorted = [...freeItems].sort((a,b)=> (a.zIndex||0) - (b.zIndex||0));
          for (const item of sorted) {
            if (item.type === 'text' && item.text) {
              const fontMm = item.fontMm || 4;
              ctx.font = `${mmToPx(fontMm)}px Arial`;
              const left = mmToPx(item.x);
              const top = mmToPx(item.y);
              const w = mmToPx(item.wrapWidthMm || (labelWidth - item.x - 6));
              const maxH = mmToPx(labelHeight - item.y - 2);
              // Satır yüksekliğini fonta bağlı tutarak üst üste binmeyi engelle
              const lineHeightPx = mmToPx(fontMm * 1.15);
              wrapText(item.text, left, top, w, lineHeightPx, maxH);
            } else if (item.type === 'barcode' && item.text) {
              const ean = toEAN13(item.text);
              if (ean) {
                const leftAdjMm = 3; // EAN-13 ilk rakam alanını kutu içinde tutmak için
                const safeWidth = Math.max(10, (item.widthMm || 50) - leftAdjMm);
                drawEAN13(ean, mmToPx(item.x + leftAdjMm), mmToPx(item.y), safeWidth, item.heightMm || 12);
              }
            } else if (item.type === 'image' && item.src) {
              const key = item.src;
              let img = freeImageCache.current[key];
              if (!img) {
                img = new Image();
                (img as any).crossOrigin = 'anonymous';
                img.src = key;
                freeImageCache.current[key] = img;
                img.onload = () => renderZPLPreview();
              }
              if (img.complete && (item.widthMm && item.heightMm)) {
                ctx.drawImage(img, mmToPx(item.x), mmToPx(item.y), mmToPx(item.widthMm), mmToPx(item.heightMm));
              }
            } else if (item.type === 'line') {
              const w = item.widthMm || 20; const h = item.heightMm || 0.5;
              ctx.fillStyle = '#000';
              ctx.fillRect(mmToPx(item.x), mmToPx(item.y), mmToPx(w), mmToPx(h));
            } else if (item.type === 'circle') {
              const w = item.widthMm || 10; const h = item.heightMm || 10;
              const rx = mmToPx(w)/2; const ry = mmToPx(h)/2;
              const cx = mmToPx(item.x) + rx; const cy = mmToPx(item.y) + ry;
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
              ctx.fillStyle = item.color || '#000';
              ctx.fill();
            } else if (item.type === 'ring') {
              const w = item.widthMm || 12; const h = item.heightMm || 12;
              const rx = mmToPx(w)/2; const ry = mmToPx(h)/2;
              const cx = mmToPx(item.x) + rx; const cy = mmToPx(item.y) + ry;
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
              ctx.lineWidth = Math.max(1, Math.floor(mmToPx(0.6)));
              ctx.strokeStyle = item.color || '#000';
              ctx.stroke();
            } else if (item.type === 'rectangle') {
              const w = item.widthMm || 20; const h = item.heightMm || 10;
              // Beyaz dikdörtgen için silgi etkisi - altındaki her şeyi siler
              if (item.color === '#FFFFFF' || item.color === '#ffffff') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = '#000'; // Renk önemli değil, silme operasyonu
              } else {
                ctx.fillStyle = item.color || '#000';
              }
              ctx.fillRect(mmToPx(item.x), mmToPx(item.y), mmToPx(w), mmToPx(h));
              // Blend mode'u geri al
              ctx.globalCompositeOperation = 'source-over';
            }
          }
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

  // Canvas ve ZPL'i sürekli güncelle
  useEffect(() => {
      renderZPLPreview();
    try { generateZPL(); } catch {}
  }, [labelData, labelType, labelWidth, labelHeight, showPreview, darkness, anchors, styles, visible, freeMode, freeItems, dpi, zplDarkness, printSpeed, activeTab, selectedCompany, logoImages]);

  const generateZPL = () => {
    const PW = mmToDots(labelWidth);
    const LL = mmToDots(labelHeight);
    const lines: string[] = [];
    lines.push('^XA');
    lines.push('^CI28'); // UTF-8 / Türkçe karakter seti
    lines.push(`^MD${Math.min(30, Math.max(0, Math.round(zplDarkness)))}`);
    lines.push(`^PR${Math.min(14, Math.max(1, Math.round(printSpeed)))}`); // Baskı hızı
    lines.push(`^PW${PW}`);
    lines.push(`^LL${LL}`);
    // Başlık: sadece şirket adı metin olarak (logo ZPL'e gömülmüyor)
    if (effectiveVisible.title && selectedCompany) {
      lines.push(`^FO${mmToDots(anchors.title.x)},${mmToDots(anchors.title.y)}^A0N,${mmToDots(styles.title.font)},${mmToDots(styles.title.font)}^FD${selectedCompany}^FS`);
    }
    // Ürün adı
    if (effectiveVisible.productName && labelData.productName) {
      lines.push(`^FO${mmToDots(anchors.productName.x)},${mmToDots(anchors.productName.y)}^A0N,${mmToDots(styles.productName.font)},${mmToDots(styles.productName.font)}^FD${labelData.productName}^FS`);
    }
    // Detay satırları
    let detY = anchors.details.y;
    const pushDetail = (text?: string, label?: string) => {
      if (!text) return;
      lines.push(`^FO${mmToDots(anchors.details.x)},${mmToDots(detY)}^A0N,${mmToDots(styles.details.font)},${mmToDots(styles.details.font)}^FD${label ? label+': ' : ''}${text}^FS`);
      detY += styles.details.lineGap;
    };
    if (effectiveVisible.details) {
      pushDetail(labelData.amount, 'Miktar');
      pushDetail(labelData.serialNumber, 'Seri');
      pushDetail(labelData.batchNumber, 'Parti');
      pushDetail(labelData.invoiceNumber, 'İrsaliye');
      pushDetail(labelData.entryDate, 'Giriş');
      pushDetail(labelData.expiryDate, 'SKT');
      pushDetail(labelData.supplier, 'Tedarikçi');
      
      // Custom fields
      if (labelTypeCustomFields && labelData.customFields) {
        labelTypeCustomFields
          .filter(field => field.visible)
          .forEach(field => {
            const value = labelData.customFields?.[field.name];
            if (value !== undefined && value !== null && value !== '') {
              let displayValue = String(value);
              if (field.type === 'boolean') {
                displayValue = value ? 'Evet' : 'Hayır';
              } else if (field.type === 'date' && value) {
                displayValue = new Date(String(value)).toLocaleDateString('tr-TR');
              }
              pushDetail(displayValue, field.label);
            }
          });
      }
    }
    // Barkod
    const ean = labelData.barcode ? labelData.barcode.replace(/\D/g,'') : '';
    if (effectiveVisible.barcode && ean) {
      lines.push(`^FO${mmToDots(anchors.barcode.x)},${mmToDots(anchors.barcode.y)}^BY3^BCN,${mmToDots(styles.barcode.height)},Y,N,N^FD${ean}^FS`);
    }
    lines.push('^XZ');
    const zpl = lines.join('\n');
    setZplCode(zpl);
    setShowPreview(true);
  };

  const printLabel = async () => {
    // Zorunlu alan kontrolü
    const req = labelTypeFields as any;
    const missing: string[] = [];
    if (req) {
      const need = [
        ['productName','Ürün Adı'],
        ['barcode','Barkod'],
        ['serialNumber','Seri No'],
        ['entryDate','Giriş Tarihi'],
        ['expiryDate','Son Kullanma Tarihi'],
        ['amount','Miktar'],
        ['invoiceNumber','İrsaliye No'],
        ['batchNumber','Parti No'],
        ['supplier','Tedarikçi'],
      ] as const;
      for (const [key, label] of need) {
        const rule = req?.[key];
        const visible = rule?.visible !== false;
        const required = rule?.required === true;
        if (visible && required) {
          const val = (labelData as any)[key];
          if (!val) missing.push(label as string);
        }
      }
      
      // Custom field kontrolü
      if (labelTypeCustomFields) {
        labelTypeCustomFields
          .filter(field => field.visible && field.required)
          .forEach(field => {
            const value = labelData.customFields?.[field.name];
            if (!value || value === '') {
              missing.push(field.label);
            }
          });
      }
    }
    if (missing.length > 0) {
      showToast.error(`Zorunlu alanlar boş: ${missing.join(', ')}`);
      return;
    }
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
    // Zorunlu alan kontrolü: görünür ve zorunlu olanlarda değer olmalı
    const req = labelTypeFields as any;
    const missing: string[] = [];
    if (req) {
      const need = [
        ['productName','Ürün Adı'],
        ['barcode','Barkod'],
        ['serialNumber','Seri No'],
        ['entryDate','Giriş Tarihi'],
        ['expiryDate','Son Kullanma Tarihi'],
        ['amount','Miktar'],
        ['invoiceNumber','İrsaliye No'],
        ['batchNumber','Parti No'],
        ['supplier','Tedarikçi'],
      ] as const;
      for (const [key, label] of need) {
        const rule = req?.[key];
        const visible = rule?.visible !== false;
        const required = rule?.required === true;
        if (visible && required) {
          const val = (labelData as any)[key];
          if (!val) missing.push(label as string);
        }
      }
      
      // Custom field kontrolü
      if (labelTypeCustomFields) {
        labelTypeCustomFields
          .filter(field => field.visible && field.required)
          .forEach(field => {
            const value = labelData.customFields?.[field.name];
            if (!value || value === '') {
              missing.push(field.label);
            }
          });
      }
    }
    if (missing.length > 0) {
      showToast.error(`Zorunlu alanlar boş: ${missing.join(', ')}`);
      return;
    }
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

  if (initialLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          <div className="text-sm">Yükleniyor…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etiket Oluşturucu</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Zebra Yazıcı Desteği
        </div>
      </div>

      {/* Sekmeler */}
      <div className="mb-4 flex items-center gap-2">
        <button
          className={`px-3 py-1.5 text-sm rounded-md border ${activeTab==='standart' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={()=>setActiveTab('standart')}
        >Standart Etiket</button>
        <button
          className={`px-3 py-1.5 text-sm rounded-md border ${activeTab==='serbest' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300'}`}
          onClick={()=>setActiveTab('serbest')}
        >Serbest Etiket</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        {activeTab==='standart' && (
          <StandardForm
            labelType={labelType}
            setLabelType={setLabelType}
            labelTypeOptions={labelTypeOptions}
            labelData={labelData}
            setLabelData={setLabelData}
            fieldsConfig={labelTypeFields ?? undefined}
            customFields={labelTypeCustomFields}
            templateName={templateName}
            setTemplateName={setTemplateName}
            saving={saving}
            isDirty={isDirty}
            currentTemplateId={currentTemplateId}
            setShowSaveDialog={setShowSaveDialog}
            setCurrentTemplateId={setCurrentTemplateId}
            setShowTemplateModal={setShowTemplateModal}
            companyLogos={companyLogos}
            logoImages={logoImages}
            selectedCompany={selectedCompany}
            setSelectedCompany={setSelectedCompany}
            labelWidth={labelWidth}
            setLabelWidth={setLabelWidth}
            labelHeight={labelHeight}
            setLabelHeight={setLabelHeight}
            dpi={dpi}
            setDpi={setDpi}
            darkness={darkness}
            setDarkness={setDarkness}
            zplDarkness={zplDarkness}
            setZplDarkness={setZplDarkness}
            printSpeed={printSpeed}
            setPrintSpeed={setPrintSpeed}
            showAdvancedSettings={showAdvancedSettings}
            setShowAdvancedSettings={setShowAdvancedSettings}
            styles={styles}
            setStyles={setStyles}
            validateEan13={normalizeEan13}
          />
        )}

        {activeTab==='serbest' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Serbest Etiket Araçları</h3>
            <div className="space-y-4" onKeyDown={(e)=>{
              if (e.key === 'Delete' && selectedFreeId) {
                setFreeItemTypes(items => items.filter(i => i.id !== selectedFreeId));
                setSelectedFreeId(null);
              }
            }} tabIndex={0}>
              {/* Şablon Kaydet/Güncelle */}
              <div>
                <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Şablon</div>
                <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={templateName}
                onChange={(e)=>setTemplateName(e.target.value)}
                    placeholder="Şablon adı"
                className="w-44 p-2 text-sm border border-gray-300 rounded"
              />
                  <button
                    onClick={()=>{ setShowPreview(true); setShowSaveDialog(true); }}
                    disabled={saving || (!isDirty && !currentTemplateId)}
                    className={`px-3 py-1.5 text-sm text-white rounded ${currentTemplateId ? 'bg-emerald-600' : 'bg-indigo-600'} disabled:opacity-50`}
                  >{currentTemplateId ? 'Güncelle' : 'Kaydet'}</button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded"
                onClick={() => {
                  setCurrentTemplateId(null);
                      setTemplateName(n => (n ? `${n} (Kopya)` : 'Yeni Taslak'));
                      setShowPreview(true);
                  setShowSaveDialog(true);
                }}
              >Yeni Kaydet</button>
              <button type="button" onClick={()=>setShowTemplateModal(true)} className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded">Şablonlar</button>
                </div>
            </div>
              {/* Öğe ekleme */}
            <div>
                <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Öğe Ekle</div>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'text', text:'Yeni Metin', fontMm:4, wrapWidthMm:60, x:6, y:6, zIndex:5 }); setShowFreeDialog(true); }}>
                    <Type className="w-4 h-4" />
                    <span className="text-sm">Metin</span>
                  </button>
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'barcode', text:'5901234123457', widthMm:60, heightMm:12, x:6, y:20 }); setShowFreeDialog(true); }}>
                    <BarcodeIcon className="w-4 h-4" />
                    <span className="text-sm">Barkod</span>
                  </button>
                  <>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'image', src:String(r.result), widthMm:30, heightMm:12, x:6, y:10 }); setShowFreeDialog(true); }; r.readAsDataURL(f); e.currentTarget.value=''; }} />
                    <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>imageInputRef.current?.click()}>
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-sm">Görsel</span>
                    </button>
                  </>
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'line', widthMm:40, heightMm:0.6, x:6, y:30 }); setShowFreeDialog(true); }}>
                    <div className="w-5 h-5 border-t-2 border-gray-700" />
                    <span className="text-sm">Çizgi</span>
                  </button>
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'circle', widthMm:12, heightMm:12, x:6, y:36 }); setShowFreeDialog(true); }}>
                    <div className="w-4 h-4 rounded-full bg-gray-700" />
                    <span className="text-sm">Daire</span>
                  </button>
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'ring', widthMm:12, heightMm:12, x:20, y:36 }); setShowFreeDialog(true); }}>
                    <div className="w-4 h-4 rounded-full border-2 border-gray-700" />
                    <span className="text-sm">Çember</span>
                  </button>
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'rectangle', widthMm:20, heightMm:10, color:'#FFFFFF', x:6, y:42, zIndex:0 }); setShowFreeDialog(true); }}>
                    <div className="w-4 h-3 bg-white border border-gray-700" />
                    <span className="text-sm">Dikdörtgen</span>
                  </button>
            </div>
            </div>

              {/* Yakınlaştırma ve Izgara */}
              <div>
                <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Yakınlaştır</div>
                <div className="flex items-center gap-2 mb-2">
                  <button type="button" className="px-2 py-1 rounded border" onClick={()=>setZoom(z=>Math.max(0.5, Number((z-0.1).toFixed(2))))}><ZoomOut className="w-4 h-4"/></button>
                  <input type="range" min={0.5} max={3} step={0.1} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} className="flex-1" />
                  <button type="button" className="px-2 py-1 rounded border" onClick={()=>setZoom(z=>Math.min(3, Number((z+0.1).toFixed(2))))}><ZoomIn className="w-4 h-4"/></button>
                  <span className="w-10 text-right text-sm">{Math.round(zoom*100)}%</span>
              </div>
                <div className="flex items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={showGrid} onChange={(e)=>setShowGrid(e.target.checked)} /> Izgarayı Göster
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={snapToGrid} onChange={(e)=>setSnapToGrid(e.target.checked)} /> Izgaraya Yapıştır (Snap)
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <span>Izgara (mm)</span>
                    <input type="number" min={1} step={0.5} value={gridMm} onChange={(e)=>setGridMm(Math.max(0.5, Number(e.target.value)))} className="w-16 p-1 border rounded" />
                  </label>
              </div>
            </div>

              {/* Öğeler listesi ve katman kontrolü (modüler) */}
              <FreeItemsPanel
                items={freeItems}
                selectedId={selectedFreeId}
                onSelect={(id)=>setSelectedFreeId(id)}
                onMoveLayer={moveLayer}
                onReorder={reorderLayers}
                onClear={()=>setFreeItemTypes([])}
              />

              {/* Aksiyonlar */}
              <div className="grid grid-cols-1 gap-2 pt-2 border-t">
                <button onClick={generateZPL} className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"><QrCode className="w-4 h-4"/>ZPL Oluştur</button>
                <button onClick={downloadZPL} disabled={!zplCode} className="flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-700 text-white text-sm rounded-md hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed"><Download className="w-4 h-4"/>ZPL İndir</button>
                <button onClick={printLabel} disabled={!zplCode} className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed"><Printer className="w-4 h-4"/>Yazdır</button>
            </div>
            </div>
            </div>
        )}

        {/* Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Etiket Önizleme</h3>
            
            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap items-center justify-end">
            {/* Seçili öge için büyüt/küçült düğmeleri */}
            {selectedFreeId && freeMode && (
              <div className="flex gap-1 border border-gray-300 rounded-md">
                <button 
                  className="px-2 py-1 text-sm rounded-l-md bg-gray-50 hover:bg-gray-100" 
                  onClick={()=>adjustSelectedFreeSize(-1)} 
                  title="Küçült"
                >−</button>
                <button 
                  className="px-2 py-1 text-sm rounded-r-md bg-gray-50 hover:bg-gray-100" 
                  onClick={()=>adjustSelectedFreeSize(1)} 
                  title="Büyüt"
                >＋</button>
              </div>
            )}
            
            {/* Seçili öge için katman kontrolü */}
            {selectedFreeId && freeMode && (
              <div className="flex gap-1 border border-gray-300 rounded-md">
                <button 
                  className="px-2 py-1 text-sm rounded-l-md bg-gray-50 hover:bg-gray-100" 
                  onClick={()=>moveLayer(selectedFreeId, 'down')} 
                  title="Arkaya Al"
                >Alt</button>
                <button 
                  className="px-2 py-1 text-sm rounded-r-md bg-gray-50 hover:bg-gray-100" 
                  onClick={()=>moveLayer(selectedFreeId, 'up')} 
                  title="Öne Al"
                >Üst</button>
              </div>
            )}
            <button
                type="button"
                onClick={()=>setShowLabelSettings(true)}
                className="px-3 py-1.5 text-sm rounded-md border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                title="Etiket Ayarları"
              >Etiket Ayarları</button>
            {/* Düzenleme Modu */}
              <button
                type="button"
                onClick={() => setEditMode(v=>!v)}
                className={`px-3 py-1.5 text-sm rounded-md border ${editMode ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
              >{editMode ? 'Düzenleme Açık' : 'Düzenleme Modu'}</button>
            {/* Konumları Sıfırla kaldırıldı */}
            {/* Serbest Mod Penceresi kaldırıldı */}

            {/* ZPL Oluştur butonu kaldırıldı - ZPL sürekli güncelleniyor */}
            
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
              <button
                type="button"
                onClick={()=>{ setWsItems(freeItems); setShowFreeWorkspace(true); }}
                className="px-3 py-1.5 text-sm rounded-md border bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                title="Büyük Önizleme"
              >Büyük Önizleme</button>
            </div>
          </div>

        {/* Canvas Preview + Drag Anchors */}
          <PreviewCanvas
            canvasRef={canvasRef}
            overlayRef={overlayRef}
            labelWidth={labelWidth}
            labelHeight={labelHeight}
            zoom={zoom}
            showGrid={showGrid}
            gridMm={gridMm}
            showPreview={showPreview}
            activeTab={activeTab}
            editMode={editMode}
            visible={visible}
            effectiveVisible={effectiveVisible}
            anchors={anchors}
            styles={styles}
            freeItems={freeItems}
            selectedFreeId={selectedFreeId}
            freeMode={freeMode}
            setDragKey={setDragKey}
            setDraggingAnchorKey={setDraggingAnchorKey}
            setDragOffset={setDragOffset}

            setResizingAnchorKeyGlobal={setResizingAnchorKeyGlobal}
            setResizeStart={setResizeStart}
            setDraggingFreeId={setDraggingFreeId}
            setSelectedFreeId={setSelectedFreeId}
            setEditingFreeId={setEditingFreeId}
            setFreeDraft={setFreeDraft}
            setShowFreeDialog={setShowFreeDialog}
            setRemoveTarget={setRemoveTarget}
            setRemoveFreeId={setRemoveFreeId}
            setResizingFreeIdGlobal={setResizingFreeIdGlobal}
          />
          {activeTab==='standart' && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Öğe Ekle</div>
              <div className="grid grid-cols-3 gap-2">
                <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeMode(true); setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'text', text:'Yeni Metin', fontMm:4, wrapWidthMm:60, x:6, y:6, zIndex:5 }); setShowFreeDialog(true); }}>
                  <Type className="w-4 h-4" />
                  <span className="text-sm">Metin</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeMode(true); setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'barcode', text:'5901234123457', widthMm:60, heightMm:12, x:6, y:20 }); setShowFreeDialog(true); }}>
                  <BarcodeIcon className="w-4 h-4" />
                  <span className="text-sm">Barkod</span>
                </button>
                <>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ setFreeMode(true); setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'image', src:String(r.result), widthMm:30, heightMm:12, x:6, y:10 }); setShowFreeDialog(true); }; r.readAsDataURL(f); e.currentTarget.value=''; }} />
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>imageInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-sm">Görsel</span>
                  </button>
                </>
                <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeMode(true); setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'line', widthMm:40, heightMm:0.6, x:6, y:30 }); setShowFreeDialog(true); }}>
                  <div className="w-5 h-5 border-t-2 border-gray-700" />
                  <span className="text-sm">Çizgi</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeMode(true); setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'circle', widthMm:12, heightMm:12, x:6, y:36 }); setShowFreeDialog(true); }}>
                  <div className="w-4 h-4 rounded-full bg-gray-700" />
                  <span className="text-sm">Daire</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeMode(true); setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'ring', widthMm:12, heightMm:12, x:20, y:36 }); setShowFreeDialog(true); }}>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-700" />
                  <span className="text-sm">Çember</span>
                </button>
                <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeMode(true); setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'rectangle', widthMm:20, heightMm:10, color:'#FFFFFF', x:6, y:42, zIndex:0 }); setShowFreeDialog(true); }}>
                  <div className="w-4 h-3 bg-white border border-gray-700" />
                  <span className="text-sm">Dikdörtgen</span>
                </button>
                    </div>
                </div>
              )}
            <div className="flex items-center justify-between mt-2 gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span>Yakınlaştır:</span>
                <button type="button" className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={()=>setZoom(z=>Math.max(0.5, Number((z-0.1).toFixed(2))))}>-</button>
                <input type="range" min={0.5} max={3} step={0.1} value={zoom} onChange={(e)=>setZoom(Number(e.target.value))} />
                <button type="button" className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={()=>setZoom(z=>Math.min(3, Number((z+0.1).toFixed(2))))}>+</button>
                <span className="w-10 text-right">{Math.round(zoom*100)}%</span>
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

          {/* Talimatlar kaldırıldı – arayüzü sadeleştirmek için */}
          </div>

        {/* Şablon Modalı */}
        {showLabelSettings && (
          <LabelSettingsModal open={showLabelSettings} onClose={()=>setShowLabelSettings(false)} />
        )}
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setShowTemplateModal(false)} />
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-3xl rounded-lg shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">Şablonlar</h4>
                <button className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={()=>setShowTemplateModal(false)}>Kapat</button>
        </div>
              <div className="mb-3 flex items-center gap-2">
                <input value={templateSearch} onChange={(e)=>setTemplateSearch(e.target.value)} placeholder="Ara..." className="flex-1 p-2 border rounded" />
                <select value={templateTypeFilter} onChange={(e)=>setTemplateTypeFilter(e.target.value)} className="p-2 border rounded">
                  <option value="Hepsi">Tüm Türler</option>
                  {labelTypeOptions.map((opt)=> (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  <option value="Geçersiz">Geçersiz Türler</option>
                </select>
                <button onClick={fetchTemplates} className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded">Yenile</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-auto">
                {templates.filter(t=> {
                    const type = (t as any).data?.labelType || '';
                    const valid = labelTypeOptions.includes(type);
                    const matchText = t.name.toLowerCase().includes(templateSearch.toLowerCase());
                    const matchType = templateTypeFilter==='Hepsi' ? true : (templateTypeFilter==='Geçersiz' ? !valid : type===templateTypeFilter);
                    return matchText && matchType;
                  }).map(t => (
                  <div key={t.id} className="relative border rounded-md p-2 hover:shadow cursor-pointer group" onClick={()=>{loadTemplate(t.id); setShowTemplateModal(false);}}>
                    <button
                      className="absolute right-1 top-1 p-1 rounded bg-red-600 text-white opacity-0 group-hover:opacity-100"
                      onClick={(e)=>{ e.stopPropagation(); setDeleteTemplateId(t.id); }}
                      title="Şablonu sil"
                      aria-label="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {/* Tür Badgesi */}
                    {(() => {
                      const type = (t as any).data?.labelType || '';
                      const isFree = (t as any).is_free === true;
                      const text = isFree ? 'Serbest Etiket' : (labelTypeOptions.includes(type) ? type : '');
                      return text ? (
                        <div className="absolute left-1 top-1 px-2 py-0.5 text-[10px] rounded bg-gray-800 text-white opacity-80">{text}</div>
                      ) : null;
                    })()}
                    {t.thumbnail ? (
                      <img src={t.thumbnail} alt={t.name} className="w-full h-28 object-contain bg-gray-50 rounded" />
                    ) : (
                      <div className="w-full h-28 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">Önizleme yok</div>
                    )}
                    <div className="mt-2 text-sm font-medium truncate" title={t.name}>{t.name}</div>
                  </div>
                ))}
                {templates.length===0 && (
                  <div className="col-span-full text-sm text-gray-500">Kayıtlı şablon yok.</div>
                )}
          </div>
        </div>
          </div>
        )}

        {/* Serbest Mod Dialog */}
        {showFreeDialog && freeDraft && (
          <div className="fixed inset-0 z-[103] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setShowFreeDialog(false)} />
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-3">{editingFreeId ? 'Öğeyi Düzenle' : 'Yeni Öğeyi Ekle'}</h4>
              <div className="space-y-3">
                <div className="text-sm">Tip: <span className="font-medium capitalize">{freeDraft.type}</span></div>
                {(freeDraft.type === 'text') && (
                  <>
                    <label className="block text-sm font-medium mb-1">Metin</label>
                    <textarea className="w-full p-2 border rounded" rows={3} value={freeDraft.text || ''} onChange={(e)=>setFreeDraft({...freeDraft, text:e.target.value})} />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Font (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.fontMm || 4} onChange={(e)=>setFreeDraft({...freeDraft, fontMm:Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Sarma Genişliği (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.wrapWidthMm || 60} onChange={(e)=>setFreeDraft({...freeDraft, wrapWidthMm:Number(e.target.value)})} />
                      </div>
                    </div>
                  </>
                )}
                {(freeDraft.type === 'line') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Genişlik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.widthMm || 40} onChange={(e)=>setFreeDraft({...freeDraft, widthMm:Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Kalınlık (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.heightMm || 0.6} onChange={(e)=>setFreeDraft({...freeDraft, heightMm:Number(e.target.value)})} />
                      </div>
                    </div>
                  </>
                )}
                {(freeDraft.type === 'circle') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Genişlik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.widthMm || 12} onChange={(e)=>setFreeDraft({...freeDraft, widthMm:Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Yükseklik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.heightMm || 12} onChange={(e)=>setFreeDraft({...freeDraft, heightMm:Number(e.target.value)})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Renk</label>
                      <input type="color" className="w-full h-10 border rounded" value={freeDraft.color || '#000000'} onChange={(e)=>setFreeDraft({...freeDraft, color:e.target.value})} />
                    </div>
                  </>
                )}
                {(freeDraft.type === 'ring') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Genişlik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.widthMm || 12} onChange={(e)=>setFreeDraft({...freeDraft, widthMm:Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Yükseklik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.heightMm || 12} onChange={(e)=>setFreeDraft({...freeDraft, heightMm:Number(e.target.value)})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Renk</label>
                      <input type="color" className="w-full h-10 border rounded" value={freeDraft.color || '#000000'} onChange={(e)=>setFreeDraft({...freeDraft, color:e.target.value})} />
                    </div>
                  </>
                )}
                {(freeDraft.type === 'rectangle') && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Genişlik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.widthMm || 20} onChange={(e)=>setFreeDraft({...freeDraft, widthMm:Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Yükseklik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.heightMm || 10} onChange={(e)=>setFreeDraft({...freeDraft, heightMm:Number(e.target.value)})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Renk</label>
                      <input type="color" className="w-full h-10 border rounded" value={freeDraft.color || '#FFFFFF'} onChange={(e)=>setFreeDraft({...freeDraft, color:e.target.value})} />
                    </div>
                  </>
                )}
                {(freeDraft.type === 'barcode') && (
                  <>
                    <label className="block text-sm font-medium mb-1">Barkod (EAN-13)</label>
                    <input className="w-full p-2 border rounded" value={freeDraft.text || ''} onChange={(e)=>setFreeDraft({...freeDraft, text:e.target.value})} />
                    {(() => { const r = normalizeEan13(freeDraft.text); if (!freeDraft.text) return <p className="text-xs text-gray-500 mt-1">12 haneli girerseniz son haneyi otomatik hesaplarız</p>; if (r.error) return <p className="text-xs mt-1 text-red-600">{r.error}</p>; return <p className="text-xs mt-1 text-emerald-600">Geçerli EAN-13 ✓ (Checksum: {r.checksum})</p>; })()}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Genişlik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.widthMm || 60} onChange={(e)=>setFreeDraft({...freeDraft, widthMm:Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Yükseklik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.heightMm || 12} onChange={(e)=>setFreeDraft({...freeDraft, heightMm:Number(e.target.value)})} />
                      </div>
                    </div>
                  </>
                )}
                {(freeDraft.type === 'image') && (
                  <>
                    <div className="text-xs text-gray-500 mb-1">Yüklenen görseli yeniden seçmek isterseniz üstteki “Görsel Ekle” ile tekrar ekleyin.</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm mb-1">Genişlik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.widthMm || 30} onChange={(e)=>setFreeDraft({...freeDraft, widthMm:Number(e.target.value)})} />
                      </div>
                      <div>
                        <label className="block text-sm mb-1">Yükseklik (mm)</label>
                        <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.heightMm || 12} onChange={(e)=>setFreeDraft({...freeDraft, heightMm:Number(e.target.value)})} />
                      </div>
                    </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm mb-1">X (mm)</label>
                    <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.x || 6} onChange={(e)=>setFreeDraft({...freeDraft, x:Number(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Y (mm)</label>
                    <input type="number" step={0.1} className="w-full p-2 border rounded" value={freeDraft.y || 6} onChange={(e)=>setFreeDraft({...freeDraft, y:Number(e.target.value)})} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 mt-4">
                <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={()=>setShowFreeDialog(false)}>Vazgeç</button>
                <button
                  className="px-3 py-1.5 text-sm rounded bg-purple-600 text-white"
                  onClick={()=>{
                    if (!freeDraft) return;
                    const applyTo = freeEditContext === 'workspace' ? setWsItems : setFreeItemTypes;
                    if (editingFreeId) {
                      applyTo((arr: FreeItemType[]) => normalizeZ(arr.map(it => it.id===editingFreeId ? { ...it, ...freeDraft, id: editingFreeId } as FreeItemType : it)));
                    } else {
                      const id = crypto.randomUUID();
                      applyTo((arr: FreeItemType[]) => normalizeZ([ ...arr, { id, ...(freeDraft as any), zIndex: getMaxZ(arr)+1 } as FreeItemType ]));
                    }
                    setShowFreeDialog(false);
                    setEditingFreeId(null);
                    setFreeDraft(null);
                    setShowPreview(true);
                    renderZPLPreview();
                  }}
                >Onayla</button>
              </div>
            </div>
          </div>
        )}

        {/* Serbest Mod Çalışma Alanı (ayrı pencere/modal) */}
        {showFreeWorkspace && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setShowFreeWorkspace(false)} />
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-7xl h-[85vh] rounded-lg shadow-2xl p-4 z-[101] overflow-auto">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">Serbest Etiket Tasarımı</h4>
                <div className="flex items-center gap-2">
                  {/* Seçili öğe büyüt/küçült */}
                  <div className="flex items-center gap-1 mr-2">
                    <button className="px-2 py-1 text-sm rounded border" onClick={()=>adjustSelectedSize(-1)} title="Küçült">−</button>
                    <button className="px-2 py-1 text-sm rounded border" onClick={()=>adjustSelectedSize(1)} title="Büyüt">＋</button>
                  </div>
                  {/* Seçili öğe katman kontrolü */}
                  {(wsSelectedAnchorKey || selectedFreeId) && (
                    <div className="flex items-center gap-1 mr-2">
                      <button className="px-2 py-1 text-sm rounded border" onClick={()=>{
                        if (selectedFreeId) {
                          moveLayer(selectedFreeId, 'down');
                          // workspace items'ı güncelle
                          setWsItems(prev => [...prev].map(item => {
                            const found = freeItems.find(f => f.id === item.id);
                            return found ? { ...found } : item;
                          }));
                        }
                      }} title="Arkaya Al">Alt</button>
                      <button className="px-2 py-1 text-sm rounded border" onClick={()=>{
                        if (selectedFreeId) {
                          moveLayer(selectedFreeId, 'up');
                          // workspace items'ı güncelle
                          setWsItems(prev => [...prev].map(item => {
                            const found = freeItems.find(f => f.id === item.id);
                            return found ? { ...found } : item;
                          }));
                        }
                      }} title="Öne Al">Üst</button>
                    </div>
                  )}
                  <button className="px-3 py-1.5 text-sm rounded border" onClick={()=>{ setFreeEditContext('workspace'); setEditingFreeId(null); setFreeDraft({ type:'text', text:'Yeni Metin', fontMm:4, wrapWidthMm:60, x:6, y:6, zIndex:5 }); setShowFreeDialog(true); }}>Metin</button>
                  <button className="px-3 py-1.5 text-sm rounded border" onClick={()=>{ setFreeEditContext('workspace'); setEditingFreeId(null); setFreeDraft({ type:'barcode', text:'5901234123457', widthMm:60, heightMm:12, x:6, y:20 }); setShowFreeDialog(true); }}>Barkod</button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ setFreeEditContext('workspace'); setEditingFreeId(null); setFreeDraft({ type:'image', src:String(r.result), widthMm:30, heightMm:12, x:6, y:10 }); setShowFreeDialog(true); }; r.readAsDataURL(f); e.currentTarget.value=''; }} />
                  <button className="px-3 py-1.5 text-sm rounded border" onClick={()=>imageInputRef.current?.click()}>Görsel</button>
                  <button className="px-3 py-1.5 text-sm rounded border" onClick={()=>{ setFreeEditContext('workspace'); setEditingFreeId(null); setFreeDraft({ type:'rectangle', widthMm:20, heightMm:10, color:'#FFFFFF', x:6, y:42, zIndex:0 }); setShowFreeDialog(true); }}>Dikdörtgen</button>
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <span>Yakınlaştır:</span>
                    <button className="px-2 py-1 bg-gray-200 rounded" onClick={()=>setWsZoom(z=>Math.max(0.5, Number((z-0.1).toFixed(2))))}>-</button>
                    <input type="range" min={0.5} max={3} step={0.1} value={wsZoom} onChange={(e)=>setWsZoom(Number(e.target.value))} />
                    <button className="px-2 py-1 bg-gray-200 rounded" onClick={()=>setWsZoom(z=>Math.min(3, Number((z+0.1).toFixed(2))))}>+</button>
                    <span className="w-10 text-right">{Math.round(wsZoom*100)}%</span>
                  </div>
                  <button className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white" onClick={()=>{ 
                    setFreeMode(true); 
                    setFreeItemTypes([...wsItems]); 
                    setShowFreeWorkspace(false); 
                    setShowPreview(true); 
                    setTimeout(()=>{ 
                      try { 
                        renderZPLPreview(); 
                        generateZPL(); 
                        // Force state update
                        setFreeItemTypes(prev => [...prev]);
                      } catch {} 
                    }, 100); 
                  }}>Kaydet ve Kapat</button>
                  <button className="px-3 py-1.5 text-sm rounded bg-gray-200" onClick={()=>{ 
                    setFreeMode(true); 
                    setFreeItemTypes([...wsItems]); 
                    setShowFreeWorkspace(false); 
                    setShowPreview(true); 
                    setTimeout(()=>{ 
                      try { 
                        renderZPLPreview(); 
                        generateZPL(); 
                        // Force state update
                        setFreeItemTypes(prev => [...prev]);
                      } catch {} 
                    }, 100); 
                  }}>Kapat</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 relative">
                <div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <div ref={wsContainerRef} className="w-full max-w-[1400px] mx-auto bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 relative overflow-auto">
                      <canvas ref={wsCanvasRef} className="w-full h-auto border border-gray-300" style={{ width: `${labelWidth * 3.78 * wsZoom}px`, height: `${labelHeight * 3.78 * wsZoom}px` }} />
                      {/* Standart öğeler overlay */}
                      <div className="absolute inset-4 pointer-events-none select-none">
                        {(['title','productName','details','barcode'] as const).filter(k=>effectiveVisible[k]).map((key)=> (
                          <div
                            key={key}
                            className="absolute bg-red-500/10 border border-red-500 text-[10px] text-red-700 rounded pointer-events-auto z-20"
                            style={{
                              left: `${anchors[key].x * 3.78 * wsZoom}px`,
                              top: `${anchors[key].y * 3.78 * wsZoom}px`,
                              width: (() => {
                                const base = 3.78 * wsZoom;
                                if (key==='productName') return `${styles.productName.wrapWidth * base}px`;
                                if (key==='barcode') return `${styles.barcode.widthMm * base}px`;
                                if (key==='details') return `${styles.details.widthMm * base}px`;
                                return `${styles.title.widthMm * base}px`;
                              })(),
                              height: (() => {
                                const base = 3.78 * wsZoom;
                                if (key==='title') return `${(styles.title.font + 2) * base}px`;
                                if (key==='productName') return `${(styles.productName.font * 2 + styles.details.lineGap) * base}px`;
                                if (key==='details') return `${(styles.details.lineGap * 6) * base}px`;
                                return `${(styles.barcode.height + 8) * base}px`;
                              })(),
                              cursor: 'move'
                            }}
                            onMouseDown={(e) => {
                              setWsDraggingAnchorKey(key);
                              setWsSelectedAnchorKey(key);
                              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                              setWsDragOffset({ dx: e.clientX - (rect.left + anchors[key].x * 3.78 * wsZoom), dy: e.clientY - (rect.top + anchors[key].y * 3.78 * wsZoom) });
                            }}
                            onMouseUp={() => setWsDraggingAnchorKey(null)}
                            onMouseMove={(e) => {
                              if (wsDraggingAnchorKey !== key) return;
                              const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                              const base = 3.78 * wsZoom;
                              let x = (e.clientX - parent.left - wsDragOffset.dx) / base;
                              let y = (e.clientY - parent.top - wsDragOffset.dy) / base;
                              if (snapToGrid) { const g = gridMm; x = Math.round(x/g)*g; y = Math.round(y/g)*g; }
                              setAnchors(prev => ({ ...prev, [key]: { x: Math.max(0, Math.min(labelWidth-5, x)), y: Math.max(0, Math.min(labelHeight-5, y)) } }));
                            }}
                            onMouseLeave={() => setWsDraggingAnchorKey(null)}
                          >
                            <div className="absolute left-1 top-1 text-[10px] px-1 py-0.5 bg-white/60 rounded">{key}</div>
                            {/* İçerik önizleme (sadece görsel amaçlı) */}
                            {key==='title' && (
                              <div className="absolute inset-1 overflow-hidden pointer-events-none">
                                {logoImages[selectedCompany] ? (
                                  <img
                                    src={(logoImages as any)[selectedCompany]?.src || ''}
                                    alt={selectedCompany}
                                    className="h-full object-contain"
                                    style={{ maxWidth: '100%', maxHeight: `${(styles.title.font + 4) * 3.78 * wsZoom}px` }}
                                  />
                                ) : (
                                  <div
                                    className="text-black"
                                    style={{ fontSize: `${styles.title.font * 3.78 * wsZoom}px`, lineHeight: 1 as any }}
                                  >
                                    {selectedCompany}
                                  </div>
                                )}
                              </div>
                            )}
                            {key==='productName' && labelData.productName && (
                              <div
                                className="absolute inset-1 overflow-hidden pointer-events-none text-black"
                                style={{ fontSize: `${styles.productName.font * 3.78 * wsZoom}px`, lineHeight: `${Math.max(1, styles.details.lineGap * 3.78 * wsZoom)}px` }}
                              >
                                {labelData.productName}
                              </div>
                            )}
                            {key==='details' && (
                              <div
                                className="absolute inset-1 overflow-hidden pointer-events-none text-black"
                                style={{ fontSize: `${styles.details.font * 3.78 * wsZoom}px`, lineHeight: `${Math.max(12, styles.details.lineGap * 3.78 * wsZoom)}px` }}
                              >
                                {labelData.amount && (<div>Miktar: {labelData.amount}</div>)}
                                {labelData.serialNumber && (<div>Seri: {labelData.serialNumber}</div>)}
                                {labelData.batchNumber && (<div>Parti: {labelData.batchNumber}</div>)}
                                {labelData.invoiceNumber && (<div>İrsaliye: {labelData.invoiceNumber}</div>)}
                                {labelData.entryDate && (<div>Giriş: {labelData.entryDate}</div>)}
                                {labelData.expiryDate && (<div>SKT: {labelData.expiryDate}</div>)}
                                {labelData.supplier && (<div>Tedarikçi: {labelData.supplier}</div>)}
                                
                                {/* Custom fields */}
                                {labelTypeCustomFields?.filter(field => field.visible).map(field => {
                                  const value = labelData.customFields?.[field.name];
                                  if (value !== undefined && value !== null && value !== '') {
                                    let displayValue = String(value);
                                    if (field.type === 'boolean') {
                                      displayValue = value ? 'Evet' : 'Hayır';
                                    } else if (field.type === 'date' && value) {
                                      displayValue = new Date(String(value)).toLocaleDateString('tr-TR');
                                    }
                                    return (<div key={field.id}>{field.label}: {displayValue}</div>);
                                  }
                                  return null;
                                })}
                              </div>
                            )}
                            {key==='barcode' && labelData.barcode && (
                              <div className="absolute inset-1 flex flex-col justify-end pointer-events-none">
                                <div
                                  className="w-full"
                                  style={{
                                    height: `${Math.max(8, (styles.barcode.height || 12) * 3.78 * wsZoom * 0.7)}px`,
                                    backgroundImage: 'repeating-linear-gradient(90deg, #111 0, #111 2px, transparent 2px, transparent 4px)'
                                  }}
                                />
                                <div className="text-[10px] text-black text-center mt-1 select-none">
                                  {String(labelData.barcode)}
                                </div>
                              </div>
                            )}
                            <div
                              className="absolute right-0 bottom-0 w-3 h-3 bg-blue-600 cursor-se-resize"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setWsResizingAnchorKey(key);
                                const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                                setWsResizeStart({
                                  x0: e.clientX,
                                  y0: e.clientY,
                                  wMm: parseFloat(((parent.width)/(3.78*wsZoom)).toFixed(2)),
                                  hMm: parseFloat(((parent.height)/(3.78*wsZoom)).toFixed(2)),
                                  productFont: styles.productName.font,
                                  productWrap: styles.productName.wrapWidth,
                                  titleFont: styles.title.font,
                                  detailsGap: styles.details.lineGap,
                                  detailsFont: styles.details.font,
                                  bcHeight: styles.barcode.height
                                });
                              }}
                              onMouseMove={(e) => {
                                if (wsResizingAnchorKey !== key) return;
                                const base = 3.78 * wsZoom;
                                const rawDx = (e.clientX - wsResizeStart.x0) / base;
                                const rawDy = (e.clientY - wsResizeStart.y0) / base;
                                const targetDx = (Math.abs(rawDx) < 0.15 ? 0 : rawDx * WS_RESIZE_SENS);
                                const targetDyRaw = (Math.abs(rawDy) < 0.15 ? 0 : rawDy * WS_RESIZE_SENS);
                                wsResizeDeltaRef.current.dx = wsResizeDeltaRef.current.dx + (targetDx - wsResizeDeltaRef.current.dx) * WS_RESIZE_SMOOTH;
                                wsResizeDeltaRef.current.dy = wsResizeDeltaRef.current.dy + (targetDyRaw - wsResizeDeltaRef.current.dy) * WS_RESIZE_SMOOTH;
                                const dxMm = wsResizeDeltaRef.current.dx;
                                const dyMm = (key==='details' ? wsResizeDeltaRef.current.dy/2 : wsResizeDeltaRef.current.dy);
                                setStyles(s => {
                                  if (key==='productName') return { ...s, productName: { ...s.productName, wrapWidth: Math.max(20, wsResizeStart.productWrap + dxMm), font: Math.max(2, wsResizeStart.productFont + dyMm) } };
                                  if (key==='title') return { ...s, title: { ...s.title, widthMm: Math.max(10, wsResizeStart.wMm + dxMm), font: Math.max(2, wsResizeStart.titleFont + dyMm) } };
                                  if (key==='details') return { ...s, details: { ...s.details, widthMm: Math.max(20, wsResizeStart.wMm + dxMm), lineGap: Math.max(2, wsResizeStart.detailsGap + dyMm/2), font: Math.max(2, wsResizeStart.detailsFont + dyMm/2) } };
                                  if (key==='barcode') return { ...s, barcode: { ...s.barcode, widthMm: Math.max(20, wsResizeStart.wMm + dxMm), height: Math.max(5, wsResizeStart.bcHeight + dyMm) } };
                                  return s;
                                });
                              }}
                              onMouseUp={() => setWsResizingAnchorKey(null)}
                              onMouseLeave={() => setWsResizingAnchorKey(null)}
                            />
                          </div>
                        ))}
                      </div>
                      {/* Serbest öğe overlay */}
                      <div className="absolute inset-4 pointer-events-none select-none">
                        {[...wsItems].sort((a,b)=> (a.zIndex||0)-(b.zIndex||0)).map((item) => (
                          <div
                            key={item.id}
                            className="absolute bg-purple-500/10 border border-purple-500 text-[10px] text-purple-800 rounded pointer-events-auto"
                            style={{
                              left: `${item.x * 3.78 * wsZoom}px`,
                              top: `${item.y * 3.78 * wsZoom}px`,
                              width: `${((item.type==='text' ? (item.wrapWidthMm || 60) : (item.widthMm || 40)) * 3.78 * wsZoom)}px`,
                              height: `${(() => {
                                if (item.type==='text') {
                                  const font = item.fontMm || 4;
                                  const wrap = item.wrapWidthMm || 60;
                                  const text = item.text || '';
                                  const charW = font * 0.55; // yaklaşık karakter genişliği mm
                                  const maxChars = Math.max(1, Math.floor(wrap / charW));
                                  const words = text.split(/\s+/).filter(Boolean);
                                  let lines = 1; let lineLen = 0;
                                  for (const w of words) { const need=(lineLen>0?1:0)+w.length; if (lineLen + need > maxChars) { lines++; lineLen = w.length; } else { lineLen += need; } }
                                  const lineHeightMm = font * 1.15;
                                  const calc = Math.max(font + 2, lines * lineHeightMm);
                                  return calc * 3.78 * wsZoom;
                                }
                                return (item.heightMm || 12) * 3.78 * wsZoom;
                              })()}px`,
                              cursor: 'move',
                              zIndex: 1000
                            }}
                            onMouseDown={(e) => {
                              setSelectedFreeId(item.id);
                              setWsSelectedAnchorKey(null);
                              setDragKey('title');
                              const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                              setDragOffset({ dx: e.clientX - (rect.left + item.x * 3.78 * wsZoom), dy: e.clientY - (rect.top + item.y * 3.78 * wsZoom) });
                              (e.currentTarget as any).dataset.freeId = item.id;
                            }}
                            onMouseMove={(e) => {
                              const freeId = (e.currentTarget as any).dataset.freeId;
                              if (!freeId || dragKey !== 'title') return;
                              const parent = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                              const x = (e.clientX - parent.left - dragOffset.dx) / (3.78 * wsZoom);
                              const y = (e.clientY - parent.top - dragOffset.dy) / (3.78 * wsZoom);
                              setWsItems((arr)=> arr.map(it=> it.id===freeId ? { ...it, x: Math.max(0, Math.min(labelWidth-5, x)), y: Math.max(0, Math.min(labelHeight-5, y)) } : it));
                            }}
                            onMouseUp={() => setDragKey(null)}
                            onMouseLeave={() => setDragKey(null)}
                            onDoubleClick={(e)=>{ e.stopPropagation(); setFreeEditContext('workspace'); setEditingFreeId(item.id); setFreeDraft({ ...item, type: item.type }); setShowFreeDialog(true); }}
                            >
                            <div className="absolute left-1 top-1 text-[10px] px-1 py-0.5 bg-white/60 rounded">{item.type}</div>
                            <button type="button" className="absolute right-1 top-1 w-4 h-4 leading-4 text-[10px] bg-red-600 text-white rounded hover:bg-red-700" onClick={(e)=>{ e.stopPropagation(); setWsRemoveId(item.id); }}>×</button>
                              {/* İçerik önizleme */}
                              {item.type === 'text' && (
                                <div
                                  className="absolute inset-1 overflow-hidden text-black pointer-events-none"
                                  style={{
                                    fontSize: `${(item.fontMm || 4) * 3.78 * wsZoom}px`,
                                    lineHeight: `${(item.fontMm || 4) * 3.78 * wsZoom * 1.15}px`
                                  }}
                                >
                                  {item.text}
                                </div>
                              )}
                              {item.type === 'barcode' && (
                                <div className="absolute inset-1 flex flex-col justify-end pointer-events-none">
                                  <div
                                    className="w-full"
                                    style={{
                                      height: `${Math.max(8, (item.heightMm || 12) * 3.78 * wsZoom * 0.7)}px`,
                                      backgroundImage:
                                        'repeating-linear-gradient(90deg, #111 0, #111 2px, transparent 2px, transparent 4px)'
                                    }}
                                  />
                                  <div className="text-[10px] text-black text-center mt-1 select-none">
                                    {item.text}
                                  </div>
                                </div>
                              )}
                              {item.type === 'image' && item.src && (
                                <img
                                  src={item.src}
                                  alt="img"
                                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                />
                              )}
                              {item.type === 'rectangle' && (
                                <div
                                  className="absolute inset-0 pointer-events-none"
                                  style={{
                                    backgroundColor: item.color || '#000000',
                                    // Beyaz dikdörtgen için silgi görsel etkisi
                                    ...(item.color === '#FFFFFF' || item.color === '#ffffff' ? {
                                      backgroundColor: 'rgba(255,255,255,0.8)',
                                      border: '1px dashed #ccc',
                                      boxSizing: 'border-box'
                                    } : {})
                                  }}
                                />
                              )}
                            <div className="absolute right-0 bottom-0 w-3 h-3 bg-purple-600 cursor-se-resize"
                              onMouseDown={(e)=>{
                                e.stopPropagation();
                                const parent=(e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                                setResizeStart({ x0:e.clientX, y0:e.clientY, wMm: parseFloat(((parent.width)/(3.78*wsZoom)).toFixed(2)), hMm: parseFloat(((parent.height)/(3.78*wsZoom)).toFixed(2)), productFont: item.fontMm||4, productWrap: item.wrapWidthMm||60, titleFont:0, detailsGap:0, detailsFont:0, bcHeight:item.heightMm||12, bcScale:1 });
                                setWsResizingFreeId(item.id);
                                setWsResizeStartFree({ x0:e.clientX, y0:e.clientY, wMm: item.widthMm||40, hMm: item.heightMm||12, fontMm: item.fontMm||4, wrapMm: item.wrapWidthMm||60 });
                              }}
                              onMouseUp={()=>{ setWsResizingFreeId(null); }}
                              onMouseLeave={()=>{ setWsResizingFreeId(null); }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Silme onayı */}
            {wsRemoveId && (
              <div className="fixed inset-0 z-[102] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/40" onClick={()=>setWsRemoveId(null)} />
                <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-lg shadow-lg p-4">
                  <h4 className="text-lg font-semibold mb-2">Öğeyi Kaldır</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Seçili öğeyi kaldırmak istiyor musunuz?</p>
                  <div className="flex items-center justify-end gap-2">
                    <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={()=>setWsRemoveId(null)}>Vazgeç</button>
                    <button className="px-3 py-1.5 text-sm rounded bg-red-600 text-white" onClick={()=>{ setWsItems(items=>items.filter(i=>i.id!==wsRemoveId)); setWsRemoveId(null); }}>Kaldır</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Büyük Önizleme Dialogu */}
        {showPreview && (
          <div className="fixed inset-0 z-[90] pointer-events-none">
            {/* boş; ana önizleme zaten sayfada */}
          </div>
        )}
        {/* Kaydet/Güncelle Onayı */}
        {showSaveDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setShowSaveDialog(false)} />
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-2">{currentTemplateId ? 'Şablonu güncelle' : 'Yeni şablon kaydet'}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Bu şablonu {currentTemplateId ? 'güncellemek' : 'kaydetmek'} istiyor musunuz?</p>
              <div className="border rounded mb-3 bg-gray-50 flex items-center justify-center">
                <img src={generateThumbnail()} alt="Önizleme" className="max-h-48 object-contain mx-auto" />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={()=>setShowSaveDialog(false)}>Vazgeç</button>
                {currentTemplateId ? (
                  <button className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white" onClick={()=>{updateTemplate(currentTemplateId); setShowSaveDialog(false);}}>Güncelle</button>
                ) : (
                  <button className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white" onClick={()=>{saveTemplate(); setShowSaveDialog(false);}}>Kaydet</button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Şablon Sil Onayı */}
        {deleteTemplateId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setDeleteTemplateId(null)} />
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-2">Şablonu Sil</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Bu şablonu kalıcı olarak silmek istiyor musunuz?</p>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={()=>setDeleteTemplateId(null)}>Vazgeç</button>
                <button className="px-3 py-1.5 text-sm rounded bg-red-600 text-white" onClick={async()=>{ await removeTemplate(deleteTemplateId); setDeleteTemplateId(null); }}>Sil</button>
              </div>
            </div>
          </div>
        )}

        {/* Öğeyi Kaldır Onayı (sabit öğe) */}
        {removeTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setRemoveTarget(null)} />
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-2">Öğeyi Kaldır</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">“{removeTarget}” öğesini gizlemek istiyor musunuz?</p>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={()=>setRemoveTarget(null)}>Vazgeç</button>
                <button
                  className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
                  onClick={() => { setVisible(v=>({ ...v, [removeTarget]: false })); setRemoveTarget(null); }}
                >Kaldır</button>
              </div>
            </div>
          </div>
        )}

        {/* Öğeyi Kaldır Onayı (serbest öğe) */}
        {removeFreeId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setRemoveFreeId(null)} />
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-sm rounded-lg shadow-lg p-4">
              <h4 className="text-lg font-semibold mb-2">Öğeyi Kaldır</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">Seçili öğeyi kaldırmak istiyor musunuz?</p>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={()=>setRemoveFreeId(null)}>Vazgeç</button>
                <button
                  className="px-3 py-1.5 text-sm rounded bg-red-600 text-white"
                  onClick={() => { setFreeItemTypes(items => items.filter(i => i.id !== removeFreeId)); setRemoveFreeId(null); }}
                >Kaldır</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelGenerator;