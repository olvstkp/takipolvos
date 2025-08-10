import React, { useState, useRef, useEffect } from 'react';
import { Printer, QrCode, Download, Type, Barcode as BarcodeIcon, Image as ImageIcon, ZoomIn, ZoomOut, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import FreeItemsPanel from '../components/FreeItemsPanel';
import PreviewCanvas from '../components/PreviewCanvas';
import StandardForm from '../components/StandardForm';

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

  const [labelType, setLabelType] = useState<string>('Koli etiketi');
  // Etiket boyutu (mm) - 104 x 50.8 mm
  const [labelWidth, setLabelWidth] = useState<number>(104);
  const [labelHeight, setLabelHeight] = useState<number>(50.8);
  // ZPL için DPI (isteğe bağlı) ve görsel baskı için koyuluk
  const [dpi, setDpi] = useState<203 | 300 | 600>(203);
  const [darkness, setDarkness] = useState<number>(2);
  const [zplDarkness, setZplDarkness] = useState<number>(30); // ^MD 0-30
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
  // Resize yumuşatma: hız ve easing
  const RESIZE_SENS = 0.050; // daha düşük = daha az hassas
  const RESIZE_SMOOTH = 0.015; // daha düşük = daha yumuşak/istekleri daha yavaş takip eder
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
  const [resizingKey, setResizingKey] = useState<AnchorKey | null>(null);
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

  // Serbest Mod öğeleri
  type FreeItemType = 'text' | 'barcode' | 'image' | 'line' | 'circle' | 'ring';
  type FreeItem = {
    id: string;
    type: FreeItemType;
    x: number; // mm
    y: number; // mm
    widthMm?: number; // barcode/image
    heightMm?: number; // barcode/image
    text?: string; // text/barcode digits
    fontMm?: number; // text
    wrapWidthMm?: number; // text
    src?: string; // image data url
    zIndex?: number; // katmanlama
  };
  const [freeMode, setFreeMode] = useState<boolean>(false);
  const [freeItems, setFreeItems] = useState<FreeItem[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const freeImageCache = useRef<Record<string, HTMLImageElement>>({});
  const [showFreeDialog, setShowFreeDialog] = useState<boolean>(false);
  const [freeDraft, setFreeDraft] = useState<Partial<FreeItem> & { type: FreeItemType } | null>(null);
  const [editingFreeId, setEditingFreeId] = useState<string | null>(null);
  const [freeEditContext, setFreeEditContext] = useState<'preview'|'workspace'>('preview');
  const [showFreeWorkspace, setShowFreeWorkspace] = useState<boolean>(false);
  const [wsItems, setWsItems] = useState<FreeItem[]>([]);
  const wsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [wsZoom, setWsZoom] = useState<number>(1);
  const [wsRemoveId, setWsRemoveId] = useState<string | null>(null);
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
        setFreeItems(arr => arr.map(it => it.id===draggingFreeId ? { ...it, x: Math.max(0, Math.min(labelWidth-5, x)), y: Math.max(0, Math.min(labelHeight-5, y)) } : it));
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
        setFreeItems(arr => arr.map(it => {
          if (it.id !== resizingFreeIdGlobal) return it;
          if (it.type==='text') {
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

  // Taslak yönetimi
  type TemplateRow = { id: string; name: string; data: any; thumbnail?: string };
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templateName, setTemplateName] = useState<string>('Yeni Taslak');
  const [saving, setSaving] = useState<boolean>(false);
  // const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [templateSearch, setTemplateSearch] = useState<string>('');
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
  const normalizeZ = (items: FreeItem[]): FreeItem[] => {
    const sorted = [...items].sort((a,b)=> (a.zIndex||0) - (b.zIndex||0));
    return sorted.map((it, idx) => ({ ...it, zIndex: idx }));
  };
  const getMaxZ = (items: FreeItem[]) => items.reduce((m, it)=> Math.max(m, it.zIndex ?? 0), -1);
  const moveLayer = (id: string, direction: 'up' | 'down') => {
    setFreeItems(items => {
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
    setFreeItems(items => {
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
    anchors,
    styles,
    selectedCompany,
    visible,
    freeMode,
    freeItems,
  });

  const applySerializedState = (s: any) => {
    if (!s) return;
    setLabelData(s.labelData ?? labelData);
    setLabelType(s.labelType ?? labelType);
    setLabelWidth(s.labelWidth ?? labelWidth);
    setLabelHeight(s.labelHeight ?? labelHeight);
    setDpi(s.dpi ?? dpi);
    setDarkness(s.darkness ?? darkness);
    setZplDarkness(s.zplDarkness ?? zplDarkness);
    setAnchors(s.anchors ?? anchors);
    setStyles(s.styles ?? styles);
    if (s.selectedCompany) setSelectedCompany(s.selectedCompany);
    if (s.visible) setVisible({ ...defaultVisibility, ...s.visible });
    if (s.freeMode !== undefined) setFreeMode(!!s.freeMode);
    if (s.freeItems) setFreeItems(s.freeItems as FreeItem[]);
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
  }, [labelData, labelType, labelWidth, labelHeight, dpi, darkness, zplDarkness, anchors, styles, selectedCompany, visible, freeMode, freeItems]);

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
        // Standart mod öğeleri sadece Standart sekmesinde çizilsin
        if (activeTab === 'standart') {
          // Başlık: logo varsa çiz, yoksa metin
          if (visible.title) {
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
            } else {
              ctx.font = `bold ${mmToPx(styles.title.font)}px Arial`;
              ctx.fillText('OLIVOS', mmToPx(anchors.title.x), mmToPx(anchors.title.y));
            }
          }

          // Ürün adı (sararak)
          if (visible.productName) {
            ctx.font = `${mmToPx(styles.productName.font)}px Arial`;
            let y = mmToPx(anchors.productName.y);
            const left = mmToPx(anchors.productName.x);
            const maxW = mmToPx(Math.min(labelWidth - anchors.productName.x - 6, styles.productName.wrapWidth));
            y = wrapText(labelData.productName, left, y, maxW, mmToPx(styles.details.lineGap));
          }

          // Diğer alanlar (daha küçük yazı)
          if (visible.details) {
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
          }

          // Barkod (EAN-13)
          if (visible.barcode) {
            const ean = toEAN13(labelData.barcode);
            if (ean) {
              const barWidthMm = Math.max(20, styles.barcode.widthMm);
              const barLeft = mmToPx(anchors.barcode.x);
              const barTop = mmToPx(anchors.barcode.y);
              drawEAN13(ean, barLeft, barTop, barWidthMm, styles.barcode.height);
            }
          }
        }
        
        // Serbest mod çizimleri: sadece Serbest sekmesinde
        if (activeTab==='serbest' && freeMode && freeItems.length > 0) {
          // zIndex'e göre sırala ve çiz
          const sorted = [...freeItems].sort((a,b)=> (a.zIndex||0) - (b.zIndex||0));
          for (const item of sorted) {
            if (item.type === 'text' && item.text) {
              ctx.font = `${mmToPx(item.fontMm || 4)}px Arial`;
              wrapText(item.text, mmToPx(item.x), mmToPx(item.y), mmToPx(item.wrapWidthMm || (labelWidth - item.x - 6)), mmToPx(4));
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
              ctx.fillStyle = '#000';
              ctx.fill();
            } else if (item.type === 'ring') {
              const w = item.widthMm || 12; const h = item.heightMm || 12;
              const rx = mmToPx(w)/2; const ry = mmToPx(h)/2;
              const cx = mmToPx(item.x) + rx; const cy = mmToPx(item.y) + ry;
              ctx.beginPath();
              ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
              ctx.lineWidth = Math.max(1, Math.floor(mmToPx(0.6)));
              ctx.strokeStyle = '#000';
              ctx.stroke();
            }
          }
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

  // Canvas ve ZPL'i sürekli güncelle
  useEffect(() => {
    renderZPLPreview();
    try { generateZPL(); } catch {}
  }, [labelData, labelType, labelWidth, labelHeight, showPreview, darkness, anchors, styles, visible, freeMode, freeItems, dpi, zplDarkness]);

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
            labelData={labelData}
            setLabelData={setLabelData}
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
                setFreeItems(items => items.filter(i => i.id !== selectedFreeId));
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
                  <button type="button" className="flex items-center justify-center gap-2 px-2 py-2 rounded border bg-white hover:bg-gray-50" onClick={()=>{ setFreeEditContext('preview'); setEditingFreeId(null); setFreeDraft({ type:'text', text:'Yeni Metin', fontMm:4, wrapWidthMm:60, x:6, y:6 }); setShowFreeDialog(true); }}>
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
                onClear={()=>setFreeItems([])}
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
            anchors={anchors}
            styles={styles}
            freeItems={freeItems}
            selectedFreeId={selectedFreeId}
            setDragKey={setDragKey}
            setDraggingAnchorKey={setDraggingAnchorKey}
            setDragOffset={setDragOffset}
            setResizingKey={setResizingKey}
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
                <button onClick={fetchTemplates} className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded">Yenile</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-auto">
                {templates.filter(t=> t.name.toLowerCase().includes(templateSearch.toLowerCase())).map(t => (
                  <div key={t.id} className="relative border rounded-md p-2 hover:shadow cursor-pointer group" onClick={()=>{loadTemplate(t.id); setShowTemplateModal(false);}}>
                    <button
                      className="absolute right-1 top-1 p-1 rounded bg-red-600 text-white opacity-0 group-hover:opacity-100"
                      onClick={(e)=>{ e.stopPropagation(); setDeleteTemplateId(t.id); }}
                      title="Şablonu sil"
                      aria-label="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                    const applyTo = freeEditContext === 'workspace' ? setWsItems : setFreeItems;
                    if (editingFreeId) {
                      applyTo((arr: FreeItem[]) => normalizeZ(arr.map(it => it.id===editingFreeId ? { ...it, ...freeDraft, id: editingFreeId } as FreeItem : it)));
                    } else {
                      const id = crypto.randomUUID();
                      applyTo((arr: FreeItem[]) => normalizeZ([ ...arr, { id, ...(freeDraft as any), zIndex: getMaxZ(arr)+1 } as FreeItem ]));
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
            <div className="relative bg-white dark:bg-gray-800 w-full max-w-5xl rounded-lg shadow-2xl p-4 z-[101]">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-lg font-semibold">Serbest Etiket Tasarımı</h4>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 text-sm rounded border" onClick={()=>{ setFreeEditContext('workspace'); setEditingFreeId(null); setFreeDraft({ type:'text', text:'Yeni Metin', fontMm:4, wrapWidthMm:60, x:6, y:6 }); setShowFreeDialog(true); }}>Metin</button>
                  <button className="px-3 py-1.5 text-sm rounded border" onClick={()=>{ setFreeEditContext('workspace'); setEditingFreeId(null); setFreeDraft({ type:'barcode', text:'5901234123457', widthMm:60, heightMm:12, x:6, y:20 }); setShowFreeDialog(true); }}>Barkod</button>
                  <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ setFreeEditContext('workspace'); setEditingFreeId(null); setFreeDraft({ type:'image', src:String(r.result), widthMm:30, heightMm:12, x:6, y:10 }); setShowFreeDialog(true); }; r.readAsDataURL(f); e.currentTarget.value=''; }} />
                  <button className="px-3 py-1.5 text-sm rounded border" onClick={()=>imageInputRef.current?.click()}>Görsel</button>
                  <div className="ml-4 flex items-center gap-2 text-sm">
                    <span>Yakınlaştır:</span>
                    <button className="px-2 py-1 bg-gray-200 rounded" onClick={()=>setWsZoom(z=>Math.max(0.5, Number((z-0.1).toFixed(2))))}>-</button>
                    <input type="range" min={0.5} max={3} step={0.1} value={wsZoom} onChange={(e)=>setWsZoom(Number(e.target.value))} />
                    <button className="px-2 py-1 bg-gray-200 rounded" onClick={()=>setWsZoom(z=>Math.min(3, Number((z+0.1).toFixed(2))))}>+</button>
                    <span className="w-10 text-right">{Math.round(wsZoom*100)}%</span>
                  </div>
                  <button className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white" onClick={()=>{ setFreeMode(true); setFreeItems(wsItems); setShowFreeWorkspace(false); setShowPreview(true); setTimeout(()=>renderZPLPreview(),0); }}>Önizlemeye Aktar</button>
                  <button className="px-3 py-1.5 text-sm rounded bg-gray-200" onClick={()=>setShowFreeWorkspace(false)}>Kapat</button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                <div className="md:col-span-2">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-4 relative">
                      <canvas ref={wsCanvasRef} className="w-full h-auto border border-gray-300" style={{ width: `${labelWidth * 3.78 * wsZoom}px`, height: `${labelHeight * 3.78 * wsZoom}px`, maxWidth: '100%' }} />
                      {/* Serbest öğe overlay */}
                      <div className="absolute inset-4 pointer-events-none select-none">
                        {wsItems.map((item) => (
                          <div
                            key={item.id}
                            className="absolute bg-purple-500/10 border border-purple-500 text-[10px] text-purple-800 rounded pointer-events-auto"
                            style={{
                              left: `${item.x * 3.78 * wsZoom}px`,
                              top: `${item.y * 3.78 * wsZoom}px`,
                              width: `${((item.type==='text' ? (item.wrapWidthMm || 60) : (item.widthMm || 40)) * 3.78 * wsZoom)}px`,
                              height: `${(item.heightMm || (item.type==='text' ? (item.fontMm||4)+6 : 12)) * 3.78 * wsZoom}px`,
                              cursor: 'move',
                              zIndex: 1000
                            }}
                            onMouseDown={(e) => {
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
                                  style={{ fontSize: `${(item.fontMm || 4) * 3.78 * wsZoom}px`, lineHeight: 1.1 as any }}
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
                            <div className="absolute right-0 bottom-0 w-3 h-3 bg-purple-600 cursor-se-resize"
                              onMouseDown={(e)=>{
                                e.stopPropagation(); setResizingKey('productName'); const parent=(e.currentTarget.parentElement as HTMLElement).getBoundingClientRect(); setResizeStart({ x0:e.clientX, y0:e.clientY, wMm: parseFloat(((parent.width)/(3.78*wsZoom)).toFixed(2)), hMm: parseFloat(((parent.height)/(3.78*wsZoom)).toFixed(2)), productFont: item.fontMm||4, productWrap: item.wrapWidthMm||60, titleFont:0, detailsGap:0, detailsFont:0, bcHeight:item.heightMm||12, bcScale:1 }); (e.currentTarget as any).dataset.freeId=item.id; }}
                              onMouseMove={(e)=>{ if(resizingKey!=='productName') return; const freeId=(e.currentTarget as any).dataset.freeId; if(!freeId) return; const dxMm=(e.clientX-resizeStart.x0)/(3.78*wsZoom); const dyMm=(e.clientY-resizeStart.y0)/(3.78*wsZoom); setWsItems(arr=>arr.map(it=>{ if(it.id!==freeId) return it; if(it.type==='text'){ return { ...it, wrapWidthMm: Math.max(20,(it.wrapWidthMm||60)+dxMm), fontMm: Math.max(2,(it.fontMm||4)+dyMm) }; } return { ...it, widthMm: Math.max(10,(it.widthMm||40)+dxMm), heightMm: Math.max(5,(it.heightMm||12)+dyMm) }; })); }}
                              onMouseUp={()=>setResizingKey(null)} onMouseLeave={()=>setResizingKey(null)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Özellikler paneli basit hali */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">Bu pencere boş etiket üzerinde serbest öğeleri düzenlemek içindir. Öğelere çift tıklayarak detaylarını düzenleyebilirsiniz. Bittiğinde “Önizlemeye Aktar”a basın.</div>
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
                  onClick={() => { setFreeItems(items => items.filter(i => i.id !== removeFreeId)); setRemoveFreeId(null); }}
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