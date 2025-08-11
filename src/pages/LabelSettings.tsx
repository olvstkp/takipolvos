import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_LABEL_TYPES, LabelFieldKey, LabelTypeDef, buildDefaultFields } from '../lib/label_settings';
import ConfirmDialog from '../components/ConfirmDialog';

const ALL_FIELDS: LabelFieldKey[] = [
  'productName','barcode','serialNumber','entryDate','expiryDate','amount','invoiceNumber','batchNumber','supplier','logo'
];

const LabelSettings: React.FC = () => {
  const [types, setTypes] = useState<LabelTypeDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<LabelTypeDef | null>(null);
  const [name, setName] = useState('');
  const [fields, setFields] = useState(buildDefaultFields());
  const [saving, setSaving] = useState(false);
  const [anchors, setAnchors] = useState<Record<string, {x:number;y:number}>>(buildDefaultFields() && { title:{x:6,y:6}, productName:{x:6,y:13}, details:{x:6,y:26}, barcode:{x:6,y:34} } as any);

  const filtered = useMemo(() => (
    types.filter(t => t.name.toLowerCase().includes(search.toLowerCase()))
  ), [types, search]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('label_types').select('id, name, fields').order('name', { ascending: true });
    if (!error && data) {
      setTypes(data as LabelTypeDef[]);
    } else {
      // Tablo yoksa veya hata: defaultları göster (salt okunur gibi)
      setTypes(DEFAULT_LABEL_TYPES);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setFields(buildDefaultFields());
  };

  const onEdit = (t: LabelTypeDef) => {
    setEditing(t);
    setName(t.name);
    setFields({ ...buildDefaultFields(), ...(t.fields || {}) });
    setAnchors((t.anchors as any) || { title:{x:6,y:6}, productName:{x:6,y:13}, details:{x:6,y:26}, barcode:{x:6,y:34} });
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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

  return (
    <>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Etiket Ayarları</h1>
        <div className="text-sm text-gray-500">Etiket türlerini oluşturun ve alan görünürlüğünü/zorunluluğunu yönetin.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ara..." className="flex-1 p-2 border rounded" />
            <button className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded" onClick={load}>Yenile</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
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
                      <span className="capitalize">{f}</span>
                      <span>{t.fields?.[f]?.visible === false ? 'Gizli' : (t.fields?.[f]?.required ? 'Zorunlu' : 'Opsiyonel')}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">{editing ? 'Türü Düzenle' : 'Yeni Tür Ekle'}</h3>
            {editing && <button className="text-sm px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded" onClick={resetForm}>Yeni</button>}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Ad</label>
              <input className="w-full p-2 border rounded" value={name} onChange={e=>setName(e.target.value)} placeholder="Örn: Numune Etiketi" />
            </div>
              {/* Anchor ayarları */}
              <div className="border rounded p-3">
                <div className="text-sm font-medium mb-2">Konumlar (mm)</div>
                <div className="grid grid-cols-2 gap-3">
                  {['title','productName','details','barcode'].map((k)=> (
                    <div key={k} className="grid grid-cols-2 gap-2 items-center">
                      <div className="text-xs capitalize">{k} X</div>
                      <input type="number" step={0.1} className="p-2 border rounded" value={anchors?.[k]?.x ?? 0} onChange={(e)=>setAnchors(prev=>({ ...(prev||{}), [k]: { ...(prev?.[k]||{x:0,y:0}), x: Number(e.target.value) } }))} />
                      <div className="text-xs capitalize">{k} Y</div>
                      <input type="number" step={0.1} className="p-2 border rounded" value={anchors?.[k]?.y ?? 0} onChange={(e)=>setAnchors(prev=>({ ...(prev||{}), [k]: { ...(prev?.[k]||{x:0,y:0}), y: Number(e.target.value) } }))} />
                    </div>
                  ))}
                </div>
              </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_FIELDS.map(f => (
                <div key={f} className="border rounded p-2">
                  <div className="text-sm font-medium capitalize mb-2">{f}</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={fields[f].visible} onChange={(e)=>setFields(prev=>({ ...prev, [f]: { ...prev[f], visible: e.target.checked } }))} /> Görünür
                  </label>
                  <label className="flex items-center gap-2 text-sm mt-1">
                    <input type="checkbox" checked={fields[f].required} onChange={(e)=>setFields(prev=>({ ...prev, [f]: { ...prev[f], required: e.target.checked } }))} /> Zorunlu
                  </label>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button className="px-3 py-1.5 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={resetForm}>Temizle</button>
              <button className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white disabled:opacity-50" disabled={saving || !name.trim()} onClick={onSave}>{editing ? 'Güncelle' : 'Ekle'}</button>
            </div>
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
    </>
  );
};

export default LabelSettings;


