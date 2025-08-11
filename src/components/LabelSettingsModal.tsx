import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_LABEL_TYPES, LabelFieldKey, LabelTypeDef, buildDefaultFields } from '../lib/label_settings';
import ConfirmDialog from './ConfirmDialog';

const ALL_FIELDS: LabelFieldKey[] = [
  'productName','barcode','serialNumber','entryDate','expiryDate','amount','invoiceNumber','batchNumber','supplier','logo'
];

const FIELD_LABELS: Record<LabelFieldKey, string> = {
  productName: 'Ürün Adı',
  barcode: 'Barkod',
  serialNumber: 'Seri No',
  entryDate: 'Giriş Tarihi',
  expiryDate: 'Son Kullanma Tarihi',
  amount: 'Miktar',
  invoiceNumber: 'İrsaliye No',
  batchNumber: 'Parti No',
  supplier: 'Tedarikçi',
  logo: 'Logo',
};

const ANCHOR_LABELS: Record<'title'|'productName'|'details'|'barcode', string> = {
  title: 'Logo',
  productName: 'Ürün Adı',
  details: 'Detaylar',
  barcode: 'Barkod',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

const LabelSettingsModal: React.FC<Props> = ({ open, onClose }) => {
  const [types, setTypes] = useState<LabelTypeDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LabelTypeDef | null>(null);
  const [name, setName] = useState('');
  const [fields, setFields] = useState(buildDefaultFields());
  const [saving, setSaving] = useState(false);
  const [anchors, setAnchors] = useState<Record<string, { x:number; y:number }>>({ title:{x:6,y:6}, productName:{x:6,y:13}, details:{x:6,y:26}, barcode:{x:6,y:34} });
  const scale = 5; // px per mm for mini preview
  const previewRef = useRef<HTMLDivElement>(null);
  const [dragKey, setDragKey] = useState<'title'|'productName'|'details'|'barcode'|null>(null);
  const [dragOffset, setDragOffset] = useState<{dx:number; dy:number}>({ dx:0, dy:0 });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => (
    types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  ), [types, search]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('label_types').select('id, name, fields, anchors').order('name', { ascending: true });
    if (!error && data) {
      setTypes(data as LabelTypeDef[]);
    } else {
      setTypes(DEFAULT_LABEL_TYPES);
    }
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragKey || !previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const pxX = e.clientX - rect.left - dragOffset.dx;
      const pxY = e.clientY - rect.top - dragOffset.dy;
      const mmX = Math.max(0, Math.round(pxX / scale));
      const mmY = Math.max(0, Math.round(pxY / scale));
      setAnchors(prev => ({ ...prev, [dragKey]: { x: mmX, y: mmY } }));
    };
    const onUp = () => setDragKey(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragKey, dragOffset, scale]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setFields(buildDefaultFields());
    setAnchors({ title:{x:6,y:6}, productName:{x:6,y:13}, details:{x:6,y:26}, barcode:{x:6,y:34} });
  };

  const onEdit = (t: LabelTypeDef) => {
    setEditing(t);
    setName(t.name);
    setFields({ ...buildDefaultFields(), ...(t.fields || {}) });
    setAnchors((t.anchors as any) || { title:{x:6,y:6}, productName:{x:6,y:13}, details:{x:6,y:26}, barcode:{x:6,y:34} });
  };

  const onDelete = async (id?: string) => {
    if (!id) return;
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    await supabase.from('label_types').delete().eq('id', confirmDeleteId);
    setConfirmDeleteId(null);
    await load();
  };

  const onSave = async () => {
    setSaving(true);
    const payload = { name: name.trim(), fields, anchors };
    if (!payload.name) { setSaving(false); return; }
    if (editing?.id) {
      await supabase.from('label_types').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('label_types').insert(payload);
    }
    setSaving(false);
    resetForm();
    await load();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 w-[96vw] h-[92vh] max-w-none rounded-lg shadow-2xl p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold">Etiket Ayarları</h4>
          <button className="text-sm px-2 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={onClose}>Kapat</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
          {/* Liste */}
          <div className="lg:col-span-5 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 h-full overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara..." className="flex-1 p-2 border rounded" />
              <button className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded" onClick={load}>Yenile</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
              {loading ? (
                <div>Yükleniyor...</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-gray-500">Kayıtlı etiket türü yok.</div>
              ) : filtered.map(t => (
                <div key={t.id || t.name} className="border rounded-md p-3 bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{t.name}</div>
                    <div className="flex items-center gap-2">
                      {t.id && <button className="px-2 py-1 text-xs rounded border" onClick={()=>onEdit(t)}>Düzenle</button>}
                      {t.id && <button className="px-2 py-1 text-xs rounded border text-red-600" onClick={()=>onDelete(t.id)}>Sil</button>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {ALL_FIELDS.map(f => (
                      <div key={f} className="flex items-center justify-between bg-white/70 dark:bg-gray-800/60 rounded px-2 py-1">
                        <span>{FIELD_LABELS[f]}</span>
                        <span>{t.fields?.[f]?.visible === false ? 'Gizli' : (t.fields?.[f]?.required ? 'Zorunlu' : 'Opsiyonel')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form + mini önizleme */}
          <div className="lg:col-span-7 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 h-full overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{editing ? 'Türü Düzenle' : 'Yeni Tür Ekle'}</h3>
              {editing && <button className="text-sm px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onClick={resetForm}>Yeni</button>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Ad</label>
                <input className="w-full p-2 border rounded" value={name} onChange={e=>setName(e.target.value)} placeholder="Örn: Numune Etiketi" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[40vh] overflow-auto">
                {ALL_FIELDS.map(f => (
                  <div key={f} className="border rounded p-2">
                    <div className="text-sm font-medium mb-2">{FIELD_LABELS[f]}</div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={fields[f].visible} onChange={(e)=>setFields(prev=>({ ...prev, [f]: { ...prev[f], visible: e.target.checked } }))} /> Görünür
                    </label>
                    <label className="flex items-center gap-2 text-sm mt-1 opacity-100">
                      <input
                        type="checkbox"
                        checked={fields[f].required}
                        disabled={!fields[f].visible}
                        onChange={(e)=>setFields(prev=>({ ...prev, [f]: { ...prev[f], required: e.target.checked } }))}
                      /> Zorunlu
                    </label>
                  </div>
                ))}
              </div>
              {/* Konumlar ve mini önizleme */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border rounded p-3">
                  <div className="text-sm font-medium mb-2">Konumlar (mm)</div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['title','productName','details','barcode'] as const).map((k)=> (
                      <div key={k} className="grid grid-cols-2 gap-2 items-center">
                        <div className="text-xs">{ANCHOR_LABELS[k]} X</div>
                        <input type="number" step={0.1} className="p-2 border rounded" value={anchors?.[k]?.x ?? 0} onChange={(e)=>setAnchors(prev=>({ ...(prev||{}), [k]: { ...(prev?.[k]||{x:0,y:0}), x: Number(e.target.value) } }))} />
                        <div className="text-xs">{ANCHOR_LABELS[k]} Y</div>
                        <input type="number" step={0.1} className="p-2 border rounded" value={anchors?.[k]?.y ?? 0} onChange={(e)=>setAnchors(prev=>({ ...(prev||{}), [k]: { ...(prev?.[k]||{x:0,y:0}), y: Number(e.target.value) } }))} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-sm font-medium mb-2">Önizleme</div>
                  <div className="bg-gray-50 rounded-md p-3">
                    <div ref={previewRef} className="relative w-[540px] h-[264px] border mx-auto bg-white select-none">
                      <div className="absolute inset-3 border"></div>
                      {/* Title */}
                      {fields.logo.visible !== false && (
                        <div
                          className="absolute bg-red-500/10 border border-red-500 text-[10px] px-1 rounded cursor-move"
                          style={{ 
                            left: `${(anchors?.title?.x ?? 0) * scale}px`, 
                            top: `${(anchors?.title?.y ?? 0) * scale}px`,
                            width: `${50 * scale}px`,
                            height: `${10 * scale}px`
                          }}
                          onMouseDown={(e)=>{ if(!previewRef.current) return; const r=previewRef.current.getBoundingClientRect(); setDragKey('title'); setDragOffset({ dx: e.clientX - (r.left + (anchors?.title?.x ?? 0)*scale), dy: e.clientY - (r.top + (anchors?.title?.y ?? 0)*scale) }); }}
                        >Logo</div>
                      )}
                      {/* Product name */}
                      {fields.productName.visible && (
                        <div
                          className="absolute bg-red-500/10 border border-red-500 text-[10px] px-1 rounded cursor-move"
                          style={{ left: `${(anchors?.productName?.x ?? 0) * scale}px`, top: `${(anchors?.productName?.y ?? 0) * scale}px`, width: '240px', height: '42px' }}
                          onMouseDown={(e)=>{ if(!previewRef.current) return; const r=previewRef.current.getBoundingClientRect(); setDragKey('productName'); setDragOffset({ dx: e.clientX - (r.left + (anchors?.productName?.x ?? 0)*scale), dy: e.clientY - (r.top + (anchors?.productName?.y ?? 0)*scale) }); }}
                        >Ürün Adı</div>
                      )}
                      {/* Details: görünür alanlardan en az biri aktifse */}
                      {(['amount','serialNumber','batchNumber','invoiceNumber','entryDate','expiryDate','supplier'] as const).some(k=> fields[k].visible) && (
                        <div
                          className="absolute bg-red-500/10 border border-red-500 text-[10px] px-1 rounded cursor-move"
                          style={{ left: `${(anchors?.details?.x ?? 0) * scale}px`, top: `${(anchors?.details?.y ?? 0) * scale}px`, width: '330px', height: '72px' }}
                          onMouseDown={(e)=>{ if(!previewRef.current) return; const r=previewRef.current.getBoundingClientRect(); setDragKey('details'); setDragOffset({ dx: e.clientX - (r.left + (anchors?.details?.x ?? 0)*scale), dy: e.clientY - (r.top + (anchors?.details?.y ?? 0)*scale) }); }}
                        >Detaylar</div>
                      )}
                      {/* Barcode */}
                      {fields.barcode.visible && (
                        <div
                          className="absolute bg-red-500/10 border border-red-500 text-[10px] px-1 rounded cursor-move"
                          style={{ left: `${(anchors?.barcode?.x ?? 0) * scale}px`, top: `${(anchors?.barcode?.y ?? 0) * scale}px`, width: '270px', height: '36px' }}
                          onMouseDown={(e)=>{ if(!previewRef.current) return; const r=previewRef.current.getBoundingClientRect(); setDragKey('barcode'); setDragOffset({ dx: e.clientX - (r.left + (anchors?.barcode?.x ?? 0)*scale), dy: e.clientY - (r.top + (anchors?.barcode?.y ?? 0)*scale) }); }}
                        >Barkod</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={resetForm}>Temizle</button>
                <button className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white disabled:opacity-50" disabled={saving || !name.trim()} onClick={onSave}>{editing ? 'Güncelle' : 'Ekle'}</button>
              </div>
            </div>
          </div>
        </div>
        <ConfirmDialog
          open={!!confirmDeleteId}
          title="Silme Onayı"
          message="Bu etiket türünü silmek istiyor musunuz?"
          confirmText="Sil"
          cancelText="Vazgeç"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDeleteId(null)}
        />
      </div>
    </div>
  );
};

export default LabelSettingsModal;



